#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

program
  .version('1.0.0')
  .description('Vérification des projets Supabase')
  .option('-v, --verbose', 'Afficher plus de détails')
  .parse(process.argv);

const options = program.opts();

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
    console.log('═'.repeat(40));

    for (const [env, project] of Object.entries(projects)) {
      try {
        // Essayer d'abord avec la clé de service spécifique à l'environnement
        const serviceKey = process.env[`SUPABASE_${env.toUpperCase()}_SERVICE_KEY`];
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
        
        if (!serviceKey && !anonKey) {
          console.log(`⚠️ ${env.padEnd(12)} (${project.id}) - Pas de clé disponible`);
          continue;
        }
        
        const key = serviceKey || anonKey;
        const keyType = serviceKey ? 'SERVICE_ROLE' : 'ANON';
        
        if (options.verbose) {
          console.log(`ℹ️ ${env.padEnd(12)} - Utilisation de la clé ${keyType}`);
        }

        const supabase = createClient(project.url, key);

        // Test de connexion
        const { data, error } = await supabase.from('user_profiles').select('count');
        
        if (error && error.code === '42P01') {
          console.log(`✓ ${env.padEnd(12)} (${project.id}) - Connexion OK (table non trouvée)`);
        } else if (error) {
          console.log(`⚠️ ${env.padEnd(12)} (${project.id}) - Erreur: ${error.message}`);
        } else {
          console.log(`✓ ${env.padEnd(12)} (${project.id}) - Connexion OK`);
          
          if (options.verbose) {
            // Vérifier les fonctions Edge
            try {
              const { data: functions, error: fnError } = await supabase.functions.list();
              if (!fnError && functions) {
                console.log(`  ├─ 📦 ${functions.length} fonctions Edge trouvées`);
              }
            } catch (e) {
              console.log(`  ├─ ⚠️ Impossible de lister les fonctions Edge`);
            }
            
            // Vérifier le stockage
            try {
              const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
              if (!storageError && buckets) {
                console.log(`  └─ 🗂️ ${buckets.length} buckets de stockage trouvés`);
              }
            } catch (e) {
              console.log(`  └─ ⚠️ Impossible de lister les buckets de stockage`);
            }
          }
        }
      } catch (error) {
        console.log(`✗ ${env.padEnd(12)} (${project.id}) - Erreur de connexion: ${error.message}`);
      }
    }

    console.log('═'.repeat(40));
    console.log('✅ Vérification terminée');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
    process.exit(1);
  }
}

checkProjects();