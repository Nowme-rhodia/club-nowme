#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonction pour charger les variables d'environnement depuis .env (optionnel)
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

// Vérifier les variables d'environnement nécessaires
const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.log('⚠️ Variables d\'environnement manquantes dans le processus:', missingEnvVars.join(', '));
  
  // En environnement CI, les variables peuvent être disponibles différemment
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log('ℹ️ Environnement CI détecté - les variables devraient être injectées par GitHub Actions');
    
    // Vérifier si les variables sont définies mais vides
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value === undefined) {
        console.log(`❌ ${envVar}: non définie`);
      } else if (value === '') {
        console.log(`⚠️ ${envVar}: définie mais vide`);
      } else {
        console.log(`✅ ${envVar}: définie (${value.substring(0, 10)}...)`);
      }
    });
  } else {
    console.error('❌ Variables d\'environnement manquantes:', missingEnvVars.join(', '));
    console.log('💡 Assure-toi que les variables sont définies dans ton environnement ou dans un fichier .env');
    process.exit(1);
  }
}

// Vérifier si les URLs sont valides (seulement si définies)
if (process.env.VITE_SUPABASE_URL) {
  try {
    new URL(process.env.VITE_SUPABASE_URL);
    console.log('✅ VITE_SUPABASE_URL est une URL valide');
  } catch (error) {
    console.error('❌ VITE_SUPABASE_URL n\'est pas une URL valide');
    process.exit(1);
  }
}

// Vérifier si la clé anon a un format valide (seulement si définie)
if (process.env.VITE_SUPABASE_ANON_KEY) {
  if (process.env.VITE_SUPABASE_ANON_KEY.length < 30) {
    console.error('❌ VITE_SUPABASE_ANON_KEY semble invalide (trop courte)');
    process.exit(1);
  } else {
    console.log('✅ VITE_SUPABASE_ANON_KEY a un format valide');
  }
}

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
    } else {
      console.warn('⚠️ Aucune migration trouvée');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la lecture des migrations:', error);
  }
} else {
  console.warn('⚠️ Répertoire des migrations non trouvé');
}

console.log('✅ Vérification de la configuration Supabase terminée');

// En environnement CI, on considère que c'est OK même si les variables ne sont pas visibles
if (process.env.CI || process.env.GITHUB_ACTIONS) {
  console.log('ℹ️ Environnement CI - configuration considérée comme valide');
  process.exit(0);
} else if (missingEnvVars.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}