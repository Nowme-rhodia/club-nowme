#!/usr/bin/env node

import pkg from '@supabase/supabase-js';
const { createClient } = pkg;

import cmdPkg from 'commander';
const { program } = cmdPkg;

import dotenvPkg from 'dotenv';
const dotenv = dotenvPkg;

program
  .version('1.0.0')
  .description('Vérification des projets Supabase')
  .parse(process.argv);

// Projet actuel
const projects = {
  production: {
    id: 'dqfyuhwrjozoxadkccdj',
    url: 'https://dqfyuhwrjozoxadkccdj.supabase.co'
  }
  // Vous pouvez ajouter d'autres projets si nécessaire
};

async function checkProjects() {
  try {
    console.log('🔍 Vérification des projets Supabase');
    console.log('-----------------------------------');

    for (const [env, project] of Object.entries(projects)) {
      try {
        const supabase = createClient(
          project.url,
          process.env[`SUPABASE_${env.toUpperCase()}_SERVICE_KEY`] || process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error } = await supabase.from('_prisma_migrations').select('*').limit(1);
        
        if (error && error.code === '42P01') {
          console.log(`✓ ${env.padEnd(12)} (${project.id}) - Connexion OK`);
        } else if (error) {
          console.log(`⚠ ${env.padEnd(12)} (${project.id}) - Erreur: ${error.message}`);
        } else {
          console.log(`✓ ${env.padEnd(12)} (${project.id}) - Connexion OK`);
        }
      } catch (error) {
        console.log(`✗ ${env.padEnd(12)} (${project.id}) - Erreur de connexion`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    process.exit(1);
  }
}

checkProjects();