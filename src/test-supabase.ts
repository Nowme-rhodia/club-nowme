// Script de test de connexion Supabase
// Exécuter dans la console du navigateur

import { supabase } from './lib/supabase';

async function testSupabaseConnection() {
  console.log('🔍 Test de connexion Supabase...');
  console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  
  // Test 1 : Session
  console.log('\n📝 Test 1 : Récupération de la session');
  const start1 = Date.now();
  const { data: session, error: sessionError } = await supabase.auth.getSession();
  const time1 = Date.now() - start1;
  console.log(`⏱️ Temps: ${time1}ms`);
  console.log('Session:', session?.session?.user?.id);
  console.log('Error:', sessionError);
  
  if (!session?.session?.user) {
    console.error('❌ Pas de session active. Connectez-vous d\'abord.');
    return;
  }
  
  const userId = session.session.user.id;
  
  // Test 2 : user_profiles
  console.log('\n📝 Test 2 : Requête user_profiles');
  const start2 = Date.now();
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  const time2 = Date.now() - start2;
  console.log(`⏱️ Temps: ${time2}ms`);
  console.log('Profile:', profile);
  console.log('Error:', profileError);
  
  // Test 3 : subscriptions
  console.log('\n📝 Test 3 : Requête subscriptions');
  const start3 = Date.now();
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  const time3 = Date.now() - start3;
  console.log(`⏱️ Temps: ${time3}ms`);
  console.log('Subscription:', subscription);
  console.log('Error:', subscriptionError);
  
  // Test 4 : Requêtes en parallèle
  console.log('\n📝 Test 4 : Requêtes en parallèle');
  const start4 = Date.now();
  const [profileResult, subscriptionResult] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle()
  ]);
  const time4 = Date.now() - start4;
  console.log(`⏱️ Temps: ${time4}ms`);
  console.log('Profile:', profileResult.data);
  console.log('Subscription:', subscriptionResult.data);
  
  // Résumé
  console.log('\n📊 RÉSUMÉ');
  console.log('─────────────────────────────────');
  console.log(`Session:       ${time1}ms ${sessionError ? '❌' : '✅'}`);
  console.log(`user_profiles: ${time2}ms ${profileError ? '❌' : '✅'}`);
  console.log(`subscriptions: ${time3}ms ${subscriptionError ? '❌' : '✅'}`);
  console.log(`Parallèle:     ${time4}ms`);
  console.log('─────────────────────────────────');
  
  if (time2 > 1000 || time3 > 1000) {
    console.warn('⚠️ ATTENTION : Requêtes lentes (> 1s)');
    console.warn('Causes possibles :');
    console.warn('  - Serveur Supabase distant ou lent');
    console.warn('  - Connexion internet lente');
    console.warn('  - Problème de configuration Supabase');
  } else {
    console.log('✅ Connexion Supabase OK !');
  }
}

// Exécuter le test
testSupabaseConnection();
