#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';
import fs from 'fs/promises';
import path from 'path';

program
  .version('1.0.0')
  .description('Script de migration Supabase pour Nowme')
  .option('-e, --environment <type>', 'Environnement cible (dev, staging, production)', 'dev')
  .parse(process.argv);

const options = program.opts();

// Configuration des projets - CORRIGÉ
const projectConfig = {
  dev: {
    id: 'dqfyuhwrjozoxadkccdj',
    url: process.env.VITE_SUPABASE_URL || 'https://dqfyuhwrjozoxadkccdj.supabase.co'
  },
  staging: {
    id: 'dqfyuhwrjozoxadkccdj',
    url: process.env.VITE_SUPABASE_URL || 'https://dqfyuhwrjozoxadkccdj.supabase.co'
  },
  production: {
    id: 'dqfyuhwrjozoxadkccdj',
    url: process.env.VITE_SUPABASE_URL || 'https://dqfyuhwrjozoxadkccdj.supabase.co'
  }
};

async function runMigrations() {
  const config = projectConfig[options.environment];
  
  if (!config) {
    console.error('❌ Environnement invalide. Utilisez dev, staging, ou production');
    process.exit(1);
  }

  try {
    console.log(`🚀 Démarrage des migrations pour l'environnement ${options.environment}`);
    console.log(`📡 URL Supabase: ${config.url}`);
    
    // Vérifier que les variables d'environnement sont disponibles
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquante');
      process.exit(1);
    }

    // Créer le client Supabase avec la clé service
    const supabase = createClient(config.url, serviceRoleKey);

    // Test de connexion
    console.log('🔍 Test de connexion...');
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (testError && testError.code !== '42P01') {
      console.error('❌ Erreur de connexion:', testError.message);
      process.exit(1);
    }

    console.log('✅ Connexion Supabase réussie');

    // Lire les fichiers de migration
    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
    
    let files;
    try {
      files = await fs.readdir(migrationsDir);
    } catch (error) {
      console.error('❌ Impossible de lire le dossier migrations:', error.message);
      process.exit(1);
    }

    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    if (sqlFiles.length === 0) {
      console.log('ℹ️ Aucun fichier de migration trouvé');
      return;
    }

    console.log(`📦 ${sqlFiles.length} fichiers de migration trouvés`);

    // Vérifier/créer la table de suivi des migrations
    await ensureMigrationsTable(supabase);

    // Récupérer les migrations déjà appliquées
    const { data: appliedMigrations, error: migrationsError } = await supabase
      .from('__supabase_migrations')
      .select('name');

    if (migrationsError) {
      console.log('⚠️ Table de migrations non accessible, on continue...');
    }

    const appliedNames = new Set(appliedMigrations?.map(m => m.name) || []);

    // Afficher les instructions pour chaque migration
    console.log('\n📋 INSTRUCTIONS POUR APPLIQUER LES MIGRATIONS :');
    console.log('=' .repeat(60));
    
    for (const file of sqlFiles) {
      if (appliedNames.has(file)) {
        console.log(`⏭️ Migration ${file} déjà appliquée`);
        continue;
      }

      console.log(`\n📦 Migration à appliquer : ${file}`);
      console.log('-'.repeat(40));
      
      try {
        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
        
        // Extraire le commentaire de description
        const lines = sql.split('\n');
        const commentLines = [];
        let inComment = false;
        
        for (const line of lines) {
          if (line.trim().startsWith('/*')) {
            inComment = true;
          }
          if (inComment) {
            commentLines.push(line.replace(/^\/\*|\*\/$/g, '').trim());
          }
          if (line.trim().endsWith('*/')) {
            inComment = false;
            break;
          }
        }

        if (commentLines.length > 0) {
          console.log('📝 Description:');
          commentLines.forEach(line => {
            if (line.trim()) console.log(`   ${line}`);
          });
        }

        console.log('\n🔧 Instructions:');
        console.log('   1. Ouvrir le dashboard Supabase');
        console.log('   2. Aller dans SQL Editor');
        console.log('   3. Copier-coller le contenu du fichier:');
        console.log(`      supabase/migrations/${file}`);
        console.log('   4. Exécuter la requête');
        console.log('\n🌐 Dashboard: https://supabase.com/dashboard/project/dqfyuhwrjozoxadkccdj/sql');

        // Marquer comme "à faire manuellement"
        console.log(`\n⚠️ Migration ${file} nécessite une application manuelle`);

      } catch (error) {
        console.error(`❌ Erreur lors de la lecture de ${file}:`, error.message);
      }
    }

    console.log('\n✅ Instructions générées pour toutes les migrations');
    console.log('\n💡 CONSEIL: Appliquez les migrations dans l\'ordre chronologique');
    console.log('💡 Vérifiez que chaque migration s\'exécute sans erreur avant de passer à la suivante');
    console.log('\n🔗 Lien direct: https://supabase.com/dashboard/project/dqfyuhwrjozoxadkccdj/sql');

  } catch (error) {
    console.error('❌ Erreur lors des migrations:', error.message);
    process.exit(1);
  }
}

async function ensureMigrationsTable(supabase) {
  try {
    // Vérifier si la table existe déjà
    const { data, error } = await supabase
      .from('__supabase_migrations')
      .select('id')
      .limit(1);

    if (error && error.code === '42P01') {
      console.log('📋 Table de suivi des migrations non trouvée');
      console.log('💡 Vous devrez peut-être la créer manuellement si nécessaire');
    } else {
      console.log('✅ Table de suivi des migrations accessible');
    }
  } catch (error) {
    console.log('⚠️ Impossible de vérifier la table de migrations');
  }
}

runMigrations();