// scripts/setup-migration.js
// Script pour configurer l'environnement de migration

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration pour ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Créer le dossier migrations s'il n'existe pas
const migrationsDir = path.join(process.cwd(), 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
  console.log('✅ Dossier migrations créé');
}

// Créer le fichier .env s'il n'existe pas
const envPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  const envContent = `# Configuration Supabase
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-clé-service-role
# Ne partagez jamais ce fichier ou ces clés - ajoutez .env à votre .gitignore
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Fichier .env créé (à compléter avec vos informations)');
}

// Vérifier si les dépendances nécessaires sont installées
try {
  // Vérifier si les dépendances sont installées en vérifiant package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const deps = packageJson.dependencies || {};
  
  if (!deps['@supabase/supabase-js']) {
    console.log('📦 Installation de @supabase/supabase-js...');
    execSync('npm install @supabase/supabase-js', { stdio: 'inherit' });
  } else {
    console.log('✅ @supabase/supabase-js est déjà installé');
  }
  
  if (!deps['dotenv']) {
    console.log('📦 Installation de dotenv...');
    execSync('npm install dotenv', { stdio: 'inherit' });
  } else {
    console.log('✅ dotenv est déjà installé');
  }
} catch (e) {
  console.error('Erreur lors de la vérification des dépendances:', e);
}

// Mettre à jour package.json avec les scripts de migration
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Ajouter les scripts de migration s'ils n'existent pas déjà
  packageJson.scripts = packageJson.scripts || {};
  
  if (!packageJson.scripts['db:list']) {
    packageJson.scripts['db:list'] = 'node scripts/db-migrate.js --list';
  }
  
  if (!packageJson.scripts['db:create']) {
    packageJson.scripts['db:create'] = 'node scripts/db-migrate.js --create';
  }
  
  if (!packageJson.scripts['db:run']) {
    packageJson.scripts['db:run'] = 'node scripts/db-migrate.js --run';
  }
  
  if (!packageJson.scripts['db:push']) {
    packageJson.scripts['db:push'] = 'node scripts/db-migrate.js --push';
  }
  
  if (!packageJson.scripts['db:reset']) {
    packageJson.scripts['db:reset'] = 'node scripts/db-migrate.js --reset';
  }
  
  // Écrire le package.json mis à jour
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Scripts de migration ajoutés à package.json');
}

console.log('\n🚀 Configuration terminée!');
console.log('\nPour utiliser le système de migration:');
console.log('1. Complétez le fichier .env avec vos informations Supabase');
console.log('2. Utilisez les commandes suivantes:');
console.log('   - npm run db:list   - Liste toutes les migrations et leur statut');
console.log('   - npm run db:create nom_migration - Crée une nouvelle migration');
console.log('   - npm run db:run nom_fichier.sql  - Exécute une migration spécifique');
console.log('   - npm run db:push   - Exécute toutes les migrations en attente');
console.log('   - npm run db:reset  - Réinitialise la base de données (avec --confirm)');
console.log('\nExemple:');
console.log('npm run db:create add_users_table');
console.log('npm run db:push');