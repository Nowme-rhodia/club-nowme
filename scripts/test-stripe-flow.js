#!/usr/bin/env node

// Test complet du flow Stripe
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const TEST_EMAIL = 'test-stripe@nowme.fr';

async function testStripeFlow() {
  console.log('🧪 Test du flow Stripe complet');
  console.log('================================');

  try {
    // 1. Tester la création de session checkout
    console.log('\n1️⃣ Test création session checkout...');
    
    const checkoutResponse = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          priceId: 'price_1RqkgvDaQ8XsywAvq2A06dT7',
          planType: 'monthly',
          email: TEST_EMAIL,
          success_url: 'https://club.nowme.fr/subscription-success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://club.nowme.fr/subscription'
        })
      }
    );

    if (checkoutResponse.ok) {
      const { sessionId } = await checkoutResponse.json();
      console.log('✅ Session checkout créée:', sessionId);
    } else {
      const error = await checkoutResponse.text();
      console.log('❌ Erreur session checkout:', error);
    }

    // 2. Vérifier la table des événements webhook
    console.log('\n2️⃣ Vérification table webhook events...');
    
    const { data: recentEvents, error: eventsError } = await supabase
      .from('stripe_webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (eventsError) {
      console.log('❌ Erreur lecture events:', eventsError.message);
    } else {
      console.log(`✅ ${recentEvents.length} événements récents trouvés`);
      recentEvents.forEach(event => {
        console.log(`   - ${event.event_type} (${event.status}) - ${event.customer_email || 'pas d\'email'}`);
      });
    }

    // 3. Vérifier la table des emails
    console.log('\n3️⃣ Vérification queue emails...');
    
    const { data: pendingEmails, error: emailsError } = await supabase
      .from('emails')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3);

    if (emailsError) {
      console.log('❌ Erreur lecture emails:', emailsError.message);
    } else {
      console.log(`✅ ${pendingEmails.length} emails en attente`);
      pendingEmails.forEach(email => {
        console.log(`   - ${email.to_address} - ${email.subject}`);
      });
    }

    // 4. Tester la fonction d'envoi d'emails
    console.log('\n4️⃣ Test envoi email...');
    
    const emailResponse = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/send-emails`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        }
      }
    );

    if (emailResponse.ok) {
      const emailResult = await emailResponse.json();
      console.log('✅ Fonction email:', emailResult.message || 'OK');
    } else {
      const emailError = await emailResponse.text();
      console.log('❌ Erreur fonction email:', emailError);
    }

    console.log('\n🎯 Instructions pour tester avec Stripe CLI:');
    console.log('============================================');
    console.log('1. Installer Stripe CLI: https://stripe.com/docs/stripe-cli');
    console.log('2. Se connecter: stripe login');
    console.log('3. Écouter les webhooks:');
    console.log(`   stripe listen --forward-to ${process.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`);
    console.log('4. Dans un autre terminal, déclencher un événement test:');
    console.log('   stripe trigger checkout.session.completed');
    console.log('\n5. Vérifier les logs ici et dans Supabase Dashboard');

  } catch (error) {
    console.error('❌ Erreur test:', error.message);
  }
}

// Fonction pour créer un utilisateur test complet
async function createTestUser() {
  console.log('\n🧪 Création utilisateur test...');
  
  try {
    const { data, error } = await supabase.functions.invoke('admin-recreate-user', {
      body: {
        email: TEST_EMAIL,
        password: 'testpass123',
        role: 'subscriber'
      }
    });

    if (error) {
      console.log('❌ Erreur création test user:', error.message);
    } else {
      console.log('✅ Utilisateur test créé:', TEST_EMAIL);
    }
  } catch (error) {
    console.log('❌ Erreur:', error.message);
  }
}

// Fonction pour nettoyer les données de test
async function cleanupTestData() {
  console.log('\n🧹 Nettoyage données test...');
  
  try {
    // Supprimer les événements webhook de test
    const { error: webhookError } = await supabase
      .from('stripe_webhook_events')
      .delete()
      .like('customer_email', '%test%');

    // Supprimer les emails de test
    const { error: emailError } = await supabase
      .from('emails')
      .delete()
      .like('to_address', '%test%');

    console.log('✅ Données test nettoyées');
  } catch (error) {
    console.log('❌ Erreur nettoyage:', error.message);
  }
}

// Exécuter selon l'argument
const command = process.argv[2];

switch (command) {
  case 'test':
    testStripeFlow();
    break;
  case 'create-user':
    createTestUser();
    break;
  case 'cleanup':
    cleanupTestData();
    break;
  default:
    console.log('Usage:');
    console.log('  npm run test:stripe test        - Tester le flow complet');
    console.log('  npm run test:stripe create-user - Créer un utilisateur test');
    console.log('  npm run test:stripe cleanup     - Nettoyer les données test');
}