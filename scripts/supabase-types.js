// supabase-types.js - Compatible avec StackBlitz
// Ce script génère des types TypeScript basés sur votre schéma Supabase

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Utiliser la clé de service pour accéder aux métadonnées

// Initialiser le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function generateTypes() {
  try {
    // Récupérer la liste des tables
    const { data: tables, error: tablesError } = await supabase
      .from('pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) throw tablesError;
    
    let typesContent = '// Types générés automatiquement - ne pas modifier directement\n\n';
    
    // Pour chaque table, récupérer sa structure
    for (const table of tables) {
      const { data: columns, error: columnsError } = await supabase
        .rpc('get_table_columns', { 
          p_schema: table.schemaname, 
          p_table: table.tablename 
        });
      
      if (columnsError) {
        console.error(`Erreur pour ${table.tablename}:`, columnsError);
        continue;
      }
      
      // Générer l'interface TypeScript
      typesContent += `export interface ${pascalCase(table.tablename)} {\n`;
      
      columns.forEach(column => {
        const tsType = mapPgTypeToTs(column.data_type);
        const nullable = column.is_nullable === 'YES' ? ' | null' : '';
        typesContent += `  ${column.column_name}: ${tsType}${nullable};\n`;
      });
      
      typesContent += '}\n\n';
    }
    
    // Dans StackBlitz, au lieu d'écrire dans un fichier, on affiche le contenu
    // pour que l'utilisateur puisse le copier-coller
    console.log(typesContent);
    
    // Option: Télécharger le fichier directement dans le navigateur
    downloadAsFile('supabase-types.ts', typesContent);
    
    console.log('Types générés avec succès!');
  } catch (error) {
    console.error('Erreur lors de la génération des types:', error);
  }
}

// Fonction utilitaire pour convertir snake_case en PascalCase
function pascalCase(str) {
  return str
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

// Fonction pour mapper les types PostgreSQL vers TypeScript
function mapPgTypeToTs(pgType) {
  const typeMap = {
    'integer': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'decimal': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'character varying': 'string',
    'varchar': 'string',
    'text': 'string',
    'boolean': 'boolean',
    'date': 'string',
    'timestamp': 'string',
    'timestamp with time zone': 'string',
    'timestamp without time zone': 'string',
    'json': 'Record<string, any>',
    'jsonb': 'Record<string, any>',
    'uuid': 'string',
  };
  
  return typeMap[pgType] || 'any';
}

// Fonction pour télécharger le contenu comme fichier dans le navigateur
function downloadAsFile(filename, content) {
  // Cette fonction ne fonctionne que dans un environnement navigateur
  if (typeof window !== 'undefined') {
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }
}

// Fonction RPC à créer dans Supabase pour récupérer les colonnes d'une table
// CREATE OR REPLACE FUNCTION get_table_columns(p_schema text, p_table text)
// RETURNS TABLE(column_name text, data_type text, is_nullable text)
// LANGUAGE plpgsql
// SECURITY DEFINER
// AS $$
// BEGIN
//   RETURN QUERY
//   SELECT 
//     column_name::text,
//     data_type::text,
//     is_nullable::text
//   FROM 
//     information_schema.columns
//   WHERE 
//     table_schema = p_schema
//     AND table_name = p_table
//   ORDER BY 
//     ordinal_position;
// END;
// $$;