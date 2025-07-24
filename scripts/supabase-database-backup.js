import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import { format } from 'npm:date-fns@3.0.6';

/**
 * Edge Function pour sauvegarder des données de tables spécifiques
 * et les stocker dans un bucket Storage
 */
Deno.serve(async (req) => {
  try {
    // Vérifier si la requête est autorisée
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialiser le client Supabase avec la clé de service
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les paramètres de la requête
    const params = await req.json();
    const { 
      tables = [], 
      bucketName = 'backups',
      folderPath = '',
      includeTimestamp = true,
      format = 'json'  // 'json' ou 'csv'
    } = params;

    if (!tables || tables.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune table spécifiée' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier si le bucket existe, sinon le créer
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      return new Response(JSON.stringify({ error: 'Erreur lors de la vérification des buckets', details: bucketsError }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { error: createBucketError } = await supabase.storage.createBucket(bucketName, {
        public: false
      });
      
      if (createBucketError) {
        return new Response(JSON.stringify({ error: 'Erreur lors de la création du bucket', details: createBucketError }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Générer un timestamp pour le nom du fichier
    const timestamp = includeTimestamp ? `_${format(new Date(), 'yyyyMMdd_HHmmss')}` : '';
    
    // Résultats pour chaque table
    const results = [];
    
    // Traiter chaque table
    for (const tableName of tables) {
      try {
        // Récupérer toutes les données de la table
        const { data: tableData, error: tableError } = await supabase
          .from(tableName)
          .select('*');
        
        if (tableError) {
          results.push({
            table: tableName,
            success: false,
            error: tableError.message
          });
          continue;
        }
        
        let fileContent;
        let contentType;
        let fileExtension;
        
        // Formater les données selon le format demandé
        if (format === 'csv') {
          fileContent = convertToCSV(tableData);
          contentType = 'text/csv';
          fileExtension = 'csv';
        } else {
          // Par défaut, utiliser JSON
          fileContent = JSON.stringify(tableData, null, 2);
          contentType = 'application/json';
          fileExtension = 'json';
        }
        
        // Construire le chemin du fichier
        const filePath = folderPath 
          ? `${folderPath}/${tableName}${timestamp}.${fileExtension}`.replace(/\/+/g, '/')
          : `${tableName}${timestamp}.${fileExtension}`;
        
        // Sauvegarder le fichier dans le bucket
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, new Blob([fileContent], { type: contentType }), {
            contentType,
            upsert: true
          });
        
        if (uploadError) {
          results.push({
            table: tableName,
            success: false,
            error: uploadError.message
          });
        } else {
          // Obtenir l'URL du fichier (pour référence interne)
          const { data: urlData } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 60 * 60); // URL valide pendant 1 heure
          
          results.push({
            table: tableName,
            success: true,
            records: tableData.length,
            filePath,
            signedUrl: urlData?.signedUrl || null
          });
        }
      } catch (error) {
        results.push({
          table: tableName,
          success: false,
          error: error.message
        });
      }
    }

    // Résumé des résultats
    const summary = {
      timestamp: new Date().toISOString(),
      totalTables: tables.length,
      successfulBackups: results.filter(r => r.success).length,
      failedBackups: results.filter(r => !r.success).length,
      details: results
    };

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Erreur interne du serveur', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Convertit un tableau d'objets en format CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const headerRow = headers.join(',');
  
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      
      // Gérer les valeurs null ou undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      // Gérer les objets et tableaux
      if (typeof value === 'object') {
        const stringValue = JSON.stringify(value);
        // Échapper les guillemets et entourer de guillemets
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      // Gérer les chaînes de caractères
      if (typeof value === 'string') {
        // Échapper les guillemets et entourer de guillemets si nécessaire
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }
      
      // Autres types de données
      return String(value);
    }).join(',');
  });
  
  return [headerRow, ...rows].join('\n');
}