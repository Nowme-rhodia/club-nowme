// scripts/create-exec-sql.js
// Script pour créer la fonction exec_sql dans Supabase

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erreur: Variables d\'environnement SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises');
  console.error('Créez un fichier .env à la racine du projet avec ces variables');
  process.exit(1);
}

// Initialiser le client Supabase avec la clé de service pour les opérations admin
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createExecSqlFunction() {
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query TEXT)
    RETURNS VOID
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
    END;
    $$;
  `;
  
  try {
    console.log('Création de la fonction exec_sql...');
    
    // Utiliser l'API REST de Supabase pour créer la fonction
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'params=single-object'
      },
      body: JSON.stringify({ query: createFunctionSQL })
    });
    
    if (response.ok) {
      console.log('✅ Fonction exec_sql créée avec succès');
    } else {
      const errorText = await response.text();
      console.error('❌ Erreur lors de la création de la fonction exec_sql:', errorText);
      console.error('Vous devrez peut-être créer cette fonction manuellement dans l\'éditeur SQL de Supabase');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la création de la fonction exec_sql:', error);
    console.error('Vous devrez peut-être créer cette fonction manuellement dans l\'éditeur SQL de Supabase');
  }
}

// Exécuter la fonction principale
createExecSqlFunction().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});