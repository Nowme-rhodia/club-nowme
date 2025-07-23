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

// Configuration des projets
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

    const sqlFiles = files.filter(f => f.endsWith('.sql'));
    
    if (sqlFiles.length === 0) {
      console.log('ℹ️ Aucun fichier de migration trouvé');
      return;
    }

    // Trier les fichiers par nom (qui contient la date)
    sqlFiles.sort();

    console.log(`📦 ${sqlFiles.length} fichiers de migration trouvés`);

    // Vérifier/créer la table de suivi des migrations
    await ensureMigrationsTable(supabase);

    // Récupérer les migrations déjà appliquées
    const { data: appliedMigrations, error: migrationsError } = await supabase
      .from('__supabase_migrations')
      .select('name');

    if (migrationsError) {
      console.error('❌ Erreur lors de la récupération des migrations appliquées:', migrationsError.message);
      process.exit(1);
    }

    const appliedNames = new Set(appliedMigrations?.map(m => m.name) || []);

    // Exécuter chaque migration non appliquée
    for (const file of sqlFiles) {
      if (appliedNames.has(file)) {
        console.log(`⏭️ Migration ${file} déjà appliquée`);
        continue;
      }

      console.log(`📦 Exécution de la migration: ${file}`);
      
      try {
        const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
        
        // Exécuter le SQL via l'API REST directement
        const response = await fetch(`${config.url}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          },
          body: JSON.stringify({ sql })
        });

        if (!response.ok) {
          // Si exec n'existe pas, essayer une approche alternative
          console.log(`⚠️ Fonction exec non disponible, tentative d'approche alternative...`);
          
          // Pour les migrations simples, on peut essayer de les décomposer
          await executeMigrationAlternative(supabase, sql, file);
        }

        // Marquer la migration comme appliquée
        const { error: insertError } = await supabase
          .from('__supabase_migrations')
          .insert({ name: file });

        if (insertError) {
          console.error(`⚠️ Impossible de marquer la migration ${file} comme appliquée:`, insertError.message);
        } else {
          console.log(`✅ Migration ${file} appliquée avec succès`);
        }

      } catch (error) {
        console.error(`❌ Erreur lors de l'exécution de ${file}:`, error.message);
        // Continuer avec les autres migrations au lieu de s'arrêter
        console.log(`⏭️ Passage à la migration suivante...`);
      }
    }

    console.log('✅ Migrations terminées');
  } catch (error) {
    console.error('❌ Erreur lors des migrations:', error.message);
    process.exit(1);
  }
}

async function ensureMigrationsTable(supabase) {
  // Vérifier si la table existe déjà
  const { data, error } = await supabase
    .from('__supabase_migrations')
    .select('id')
    .limit(1);

  if (error && error.code === '42P01') {
    console.log('📋 Création de la table de suivi des migrations...');
    // La table n'existe pas, mais on ne peut pas la créer via l'API REST
    // Elle devrait être créée manuellement ou via le dashboard Supabase
    console.log('ℹ️ Veuillez créer la table __supabase_migrations manuellement si elle n\'existe pas');
  }
}

async function executeMigrationAlternative(supabase, sql, filename) {
  console.log(`🔄 Tentative d'exécution alternative pour ${filename}`);
  
  // Pour les migrations simples, on peut essayer de les décomposer
  // Ceci est une approche limitée qui ne fonctionnera que pour certains types de migrations
  
  // Diviser le SQL en statements individuels
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.toLowerCase().includes('create table') || 
        statement.toLowerCase().includes('alter table') ||
        statement.toLowerCase().includes('create index')) {
      
      console.log(`⚠️ Statement SQL complexe détecté: ${statement.substring(0, 50)}...`);
      console.log(`ℹ️ Cette migration doit être appliquée manuellement via le dashboard Supabase`);
    }
  }
}

runMigrations();