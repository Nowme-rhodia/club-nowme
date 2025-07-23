#!/usr/bin/env node

/**
 * Script pour appliquer les migrations manuellement
 * Utilise l'approche recommandée pour Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

async function applyMigrationsManual() {
  console.log('🚀 Application manuelle des migrations Supabase');
  console.log('================================================');
  
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Variables d\'environnement manquantes:');
    console.error('   - VITE_SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Test de connexion
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (error && error.code !== '42P01') {
      throw new Error(`Connexion échouée: ${error.message}`);
    }

    console.log('✅ Connexion Supabase réussie');

    // Lire les migrations
    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log(`📦 ${sqlFiles.length} fichiers de migration trouvés`);
    console.log('');

    // Afficher les instructions pour chaque migration
    for (const file of sqlFiles) {
      console.log(`📄 Migration: ${file}`);
      console.log('─'.repeat(50));
      
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      
      // Extraire le commentaire de description s'il existe
      const lines = sql.split('\n');
      const commentLines = [];
      let inComment = false;
      
      for (const line of lines) {
        if (line.trim().startsWith('/*')) {
          inComment = true;
        }
        if (inComment) {
          commentLines.push(line);
        }
        if (line.trim().endsWith('*/')) {
          inComment = false;
          break;
        }
      }

      if (commentLines.length > 0) {
        console.log('📝 Description:');
        commentLines.forEach(line => {
          console.log(`   ${line.replace(/^\/\*|\*\/$/g, '').trim()}`);
        });
      }

      console.log('');
      console.log('🔧 Instructions:');
      console.log('   1. Ouvrir le dashboard Supabase');
      console.log('   2. Aller dans SQL Editor');
      console.log('   3. Copier-coller le contenu du fichier:');
      console.log(`      supabase/migrations/${file}`);
      console.log('   4. Exécuter la requête');
      console.log('');
      console.log('🌐 Dashboard: https://supabase.com/dashboard/project/dqfyuhwrjozoxadkccdj/sql');
      console.log('');
      console.log('═'.repeat(70));
      console.log('');
    }

    console.log('✅ Instructions générées pour toutes les migrations');
    console.log('');
    console.log('💡 Conseil: Appliquez les migrations dans l\'ordre chronologique');
    console.log('💡 Vérifiez que chaque migration s\'exécute sans erreur avant de passer à la suivante');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

applyMigrationsManual();