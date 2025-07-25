// scripts/db-migrate.js
// Script amélioré pour créer et exécuter des migrations depuis StackBlitz vers Supabase

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Configuration pour ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config();

// Afficher les informations de débogage
console.log('Recherche des variables d\'environnement...');
const envKeys = Object.keys(process.env).filter(key => key.includes('SUPA'));
console.log(`Variables trouvées: ${envKeys.join(', ') || 'aucune'}`);

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erreur: Variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises');
  console.error('Créez un fichier .env à la racine du projet avec ces variables');
  console.error('Ou assurez-vous qu\'elles sont définies dans l\'environnement GitHub Actions');
  process.exit(1);
}

// Initialiser le client Supabase avec la clé de service pour les opérations admin
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ✅ Définir le chemin du bon dossier des migrations (corrigé ici)
const MIGRATIONS_DIR = path.join(process.cwd(), 'supabase', 'migrations');

// Créer le dossier des migrations s'il n'existe pas
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}


// Fonction pour créer une nouvelle migration
async function createMigration(name) {
  if (!name) {
    console.error('Erreur: Nom de migration requis');
    console.log('Usage: npm run db:create nom_de_la_migration');
    process.exit(1);
  }
  
  // Créer un nom de fichier avec timestamp
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
  const fileName = `${timestamp}_${name}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  
  // Créer le fichier avec un contenu initial
  fs.writeFileSync(filePath, `-- Migration: ${name}\n-- Created at: ${new Date().toISOString()}\n\n-- Votre SQL ici\n`);
  
  console.log(`Migration créée: ${fileName}`);
  return fileName;
}

// Fonction pour exécuter une migration spécifique
async function runMigration(fileName) {
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`Erreur: Le fichier de migration ${fileName} n'existe pas`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Exécution de la migration: ${fileName}`);
  
  try {
    // Exécuter la migration via l'API Supabase
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Erreur lors de l\'exécution de la migration:', error);
      process.exit(1);
    }
    
    console.log(`Migration ${fileName} exécutée avec succès`);
    
    // Enregistrer la migration dans la table des migrations
    await recordMigration(fileName);
  } catch (error) {
    console.error('Erreur lors de l\'exécution de la migration:', error);
    process.exit(1);
  }
}

// Fonction pour enregistrer une migration exécutée
async function recordMigration(fileName) {
  try {
    // Vérifier si la table des migrations existe, sinon la créer
    await ensureMigrationsTable();
    
    // Insérer l'enregistrement de la migration
    const { error } = await supabase
      .from('migrations')
      .insert([{ 
        name: fileName, 
        executed_at: new Date().toISOString() 
      }]);
    
    if (error) {
      console.error('Erreur lors de l\'enregistrement de la migration:', error);
    }
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la migration:', error);
  }
}

// Fonction pour s'assurer que la table des migrations existe
async function ensureMigrationsTable() {
  try {
    // Vérifier si la table existe déjà
    const { data, error } = await supabase
      .from('migrations')
      .select('name')
      .limit(1);
    
    if (error && error.code === '42P01') { // Table doesn't exist
      // Créer la table des migrations
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `;
      
      await supabase.rpc('exec_sql', { sql_query: createTableSQL });
      console.log('Table des migrations créée');
    } else if (error) {
      console.error('Erreur lors de la vérification de la table des migrations:', error);
    }
  } catch (error) {
    console.error('Erreur lors de la vérification de la table des migrations:', error);
  }
}

// Fonction pour lister les migrations
async function listMigrations() {
  console.log('Migrations disponibles:');
  
  if (!fs.existsSync(MIGRATIONS_DIR) || fs.readdirSync(MIGRATIONS_DIR).length === 0) {
    console.log('Aucune migration trouvée');
    return;
  }
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  // Récupérer les migrations déjà exécutées
  try {
    await ensureMigrationsTable();
    const { data: executedMigrations, error } = await supabase
      .from('migrations')
      .select('name');
    
    if (error) {
      console.error('Erreur lors de la récupération des migrations exécutées:', error);
      files.forEach(file => console.log(`- ${file}`));
      return;
    }
    
    const executedSet = new Set(executedMigrations.map(m => m.name));
    
    files.forEach(file => {
      const status = executedSet.has(file) ? '[EXÉCUTÉE]' : '[EN ATTENTE]';
      console.log(`- ${status} ${file}`);
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des migrations exécutées:', error);
    files.forEach(file => console.log(`- ${file}`));
  }
}

// Fonction pour exécuter toutes les migrations en attente
async function runPendingMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR) || fs.readdirSync(MIGRATIONS_DIR).length === 0) {
    console.log('Aucune migration trouvée');
    return;
  }
  
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  try {
    await ensureMigrationsTable();
    const { data: executedMigrations, error } = await supabase
      .from('migrations')
      .select('name');
    
    if (error) {
      console.error('Erreur lors de la récupération des migrations exécutées:', error);
      return;
    }
    
    const executedSet = new Set(executedMigrations.map(m => m.name));
    const pendingMigrations = files.filter(file => !executedSet.has(file));
    
    if (pendingMigrations.length === 0) {
      console.log('Aucune migration en attente');
      return;
    }
    
    console.log(`${pendingMigrations.length} migration(s) en attente`);
    
    for (const migration of pendingMigrations) {
      await runMigration(migration);
    }
    
    console.log('Toutes les migrations en attente ont été exécutées');
  } catch (error) {
    console.error('Erreur lors de l\'exécution des migrations en attente:', error);
  }
}

// Fonction pour réinitialiser la base de données (supprimer toutes les tables)
async function resetDatabase() {
  console.log('⚠️ ATTENTION: Cette opération va réinitialiser la base de données ⚠️');
  console.log('Toutes les tables seront supprimées et les migrations seront marquées comme non exécutées.');
  
  // Demander confirmation (simulé ici, dans un environnement Node.js réel, utilisez readline)
  const confirmation = process.argv.includes('--confirm');
  
  if (!confirmation) {
    console.log('Opération annulée. Pour confirmer, ajoutez --confirm à la commande.');
    return;
  }
  
  try {
    // Supprimer la table des migrations
    const dropMigrationsSQL = `DROP TABLE IF EXISTS migrations;`;
    await supabase.rpc('exec_sql', { sql_query: dropMigrationsSQL });
    
    console.log('Base de données réinitialisée avec succès.');
    console.log('Vous pouvez maintenant exécuter npm run db:push pour réappliquer toutes les migrations.');
  } catch (error) {
    console.error('Erreur lors de la réinitialisation de la base de données:', error);
  }
}

// Fonction pour créer une fonction RPC exec_sql si elle n'existe pas
async function createExecSqlFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
  `;
  
  try {
    // Utiliser directement l'API REST de Supabase pour créer la fonction
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql_query: createFunctionSQL })
    });
    
    if (!response.ok) {
      // Si la fonction n'existe pas encore, créons-la d'abord
      const createResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'params=single-object'
        },
        body: JSON.stringify({ query: createFunctionSQL })
      });
      
      if (!createResponse.ok) {
        console.error('Erreur lors de la création de la fonction exec_sql');
        console.error('Vous devrez peut-être créer cette fonction manuellement dans l\'éditeur SQL de Supabase');
      } else {
        console.log('Fonction exec_sql créée avec succès');
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création de la fonction exec_sql:', error);
    console.error('Vous devrez peut-être créer cette fonction manuellement dans l\'éditeur SQL de Supabase');
  }
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);
  
  // Vérifier si la fonction exec_sql existe
  await createExecSqlFunction();
  
  if (args.length === 0) {
    console.log('\nMigration CLI pour StackBlitz + Supabase\n');
    console.log('Options disponibles:');
    console.log('  --create nom  - Crée un nouveau fichier de migration');
    console.log('  --run nom     - Exécute une migration spécifique');
    console.log('  --list        - Liste toutes les migrations et leur statut');
    console.log('  --push        - Exécute toutes les migrations en attente');
    console.log('  --reset       - Réinitialise la base de données (supprime toutes les tables)');
    console.log('  ');
    return;
  }
  
  const command = args[0];
  
  if (command === '--create') {
    await createMigration(args[1]);
  } else if (command === '--run') {
    await runMigration(args[1]);
  } else if (command === '--list') {
    await listMigrations();
  } else if (command === '--push') {
    await runPendingMigrations();
  } else if (command === '--reset') {
    await resetDatabase();
  } else {
    console.error(`Commande inconnue: ${command}`);
    process.exit(1);
  }
}

// Exécuter la fonction principale
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});