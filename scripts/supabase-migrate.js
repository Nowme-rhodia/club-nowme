#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

program
  .version('1.0.0')
  .description('Outil de gestion des migrations Supabase')
  .option('-c, --create <name>', 'Créer une nouvelle migration')
  .option('-p, --push', 'Pousser les migrations vers la base de données')
  .option('-r, --reset', 'Réinitialiser la base de données (DANGER)')
  .option('-l, --list', 'Lister les migrations existantes')
  .option('-d, --dry-run', 'Simuler sans exécuter')
  .option('-y, --yes', 'Confirmer automatiquement les actions')
  .parse(process.argv);

const options = program.opts();
const projectId = 'dqfyuhwrjozoxadkccdj';

// Vérifier si la CLI Supabase est installée
function checkSupabaseCLI() {
  try {
    const version = execSync('supabase --version', { stdio: 'pipe' }).toString().trim();
    console.log(chalk.green(`✅ Supabase CLI détectée: ${version}`));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Supabase CLI non trouvée. Veuillez l\'installer:'));
    console.log(chalk.yellow('npm install -g supabase'));
    return false;
  }
}

// Vérifier si le répertoire des migrations existe, le créer si nécessaire
function ensureMigrationsDir() {
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  
  if (!fs.existsSync(path.join(process.cwd(), 'supabase'))) {
    fs.mkdirSync(path.join(process.cwd(), 'supabase'));
  }
  
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir);
    console.log(chalk.blue('📁 Répertoire des migrations créé'));
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
  console.log(chalk.green(`✅ Migration créée: ${fileName}`));
  
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
    console.log(chalk.yellow(`ℹ️ Vous pouvez éditer le fichier manuellement: ${filePath}`));
  }
}

// Lister les migrations existantes
function listMigrations() {
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log(chalk.yellow('⚠️ Aucun répertoire de migrations trouvé'));
    return;
  }
  
  const migrations = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  if (migrations.length === 0) {
    console.log(chalk.yellow('⚠️ Aucune migration trouvée'));
    return;
  }
  
  console.log(chalk.blue(`📋 ${migrations.length} migrations trouvées:`));
  
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
    
    console.log(chalk.green(`${index + 1}. [${formattedDate}] ${name}`));
  });
}

// Pousser les migrations vers la base de données
async function pushMigrations(dryRun = false) {
  // Vérifier si le mot de passe est disponible
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.error(chalk.red('❌ Variable SUPABASE_DB_PASSWORD non trouvée dans .env'));
    process.exit(1);
  }
  
  // Construire la commande
  const dbUrl = `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:5432/postgres`;
  let command = `supabase db push --db-url "${dbUrl}"`;
  
  if (dryRun) {
    command += ' --dry-run';
    console.log(chalk.yellow('🔍 Mode simulation activé (dry-run)'));
  }
  
  try {
    console.log(chalk.blue('🚀 Exécution des migrations...'));
    // Masquer le mot de passe dans l'affichage
    console.log(chalk.gray(command.replace(dbPassword, '********')));
    
    execSync(command, { stdio: 'inherit' });
    
    if (!dryRun) {
      console.log(chalk.green('✅ Migrations appliquées avec succès'));
    } else {
      console.log(chalk.yellow('⏭️ Simulation terminée (aucune modification appliquée)'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de l\'application des migrations'));
    process.exit(1);
  }
}

// Réinitialiser la base de données
async function resetDatabase(autoConfirm = false) {
  if (!autoConfirm) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.red('⚠️ ATTENTION: Cette action va réinitialiser TOUTES les données. Êtes-vous sûr?'),
        default: false
      }
    ]);
    
    if (!confirm) {
      console.log(chalk.blue('🛑 Opération annulée'));
      return;
    }
  }
  
  // Vérifier si le mot de passe est disponible
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.error(chalk.red('❌ Variable SUPABASE_DB_PASSWORD non trouvée dans .env'));
    process.exit(1);
  }
  
  // Construire la commande
  const dbUrl = `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:5432/postgres`;
  const command = `supabase db reset --db-url "${dbUrl}"`;
  
  try {
    console.log(chalk.red('🔄 Réinitialisation de la base de données...'));
    // Masquer le mot de passe dans l'affichage
    console.log(chalk.gray(command.replace(dbPassword, '********')));
    
    execSync(command, { stdio: 'inherit' });
    console.log(chalk.green('✅ Base de données réinitialisée avec succès'));
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la réinitialisation de la base de données'));
    process.exit(1);
  }
}

// Fonction principale
async function main() {
  console.log(chalk.blue('🔧 Outil de gestion des migrations Supabase'));
  console.log(chalk.blue('═'.repeat(50)));
  
  // Vérifier la CLI Supabase
  if (!checkSupabaseCLI()) {
    process.exit(1);
  }
  
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

main();