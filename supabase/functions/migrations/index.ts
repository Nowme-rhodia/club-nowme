// data-migration.ts - Edge Function pour les migrations de données
// Cette fonction remplace supabase-data-migration.js pour une utilisation dans StackBlitz

import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MIGRATIONS_BUCKET = 'migrations';
const MIGRATIONS_TABLE = 'migrations';

// Créer un client Supabase avec la clé de service
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Interface pour les migrations
interface Migration {
  id: string;
  name: string;
  description: string;
  sql: string;
  batch: number;
  applied_at?: string;
  status: 'pending' | 'applied' | 'failed';
  error?: string;
}

serve(async (req: Request) => {
  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Extraire et vérifier le token
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Vérifier si l'utilisateur est administrateur
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
    
    // Créer la table de migrations si elle n'existe pas
    await supabase.rpc('create_migrations_table_if_not_exists');
    
    // Créer le bucket de migrations si nécessaire
    const { error: bucketError } = await supabase.storage.createBucket(MIGRATIONS_BUCKET, {
      public: false
    });
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      throw new Error(`Erreur lors de la création du bucket: ${bucketError.message}`);
    }
    
    // Analyser la requête
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();
    
    if (req.method === 'GET') {
      // Liste des migrations
      const { data: migrations, error } = await supabase
        .from(MIGRATIONS_TABLE)
        .select('*')
        .order('batch', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) {
        throw new Error(`Erreur lors de la récupération des migrations: ${error.message}`);
      }
      
      return new Response(JSON.stringify({
        success: true,
        migrations
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    else if (req.method === 'POST' && action === 'upload') {
      // Téléverser une nouvelle migration
      const formData = await req.formData();
      const migrationFile = formData.get('file') as File;
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      
      if (!migrationFile || !name) {
        return new Response(JSON.stringify({ error: 'Fichier ou nom manquant' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Lire le contenu du fichier
      const sql = await migrationFile.text();
      
      // Générer un ID unique
      const id = crypto.randomUUID();
      
      // Sauvegarder le fichier SQL dans Storage
      const { error: uploadError } = await supabase
        .storage
        .from(MIGRATIONS_BUCKET)
        .upload(`${id}.sql`, sql, {
          contentType: 'text/plain',
          cacheControl: '3600'
        });
      
      if (uploadError) {
        throw new Error(`Erreur lors du téléversement: ${uploadError.message}`);
      }
      
      // Déterminer le prochain numéro de batch
      const { data: maxBatch } = await supabase
        .from(MIGRATIONS_TABLE)
        .select('batch')
        .order('batch', { ascending: false })
        .limit(1)
        .single();
      
      const nextBatch = maxBatch ? maxBatch.batch + 1 : 1;
      
      // Enregistrer la migration dans la base de données
      const { error: insertError } = await supabase
        .from(MIGRATIONS_TABLE)
        .insert({
          id,
          name,
          description,
          sql,
          batch: nextBatch,
          status: 'pending'
        });
      
      if (insertError) {
        throw new Error(`Erreur lors de l'enregistrement: ${insertError.message}`);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Migration téléversée avec succès',
        id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    else if (req.method === 'POST' && action === 'apply') {
      // Appliquer une migration spécifique ou toutes les migrations en attente
      const body = await req.json();
      const migrationId = body.id;
      
      let migrationsToApply: Migration[] = [];
      
      if (migrationId) {
        // Récupérer une migration spécifique
        const { data, error } = await supabase
          .from(MIGRATIONS_TABLE)
          .select('*')
          .eq('id', migrationId)
          .eq('status', 'pending')
          .single();
        
        if (error || !data) {
          return new Response(JSON.stringify({ 
            error: 'Migration non trouvée ou déjà appliquée' 
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        migrationsToApply = [data];
      } else {
        // Récupérer toutes les migrations en attente
        const { data, error } = await supabase
          .from(MIGRATIONS_TABLE)
          .select('*')
          .eq('status', 'pending')
          .order('batch', { ascending: true })
          .order('name', { ascending: true });
        
        if (error) {
          throw new Error(`Erreur lors de la récupération des migrations: ${error.message}`);
        }
        
        migrationsToApply = data || [];
      }
      
      if (migrationsToApply.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Aucune migration en attente' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Appliquer les migrations
      const results = [];
      
      for (const migration of migrationsToApply) {
        try {
          // Exécuter le SQL
          const { error: sqlError } = await supabase.rpc('execute_sql', {
            sql_string: migration.sql
          });
          
          if (sqlError) {
            throw new Error(sqlError.message);
          }
          
          // Mettre à jour le statut de la migration
          const { error: updateError } = await supabase
            .from(MIGRATIONS_TABLE)
            .update({
              status: 'applied',
              applied_at: new Date().toISOString()
            })
            .eq('id', migration.id);
          
          if (updateError) {
            throw new Error(updateError.message);
          }
          
          results.push({
            id: migration.id,
            name: migration.name,
            success: true
          });
        } catch (error) {
          // Enregistrer l'erreur
          await supabase
            .from(MIGRATIONS_TABLE)
            .update({
              status: 'failed',
              error: error.message
            })
            .eq('id', migration.id);
          
          results.push({
            id: migration.id,
            name: migration.name,
            success: false,
            error: error.message
          });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        results
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    else if (req.method === 'DELETE' && action === 'delete') {
      // Supprimer une migration
      const body = await req.json();
      const migrationId = body.id;
      
      if (!migrationId) {
        return new Response(JSON.stringify({ error: 'ID de migration manquant' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Vérifier que la migration existe et n'est pas appliquée
      const { data: migration, error: fetchError } = await supabase
        .from(MIGRATIONS_TABLE)
        .select('*')
        .eq('id', migrationId)
        .single();
      
      if (fetchError || !migration) {
        return new Response(JSON.stringify({ error: 'Migration non trouvée' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (migration.status === 'applied') {
        return new Response(JSON.stringify({ 
          error: 'Impossible de supprimer une migration déjà appliquée' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Supprimer le fichier de Storage
      await supabase
        .storage
        .from(MIGRATIONS_BUCKET)
        .remove([`${migrationId}.sql`]);
      
      // Supprimer l'enregistrement de la base de données
      const { error: deleteError } = await supabase
        .from(MIGRATIONS_TABLE)
        .delete()
        .eq('id', migrationId);
      
      if (deleteError) {
        throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Migration supprimée avec succès'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    else {
      return new Response(JSON.stringify({ error: 'Méthode non supportée' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Erreur:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// Fonction SQL à créer dans Supabase
/*
CREATE OR REPLACE FUNCTION create_migrations_table_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'migrations'
  ) THEN
    CREATE TABLE public.migrations (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      sql TEXT NOT NULL,
      batch INTEGER NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE,
      status TEXT NOT NULL,
      error TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Ajouter RLS
    ALTER TABLE public.migrations ENABLE ROW LEVEL SECURITY;
    
    -- Créer une politique pour les administrateurs uniquement
    CREATE POLICY "Les administrateurs peuvent tout faire" ON public.migrations
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION execute_sql(sql_string TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql_string;
END;
$$;
*/