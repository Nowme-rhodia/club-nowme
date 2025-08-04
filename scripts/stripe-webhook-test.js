#!/usr/bin/env node

// Script pour tester manuellement les webhooks Stripe
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Utiliser service role pour les tests
);

// Événement de test checkout.session.completed
const mockCheckoutEvent = {
  id: 'evt_test_' + Date.now(),
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_' + Date.now(),
      customer: 'cus_test_' + Date.now(),
      customer_email: 'test-webhook@nowme.fr',
      customer_details: {
        email: 'test-webhook@nowme.fr',
        name: 'Test User'
      },
      subscription: 'sub_test_' + Date.now(),
      amount_total: 1299, // 12,99€
      metadata: {
        plan_type: 'monthly'
      }
    }
  },
  created: Math.floor(Date.now() / 1000)
};

async function testWebhookDirectly() {
  console.log('🎯 Test direct du webhook Stripe');
  console.log('=================================');

  try {
    console.log('📤 Envoi événement test au webhook...');
    
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pas de signature en mode test
        },
        body: JSON.stringify(mockCheckoutEvent)
      }
    );

    const responseText = await response.text();
    
    if (response.ok) {
      console.log('✅ Webhook traité avec succès');
      console.log('Réponse:', responseText);
    } else {
      console.log('❌ Erreur webhook:', response.status, responseText);
      return;
    }

    // Vérifier que l'événement a été enregistré
    console.log('\n📊 Vérification base de données...');
    
    const { data: webhookEvent, error: eventError } = await supabase
      .from('stripe_webhook_events')
      .select('*')
      .eq('stripe_event_id', mockCheckoutEvent.id)
      .single();

    if (eventError) {
      console.log('❌ Événement non trouvé:', eventError.message);
    } else {
      console.log('✅ Événement enregistré:', {
        id: webhookEvent.id,
        type: webhookEvent.event_type,
        status: webhookEvent.status,
        email: webhookEvent.customer_email
      });
    }

    // Vérifier la création utilisateur
    const { data: userProfile, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'test-webhook@nowme.fr')
      .single();

    if (userError) {
      console.log('❌ Utilisateur non créé:', userError.message);
    } else {
      console.log('✅ Utilisateur créé:', {
        id: userProfile.id,
        email: userProfile.email,
        status: userProfile.subscription_status,
        type: userProfile.subscription_type
      });
    }

    // Vérifier l'email de bienvenue
    const { data: welcomeEmail, error: emailError } = await supabase
      .from('emails')
      .select('*')
      .eq('to_address', 'test-webhook@nowme.fr')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (emailError) {
      console.log('❌ Email non trouvé:', emailError.message);
    } else {
      console.log('✅ Email de bienvenue créé:', {
        id: welcomeEmail.id,
        subject: welcomeEmail.subject,
        status: welcomeEmail.status
      });
    }

  } catch (error) {
    console.error('❌ Erreur test:', error.message);
  }
}

async function cleanupTestData() {
  console.log('🧹 Nettoyage données test...');
  
  try {
    // Supprimer l'utilisateur test
    const { data: testUser } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', 'test-webhook@nowme.fr')
      .single();

    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.user_id);
      console.log('✅ Utilisateur test supprimé');
    }

    // Supprimer les événements webhook test
    await supabase
      .from('stripe_webhook_events')
      .delete()
      .like('stripe_event_id', 'evt_test_%');

    // Supprimer les emails test
    await supabase
      .from('emails')
      .delete()
      .eq('to_address', 'test-webhook@nowme.fr');

    console.log('✅ Données test nettoyées');

  } catch (error) {
    console.error('❌ Erreur nettoyage:', error.message);
  }
}

// Exécuter selon l'argument
const command = process.argv[2];

switch (command) {
  case 'webhook':
    testWebhookDirectly();
    break;
  case 'cleanup':
    cleanupTestData();
    break;
  default:
    console.log('Usage:');
    console.log('  node scripts/stripe-webhook-test.js webhook  - Tester le webhook directement');
    console.log('  node scripts/stripe-webhook-test.js cleanup  - Nettoyer les données test');
}