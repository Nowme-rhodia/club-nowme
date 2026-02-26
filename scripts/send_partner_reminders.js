
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const DRY_RUN = process.argv.includes('--dry-run');

async function sendReminders() {
  console.log(`🚀 Starting partner reminders script (Dry run: ${DRY_RUN})`);

  // 1. Fetch all partners with their offers and user profile emails
  // Note: We use the relationship info found in previous step: offers_partner_id_fkey
  const { data: partners, error } = await supabase
    .from('partners')
    .select(`
            id,
            business_name,
            contact_name,
            contact_email,
            user_id,
            offers!offers_partner_id_fkey (
                id,
                status,
                title
            )
        `);

  if (error) {
    console.error('Error fetching partners:', error);
    return;
  }

  console.log(`📊 Found ${partners.length} partners. Analyzing offers...`);

  let eligibleCount = 0;
  let ignoredCount = 0;

  for (const partner of partners) {
    const offers = partner.offers || [];

    const draftOffers = offers.filter(o => o.status === 'draft');
    const readyOffers = offers.filter(o => o.status === 'ready');

    // Rule: Send if has at least one draft or ready offer
    if (draftOffers.length > 0 || readyOffers.length > 0) {
      eligibleCount++;

      const email = partner.contact_email;
      const name = partner.contact_name || partner.business_name || 'Partenaire';
      const draftCount = draftOffers.length;
      const readyCount = readyOffers.length;
      const approvedCount = offers.filter(o => o.status === 'approved' || o.status === 'active').length;

      console.log(`✅ Eligible: ${name} (${email}) - Drafts: ${draftCount}, Ready: ${readyCount}${approvedCount > 0 ? ` (Already has ${approvedCount} approved)` : ''}`);

      if (!DRY_RUN) {
        await enqueueEmail(partner, name, email, draftCount, readyCount);
      }
    } else {
      ignoredCount++;
    }
  }

  console.log(`\n🏁 Summary:`);
  console.log(`- Total partners: ${partners.length}`);
  console.log(`- Eligible for reminder: ${eligibleCount}`);
  console.log(`- Ignored (no draft/ready): ${ignoredCount}`);

  if (DRY_RUN) {
    console.log('\n💡 This was a dry run. No emails were enqueued.');
  } else {
    console.log(`\n✅ ${eligibleCount} emails enqueued in the 'emails' table.`);
  }
}

async function enqueueEmail(partner, name, email, draftCount, readyCount) {
  const subject = `🎀 Coucou ${name}, tes offres t'attendent sur Nowme !`;

  let draftText = "";
  if (draftCount > 0) {
    draftText = `<li><strong>${draftCount}</strong> offre${draftCount > 1 ? 's' : ''} en brouillon</li>`;
  }

  let readyText = "";
  if (readyCount > 0) {
    readyText = `<li><strong>${readyCount}</strong> offre${readyCount > 1 ? 's' : ''} prête${readyCount > 1 ? 's' : ''} mais pas encore soumise${readyCount > 1 ? 's' : ''}</li>`;
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FAFAFA;">
  <div style="background-color: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #BF2778; margin: 0; font-size: 24px;">Coucou ${name} ! 👋</h1>
    </div>

    <p style="font-size: 16px; color: #555;">
      On a repéré que tu as des offres qui dorment sur ton espace partenaire ! 😴<br><br>
      Pour qu'elles soient visibles dans "Tous les kiffs" et que nos abonnées puissent en profiter, il faut les soumettre pour validation.
    </p>

    <div style="background-color: #FFF0F7; border-left: 4px solid #BF2778; padding: 20px; border-radius: 4px; margin: 25px 0;">
      <p style="margin-top: 0; font-weight: bold; color: #BF2778;">Tes offres en attente :</p>
      <ul style="margin-bottom: 0; padding-left: 20px; color: #444;">
        ${draftText}
        ${readyText}
      </ul>
    </div>

    <p style="font-size: 16px; color: #555;">
      Peux-tu te connecter pour les soumettre ? C'est l'étape finale pour être affiché auprès de toute la communauté ! ✨
    </p>

    <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
      <a href="https://club.nowme.fr/partner/dashboard" style="background-color: #BF2778; color: white; padding: 14px 28px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(191, 39, 120, 0.3);">
        Me connecter et soumettre mes offres
      </a>
    </div>

    <p style="text-align: center; font-size: 14px; color: #888; margin-top: 40px;">
      Besoin d'aide ? N'hésite pas à répondre directement à cet email.
    </p>

    <p style="text-align: center; font-size: 14px; color: #888;">
      À très vite,<br>
      L'équipe Nowme 💕
    </p>
  </div>
</body>
</html>
    `;

  const { error } = await supabase.from('emails').insert([
    {
      to_address: email,
      subject: subject,
      content: htmlContent,
      status: 'pending'
    }
  ]);

  if (error) {
    console.error(`❌ Error enqueuing email for ${email}:`, error);
  } else {
    console.log(`📧 Enqueued email for ${email}`);
  }
}

sendReminders();
