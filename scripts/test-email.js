import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testEmail() {
  try {
    console.log('🚀 Testing email functionality...');
    console.log('--------------------------------');

    const { error } = await supabase.functions.invoke('send-email', {
      body: {
        to: 'contact@nowme.fr',
        subject: 'Test Email',
        content: `
          Bonjour,

          Ceci est un email de test pour vérifier la configuration SMTP.

          Si vous recevez cet email, cela signifie que la configuration fonctionne correctement.

          Cordialement,
          L'équipe technique
        `
      }
    });

    if (error) throw error;
    console.log('✅ Email sent successfully');
    
    // Check email status in database
    const { data: emailData, error: dbError } = await supabase
      .from('emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError) throw dbError;

    console.log('\nEmail details:');
    console.log('-------------');
    console.log(`Status: ${emailData.status}`);
    console.log(`Sent at: ${emailData.sent_at || 'Not sent yet'}`);
    if (emailData.error) {
      console.log(`Error: ${emailData.error}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testEmail();