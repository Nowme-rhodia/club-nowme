// migrate.js (à la racine du projet)
import { Command } from 'commander';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Obtenir le répertoire actuel en utilisant ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Dossier des migrations
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Configurer Commander pour traiter les options avec --
const program = new Command();

program
  .option('--create', 'Crée un nouveau fichier de migration')
  .option('--list', 'Liste toutes les migrations')
  .option('--push', 'Applique les migrations non exécutées')
  .option('--reset', 'Réinitialise la base de données')
  .parse(process.argv);

const options = program.opts();

// Fonction principale
async function main() {
  // Créer le dossier migrations s'il n'existe pas
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  }

  if (options.create) {
    await createMigration();
  } else if (options.list) {
    await listMigrations();
  } else if (options.push) {
    await pushMigrations();
  } else if (options.reset) {
    await resetDatabase();
  } else {
    showHelp();
  }
}

// Afficher l'aide
function showHelp() {
  console.log(`
Migration CLI pour StackBlitz

Options disponibles:
  --create     - Crée un nouveau fichier de migration
  --list       - Liste toutes les migrations
  --push       - Applique les migrations non exécutées
  --reset      - Réinitialise la base de données (ATTENTION: supprime toutes les données)
  `);
}

// Créer une nouvelle migration
async function createMigration() {
  const name = program.args[0];
  
  if (!name) {
    console.error('Erreur: Nom de migration requis');
    console.log('Exemple: npm run db:create nom_de_migration');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const fileName = `${timestamp}_${name}.sql`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);

  // Créer le fichier de migration
  fs.writeFileSync(filePath, `-- Migration: ${name}\n-- Created at: ${new Date().toISOString()}\n\n-- Votre SQL ici\n`);
  
  console.log(`Migration créée: ${fileName}`);
}

// Lister toutes les migrations
async function listMigrations() {
  console.log('Migrations disponibles:');
  
  // Lire les fichiers de migration
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (files.length === 0) {
    console.log('Aucune migration trouvée');
    return;
  }
  
  // Afficher les migrations
  files.forEach(file => {
    console.log(`- ${file}`);
  });
  
  // Afficher les instructions pour StackBlitz
  console.log('\nPour appliquer ces migrations:');
  console.log('1. Copiez le contenu SQL des fichiers');
  console.log('2. Collez-le dans l\'éditeur SQL de Supabase');
  console.log('3. Exécutez les requêtes dans l\'ordre');
}

// Appliquer les migrations
async function pushMigrations() {
  console.log('Dans StackBlitz, les migrations doivent être appliquées manuellement:');
  console.log('1. Exécutez "npm run db:list" pour voir les migrations disponibles');
  console.log('2. Copiez le contenu des fichiers SQL');
  console.log('3. Collez-le dans l\'éditeur SQL de Supabase');
  console.log('4. Exécutez les requêtes dans l\'ordre');
}

// Réinitialiser la base de données
async function resetDatabase() {
  console.log('ATTENTION: Cette opération supprimera toutes les données!');
  console.log('Dans StackBlitz, vous devez réinitialiser manuellement:');
  console.log('1. Accédez à l\'interface web de Supabase');
  console.log('2. Utilisez l\'option "Database" > "Reset" ou exécutez des requêtes DROP manuellement');
}

// Exécuter la fonction principale
main().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});

// Exporter la fonction principale pour permettre l'importation
export default main;