#!/usr/bin/env node

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import { program } from 'commander';

program
  .version('1.0.0')
  .description('Script de migration Supabase pour Nowme')
  .option('-e, --environment <type>', 'Environnement cible (dev, staging, production)', 'dev')
  .option('-d, --direction <type>', 'Direction de la migration (up, down)', 'up')
  .parse(process.argv);

const options = program.opts();

// Charger les variables d'environnement
const envFile = `.env.${options.environment}`;
dotenv.config({ path: envFile });

const projectIds = {
  dev: 'hwpylnvoeayhztucxpdj',
  staging: 'uqoeutrolppjajpcvhiq',
  production: 'dctakpdkhcwsuaklzqmt'
};

const projectId = projectIds[options.environment];

if (!projectId) {
  console.error('Environnement invalide. Utilisez dev, staging, ou production');
  process.exit(1);
}

try {
  console.log(`🚀 Démarrage des migrations pour l'environnement ${options.environment}`);
  
  // Exécuter les migrations
  execSync(`supabase db push --db-url postgresql://postgres:[PASSWORD]@db.${projectId}.supabase.co:5432/postgres`, {
    stdio: 'inherit'
  });
  
  console.log('✅ Migrations terminées avec succès');
} catch (error) {
  console.error('❌ Erreur lors des migrations:', error.message);
  process.exit(1);
}