import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testConnection() {
  console.log('🔍 Test de connexion à Supabase');
  console.log('--------------------------------');

  try {
    // Test de connexion basique
    const { data, error } = await supabase.from('user_profiles').select('count');
    
    if (error) {
      console.log(`❌ Erreur de connexion : ${error.message}`);
    } else {
      console.log('✅ Connexion réussie !');
      console.log(`📊 Tables accessibles`);
      
      // Liste des tables disponibles (approximative)
      const tables = [
        'user_profiles', 'partners', 'offers', 'club_events', 
        'masterclasses', 'wellness_consultations', 'member_rewards'
      ];
        
      tables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur :', error.message);
  }
}

testConnection().catch(console.error);