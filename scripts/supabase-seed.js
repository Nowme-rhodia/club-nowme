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
  .description('Outil de gestion des données de test (seed) pour Supabase')
  .option('-c, --create <name>', 'Créer un nouveau fichier seed')
  .option('-r, --run <file>', 'Exécuter un fichier seed spécifique')
  .option('-a, --run-all', 'Exécuter tous les fichiers seed')
  .option('-l, --list', 'Lister les fichiers seed disponibles')
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

// Vérifier si le répertoire des seeds existe, le créer si nécessaire
function ensureSeedDir() {
  const seedDir = path.join(process.cwd(), 'supabase/seed');
  
  if (!fs.existsSync(path.join(process.cwd(), 'supabase'))) {
    fs.mkdirSync(path.join(process.cwd(), 'supabase'));
  }
  
  if (!fs.existsSync(seedDir)) {
    fs.mkdirSync(seedDir);
    console.log(chalk.blue('📁 Répertoire des seeds créé'));
  }
  
  return seedDir;
}

// Créer un nouveau fichier seed
async function createSeed(name) {
  const seedDir = ensureSeedDir();
  
  // Formater le nom de fichier
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);
  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const fileName = `${timestamp}_${safeName}.sql`;
  const filePath = path.join(seedDir, fileName);
  
  // Créer le fichier avec un template
  const template = `-- Seed: ${name}
-- Created at: ${new Date().toISOString()}

-- Désactiver temporairement les déclencheurs pour l'insertion en masse
-- SET session_replication_role = 'replica';

BEGIN;

-- Votre SQL d'insertion de données ici
-- Exemple:
-- INSERT INTO public.users (name, email) VALUES
--   ('Utilisateur Test 1', 'test1@example.com'),
--   ('Utilisateur Test 2', 'test2@example.com');

COMMIT;

-- Réactiver les déclencheurs
-- SET session_replication_role = 'origin';
`;

  fs.writeFileSync(filePath, template);
  console.log(chalk.green(`✅ Fichier seed créé: ${fileName}`));
  
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

// Lister les fichiers seed existants
function listSeeds() {
  const seedDir = path.join(process.cwd(), 'supabase/seed');
  
  if (!fs.existsSync(seedDir)) {
    console.log(chalk.yellow('⚠️ Aucun répertoire de seeds trouvé'));
    return [];
  }
  
  const seeds = fs.readdirSync(seedDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  if (seeds.length === 0) {
    console.log(chalk.yellow('⚠️ Aucun fichier seed trouvé'));
    return [];
  }
  
  console.log(chalk.blue(`📋 ${seeds.length} fichiers seed trouvés:`));
  
  seeds.forEach((seed, index) => {
    // Extraire la date et le nom
    const timestamp = seed.substring(0, 14);
    const name = seed.substring(15).replace('.sql', '').replace(/_/g, ' ');
    
    // Formater la date
    const year = timestamp.substring(0, 4);
    const month = timestamp.substring(4, 6);
    const day = timestamp.substring(6, 8);
    const hour = timestamp.substring(8, 10);
    const minute = timestamp.substring(10, 12);
    
    const formattedDate = `${year}-${month}-${day} ${hour}:${minute}`;
    
    console.log(chalk.green(`${index + 1}. [${formattedDate}] ${name}`));
  });
  
  return seeds;
}

// Exécuter un fichier seed
async function runSeed(fileName, dryRun = false) {
  // Vérifier si le mot de passe est disponible
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.error(chalk.red('❌ Variable SUPABASE_DB_PASSWORD non trouvée dans .env'));
    process.exit(1);
  }
  
  const seedDir = path.join(process.cwd(), 'supabase/seed');
  const filePath = path.join(seedDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`❌ Fichier seed non trouvé: ${fileName}`));
    return false;
  }
  
  // Construire la commande
  const dbUrl = `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:5432/postgres`;
  let command = `psql "${dbUrl}" -f "${filePath}"`;
  
  if (dryRun) {
    console.log(chalk.yellow(`🔍 Mode simulation pour: ${fileName}`));
    console.log(chalk.gray(command.replace(dbPassword, '********')));
    return true;
  }
  
  try {
    console.log(chalk.blue(`🌱 Exécution du seed: ${fileName}`));
    // Masquer le mot de passe dans l'affichage
    console.log(chalk.gray(command.replace(dbPassword, '********')));
    
    execSync(command, { stdio: 'inherit' });
    console.log(chalk.green(`✅ Seed exécuté avec succès: ${fileName}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de l'exécution du seed: ${fileName}`));
    console.error(error.message);
    return false;
  }
}

// Exécuter tous les fichiers seed
async function runAllSeeds(dryRun = false, autoConfirm = false) {
  const seeds = listSeeds();
  
  if (seeds.length === 0) {
    return;
  }
  
  if (!autoConfirm) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Voulez-vous exécuter tous les ${seeds.length} fichiers seed?`,
        default: false
      }
    ]);
    
    if (!confirm) {
      console.log(chalk.blue('🛑 Opération annulée'));
      return;
    }
  }
  
  console.log(chalk.blue(`🚀 Exécution de ${seeds.length} fichiers seed...`));
  
  let successCount = 0;
  let failCount = 0;
  
  for (const seed of seeds) {
    const success = await runSeed(seed, dryRun);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  if (!dryRun) {
    console.log(chalk.blue('═'.repeat(50)));
    console.log(chalk.green(`✅ ${successCount} seeds exécutés avec succès`));
    
    if (failCount > 0) {
      console.log(chalk.red(`❌ ${failCount} seeds ont échoué`));
    }
  } else {
    console.log(chalk.yellow('⏭️ Simulation terminée (aucune modification appliquée)'));
  }
}

// Fonction principale
async function main() {
  console.log(chalk.blue('🌱 Outil de gestion des données de test Supabase'));
  console.log(chalk.blue('═'.repeat(50)));
  
  // Vérifier la CLI Supabase
  if (!checkSupabaseCLI()) {
    process.exit(1);
  }
  
  // Exécuter la commande appropriée
  if (options.create) {
    await createSeed(options.create);
  } else if (options.list) {
    listSeeds();
  } else if (options.run) {
    await runSeed(options.run, options.dryRun);
  } else if (options.runAll) {
    await runAllSeeds(options.dryRun, options.yes);
  } else {
    program.help();
  }
}

main();