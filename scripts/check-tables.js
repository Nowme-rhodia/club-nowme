#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';
import dotenv from 'dotenv';

program
  .version('1.0.0')
  .description('Vérification des tables Supabase')
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

async function checkTables() {
  const projectId = projectIds[options.environment];
  
  if (!projectId) {
    console.error('Environnement invalide. Utilisez dev, staging, ou production');
    process.exit(1);
  }

  try {
    console.log(`🔍 Vérification des tables pour l'environnement ${options.environment}`);
    
    const supabase = createClient(
      `https://${projectId}.supabase.co`,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erreur:', error.message);
    } else {
      console.log('✅ Tables accessibles');
      console.log(`📊 Connexion réussie`);
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    process.exit(1);
  }
}

checkTables();