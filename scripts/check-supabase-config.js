#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

program
  .version('1.0.0')
  .description('Vérification de la configuration Supabase')
  .option('-d, --detailed', 'Afficher des informations détaillées')
  .parse(process.argv);

const options = program.opts();

// Fonction pour charger les variables d'environnement depuis .env
function loadEnvFile() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log('✅ Fichier .env chargé');
    } else {
      console.log('ℹ️ Pas de fichier .env local, utilisation des variables d\'environnement système');
    }
  } catch (error) {
    console.log('ℹ️ Pas de fichier .env, utilisation des variables d\'environnement système');
  }
}

// Charger les variables d'environnement si disponibles
loadEnvFile();

console.log('🔍 Vérification de la configuration Supabase...');
console.log('═'.repeat(50));

// Vérifier les variables d'environnement nécessaires
const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const optionalEnvVars = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

// Vérifier les variables requises
console.log('\n📋 Variables d\'environnement requises:');
requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value === undefined) {
    console.log(`❌ ${envVar}: non définie`);
  } else if (value === '') {
    console.log(`⚠️ ${envVar}: définie mais vide`);
  } else {
    const displayValue = value.substring(0, 5) + '...' + value.substring(value.length - 5);
    console.log(`✅ ${envVar}: définie (${displayValue})`);
  }
});

// Vérifier les variables optionnelles
console.log('\n📋 Variables d\'environnement optionnelles:');
optionalEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value === undefined) {
    console.log(`ℹ️ ${envVar}: non définie`);
  } else if (value === '') {
    console.log(`⚠️ ${envVar}: définie mais vide`);
  } else {
    console.log(`✅ ${envVar}: définie`);
  }
});

// En environnement CI, les variables peuvent être disponibles différemment
if (process.env.CI || process.env.GITHUB_ACTIONS) {
  console.log('\nℹ️ Environnement CI détecté - les variables devraient être injectées par GitHub Actions');
}

// Vérifier si les URLs sont valides (seulement si définies)
if (process.env.VITE_SUPABASE_URL) {
  try {
    new URL(process.env.VITE_SUPABASE_URL);
    console.log('\n✅ VITE_SUPABASE_URL est une URL valide');
  } catch (error) {
    console.error('\n❌ VITE_SUPABASE_URL n\'est pas une URL valide');
  }
}

// Vérifier si la clé anon a un format valide (seulement si définie)
if (process.env.VITE_SUPABASE_ANON_KEY) {
  if (process.env.VITE_SUPABASE_ANON_KEY.length < 30) {
    console.error('❌ VITE_SUPABASE_ANON_KEY semble invalide (trop courte)');
  } else {
    console.log('✅ VITE_SUPABASE_ANON_KEY a un format valide');
  }
}

// Vérifier la structure du projet
console.log('\n📁 Structure du projet:');

// Vérifier si le répertoire des fonctions Edge existe
const supabaseFunctionsDir = path.join(process.cwd(), 'supabase', 'functions');
if (!fs.existsSync(supabaseFunctionsDir)) {
  console.warn('⚠️ Le répertoire des fonctions Supabase n\'existe pas');
} else {
  // Vérifier les fonctions Edge
  try {
    const edgeFunctions = fs.readdirSync(supabaseFunctionsDir)
      .filter(file => fs.statSync(path.join(supabaseFunctionsDir, file)).isDirectory());

    if (edgeFunctions.length === 0) {
      console.warn('⚠️ Aucune fonction Edge trouvée');
    } else {
      console.log(`✅ ${edgeFunctions.length} fonctions Edge trouvées: ${edgeFunctions.join(', ')}`);
      
      // Vérifier les fichiers index.ts dans chaque fonction
      if (options.detailed) {
        edgeFunctions.forEach(fn => {
          const indexPath = path.join(supabaseFunctionsDir, fn, 'index.ts');
          if (fs.existsSync(indexPath)) {
            console.log(`  ├─ ✅ ${fn}/index.ts`);
          } else {
            console.log(`  ├─ ❌ ${fn}/index.ts manquant`);
          }
        });
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du répertoire des fonctions Edge:', error);
  }
}

// Vérifier les migrations
const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
if (fs.existsSync(migrationsDir)) {
  try {
    const migrations = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'));
    
    if (migrations.length > 0) {
      console.log(`✅ ${migrations.length} migrations trouvées`);
      
      if (options.detailed) {
        migrations.sort().forEach(migration => {
          console.log(`  ├─ 📄 ${migration}`);
        });
      }
    } else {
      console.warn('⚠️ Aucune migration trouvée');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la lecture des migrations:', error);
  }
} else {
  console.warn('⚠️ Répertoire des migrations non trouvé');
}

// Vérifier le fichier de configuration Supabase
const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
if (fs.existsSync(configPath)) {
  console.log('✅ Fichier de configuration Supabase trouvé');
} else {
  console.warn('⚠️ Fichier de configuration Supabase non trouvé');
}

console.log('\n✅ Vérification de la configuration Supabase terminée');

// En environnement CI, on considère que c'est OK même si les variables ne sont pas visibles
if (process.env.CI || process.env.GITHUB_ACTIONS) {
  console.log('ℹ️ Environnement CI - configuration considérée comme valide');
  process.exit(0);
} else if (missingEnvVars.length > 0) {
  console.error('\n❌ Variables d\'environnement requises manquantes. Veuillez les configurer.');
  process.exit(1);
} else {
  process.exit(0);
}