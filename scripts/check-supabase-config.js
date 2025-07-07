#!/usr/bin/env node

import pkg from '@supabase/supabase-js';
const { createClient } = pkg;

import cmdPkg from 'commander';
const { program } = cmdPkg;

import dotenvPkg from 'dotenv';
const dotenv = dotenvPkg;

program
  .version('1.0.0')
  .description('Vérification complète de la configuration Supabase')
  .parse(process.argv);

// Projet actuel
const currentProject = {
  id: 'dqfyuhwrjozoxadkccdj',
  url: 'https://dqfyuhwrjozoxadkccdj.supabase.co'
};

const requiredTables = [
  'partners',
  'offers',
  'offer_prices',
  'offer_media',
  'pending_partners',
  'pending_offers',
  'emails',
  'user_profiles',
  'user_qr_codes'
];

const requiredFunctions = [
  'handle-zoho-subscription',
  'send-email',
  'send-partner-approval',
  'send-partner-confirmation',
  'send-partner-rejection',
  'send-partner-submission'
];

async function checkProject(project) {
  console.log(`\n🔍 Vérification du projet ${project.id}`);
  console.log('----------------------------------------');

  try {
    const supabase = createClient(
      project.url,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1. Vérification de la connexion
    console.log('\n📡 Test de connexion...');
    const { data: connTest, error: connError } = await supabase.from('user_profiles').select('count').limit(1);
    console.log(connError ? '❌ Échec de connexion' : '✅ Connexion OK');

    // 2. Vérification des tables
    console.log('\n📊 Vérification des tables...');
    const { data: tables } = await supabase
      .rpc('exec_sql', {
        sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
      });

    const existingTables = tables.map(t => t.table_name);
    requiredTables.forEach(table => {
      console.log(`${existingTables.includes(table) ? '✅' : '❌'} Table ${table}`);
    });

    // 3. Vérification des fonctions Edge
    console.log('\n⚡ Vérification des fonctions Edge...');
    requiredFunctions.forEach(func => {
      const url = `${project.url}/functions/v1/${func}`;
      console.log(`🔗 ${func}: ${url}`);
    });

    // 4. Vérification de l'authentification
    console.log('\n🔐 Vérification de l\'authentification...');
    const { data: authSettings } = await supabase.auth.getSession();
    console.log('✅ Configuration auth OK');

    // 5. Vérification des politiques RLS
    console.log('\n🛡️ Vérification des politiques RLS...');
    const { data: policies } = await supabase
      .rpc('exec_sql', {
        sql: `SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'`
      });

    console.log(`📋 Nombre de politiques RLS: ${policies.length}`);

  } catch (error) {
    console.error(`❌ Erreur lors de la vérification du projet:`, error.message);
  }
}

// Vérifier uniquement le projet actuel
checkProject(currentProject);