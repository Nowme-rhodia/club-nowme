// database-backup.ts - Edge Function pour sauvegarder des données
// Cette fonction remplace supabase-backup.js et supabase-database-backup.js
// pour une utilisation dans StackBlitz

import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BACKUP_BUCKET = 'database-backups';

// Créer un client Supabase avec la clé de service pour accéder à toutes les tables
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  try {
    // Vérifier l'authentification (vous pouvez implémenter une vérification plus robuste)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extraire et vérifier le token (implémentation simplifiée)
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Vérifier si l'utilisateur est administrateur (à adapter selon votre logique d'autorisation)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Analyser les paramètres de la requête
    const url = new URL(req.url);
    const tables = url.searchParams.get('tables')?.split(',') || [];
    const allTables = url.searchParams.get('all') === 'true';
    
    // Récupérer la liste des tables si nécessaire
    let tablesToBackup = tables;
    if (allTables) {
      const { data: tablesList, error: tablesError } = await supabase
        .from('pg_tables')
        .select('tablename')
        .eq('schemaname', 'public');
      
      if (tablesError) {
        throw new Error(`Erreur lors de la récupération des tables: ${tablesError.message}`);
      }
      
      tablesToBackup = tablesList.map(t => t.tablename);
    }
    
    if (tablesToBackup.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune table spécifiée' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Créer le bucket de sauvegarde s'il n'existe pas
    const { error: bucketError } = await supabase.storage.createBucket(BACKUP_BUCKET, {
      public: false
    });
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      throw new Error(`Erreur lors de la création du bucket: ${bucketError.message}`);
    }
    
    // Effectuer la sauvegarde pour chaque table
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupResults = [];
    
    for (const table of tablesToBackup) {
      // Récupérer toutes les données de la table
      const { data, error: dataError } = await supabase
        .from(table)
        .select('*');
      
      if (dataError) {
        backupResults.push({
          table,
          success: false,
          error: dataError.message
        });
        continue;
      }
      
      // Sauvegarder les données dans Storage
      const backupData = JSON.stringify(data, null, 2);
      const filePath = `${timestamp}/${table}.json`;
      
      const { error: uploadError } = await supabase
        .storage
        .from(BACKUP_BUCKET)
        .upload(filePath, backupData, {
          contentType: 'application/json',
          cacheControl: '3600'
        });
      
      if (uploadError) {
        backupResults.push({
          table,
          success: false,
          error: uploadError.message
        });
      } else {
        backupResults.push({
          table,
          success: true,
          records: data.length,
          path: filePath
        });
      }
    }
    
    // Créer un fichier de métadonnées pour la sauvegarde
    const metadata = {
      timestamp,
      tables: backupResults,
      createdBy: user.id,
      createdAt: new Date().toISOString()
    };
    
    await supabase
      .storage
      .from(BACKUP_BUCKET)
      .upload(`${timestamp}/metadata.json`, JSON.stringify(metadata, null, 2), {
        contentType: 'application/json',
        cacheControl: '3600'
      });
    
    // Générer des URLs signées pour les fichiers de sauvegarde
    const backupFiles = backupResults
      .filter(result => result.success)
      .map(result => result.path);
    
    const signedUrls = [];
    for (const filePath of backupFiles) {
      const { data: url } = await supabase
        .storage
        .from(BACKUP_BUCKET)
        .createSignedUrl(filePath, 3600); // URL valide pendant 1 heure
      
      if (url) {
        signedUrls.push({
          table: filePath.split('/').pop()?.replace('.json', ''),
          url: url.signedUrl
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      timestamp,
      results: backupResults,
      downloadUrls: signedUrls
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});