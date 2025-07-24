-- Ce n'est pas du SQL mais un script Node.js modifié
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';
import dotenv from 'dotenv';

program
  .version('1.0.0')
  .description('Vérification des tables Supabase')
  .option('-e, --environment <type>', 'Environnement cible (production)', 'production')
  .parse(process.argv);

const options = program.opts();

// Charger les variables d'environnement
const envFile = `.env${options.environment === 'production' ? '' : '.' + options.environment}`;
dotenv.config({ path: envFile });

const projectId = 'dqfyuhwrjozoxadkccdj';

async function checkTables() {
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