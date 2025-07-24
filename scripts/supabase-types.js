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
  .description('Générateur de types TypeScript pour Supabase')
  .option('-o, --output <path>', 'Chemin du fichier de sortie', './src/types/supabase.ts')
  .option('-p, --project <id>', 'ID du projet Supabase', 'dqfyuhwrjozoxadkccdj')
  .option('-v, --verbose', 'Afficher plus de détails')
  .parse(process.argv);

const options = program.opts();

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

// Vérifier si le fichier .env existe avec les variables nécessaires
function checkEnvFile() {
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  
  if (!dbPassword) {
    console.error(chalk.red('❌ Variable SUPABASE_DB_PASSWORD non trouvée dans .env'));
    return false;
  }
  
  return true;
}

// Générer les types TypeScript
async function generateTypes() {
  try {
    console.log(chalk.blue('🔧 Génération des types TypeScript pour Supabase'));
    console.log(chalk.blue('═'.repeat(50)));
    
    // Vérifications préalables
    const cliInstalled = checkSupabaseCLI();
    const envOk = checkEnvFile();
    
    if (!cliInstalled || !envOk) {
      console.error(chalk.red('❌ Vérifications préalables échouées. Résolvez les problèmes ci-dessus.'));
      process.exit(1);
    }
    
    // Créer le répertoire de sortie s'il n'existe pas
    const outputDir = path.dirname(options.output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(chalk.blue(`📁 Répertoire créé: ${outputDir}`));
    }
    
    // Construire la commande de génération de types
    const dbPassword = process.env.SUPABASE_DB_PASSWORD;
    const dbUrl = `postgresql://postgres:${dbPassword}@db.${options.project}.supabase.co:5432/postgres`;
    
    const command = `supabase gen types typescript --db-url "${dbUrl}" --output "${options.output}"`;
    
    console.log(chalk.blue('\n🔧 Exécution de la commande:'));
    // Masquer le mot de passe dans l'affichage
    console.log(chalk.gray(command.replace(dbPassword, '********')));
    
    console.log(chalk.blue('\n📋 Résultat:'));
    execSync(command, { stdio: 'inherit' });
    
    // Vérifier si le fichier a été généré
    if (fs.existsSync(options.output)) {
      const stats = fs.statSync(options.output);
      const fileSizeKB = (stats.size / 1024).toFixed(2);
      console.log(chalk.green(`\n✅ Types générés avec succès: ${options.output} (${fileSizeKB} KB)`));
      
      if (options.verbose) {
        // Afficher un aperçu du fichier généré
        const content = fs.readFileSync(options.output, 'utf8');
        const lines = content.split('\n');
        const previewLines = lines.slice(0, 20); // Afficher les 20 premières lignes
        
        console.log(chalk.blue('\n📄 Aperçu du fichier généré:'));
        console.log(chalk.gray(previewLines.join('\n')));
        
        if (lines.length > 20) {
          console.log(chalk.gray(`... et ${lines.length - 20} lignes supplémentaires`));
        }
      }
      
      // Suggérer comment utiliser les types
      console.log(chalk.blue('\n📚 Comment utiliser ces types:'));
      console.log(chalk.yellow(`
import { createClient } from '@supabase/supabase-js'
import { Database } from '${options.output.replace('./src/', './').replace('.ts', '')}'

const supabase = createClient<Database>(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// Les types sont maintenant disponibles:
const { data, error } = await supabase
  .from('your_table')
  .select('*')
// data est maintenant typé!
`));
      
    } else {
      console.error(chalk.red(`\n❌ Erreur: Le fichier ${options.output} n'a pas été généré`));
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Erreur lors de la génération des types:'), error.message);
    process.exit(1);
  }
}

generateTypes();