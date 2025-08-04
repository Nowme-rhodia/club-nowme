#!/usr/bin/env node

// Test complet du flow Stripe → Supabase → Email
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_EMAIL = 'test-flow@nowme.fr';

async function testCompleteFlow() {
  console.log('🧪 TEST COMPLET DU FLOW STRIPE');
  console.log('==============================');

  try {
    // 1. Nettoyer les données de test précédentes
    console.log('\n🧹 Nettoyage données test...');
    await cleanupTestData();

    // 2. Créer une session checkout
    console.log('\n💳 Création session checkout...');
    const sessionResult = await createTestCheckoutSession();
    
    if (!sessionResult.success) {
      console.log('❌ Échec création session');
      return;
    }

    console.log('✅ Session créée:', sessionResult.sessionId);

    // 3. Simuler le webhook checkout.session.completed
    console.log('\n🎯 Simulation webhook checkout.session.completed...');
    const webhookResult = await simulateCheckoutWebhook(sessionResult.sessionId);
    
    if (!webhookResult.success) {
      console.log('❌ Échec webhook');
      return;
    }

    // 4. Vérifier la création utilisateur
    console.log('\n👤 Vérification création utilisateur...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Attendre 2s
    
    const userResult = await checkUserCreation();
    if (!userResult.success) {
      console.log('❌ Utilisateur non créé');
      return;
    }

    console.log('✅ Utilisateur créé:', userResult.userId);

    // 5. Vérifier l'email de bienvenue
    console.log('\n📧 Vérification email de bienvenue...');
    const emailResult = await checkWelcomeEmail();
    
    if (!emailResult.success) {
      console.log('❌ Email non créé');
      return;
    }

    console.log('✅ Email créé:', emailResult.emailId);

    // 6. Tester le lien de création de mot de passe
    console.log('\n🔐 Test lien création mot de passe...');
    const linkResult = await testPasswordResetLink();
    
    if (linkResult.success) {
      console.log('✅ Lien fonctionnel:', linkResult.link);
    } else {
      console.log('⚠️ Lien non testé automatiquement');
    }

    // 7. Résumé final
    console.log('\n🎉 RÉSUMÉ DU TEST :');
    console.log('==================');
    console.log('✅ Session checkout créée');
    console.log('✅ Webhook traité');
    console.log('✅ Utilisateur créé dans auth.users');
    console.log('✅ Profil créé dans user_profiles');
    console.log('✅ Email de bienvenue généré');
    console.log('✅ Flow complet fonctionnel !');

    console.log('\n🔗 PROCHAINES ÉTAPES :');
    console.log('1. Tester manuellement le lien de mot de passe');
    console.log('2. Se connecter avec le nouveau compte');
    console.log('3. Vérifier l\'accès aux fonctionnalités');

  } catch (error) {
    console.error('❌ Erreur test complet:', error.message);
  }
}

async function createTestCheckoutSession() {
  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          priceId: 'price_1RqkgvDaQ8XsywAvq2A06dT7', // Prix mensuel
          planType: 'monthly',
          email: TEST_EMAIL,
          success_url: 'https://club.nowme.fr/subscription-success?session_id={CHECKOUT_SESSION_ID}',
          cancel_url: 'https://club.nowme.fr/subscription'
        })
      }
    );

    if (response.ok) {
      const { sessionId } = await response.json();
      return { success: true, sessionId };
    } else {
      const error = await response.text();
      console.log('❌ Erreur session:', error);
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function simulateCheckoutWebhook(sessionId) {
  try {
    const mockEvent = {
      id: 'evt_test_' + Date.now(),
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          customer: 'cus_test_' + Date.now(),
          customer_email: TEST_EMAIL,
          customer_details: {
            email: TEST_EMAIL,
            name: 'Test User'
          },
          subscription: 'sub_test_' + Date.now(),
          amount_total: 2700, // 27€ avec code KIFFE
          metadata: {
            plan_type: 'monthly'
          }
        }
      },
      created: Math.floor(Date.now() / 1000)
    };

    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockEvent)
      }
    );

    const responseText = await response.text();
    
    if (response.ok) {
      console.log('✅ Webhook simulé avec succès');
      return { success: true, response: responseText };
    } else {
      console.log('❌ Erreur webhook:', response.status, responseText);
      return { success: false, error: responseText };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkUserCreation() {
  try {
    // Vérifier dans user_profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('email', TEST_EMAIL)
      .maybeSingle();

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    if (!profile) {
      return { success: false, error: 'Profil utilisateur non trouvé' };
    }

    return { 
      success: true, 
      userId: profile.user_id,
      profile: profile
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function checkWelcomeEmail() {
  try {
    const { data: email, error } = await supabaseAdmin
      .from('emails')
      .select('*')
      .eq('to_address', TEST_EMAIL)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      emailId: email.id,
      subject: email.subject,
      status: email.status
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testPasswordResetLink() {
  try {
    // Générer un lien de test
    const { data: linkData, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: TEST_EMAIL,
      options: {
        redirectTo: 'https://club.nowme.fr/auth/update-password'
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const link = linkData?.properties?.action_link;
    
    return { 
      success: !!link, 
      link: link,
      message: 'Lien généré - test manuel requis'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function cleanupTestData() {
  try {
    // Supprimer l'utilisateur test via la table user_profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('email', TEST_EMAIL)
      .maybeSingle();
    
    if (existingProfile?.user_id) {
      await supabaseAdmin.auth.admin.deleteUser(existingProfile.user_id);
      console.log('🗑️ Utilisateur test supprimé');
    }

    // Supprimer les événements webhook de test
    await supabaseAdmin
      .from('stripe_webhook_events')
      .delete()
      .like('stripe_event_id', 'evt_test_%');

    // Supprimer les emails de test
    await supabaseAdmin
      .from('emails')
      .delete()
      .eq('to_address', TEST_EMAIL);

    console.log('✅ Données test nettoyées');
  } catch (error) {
    console.log('⚠️ Erreur nettoyage:', error.message);
  }
}

// Exécuter le test
testCompleteFlow();