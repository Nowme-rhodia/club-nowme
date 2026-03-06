import Stripe from 'stripe';
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia'
});

const outputDir = join(__dirname, 'public', 'kit-influenceurs', 'pdf-personnalises');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 20 nouveaux codes aléatoires (format KIF + 4 caractères) pour éviter les conflits avec NW*
// Et pour marquer la "nouvelle version" avec condition de renouvellement
const PROMO_CODES = [
  'KIFM2Z', 'KIFR9P', 'KIFB4W', 'KIFJ7T', 'KIFH3X',
  'KIFN1V', 'KIFK8M', 'KIFC5D', 'KIFG2Y', 'KIFQ6L',
  'KIFS3N', 'KIFT4R', 'KIFP7K', 'KIFV9W', 'KIFW1J',
  'KIFX8Z', 'KIFZ2Q', 'KIFY5B', 'KIFA3M', 'KIFD7V'
];

const DISCOUNT_PERCENT = 10;

// Désactiver absolument tout ce qui commence par NOWME ou NW pour faire place nette
async function deactivateOldCodes() {
  console.log('🗑️  Désactivation des anciens codes (NOWME*, NW*, KIF*)...');
  try {
    const list = await stripe.promotionCodes.list({ limit: 100, active: true });
    let deactivated = 0;
    for (const p of list.data) {
      if (p.code.startsWith('NOWME') || p.code.startsWith('NW') || p.code.startsWith('KIF')) {
        await stripe.promotionCodes.update(p.id, { active: false });
        process.stdout.write('.'); // Juste un point pour pas polluer
        deactivated++;
      }
    }
    console.log(`\n  → ${deactivated} codes désactivés.\n`);
  } catch (e) {
    console.warn('  ⚠️  Erreur lors de la désactivation :', e.message);
  }
}

async function createStripeCoupon() {
  console.log('📦 Création du coupon Stripe (-10% 1er mois)...');
  const coupon = await stripe.coupons.create({
    percent_off: DISCOUNT_PERCENT,
    duration: 'once',
    name: 'Condition : Payé après 2ème mois',
  });
  console.log(`✅ Coupon créé : ${coupon.id}\n`);
  return coupon.id;
}

async function createPromoCode(couponId, code) {
  try {
    const promoCode = await stripe.promotionCodes.create({
      coupon: couponId,
      code: code,
      metadata: {
        programme: 'Partenaire Créatrice V2',
        condition: 'Renouvellement requis',
        created_at: new Date().toISOString()
      }
    });
    console.log(`  ✅ ${code} créé.`);
    return promoCode.id;
  } catch (err) {
    if (err.code === 'resource_already_exists') {
      console.log(`  ⚠️  ${code} existe déjà.`);
      return 'EXISTS';
    }
    throw err;
  }
}

async function generatePDF(browser, code, logoBase64) {
  const page = await browser.newPage();

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Programme Partenaire Créatrice – Club Nowme</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Outfit', sans-serif; color: #111; line-height: 1.6; margin: 0; padding: 0; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; padding: 40px 60px 20px; border-bottom: 3px solid #ec4899; }
        .logo { max-width: 130px; }
        .header-text { text-align: right; }
        .header-text .label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #aaa; letter-spacing: 2px; }
        .header-text .title { font-size: 20px; font-weight: 900; color: #111; }
        .section { padding: 25px 60px; }
        .section:nth-child(even) { background: #fafafa; }
        h1 { font-size: 26px; font-weight: 900; color: #111; margin: 0 0 8px; }
        h2 { font-size: 17px; font-weight: 800; color: #ec4899; margin: 20px 0 10px; text-transform: uppercase; letter-spacing: 1px; }
        p { font-size: 14px; color: #555; margin: 0 0 8px; }
        .hero { padding: 30px 60px; background: linear-gradient(135deg, #fff0f7 0%, #fff 100%); border-bottom: 1px solid #fce7f3; }
        .code-block { background: #111; border-radius: 16px; padding: 20px 40px; margin: 15px 0; display: flex; align-items: center; justify-content: space-between; }
        .code-label { color: #777; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .code-value { color: #ec4899; font-size: 40px; font-weight: 900; letter-spacing: 6px; }
        .code-desc { color: #aaa; font-size: 12px; }
        .highlight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 15px 0; }
        .highlight-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 12px; padding: 14px 16px; }
        .highlight-card strong { font-size: 14px; font-weight: 800; color: #111; display: block; }
        .highlight-card span { font-size: 12px; color: #888; }
        .stats-row { display: flex; border: 2px solid #ec4899; border-radius: 14px; overflow: hidden; margin: 15px 0; }
        .stat { flex: 1; padding: 15px 10px; text-align: center; border-right: 1px solid #fce7f3; }
        .stat:last-child { border-right: none; }
        .stat .val { font-size: 22px; font-weight: 900; color: #ec4899; display: block; }
        .stat .lbl { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
        th { background: #ec4899; color: #fff; padding: 8px 12px; text-align: left; }
        td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; color: #555; }
        .format-list { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 10px 0; }
        .format-pill { background: #f3f4f6; border-radius: 8px; padding: 8px; font-size: 12px; font-weight: 600; color: #333; text-align: center; }
        .page-break { page-break-before: always; }
        .cg-section h2 { font-size: 15px; border-left: 4px solid #ec4899; padding-left: 10px; }
        .cg-section p, .cg-section li { font-size: 12px; color: #666; }
        .forbidden-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px; margin: 10px 0; }
        .forbidden-box li { color: #991b1b; font-size: 12px; }
        .rejection-table td:last-child { text-align: center; font-weight: 700; }
        .yes { color: #16a34a; }
        .no { color: #dc2626; }
        .footer { text-align: center; padding: 20px 60px; font-size: 10px; color: #bbb; border-top: 1px solid #f3f4f6; }
    </style>
</head>
<body>

<div class="header">
  ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : '<strong style="font-size:20px;color:#ec4899;">NOWME</strong>'}
  <div class="header-text">
    <div class="label">Programme partenaire créatrice</div>
    <div class="title">Club Nowme × Créatrices de contenu</div>
  </div>
</div>

<div class="hero">
  <h1>Club Nowme – Le Club Privé des Femmes qui Kiffent ✨</h1>
  <p>Club Nowme est le Club n°1 des sorties entre femmes (+30 ans) et des rencontres amicales en Île-de-France. Un abonnement mensuel débloquant un <strong>Agenda Secret</strong> de sorties exclusives et <strong>+100 partenaires</strong> négociés jusqu'à -50%.</p>
</div>

<div class="section">
  <h2>🎟️ Votre code & Lien de partage</h2>
  <p>Pour chaque nouvelle membre parrainée, vous devez <strong>impérativement</strong> lui donner votre code ET le lien vers la page d'inscription.</p>
  <div class="code-block">
    <div>
      <div class="code-label">Lien à distribuer</div>
      <div style="color:#fff; font-size:16px; font-weight:700; margin-bottom:15px;">club.nowme.fr/abonnement</div>
      
      <div class="code-label">Code Promo à appliquer</div>
      <div class="code-value">${code}</div>
      <div class="code-desc">Offre -10% sur le 1er mois &nbsp;•&nbsp; Valide 3 mois</div>
    </div>
    <div style="color:#666; font-size:12px; text-align:right; line-height:1.8;">
      <div style="color:#ec4899; font-weight:800; font-size:13px; margin-bottom:5px;">Marche à suivre :</div>
      <div>1. Donnez le lien : <strong>club.nowme.fr/abonnement</strong></div>
      <div>2. Donnez votre code : <strong>${code}</strong></div>
      <div>3. La cliente saisit le code sur Stripe</div>
      <div>4. Votre commission est enregistrée 🚀</div>
    </div>
  </div>
  <p style="color:#ec4899; font-weight:700; font-size:14px;">💸 Commission : 15 € par abonnée, versés après son 1er renouvellement (2ème mois).</p>
</div>

<div class="section">
  <h2>📝 Exemples de messages à diffuser</h2>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
    <div style="background: #fff; padding: 15px; border: 1px dashed #ec4899; border-radius: 12px;">
      <strong style="color: #ec4899; font-size: 13px; display: block; margin-bottom: 5px;">Option A - Story / Vidéo :</strong>
      <p style="font-size: 12px; font-style: italic; margin: 0;">« Hello ! Marre de la routine ? J'ai rejoint le <strong>Club Nowme</strong>, c'est le nouveau groupe d'amies qui t'attend (30, 40, 50 ans et +). C'est un agenda de sorties pépites et des réductions de folie chez +100 partenaires. <br><br>Passez par mon lien <strong>club.nowme.fr/abonnement</strong> et surtout utilisez mon code <strong>${code}</strong> pour avoir -10% sur votre 1er mois ! »</p>
    </div>
    <div style="background: #fff; padding: 15px; border: 1px dashed #ec4899; border-radius: 12px;">
      <strong style="color: #ec4899; font-size: 13px; display: block; margin-bottom: 5px;">Option B - Post / Caption :</strong>
      <p style="font-size: 12px; font-style: italic; margin: 0;">« Tes futures meilleures amies sont déjà dans le Club ! ✨ <br><br>Le <strong>Club Nowme</strong> c'est l'app n°1 pour sortir et se rencontrer entre femmes actives en Île-de-France. Rentre dans le cercle avec mon code <strong>${code}</strong> (via <strong>club.nowme.fr/abonnement</strong>). Sorties, rires et bons plans garantis ! 👇 »</p>
    </div>
  </div>
</div>

<div class="section">
  <h2>Rémunération & Avantages</h2>
  <div class="highlight-grid">
    <div class="highlight-card"><strong>💸 15 € / Abonnée fidèle</strong><span>Payé dès le début de son 2ème mois d'abonnement.</span></div>
    <div class="highlight-card"><strong>🎁 Test du Club offert</strong><span>1 mois d'accès gratuit pour créer du contenu authentique.</span></div>
    <div class="highlight-card"><strong>❤️ Produit ultra-fédérateur</strong><span>Répond au besoin vital de lien social des femmes actives.</span></div>
    <div class="highlight-card"><strong>🚀 Cookie 30 jours</strong><span>Suivi assuré si l'abonnement se fait plus tard.</span></div>
  </div>
  <div class="stats-row">
    <div class="stat"><span class="val">15 €</span><span class="lbl">Comm. / Fidèle</span></div>
    <div class="stat"><span class="val">30j</span><span class="lbl">Cookie</span></div>
    <div class="stat"><span class="val">12,99€</span><span class="lbl">1er mois membre</span></div>
    <div class="stat"><span class="val">+100</span><span class="lbl">Partenaires</span></div>
  </div>
</div>

<div class="section">
  <h2>Cible & Formats</h2>
  <table>
    <thead><tr><th>Profil cible</th><th>Ce que Nowme lui apporte</th></tr></thead>
    <tbody>
      <tr><td>Femme active 30-50 ans</td><td>Agenda clé en main, déconnexion garantie.</td></tr>
      <tr><td>Nouvellement arrivée en ville</td><td>Réseau amical bienveillant immédiat.</td></tr>
      <tr><td>Maman besoin de temps "pour elle"</td><td>Sorties soirées et ateliers entre copines.</td></tr>
    </tbody>
  </table>
  <div class="format-list">
    <div class="format-pill">📱 Story Instagram</div>
    <div class="format-pill">🖼️ Post Portrait</div>
    <div class="format-pill">🎬 Reel / TikTok</div>
  </div>
</div>

<div class="page-break"></div>

<div class="cg-section section">
  <h2>1. Condition de Commission</h2>
  <p>La commission de 15 € est acquise uniquement si la personne parrainée <strong>renouvelle son abonnement pour un deuxième mois</strong>. Si l'abonnée annule avant son premier renouvellement, aucune commission n'est due. Cela permet de garantir une communauté de membres engagées.</p>
  
  <h2>2. Paiement</h2>
  <p>Paiement par Virement ou PayPal le 5 du mois M+1 suivant le mois du renouvellement. Seuil minimum de paiement : 30 € (soit 2 abonnées fidèles).</p>

  <h2>3. Interdictions strictes</h2>
  <div class="forbidden-box">
    <ul>
      <li>Ads sur les réseaux sociaux via les mots-clés "Nowme".</li>
      <li>Faux avis ou promesses non conformes à l'offre.</li>
    </ul>
  </div>

  <h2>4. Cas de Rejet</h2>
  <table>
    <thead><tr><th>Cas</th><th>Statut Commission</th></tr></thead>
    <tbody>
      <tr><td>Annulation dans les 14j (rétractation)</td><td class="no">✗ Rejetée</td></tr>
      <tr><td>Annulation avant le 2ème mois</td><td class="no">✗ Rejetée</td></tr>
      <tr><td>Renouvellement 2ème mois effectué</td><td class="yes">✓ Validée</td></tr>
    </tbody>
  </table>
</div>

<div class="footer">
  <strong>Club Nowme</strong> — contact@nowme.fr — Paris, France<br />
  Code personnel : <strong>${code}</strong>
</div>

</body>
</html>`;

  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const outputPath = join(outputDir, `Kit_Partenaire_${code}.pdf`);

  // Tentative d'écriture avec gestion d'erreur EBUSY
  try {
    await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
  } catch (e) {
    if (e.code === 'EBUSY') {
      console.warn(`  ⚠️  Fichier ${code}.pdf verrouillé, tentative avec suffixe...`);
      await page.pdf({ path: join(outputDir, `Kit_Partenaire_${code}_NEW.pdf`), format: 'A4', printBackground: true });
    } else throw e;
  }

  await page.close();
  return outputPath;
}

async function main() {
  console.log('\n🚀 Génération des 20 kits V2 (Condition Renouvellement)\n');

  // Logo
  let logoBase64 = '';
  try {
    const logoBuffer = fs.readFileSync(join(__dirname, 'public', 'logo-nowme.png'));
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (e) { }

  // 1. Désactiver anciens codes
  await deactivateOldCodes();

  // 2. Nettoyer dossier PDF
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);
    for (const f of files) {
      try { fs.unlinkSync(join(outputDir, f)); } catch (e) { }
    }
  }

  // 3. Créer coupon Stripe
  const couponId = await createStripeCoupon();

  // 4. Lancer navigateur unique
  const browser = await chromium.launch();

  // 5. Créer les 20 codes + PDFs
  const results = [];
  console.log('🎟️  Création des codes + PDFs...\n');
  for (const code of PROMO_CODES) {
    const stripeId = await createPromoCode(couponId, code);
    await generatePDF(browser, code, logoBase64);
    results.push({ code, stripeId });
    console.log(`  📄 PDF : Kit_Partenaire_${code}.pdf`);
  }

  await browser.close();

  // 6. CSV de suivi
  const csvPath = join(outputDir, '_suivi_codes_v2.csv');
  const csv = ['Code,Stripe_ID,Date_creation']
    .concat(results.map(r => `${r.code},${r.stripeId || ''},${new Date().toISOString()}`))
    .join('\n');
  fs.writeFileSync(csvPath, csv);

  console.log('\n✅ TERMINÉ !');
  console.log(`📁 Dossier : ${outputDir}`);
  console.log(`📊 Suivi : _suivi_codes_v2.csv`);
}

main().catch(console.error);
