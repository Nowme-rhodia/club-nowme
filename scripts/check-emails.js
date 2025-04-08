import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkEmails() {
  try {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log('\nLast 10 emails:');
    console.log('---------------');
    data.forEach(email => {
      console.log(`
To: ${email.to_address}
Subject: ${email.subject}
Status: ${email.status}
${email.error ? 'Error: ' + email.error : ''}
Sent at: ${email.sent_at || 'Not sent yet'}
---`);
    });
  } catch (error) {
    console.error('Error checking emails:', error);
  }
}

checkEmails();