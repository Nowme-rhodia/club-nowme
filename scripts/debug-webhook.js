#!/usr/bin/env node

// Script pour débugger les webhooks Stripe en temps réel
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugWebhook() {
  console.log('🔍 Debug webhook Stripe');
  console.log('=======================');

  try {
    // 1. Vérifier les variables d'environnement
    console.log('\n1️⃣ Variables d\'environnement :');
    console.log('SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL);
    console.log('SUPABASE_SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('STRIPE_SECRET_KEY:', !!process.env.STRIPE_SECRET_KEY);
    console.log('STRIPE_WEBHOOK_SECRET:', !!process.env.STRIPE_WEBHOOK_SECRET);

    // 2. Tester la connexion Supabase
    console.log('\n2️⃣ Test connexion Supabase :');
    const { data, error } = await supabase
      .from('stripe_webhook_events')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Erreur connexion:', error.message);
    } else {
      console.log('✅ Connexion OK');
    }

    // 3. Voir les derniers événements webhook
    console.log('\n3️⃣ Derniers événements webhook :');
    const { data: events, error: eventsError } = await supabase
      .from('stripe_webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (eventsError) {
      console.log('❌ Erreur lecture events:', eventsError.message);
    } else {
      console.log(`📊 ${events.length} événements trouvés :`);
      events.forEach(event => {
        console.log(`   ${event.created_at} | ${event.event_type} | ${event.status} | ${event.customer_email || 'no email'}`);
        if (event.error) {
          console.log(`     ❌ Erreur: ${event.error}`);
        }
      });
    }

    // 4. Voir les emails en attente
    console.log('\n4️⃣ Emails en attente :');
    const { data: emails, error: emailsError } = await supabase
      .from('emails')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3);

    if (emailsError) {
      console.log('❌ Erreur lecture emails:', emailsError.message);
    } else {
      console.log(`📧 ${emails.length} emails en attente :`);
      emails.forEach(email => {
        console.log(`   ${email.created_at} | ${email.to_address} | ${email.subject}`);
      });
    }

    // 5. Tester la fonction webhook directement
    console.log('\n5️⃣ Test fonction webhook :');
    
    const testEvent = {
      id: 'evt_debug_' + Date.now(),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_debug_' + Date.now(),
          customer: 'cus_debug_' + Date.now(),
          customer_email: 'debug@nowme.fr',
          subscription: 'sub_debug_' + Date.now(),
          amount_total: 1299
        }
      }
    };

    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testEvent)
      }
    );

    const responseText = await response.text();
    
    if (response.ok) {
      console.log('✅ Webhook test OK:', responseText);
    } else {
      console.log('❌ Webhook test échoué:', response.status, responseText);
    }

  } catch (error) {
    console.error('❌ Erreur debug:', error.message);
  }
}

async function watchWebhooks() {
  console.log('👀 Surveillance webhooks en temps réel...');
  console.log('Appuyez sur Ctrl+C pour arrêter\n');

  let lastEventId = null;

  const checkNewEvents = async () => {
    try {
      const { data: events, error } = await supabase
        .from('stripe_webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && events.length > 0) {
        const latestEvent = events[0];
        
        if (latestEvent.id !== lastEventId) {
          lastEventId = latestEvent.id;
          
          console.log(`🆕 ${new Date().toLocaleTimeString()} | ${latestEvent.event_type} | ${latestEvent.status}`);
          console.log(`   📧 ${latestEvent.customer_email || 'no email'}`);
          
          if (latestEvent.error) {
            console.log(`   ❌ ${latestEvent.error}`);
          }
          
          if (latestEvent.status === 'completed') {
            console.log('   ✅ Traité avec succès');
          }
        }
      }
    } catch (error) {
      console.error('Erreur surveillance:', error.message);
    }
  };

  // Vérifier toutes les 2 secondes
  setInterval(checkNewEvents, 2000);
}

// Exécuter selon l'argument
const command = process.argv[2];

switch (command) {
  case 'debug':
    debugWebhook();
    break;
  case 'watch':
    watchWebhooks();
    break;
  default:
    console.log('Usage:');
    console.log('  npm run webhook:debug  - Débugger la configuration');
    console.log('  npm run webhook:watch  - Surveiller en temps réel');
}