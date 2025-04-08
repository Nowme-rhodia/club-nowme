import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Utilisation d'un seul projet Supabase (celui qui existe)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL, 
  process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
  console.log('🚀 Vérification de la connexion Supabase');
  console.log('---------------------------------------');

  try {
    // Test de connexion basique
    const { data, error } = await supabase.from('user_profiles').select('id').limit(1);
    
    if (error) {
      console.log(`❌ Erreur de connexion : ${error.message}`);
    } else {
      console.log(`✅ Connexion réussie avec ${data.length} utilisateur(s) trouvé(s)`);
    }
  } catch (error) {
    console.error(`❌ Erreur : ${error.message}`);
  }
}

main().catch(console.error);
