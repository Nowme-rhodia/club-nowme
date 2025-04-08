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
  dev: 'hwpylnvoeayhztucxpdj',
  staging: 'uqoeutrolppjajpcvhiq',
  production: 'dctakpdkhcwsuaklzqmt'
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
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name;
        `
      });

    if (error) throw error;

    console.log('\nTables trouvées:');
    console.log('----------------');
    data.forEach(row => {
      console.log(`- ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    process.exit(1);
  }
}

checkTables();