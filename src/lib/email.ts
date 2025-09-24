import { supabase } from './supabase';

interface EmailData {
  to: string;
  subject: string;
  content: string;
}

/**
 * 🔹 Fonction générique d’envoi d’email
 * - Insère dans la table `emails` (historique)
 * - Déclenche l’Edge Function `send-email` (qui utilise Resend)
 */
export async function sendEmail({ to, subject, content }: EmailData) {
  try {
    const { data: email, error: dbError } = await supabase
      .from('emails')
      .insert({
        to_address: to,
        subject,
        content,
        status: 'pending'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    const { error: sendError } = await supabase.functions.invoke('send-email', {
      body: { to, subject, content }
    });

    if (sendError) throw sendError;

    return { success: true, email };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}
