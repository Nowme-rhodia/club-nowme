#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';
import dotenv from 'dotenv';

program
  .version('1.0.0')
  .description('Vérification des tables Supabase')
  .parse(process.argv);

// Charger les variables d'environnement
dotenv.config();

const projectId = 'dqfyuhwrjozoxadkccdj';

async function checkTables() {
  try {
    console.log(`🔍 Vérification des tables pour le projet ${projectId}`);
    
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