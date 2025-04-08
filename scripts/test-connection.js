import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

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
      
      // Liste des tables disponibles
      const { data: tables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
        
      tables?.forEach(table => {
        console.log(`   - ${table.table_name}`);
      });
    }
  } catch (error) {
    console.error('❌ Erreur :', error.message);
  }
}

testConnection().catch(console.error);