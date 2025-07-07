// scripts/check-supabase-config.js
const fs = require('fs');
const path = require('path');

console.log('Vérification de la configuration Supabase...');

// Vérifier les variables d'environnement nécessaires
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Variables d'environnement manquantes: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Vérifier si les URLs sont valides
try {
  new URL(process.env.SUPABASE_URL);
  console.log('✅ SUPABASE_URL est une URL valide');
} catch (error) {
  console.error('❌ SUPABASE_URL n\'est pas une URL valide');
  process.exit(1);
}

// Vérifier si la clé de service a un format valide (simple vérification de longueur)
if (process.env.SUPABASE_SERVICE_ROLE_KEY.length < 30) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY semble invalide (trop courte)');
  process.exit(1);
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

console.log('✅ Configuration Supabase valide');
console.log('✅ Vérification de la configuration Supabase terminée avec succès');
process.exit(0);