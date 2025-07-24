#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

program
  .version('1.0.0')
  .description('Utilitaire de sauvegarde pour Supabase')
  .option('-o, --output <dir>', 'Répertoire de sortie pour les sauvegardes', './backups')
  .option('-s, --schema <schema>', 'Schéma spécifique à sauvegarder (par défaut: tous)')
  .option('-t, --table <table>', 'Table spécifique à sauvegarder (nécessite --schema)')
  .option('-d, --data-only', 'Sauvegarder uniquement les données (sans structure)')
  .option('-S, --structure-only', 'Sauvegarder uniquement la structure (sans données)')
  .option('-c, --compress', 'Compresser la sauvegarde en format gzip')
  .parse(process.argv);

const options = program.opts();

// Vérifier si pg_dump est installé
function checkPgDump() {
  try {
    const version = execSync('pg_dump --version', { stdio: 'pipe' }).toString().trim();
    console.log(chalk.green(`✅ pg_dump détecté: ${version}`));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ pg_dump non trouvé. Veuillez installer PostgreSQL CLI tools.'));
    return false;
  }
}

// Créer le répertoire de sauvegarde s'il n'existe pas
function ensureBackupDir() {
  const backupDir = path.resolve(process.cwd(), options.output);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(chalk.blue(`📁 Répertoire de sauvegarde créé: ${backupDir}`));
  }
  
  return backupDir;
}

// Générer un nom de fichier pour la sauvegarde
function generateBackupFilename() {
  const date = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
  let filename = `supabase_backup_${date}`;
  
  if (options.schema) {
    filename += `_${options.schema}`;
    
    if (options.table) {
      filename += `_${options.table}`;
    }
  }
  
  if (options.dataOnly) {
    filename += '_data-only';
  } else if (options.structureOnly) {
    filename += '_structure-only';
  }
  
  filename += '.sql';
  
  if (options.compress) {
    filename += '.gz';
  }
  
  return filename;
}

// Effectuer la sauvegarde
async function performBackup() {
  try {
    console.log(chalk.blue('💾 Démarrage de la sauvegarde Supabase'));
    console.log(chalk.blue('═'.repeat(50)));
    
    // Vérifications préalables
    if (!checkPgDump()) {
      process.exit(1);
    }
    
    // Vérifier les variables d'environnement
    const dbPassword = process.env.SUPABASE_DB_PASSWORD;
    const projectId = process.env.SUPABASE_PROJECT_ID || 'dqfyuhwrjozoxadkccdj';
    
    if (!dbPassword) {
      console.error(chalk.red('❌ Variable SUPABASE_DB_PASSWORD non trouvée dans .env'));
      process.exit(1);
    }
    
    // Préparer le répertoire et le nom de fichier
    const backupDir = ensureBackupDir();
    const filename = generateBackupFilename();
    const backupPath = path.join(backupDir, filename);
    
    // Construire la commande pg_dump
    const dbUrl = `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:5432/postgres`;
    let command = `pg_dump "${dbUrl}"`;
    
    // Ajouter les options
    if (options.schema) {
      command += ` --schema=${options.schema}`;
      
      if (options.table) {
        command += ` --table=${options.schema}.${options.table}`;
      }
    }
    
    if (options.dataOnly) {
      command += ' --data-only';
    } else if (options.structureOnly) {
      command += ' --schema-only';
    }
    
    // Gérer la compression
    if (options.compress) {
      command += ` | gzip > "${backupPath}"`;
    } else {
      command += ` --file="${backupPath}"`;
    }
    
    console.log(chalk.blue('🔧 Exécution de la commande:'));
    // Masquer le mot de passe dans l'affichage
    console.log(chalk.gray(command.replace(dbPassword, '********')));
    
    console.log(chalk.blue('\n⏳ Sauvegarde en cours...'));
    execSync(command, { stdio: 'inherit' });
    
    // Vérifier si le fichier a été créé
    if (fs.existsSync(backupPath)) {
      const stats = fs.statSync(backupPath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(chalk.green(`\n✅ Sauvegarde terminée: ${backupPath} (${fileSizeMB} MB)`));
      
      // Afficher des informations sur la restauration
      console.log(chalk.blue('\n📋 Pour restaurer cette sauvegarde:'));
      
      if (options.compress) {
        console.log(chalk.yellow(`gunzip -c "${backupPath}" | psql "postgresql://postgres:PASSWORD@db.${projectId}.supabase.co:5432/postgres"`));
      } else {
        console.log(chalk.yellow(`psql "postgresql://postgres:PASSWORD@db.${projectId}.supabase.co:5432/postgres" -f "${backupPath}"`));
      }
    } else {
      console.error(chalk.red(`\n❌ Erreur: Le fichier ${backupPath} n'a pas été créé`));
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Erreur lors de la sauvegarde:'), error.message);
    process.exit(1);
  }
}

performBackup();