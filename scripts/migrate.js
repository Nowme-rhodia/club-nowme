#!/usr/bin/env node

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { program } from 'commander';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

program
  .version('1.0.0')
  .description('Script de migration Supabase pour Nowme')
  .option('-d, --direction <type>', 'Direction de la migration (up, down)', 'up')
  .option('-n, --dry-run', 'Simuler la migration sans l\'exécuter')
  .option('-v, --verbose', 'Afficher plus de détails')
  .parse(process.argv);

const options = program.opts();

// Charger les variables d'environnement
dotenv.config();

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

// Vérifier si le fichier .env.local existe avec les variables nécessaires
function checkEnvFile() {
  const envFiles = ['.env', '.env.local'];
  let dbPassword = process.env.SUPABASE_DB_PASSWORD;
  
  if (!dbPassword) {
    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf8');
        const match = content.match(/SUPABASE_DB_PASSWORD=(.+)/);
        if (match && match[1]) {
          dbPassword = match[1].trim();
          process.env.SUPABASE_DB_PASSWORD = dbPassword;
          console.log(chalk.green(`✅ Mot de passe DB trouvé dans ${envFile}`));
          break;
        }
      }
    }
  }
  
  if (!dbPassword) {
    console.error(chalk.red('❌ Variable SUPABASE_DB_PASSWORD non trouvée'));
    return false;
  }
  
  return true;
}

// Vérifier si le répertoire des migrations existe
function checkMigrationsDir() {
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error(chalk.red('❌ Répertoire des migrations non trouvé:'), migrationsDir);
    return false;
  }
  
  const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  if (migrations.length === 0) {
    console.warn(chalk.yellow('⚠️ Aucun fichier de migration trouvé'));
    return false;
  }
  
  console.log(chalk.green(`✅ ${migrations.length} fichiers de migration trouvés`));
  
  if (options.verbose) {
    migrations.sort().forEach(migration => {
      console.log(chalk.blue(`  - ${migration}`));
    });
  }
  
  return true;
}

async function runMigrations() {
  try {
    console.log(chalk.blue(`🚀 Démarrage des migrations pour le projet ${projectId}`));
    console.log(chalk.blue('═'.repeat(50)));
    
    // Vérifications préalables
    const cliInstalled = checkSupabaseCLI();
    const envOk = checkEnvFile();
    const migrationsOk = checkMigrationsDir();
    
    if (!cliInstalled || !envOk || !migrationsOk) {
      console.error(chalk.red('❌ Vérifications préalables échouées. Résolvez les problèmes ci-dessus.'));
      process.exit(1);
    }
    
    // Construire la commande de migration
    const dbPassword = process.env.SUPABASE_DB_PASSWORD;
    const dbUrl = `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:5432/postgres`;
    
    let command = `supabase db push --db-url "${dbUrl}"`;
    
    if (options.direction === 'down') {
      command += ' --dry-run'; // La CLI ne supporte pas nativement le rollback, donc on simule
      console.warn(chalk.yellow('⚠️ Le rollback n\'est pas directement supporté. Simulation uniquement.'));
    }
    
    if (options.dryRun) {
      command += ' --dry-run';
      console.log(chalk.yellow('🔍 Mode simulation activé (dry-run)'));
    }
    
    console.log(chalk.blue('\n🔧 Exécution de la commande:'));
    // Masquer le mot de passe dans l'affichage
    console.log(chalk.gray(command.replace(dbPassword, '********')));
    
    if (!options.dryRun) {
      console.log(chalk.blue('\n📋 Résultat:'));
      execSync(command, { stdio: 'inherit' });
      console.log(chalk.green('\n✅ Migrations terminées avec succès'));
    } else {
      console.log(chalk.yellow('\n⏭️ Simulation terminée (aucune modification appliquée)'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Erreur lors des migrations:'), error.message);
    process.exit(1);
  }
}

runMigrations();