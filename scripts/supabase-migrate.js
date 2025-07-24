#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import pg from 'pg';

// Charger les variables d'environnement
try {
  // Essayer d'importer dotenv si disponible
  const dotenv = await import('dotenv').then(module => module.default);
  dotenv.config();
  console.log('✅ Variables d\'environnement chargées depuis .env');
} catch (error) {
  console.log('ℹ️ Module dotenv non trouvé, utilisation des variables d\'environnement système');
}

// Fonction simple pour colorer le texte (sans dépendance chalk)
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function colorize(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

program
  .version('1.0.0')
  .description('Outil de gestion des migrations Supabase (sans CLI)')
  .option('-c, --create <name>', 'Créer une nouvelle migration')
  .option('-p, --push', 'Pousser les migrations vers la base de données')
  .option('-r, --reset', 'Réinitialiser la base de données (DANGER)')
  .option('-l, --list', 'Lister les migrations existantes')
  .option('-d, --dry-run', 'Simuler sans exécuter')
  .option('-y, --yes', 'Confirmer automatiquement les actions')
  .parse(process.argv);

const options = program.opts();

// Vérifier si le répertoire des migrations existe, le créer si nécessaire
function ensureMigrationsDir() {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir);
    console.log(colorize('blue', '📁 Répertoire des migrations créé'));
  }
  
  return migrationsDir;
}

// Créer une nouvelle migration
async function createMigration(name) {
  const migrationsDir = ensureMigrationsDir();
  
  // Formater le nom de fichier
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);
  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `${timestamp}_${safeName}.sql`;
  const filePath = path.join(migrationsDir, fileName);
  
  // Créer le fichier avec un template
  const template = `-- Migration: ${name}
-- Created at: ${new Date().toISOString()}

-- Up Migration
BEGIN;

-- Votre SQL ici

COMMIT;

-- Down Migration (optionnel)
/*
BEGIN;

-- SQL pour annuler les changements

COMMIT;
*/
`;

  fs.writeFileSync(filePath, template);
  console.log(colorize('green', `✅ Migration créée: ${fileName}`));
  
  // Ouvrir dans l'éditeur par défaut si disponible
  try {
    if (process.platform === 'win32') {
      execSync(`start ${filePath}`);
    } else if (process.platform === 'darwin') {
      execSync(`open ${filePath}`);
    } else {
      execSync(`xdg-open ${filePath}`);
    }
  } catch (error) {
    console.log(colorize('yellow', `ℹ️ Vous pouvez éditer le fichier manuellement: ${filePath}`));
  }
}

// Lister les migrations existantes
function listMigrations() {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log(colorize('yellow', '⚠️ Aucun répertoire de migrations trouvé'));
    return;
  }
  
  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  if (migrations.length === 0) {
    console.log(colorize('yellow', '⚠️ Aucune migration trouvée'));
    return;
  }
  
  console.log(colorize('blue', `📋 ${migrations.length} migrations trouvées:`));
  
  migrations.forEach((migration, index) => {
    // Extraire la date et le nom
    const timestamp = migration.substring(0, 14);
    const name = migration.substring(15).replace('.sql', '').replace(/_/g, ' ');
    
    // Formater la date
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    
    const formattedDate = `${year}-${month}-${day} ${hour}:${minute}`;
    
    console.log(colorize('green', `${index + 1}. [${formattedDate}] ${name}`));
  });
}

// Créer une connexion à la base de données
async function createDbConnection() {
  // Vérifier si l'URL de connexion est disponible
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(colorize('red', '❌ Variable DATABASE_URL non trouvée dans .env'));
    process.exit(1);
  }
  
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    // Tester la connexion
    await pool.query('SELECT NOW()');
    console.log(colorize('green', '✅ Connexion à la base de données établie'));
    return pool;
  } catch (error) {
    console.error(colorize('red', `❌ Erreur de connexion à la base de données: ${error.message}`));
    process.exit(1);
  }
}

// Pousser les migrations vers la base de données
async function pushMigrations(dryRun = false) {
  const migrationsDir = path.join(process.cwd(), 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log(colorize('yellow', '⚠️ Aucun répertoire de migrations trouvé'));
    return;
  }
  
  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  if (migrations.length === 0) {
    console.log(colorize('yellow', '⚠️ Aucune migration trouvée'));
    return;
  }
  
  console.log(colorize('blue', `📋 ${migrations.length} migrations trouvées`));
  
  if (dryRun) {
    console.log(colorize('yellow', '🔍 Mode simulation activé (dry-run)'));
    console.log(colorize('blue', 'Les migrations suivantes seraient appliquées:'));
    
    migrations.forEach((migration, index) => {
      const content = fs.readFileSync(path.join(migrationsDir, migration), 'utf8');
      const firstLine = content.split('\n')[0];
      
      console.log(colorize('green', `${index + 1}. ${migration} - ${firstLine.replace('--', '').trim()}`));
    });
    
    console.log(colorize('yellow', '⏭️ Simulation terminée (aucune modification appliquée)'));
    return;
  }
  
  // Connexion à la base de données
  const pool = await createDbConnection();
  
  try {
    // Créer la table de suivi des migrations si elle n'existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    // Récupérer les migrations déjà appliquées
    const { rows: appliedMigrations } = await pool.query('SELECT name FROM migrations');
    const appliedMigrationNames = appliedMigrations.map(row => row.name);
    
    // Filtrer les migrations non appliquées
    const pendingMigrations = migrations.filter(migration => !appliedMigrationNames.includes(migration));
    
    if (pendingMigrations.length === 0) {
      console.log(colorize('green', '✅ Toutes les migrations sont déjà appliquées'));
      await pool.end();
      return;
    }
    
    console.log(colorize('blue', `🔄 ${pendingMigrations.length} migrations à appliquer`));
    
    // Exécuter chaque migration dans une transaction
    for (const migration of pendingMigrations) {
      console.log(colorize('blue', `🔄 Application de la migration: ${migration}`));
      
      const content = fs.readFileSync(path.join(migrationsDir, migration), 'utf8');
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Exécuter le script SQL
        await client.query(content);
        
        // Enregistrer la migration comme appliquée
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration]);
        
        await client.query('COMMIT');
        console.log(colorize('green', `✅ Migration ${migration} appliquée avec succès`));
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(colorize('red', `❌ Erreur lors de l'application de la migration ${migration}:`));
        console.error(colorize('red', error.message));
        process.exit(1);
      } finally {
        client.release();
      }
    }
    
    console.log(colorize('green', '✅ Toutes les migrations ont été appliquées avec succès'));
  } catch (error) {
    console.error(colorize('red', `❌ Erreur lors de l'application des migrations: ${error.message}`));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Réinitialiser la base de données
async function resetDatabase(autoConfirm = false) {
  if (!autoConfirm) {
    // Version simplifiée sans inquirer
    console.log(colorize('red', '⚠️ ATTENTION: Cette action va réinitialiser TOUTES les données.'));
    console.log(colorize('red', 'Pour confirmer, ajoutez l\'option --yes ou -y à votre commande.'));
    console.log(colorize('blue', '🛑 Opération annulée'));
    return;
  }
  
  // Connexion à la base de données
  const pool = await createDbConnection();
  
  try {
    console.log(colorize('red', '🔄 Réinitialisation de la base de données...'));
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Récupérer toutes les tables du schéma public
      const { rows: tables } = await client.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
      `);
      
      // Désactiver temporairement les contraintes de clé étrangère
      await client.query('SET session_replication_role = replica;');
      
      // Supprimer toutes les tables
      for (const table of tables) {
        if (table.tablename !== 'migrations') {
          await client.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
          console.log(colorize('yellow', `🗑️ Table supprimée: ${table.tablename}`));
        }
      }
      
      // Supprimer la table de migrations
      await client.query('DROP TABLE IF EXISTS migrations CASCADE');
      console.log(colorize('yellow', '🗑️ Table de migrations supprimée'));
      
      // Réactiver les contraintes de clé étrangère
      await client.query('SET session_replication_role = DEFAULT;');
      
      await client.query('COMMIT');
      console.log(colorize('green', '✅ Base de données réinitialisée avec succès'));
      
      // Réappliquer toutes les migrations
      console.log(colorize('blue', '🔄 Réapplication de toutes les migrations...'));
      await pushMigrations(false);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(colorize('red', `❌ Erreur lors de la réinitialisation: ${error.message}`));
      process.exit(1);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(colorize('red', `❌ Erreur lors de la réinitialisation de la base de données: ${error.message}`));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Fonction principale
async function main() {
  console.log(colorize('blue', '🔧 Outil de gestion des migrations Supabase (sans CLI)'));
  console.log(colorize('blue', '═'.repeat(50)));
  
  // Exécuter la commande appropriée
  if (options.create) {
    await createMigration(options.create);
  } else if (options.list) {
    listMigrations();
  } else if (options.push) {
    await pushMigrations(options.dryRun);
  } else if (options.reset) {
    await resetDatabase(options.yes);
  } else {
    program.help();
  }
}

main().catch(error => {
  console.error(colorize('red', `❌ Erreur non gérée: ${error.message}`));
  process.exit(1);
});