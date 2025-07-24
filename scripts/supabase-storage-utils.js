import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { program } from 'commander';
import chalk from 'chalk';
import mime from 'mime-types';

// Charger les variables d'environnement
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

program
  .version('1.0.0')
  .description('Utilitaires pour gérer le stockage Supabase');

// Commande pour lister les buckets
program
  .command('list-buckets')
  .description('Lister tous les buckets de stockage')
  .action(async () => {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) throw error;
      
      console.log(chalk.blue('📦 Buckets de stockage:'));
      console.log(chalk.blue('═'.repeat(50)));
      
      if (data.length === 0) {
        console.log(chalk.yellow('Aucun bucket trouvé.'));
      } else {
        data.forEach(bucket => {
          console.log(chalk.green(`• ${bucket.name}`));
          console.log(chalk.gray(`  - ID: ${bucket.id}`));
          console.log(chalk.gray(`  - Public: ${bucket.public ? 'Oui' : 'Non'}`));
          console.log(chalk.gray(`  - Créé: ${new Date(bucket.created_at).toLocaleString()}`));
          console.log(chalk.gray('  ───────────────────'));
        });
      }
    } catch (error) {
      console.error(chalk.red('❌ Erreur:'), error.message);
    }
  });

// Commande pour lister les fichiers dans un bucket
program
  .command('list-files')
  .description('Lister les fichiers dans un bucket')
  .requiredOption('-b, --bucket <name>', 'Nom du bucket')
  .option('-p, --path <path>', 'Chemin dans le bucket', '')
  .action(async (options) => {
    try {
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .list(options.path);
      
      if (error) throw error;
      
      console.log(chalk.blue(`📂 Fichiers dans ${options.bucket}${options.path ? '/' + options.path : ''}:`));
      console.log(chalk.blue('═'.repeat(50)));
      
      if (data.length === 0) {
        console.log(chalk.yellow('Aucun fichier trouvé.'));
      } else {
        // Séparer les dossiers et les fichiers
        const folders = data.filter(item => item.id === null);
        const files = data.filter(item => item.id !== null);
        
        // Afficher les dossiers
        if (folders.length > 0) {
          console.log(chalk.cyan('📁 Dossiers:'));
          folders.forEach(folder => {
            console.log(chalk.cyan(`  • ${folder.name}/`));
          });
          console.log();
        }
        
        // Afficher les fichiers
        if (files.length > 0) {
          console.log(chalk.green('📄 Fichiers:'));
          files.forEach(file => {
            const sizeKB = (file.metadata.size / 1024).toFixed(2);
            console.log(chalk.green(`  • ${file.name}`));
            console.log(chalk.gray(`    - Taille: ${sizeKB} KB`));
            console.log(chalk.gray(`    - Type: ${file.metadata.mimetype}`));
            console.log(chalk.gray(`    - Dernière modification: ${new Date(file.metadata.lastModified).toLocaleString()}`));
          });
        }
      }
    } catch (error) {
      console.error(chalk.red('❌ Erreur:'), error.message);
    }
  });

// Commande pour télécharger un fichier
program
  .command('download')
  .description('Télécharger un fichier depuis un bucket')
  .requiredOption('-b, --bucket <name>', 'Nom du bucket')
  .requiredOption('-f, --file <path>', 'Chemin du fichier dans le bucket')
  .option('-o, --output <path>', 'Chemin de sortie local', './')
  .action(async (options) => {
    try {
      console.log(chalk.blue(`⏬ Téléchargement de ${options.file} depuis ${options.bucket}...`));
      
      // Télécharger le fichier
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .download(options.file);
      
      if (error) throw error;
      
      // Déterminer le chemin de sortie
      const fileName = path.basename(options.file);
      const outputPath = path.join(options.output, fileName);
      
      // Écrire le fichier
      const buffer = await data.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(buffer));
      
      console.log(chalk.green(`✅ Fichier téléchargé avec succès: ${outputPath}`));
    } catch (error) {
      console.error(chalk.red('❌ Erreur:'), error.message);
    }
  });

// Commande pour téléverser un fichier
program
  .command('upload')
  .description('Téléverser un fichier vers un bucket')
  .requiredOption('-b, --bucket <name>', 'Nom du bucket')
  .requiredOption('-f, --file <path>', 'Chemin du fichier local')
  .option('-p, --path <path>', 'Chemin de destination dans le bucket', '')
  .option('--public', 'Rendre le fichier public', false)
  .action(async (options) => {
    try {
      if (!fs.existsSync(options.file)) {
        throw new Error(`Le fichier ${options.file} n'existe pas.`);
      }
      
      const fileName = path.basename(options.file);
      const destinationPath = options.path ? 
        path.join(options.path, fileName).replace(/\\/g, '/') : 
        fileName;
      
      console.log(chalk.blue(`⏫ Téléversement de ${options.file} vers ${options.bucket}/${destinationPath}...`));
      
      // Lire le fichier
      const fileBuffer = fs.readFileSync(options.file);
      const contentType = mime.lookup(options.file) || 'application/octet-stream';
      
      // Téléverser le fichier
      const { data, error } = await supabase.storage
        .from(options.bucket)
        .upload(destinationPath, fileBuffer, {
          contentType,
          upsert: true,
          cacheControl: '3600'
        });
      
      if (error) throw error;
      
      console.log(chalk.green(`✅ Fichier téléversé avec succès!`));
      
      // Si l'option public est activée, obtenir l'URL publique
      if (options.public) {
        const { data: urlData } = await supabase.storage
          .from(options.bucket)
          .getPublicUrl(destinationPath);
        
        console.log(chalk.green(`🔗 URL publique: ${urlData.publicUrl}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Erreur:'), error.message);
    }
  });

// Commande pour supprimer un fichier
program
  .command('delete')
  .description('Supprimer un fichier ou un dossier')
  .requiredOption('-b, --bucket <name>', 'Nom du bucket')
  .requiredOption('-p, --path <path>', 'Chemin du fichier ou dossier à supprimer')
  .option('--recursive', 'Supprimer récursivement (pour les dossiers)', false)
  .action(async (options) => {
    try {
      if (options.recursive) {
        console.log(chalk.yellow(`⚠️ Suppression récursive de ${options.path} dans ${options.bucket}...`));
        
        // Lister tous les fichiers dans le dossier
        const { data: files, error: listError } = await supabase.storage
          .from(options.bucket)
          .list(options.path);
        
        if (listError) throw listError;
        
        // Construire les chemins complets pour chaque fichier
        const filePaths = files
          .filter(file => file.id !== null) // Exclure les dossiers
          .map(file => `${options.path}/${file.name}`);
        
        if (filePaths.length === 0) {
          console.log(chalk.yellow('Aucun fichier à supprimer.'));
          return;
        }
        
        console.log(chalk.yellow(`Suppression de ${filePaths.length} fichiers...`));
        
        // Supprimer tous les fichiers
        const { data, error } = await supabase.storage
          .from(options.bucket)
          .remove(filePaths);
        
        if (error) throw error;
        
        console.log(chalk.green(`✅ ${filePaths.length} fichiers supprimés avec succès!`));
      } else {
        console.log(chalk.yellow(`⚠️ Suppression de ${options.path} dans ${options.bucket}...`));
        
        // Supprimer un seul fichier
        const { data, error } = await supabase.storage
          .from(options.bucket)
          .remove([options.path]);
        
        if (error) throw error;
        
        console.log(chalk.green(`✅ Fichier supprimé avec succès!`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Erreur:'), error.message);
    }
  });

// Commande pour créer un bucket
program
  .command('create-bucket')
  .description('Créer un nouveau bucket de stockage')
  .requiredOption('-n, --name <name>', 'Nom du bucket')
  .option('--public', 'Rendre le bucket public', false)
  .action(async (options) => {
    try {
      console.log(chalk.blue(`🆕 Création du bucket ${options.name}...`));
      
      const { data, error } = await supabase.storage.createBucket(options.name, {
        public: options.public
      });
      
      if (error) throw error;
      
      console.log(chalk.green(`✅ Bucket ${options.name} créé avec succès!`));
      console.log(chalk.gray(`Public: ${options.public ? 'Oui' : 'Non'}`));
    } catch (error) {
      console.error(chalk.red('❌ Erreur:'), error.message);
    }
  });

program.parse(process.argv);

// Si aucune commande n'est spécifiée, afficher l'aide
if (!process.argv.slice(2).length) {
  program.outputHelp();
}