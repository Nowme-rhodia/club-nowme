#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { program } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk'; // Ajout de chalk pour la coloration

// Charger les variables d'environnement
dotenv.config();

program
  .version('1.0.0')
  .description('Vérification des tables Supabase')
  .option('-l, --list', 'Lister les tables disponibles')
  .option('-t, --table <name>', 'Vérifier une table spécifique')
  .option('-c, --count', 'Afficher le nombre d\'enregistrements')
  .parse(process.argv);

const options = program.opts();
const projectId = 'dqfyuhwrjozoxadkccdj';

async function checkTables() {
  try {
    console.log(chalk.blue(`🔍 Vérification des tables pour le projet ${projectId}`));
    console.log(chalk.blue('═'.repeat(50)));
    
    const supabaseUrl = process.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseKey) {
      console.error(chalk.red('❌ Variable d\'environnement VITE_SUPABASE_ANON_KEY manquante'));
      process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Vérifier la connexion
    const { data: connectionTest, error: connectionError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (connectionError && connectionError.code !== '42P01') {
      console.error(chalk.red(`❌ Erreur de connexion: ${connectionError.message}`));
      process.exit(1);
    }

    console.log(chalk.green('✅ Connexion à Supabase réussie'));

    // Si une table spécifique est demandée
    if (options.table) {
      const tableName = options.table;
      console.log(chalk.blue(`\n📋 Vérification de la table: ${tableName}`));
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select(options.count ? 'count' : '*')
          .limit(options.count ? null : 5);
        
        if (error) {
          console.error(chalk.red(`❌ Erreur: ${error.message}`));
        } else {
          console.log(chalk.green(`✅ Table ${tableName} accessible`));
          
          if (options.count) {
            console.log(chalk.blue(`📊 Nombre d'enregistrements: ${data[0].count}`));
          } else {
            console.log(chalk.blue(`📊 Premiers enregistrements (max 5):`));
            console.table(data);
          }
        }
      } catch (error) {
        console.error(chalk.red(`❌ Erreur lors de l'accès à la table ${tableName}: ${error.message}`));
      }
    }
    // Lister toutes les tables
    else if (options.list) {
      console.log(chalk.blue('\n📋 Tentative de récupération des tables...'));
      
      try {
        // Cette requête nécessite des privilèges élevés et pourrait ne pas fonctionner avec la clé anon
        const { data, error } = await supabase.rpc('get_tables');
        
        if (error) {
          console.error(chalk.yellow(`⚠️ Impossible de récupérer la liste des tables: ${error.message}`));
          console.log(chalk.yellow('💡 Cette opération nécessite généralement une clé de service (service_role)'));
          
          // Liste de tables probables basée sur le contexte de l'application
          console.log(chalk.blue('\n📋 Tables probables (basées sur le contexte):'));
          const probableTables = [
            'user_profiles', 'partners', 'offers', 'club_events', 
            'masterclasses', 'wellness_consultations', 'member_rewards',
            'emails'
          ];
          
          for (const table of probableTables) {
            try {
              const { error: tableError } = await supabase.from(table).select('count').limit(1);
              if (!tableError) {
                console.log(chalk.green(`✅ ${table}`));
              } else if (tableError.code === '42P01') {
                console.log(chalk.red(`❌ ${table} (n'existe pas)`));
              } else {
                console.log(chalk.yellow(`⚠️ ${table} (erreur d'accès)`));
              }
            } catch (e) {
              console.log(chalk.red(`❌ ${table} (erreur: ${e.message})`));
            }
          }
        } else {
          console.log(chalk.blue('\n📋 Tables disponibles:'));
          data.forEach(table => {
            console.log(chalk.green(`✅ ${table.table_name}`));
          });
        }
      } catch (error) {
        console.error(chalk.red(`❌ Erreur: ${error.message}`));
      }
    } else {
      console.log(chalk.green('📊 Connexion réussie, base de données accessible'));
      console.log(chalk.blue('\n💡 Utilisez --list pour voir les tables disponibles'));
      console.log(chalk.blue('💡 Utilisez --table <nom> pour vérifier une table spécifique'));
    }

  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la vérification: ${error.message}`));
    process.exit(1);
  }
}

checkTables();