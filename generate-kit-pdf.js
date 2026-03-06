import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputDir = join(__dirname, 'public', 'kit-influenceurs');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function generatePDF() {
    console.log('Génération du PDF Kit Partenaire Créatrice (V5 Pro)...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    let logoBase64 = '';
    try {
        const logoBuffer = fs.readFileSync(join(__dirname, 'public', 'logo-nowme.png'));
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (e) { }

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Programme Partenaire Créatrice – Club Nowme</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Outfit', sans-serif; color: #111; line-height: 1.65; margin: 0; padding: 0; background: #fff; }
        
        /* HEADER */
        .header { display: flex; justify-content: space-between; align-items: center; padding: 40px 60px 30px; border-bottom: 3px solid #ec4899; }
        .logo { max-width: 130px; }
        .header-text { text-align: right; }
        .header-text .label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #aaa; letter-spacing: 2px; }
        .header-text .title { font-size: 22px; font-weight: 900; color: #111; }
        
        /* SECTIONS */
        .section { padding: 30px 60px; }
        .section:nth-child(even) { background: #fafafa; }
        h1 { font-size: 28px; font-weight: 900; color: #111; margin: 0 0 8px; }
        h2 { font-size: 18px; font-weight: 800; color: #ec4899; margin: 25px 0 10px; text-transform: uppercase; letter-spacing: 1px; }
        h3 { font-size: 15px; font-weight: 700; color: #333; margin: 15px 0 6px; }
        p, li { font-size: 14px; color: #555; margin: 0 0 6px; }
        ul { padding-left: 18px; margin: 5px 0 10px; }
        li { margin-bottom: 5px; }
        
        /* HERO INTRO */
        .hero { padding: 35px 60px; background: linear-gradient(135deg, #fff0f7 0%, #fff 100%); border-bottom: 1px solid #fce7f3; }
        .hero p { font-size: 15px; color: #555; max-width: 700px; }
        
        /* HIGHLIGHT BOXES */
        .highlight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 15px 0; }
        .highlight-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 12px; padding: 16px 18px; }
        .highlight-card .icon { font-size: 20px; margin-bottom: 6px; }
        .highlight-card strong { font-size: 14px; font-weight: 800; color: #111; display: block; }
        .highlight-card span { font-size: 13px; color: #888; }
        
        /* KEY STATS ROW */
        .stats-row { display: flex; gap: 0; border: 2px solid #ec4899; border-radius: 14px; overflow: hidden; margin: 20px 0; }
        .stat { flex: 1; padding: 18px 12px; text-align: center; border-right: 1px solid #fce7f3; }
        .stat:last-child { border-right: none; }
        .stat .val { font-size: 26px; font-weight: 900; color: #ec4899; display: block; }
        .stat .lbl { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        
        /* AUDIENCE TABLE */
        table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        th { background: #ec4899; color: #fff; padding: 10px 14px; text-align: left; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 9px 14px; border-bottom: 1px solid #f3f4f6; color: #555; }
        tr:nth-child(even) td { background: #fafafa; }

        /* FORMATS */
        .format-list { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 12px 0; }
        .format-pill { background: #f3f4f6; border-radius: 8px; padding: 10px 14px; font-size: 13px; font-weight: 600; color: #333; text-align: center; }
        .format-pill .size { font-size: 11px; color: #999; display: block; margin-top: 2px; }
        
        /* CONDITIONS */
        .cg-section { padding: 25px 60px; }
        .cg-section h2 { font-size: 16px; font-weight: 800; color: #ec4899; margin: 20px 0 8px; text-transform: uppercase; border-left: 4px solid #ec4899; padding-left: 10px; }
        .cg-section p, .cg-section li { font-size: 13px; color: #666; }
        .cg-section ul { padding-left: 20px; }
        
        /* INTERDICTIONS */
        .forbidden-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; margin: 10px 0; }
        .forbidden-box li { color: #991b1b; font-size: 13px; }
        
        /* REJECTION TABLE */
        .rejection-table td:last-child { text-align: center; font-weight: 700; }
        .yes { color: #16a34a; }
        .no { color: #dc2626; }
        
        /* FOOTER */
        .footer { text-align: center; padding: 20px 60px 30px; font-size: 11px; color: #bbb; border-top: 1px solid #f3f4f6; }
        .footer strong { color: #888; }
        
        /* PAGE BREAK */
        .page-break { page-break-before: always; }
    </style>
</head>
<body>

<!-- ===== EN-TÊTE ===== -->
<div class="header">
  ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : '<strong style="font-size:20px;color:#ec4899;">NOWME</strong>'}
  <div class="header-text">
    <div class="label">Programme partenaire créatrice</div>
    <div class="title">Club Nowme × Créatrices de contenu</div>
  </div>
</div>

<!-- ===== INTRO ===== -->
<div class="hero">
  <h1>Club Nowme – Le Club Privé des Femmes qui Kiffent ✨</h1>
  <p>Club Nowme est le Club n°1 des sorties entre femmes (+30 ans) et des rencontres amicales en Île-de-France. Via un abonnement mensuel, nos membres accèdent à un <strong>Agenda Secret</strong> de sorties exclusives (apéros, ateliers, voyages...) et à <strong>+100 partenaires</strong> avec des réductions jusqu'à -50% (restos, massages, sport, mode...).</p>
  <p style="margin-top:10px;">Notre programme <strong>Partenaire Créatrice</strong> vous permet de générer des revenus en recommandant le Club à votre communauté, <strong>sans aucune obligation d'abonnement de votre part</strong>.</p>
</div>

<!-- ===== POURQUOI PROMOUVOIR ===== -->
<div class="section">
  <h2>Pourquoi promouvoir Club Nowme ?</h2>
  <div class="highlight-grid">
    <div class="highlight-card">
      <div class="icon">💸</div>
      <strong>Commission attractive : 15 € par abonnée</strong>
      <span>Montant fixe par conversion, versé mensuellement.</span>
    </div>
    <div class="highlight-card">
      <div class="icon">🎁</div>
      <strong>1 mois d'accès offert (optionnel)</strong>
      <span>Pour tester le Club en toute authenticité avant d'en parler.</span>
    </div>
    <div class="highlight-card">
      <div class="icon">❤️</div>
      <strong>Produit émotionnel qui convertit</strong>
      <span>La solitude & la routine touchent 80% des femmes actives : le Club répond à un vrai besoin.</span>
    </div>
    <div class="highlight-card">
      <div class="icon">🚀</div>
      <strong>Cookie longue durée : 30 jours</strong>
      <span>Si votre audience clique et s'abonne dans les 30 jours, la commission vous est attribuée.</span>
    </div>
    <div class="highlight-card">
      <div class="icon">🔑</div>
      <strong>Code promo personnalisé</strong>
      <span>Un code unique à votre nom = tracking transparent + avantage exclusif pour votre audience.</span>
    </div>
    <div class="highlight-card">
      <div class="icon">📨</div>
      <strong>Paiement simple</strong>
      <span>Virement ou PayPal le 5 du mois suivant, avec récapitulatif détaillé.</span>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat"><span class="val">15 €</span><span class="lbl">Commission / Abonnée</span></div>
    <div class="stat"><span class="val">30j</span><span class="lbl">Durée du cookie</span></div>
    <div class="stat"><span class="val">12,99€</span><span class="lbl">1er mois membre</span></div>
    <div class="stat"><span class="val">+100</span><span class="lbl">Partenaires -50%</span></div>
  </div>
</div>

<!-- ===== VOTRE AUDIENCE VA ADORER ===== -->
<div class="section">
  <h2>Votre audience va adorer si elle est...</h2>
  <table>
    <thead><tr><th>Profil</th><th>Besoin identifié</th><th>Ce que Nowme lui apporte</th></tr></thead>
    <tbody>
      <tr><td>Femme active 30-45 ans, Île-de-France</td><td>Manque de temps, copines perdues de vue</td><td>Agenda clé en main, nouvelles rencontres</td></tr>
      <tr><td>Nouvellement arrivée en ville</td><td>Pas de réseau social local</td><td>Communauté bienveillante, événements IRL</td></tr>
      <tr><td>Maman qui veut souffler</td><td>Envie de sorties "pour elle" sans culpabilité</td><td>Soirées entre filles, lâcher prise</td></tr>
      <tr><td>Femme 45-55 ans active</td><td>Nouvelles amitiés, envie d'explorer</td><td>Clubs thématiques, voyages, ateliers</td></tr>
    </tbody>
  </table>
</div>

<!-- ===== FORMATS ACCEPTÉS ===== -->
<div class="section">
  <h2>Formats de promotion acceptés</h2>
  <div class="format-list">
    <div class="format-pill">📱 Story Instagram<span class="size">1080 × 1920 px</span></div>
    <div class="format-pill">🖼️ Post Carré<span class="size">1080 × 1080 px</span></div>
    <div class="format-pill">🖼️ Post Portrait<span class="size">1080 × 1350 px</span></div>
    <div class="format-pill">🎬 Reel / TikTok<span class="size">Vertical, max 90 sec</span></div>
    <div class="format-pill">📧 Newsletter<span class="size">Email ou blog</span></div>
    <div class="format-pill">🎙️ Podcast / YouTube<span class="size">Mention orale + lien</span></div>
  </div>
  <p style="margin-top:10px;">Des <strong>visuels professionnels prêts à l'emploi</strong> (dans chaque format) ainsi que des <strong>scripts types</strong> sont disponibles dans le Pack Partenaire fourni à l'activation de votre partenariat.</p>
</div>

<!-- ===== PAGE 2 : CONDITIONS GENERALES ===== -->
<div class="page-break"></div>

<div class="header">
  ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : '<strong style="font-size:20px;color:#ec4899;">NOWME</strong>'}
  <div class="header-text">
    <div class="label">Conditions Générales</div>
    <div class="title">Programme Partenaire Créatrice — Club Nowme</div>
  </div>
</div>

<div class="cg-section">
  <p style="font-size:12px; color:#aaa; margin-top:10px;">Dernière mise à jour : Mars 2026. Ces conditions régissent la participation au programme Partenaire Créatrice de Club Nowme. En rejoignant, vous ("la Créatrice") acceptez ces conditions.</p>

  <h2>1. Admissibilité</h2>
  <ul>
    <li>Le programme est ouvert à toute créatrice de contenu approuvée par Club Nowme après examen de son profil.</li>
    <li>Les comptes à contenu illégal, discriminatoire, ou ciblant un public mineur sont exclus automatiquement.</li>
    <li>Aucun abonnement Club Nowme n'est requis pour participer.</li>
  </ul>

  <h2>2. Commission et Paiement</h2>
  <ul>
    <li><strong>Commission :</strong> 15 € fixe par abonnement validé généré via votre code promo unique.</li>
    <li><strong>Cookie :</strong> 30 jours à partir de l'utilisation du code promo.</li>
    <li>Les abonnements annulés dans les 14 jours (rétractation légale) ne donnent pas droit à commission.</li>
    <li><strong>Paiement :</strong> Virement bancaire ou PayPal, effectué le 5 du mois M+1, après validation des conversions.</li>
    <li>Un seuil minimal de <strong>30 €</strong> (≥ 2 conversions) est requis pour déclencher le paiement mensuel. En deçà, le montant est reporté au mois suivant.</li>
  </ul>

  <h2>3. Obligations de la Créatrice</h2>
  <ul>
    <li>Utiliser uniquement le code promo et les visuels fournis par Club Nowme pour le tracking.</li>
    <li>Mentionner le partenariat commercial de manière transparente dans vos publications (ex : "#partenariat", "#sponsorisé").</li>
    <li>Ne pas faire de promesses mensongères sur le Club, ses avantages ou ses tarifs.</li>
    <li>Respecter les lois applicables : RGPD, droits d'image, réglementation publicitaire (ARPP).</li>
  </ul>

  <h2>4. Interdictions</h2>
  <div class="forbidden-box">
    <ul>
      <li>Achat de mots-clés protégés en SEA (ex : "Club Nowme", "Nowme club", "avis Nowme").</li>
      <li>Création de faux profils ou de faux avis pour générer des conversions.</li>
      <li>Utilisation de méthodes de tracking non autorisées (scripts, bots, redirections frauduleuses).</li>
      <li>Diffusion de promotions inventées (faux rabais non communiqués par Club Nowme).</li>
    </ul>
  </div>

  <h2>5. Cas de rejet de commission</h2>
  <table class="rejection-table">
    <thead><tr><th>Situation</th><th>Commission rejetée ?</th></tr></thead>
    <tbody>
      <tr><td>Abonnement annulé dans les 14 jours (rétractation)</td><td class="no">✗ Rejetée</td></tr>
      <tr><td>Paiement échoué / carte refusée</td><td class="no">✗ Rejetée</td></tr>
      <tr><td>Fraude suspectée (auto-référencement, commande fictive)</td><td class="no">✗ Rejetée</td></tr>
      <tr><td>Non-respect des conditions du programme</td><td class="no">✗ Rejetée</td></tr>
      <tr><td>Abonnement actif après 30 jours</td><td class="yes">✓ Validée</td></tr>
    </tbody>
  </table>

  <h2>6. Résiliation</h2>
  <ul>
    <li>Club Nowme peut résilier le partenariat en cas de non-respect des conditions, avec un préavis de <strong>7 jours</strong> (sauf fraude avérée : résiliation immédiate).</li>
    <li>Les commissions validées avant résiliation restent dues et seront versées normalement.</li>
  </ul>

  <h2>7. Données et Confidentialité</h2>
  <ul>
    <li>Les données des membres Club Nowme restent la propriété exclusive de Club Nowme.</li>
    <li>La Créatrice s'engage à ne pas collecter, transmettre ou commercialiser ces données.</li>
    <li>Conformité RGPD requise sur les plateformes de la Créatrice.</li>
  </ul>

  <h2>8. Délais de modification</h2>
  <table>
    <thead><tr><th>Type de changement</th><th>Délai de préavis</th></tr></thead>
    <tbody>
      <tr><td>Modification des conditions du programme (commission, cookie…)</td><td>21 jours</td></tr>
      <tr><td>Mise à jour du site pouvant affecter le tracking</td><td>21 jours</td></tr>
      <tr><td>Suspension ou fermeture du programme</td><td>30 jours</td></tr>
    </tbody>
  </table>
</div>

<div class="footer">
  <strong>Club Nowme</strong> — contact@nowme.fr — 07 69 25 04 29 — Paris, Île-de-France<br />
  En rejoignant ce programme, vous confirmez avoir lu et accepté l'intégralité des conditions ci-dessus.
</div>

</body>
</html>`;

    await page.setContent(html, { waitUntil: 'load' });
    await page.waitForTimeout(800);

    const outputPath = join(outputDir, 'Kit_Partenaire_Creatrice_Nowme.pdf');
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
    });

    await browser.close();
    console.log('✅ PDF Partenaire Créatrice (V5 Pro) généré ! : ' + outputPath);
}

generatePDF().catch(console.error);
