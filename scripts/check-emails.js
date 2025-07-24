#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { program } from 'commander';

// Charger les variables d'environnement
dotenv.config();

program
  .version('1.0.0')
  .description('Vérification des emails envoyés via Supabase')
  .option('-l, --limit <number>', 'Nombre d\'emails à afficher', '10')
  .option('-s, --status <status>', 'Filtrer par statut (sent, pending, error)')
  .parse(process.argv);

const options = program.opts();

async function checkEmails() {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variables d\'environnement manquantes:');
      console.error('   - VITE_SUPABASE_URL');
      console.error('   - VITE_SUPABASE_ANON_KEY');
      process.exit(1);
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Construire la requête
    let query = supabase
      .from('emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(options.limit));
      
    // Ajouter le filtre de statut si spécifié
    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('ℹ️ Aucun email trouvé avec les critères spécifiés');
      return;
    }

    console.log(`\n📧 ${data.length} derniers emails:`);
    console.log('═'.repeat(50));
    
    data.forEach(email => {
      console.log(`
📩 ID: ${email.id}
👤 Destinataire: ${email.to_address}
📝 Sujet: ${email.subject}
🔄 Statut: ${email.status}
${email.error ? '❌ Erreur: ' + email.error : ''}
⏱️ Créé le: ${new Date(email.created_at).toLocaleString()}
${email.sent_at ? '✅ Envoyé le: ' + new Date(email.sent_at).toLocaleString() : '⏳ Non envoyé'}
${'─'.repeat(50)}`);
    });
    
    console.log(`\n✅ Total: ${data.length} email(s)`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des emails:', error.message);
    process.exit(1);
  }
}

checkEmails();