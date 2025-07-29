// Ce fichier est un exemple de comment vous pourriez utiliser les fonctions SQL
// dans une fonction Edge pour afficher des statistiques sur les webhooks Stripe

import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

// Récupération des variables d'environnement
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Initialisation du client Supabase avec la clé de service
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interface pour les statistiques par statut
interface WebhookStatusStats {
  status: string;
  count: number;
  last_24h: number;
  last_7d: number;
}

// Interface pour les statistiques par type d'événement
interface WebhookTypeStats {
  event_type: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  success_rate: number;
  last_received: string;
}

// Interface pour les incohérences de statut d'abonnement
interface InconsistentStatus {
  user_id: string;
  email: string;
  db_status: string;
  stripe_subscription_id: string;
  last_webhook_event_type: string;
  last_webhook_event_time: string;
}

// Fonction principale pour traiter les requêtes
Deno.serve(async (req) => {
  try {
    // Vérifier l'authentification (vous devriez implémenter une vérification plus robuste)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Non autorisé', { status: 401 });
    }
    
    // Extraire le token JWT
    const token = authHeader.split(' ')[1];
    
    // Vérifier que l'utilisateur est un administrateur
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response('Non autorisé', { status: 401 });
    }
    
    // Vérifier si l'utilisateur est un administrateur (vous devez adapter cette logique à votre système de rôles)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profileError || profile?.role !== 'admin') {
      return new Response('Accès refusé', { status: 403 });
    }
    
    // Récupérer les statistiques par statut
    const { data: statusStats, error: statusError } = await supabase
      .rpc('get_webhook_event_counts');
      
    if (statusError) {
      console.error('Erreur lors de la récupération des statistiques par statut:', statusError);
      return new Response(`Erreur: ${statusError.message}`, { status: 500 });
    }
    
    // Récupérer les statistiques par type d'événement
    const { data: typeStats, error: typeError } = await supabase
      .rpc('get_webhook_event_type_stats');
      
    if (typeError) {
      console.error('Erreur lors de la récupération des statistiques par type:', typeError);
      return new Response(`Erreur: ${typeError.message}`, { status: 500 });
    }
    
    // Récupérer les incohérences de statut d'abonnement
    const { data: inconsistencies, error: inconsistencyError } = await supabase
      .rpc('find_inconsistent_subscription_statuses');
      
    if (inconsistencyError) {
      console.error('Erreur lors de la récupération des incohérences:', inconsistencyError);
      return new Response(`Erreur: ${inconsistencyError.message}`, { status: 500 });
    }
    
    // Préparer la réponse
    const response = {
      status_statistics: statusStats,
      event_type_statistics: typeStats,
      subscription_inconsistencies: inconsistencies,
      generated_at: new Date().toISOString()
    };
    
    // Renvoyer les données au format JSON
    return new Response(JSON.stringify(response, null, 2), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
    
  } catch (error) {
    console.error('Erreur non gérée:', error);
    return new Response(`Erreur interne: ${error.message}`, { status: 500 });
  }
});