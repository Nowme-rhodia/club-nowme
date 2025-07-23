#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

program
  .version('1.0.0')
  .description('Script de migration Supabase pour Nowme')
  .option('-e, --environment <type>', 'Environnement cible (dev, staging, production)', 'dev')
  .parse(process.argv);

const options = program.opts();

// Charger les variables d'environnement
const envFile = `.env.${options.environment}`;
dotenv.config({ path: envFile });

const projectIds = {
  dev: 'dqfyuhwrjozoxadkccdj',
  staging: 'dqfyuhwrjozoxadkccdj',
  production: 'dqfyuhwrjozoxadkccdj'
};

async function runMigrations() {
  const projectId = projectIds[options.environment];
  
  if (!projectId) {
    console.error('Environnement invalide. Utilisez dev, staging, ou production');
    process.exit(1);
  }

  try {
    console.log(`🚀 Démarrage des migrations pour l'environnement ${options.environment}`);
    
    // Lire les fichiers de migration
    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql'));

    // Trier les fichiers par nom (qui contient la date)
    sqlFiles.sort();

    // Créer le client Supabase
    const supabase = createClient(
      `https://${projectId}.supabase.co`,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Exécuter chaque migration
    for (const file of sqlFiles) {
      console.log(`📦 Exécution de la migration: ${file}`);
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        throw new Error(`Erreur lors de l'exécution de ${file}: ${error.message}`);
      }
    }

    console.log('✅ Migrations terminées avec succès');
  } catch (error) {
    console.error('❌ Erreur lors des migrations:', error.message);
    process.exit(1);
  }
}

runMigrations();