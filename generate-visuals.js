import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Sélection de photos plus "communauté de filles"
const photos = [
  'images/IMG_6826.JPEG', // Mettre les bons chemins ici si possible, sinon on garde des valeurs par defaut du public/images
  'images/20250523_160815.jpg',
  'images/IMG_20240407_194459.jpg'
];

// Messages adaptés à la cible féminine / amitié / bons plans
const messages = [
  {
    title: "Rejoins le Club n°1<br/>des femmes qui kiffent",
    subtitle: "Le seul réseau de sorties 100% féminin dédié au kiff en IDF ✨"
  },
  {
    title: "Tes sorties<br/>à prix Club",
    subtitle: "Accède aux pépites d'IDF avec jusqu'à -50% de réduction 💸"
  },
  {
    title: "Retrouve l'énergie<br/>d'une bande de copines",
    subtitle: "Tes nouvelles amies (30-40-50+) t'attendent déjà 💕"
  }
];

// 3 Formats demandés: Story, Post Carré, Post Portrait
const formats = [
  { name: 'story', width: 1080, height: 1920, titleSize: '80px', logoWidth: '350px' },
  { name: 'post-carre', width: 1080, height: 1080, titleSize: '70px', logoWidth: '250px' },
  { name: 'post-portrait', width: 1080, height: 1350, titleSize: '75px', logoWidth: '300px' }
];

const logoPath = 'logo-nowme.png';
const outputDir = join(__dirname, 'public', 'kit-influenceurs');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateVisuals() {
  console.log('Lancement du navigateur pour générer les visuels multiples formats...');
  const browser = await chromium.launch();

  for (let f = 0; f < formats.length; f++) {
    const format = formats[f];
    const page = await browser.newPage({
      viewport: { width: format.width, height: format.height },
      deviceScaleFactor: 2
    });

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const message = messages[i];
      console.log(`Génération du format ${format.name} avec ${photo}...`);

      let imgBase64 = '';
      try {
        const imgBuffer = fs.readFileSync(join(__dirname, 'public', photo));
        imgBase64 = `data:image/jpeg;base64,${imgBuffer.toString('base64')}`;
      } catch (e) {
        console.warn(`Attention: Photo ${photo} introuvable. Utilisation d'un fond noir.`);
      }

      let logoBase64 = '';
      try {
        const logoBuffer = fs.readFileSync(join(__dirname, 'public', logoPath));
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      } catch (e) {
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
            body, html {
              margin: 0; padding: 0;
              width: ${format.width}px; height: ${format.height}px;
              font-family: 'Outfit', sans-serif;
              background-color: #000; overflow: hidden;
              display: flex; flex-direction: column;
            }
            .background {
              position: absolute; top: 0; left: 0;
              width: 100%; height: 100%;
              ${imgBase64 !== '' ? `background-image: url('${imgBase64}');` : ''}
              background-size: cover; background-position: center;
              z-index: 1;
            }
            .overlay {
              position: absolute; top: 0; left: 0; width: 100%; height: 100%;
              background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.95) 100%);
              z-index: 2;
            }
            .content {
              position: relative; z-index: 3;
              width: 100%; height: 100%;
              display: flex; flex-direction: column;
              justify-content: space-between; align-items: center;
              padding: ${format.name === 'post-carre' ? '60px' : '100px'} 60px;
              box-sizing: border-box; color: white; text-align: center;
            }
            .logo {
              width: ${format.logoWidth};
              object-fit: contain;
              filter: drop-shadow(0px 4px 10px rgba(0,0,0,0.5));
            }
            .bottom-section {
              width: 100%; display: flex; flex-direction: column; align-items: center;
              margin-bottom: ${format.name === 'post-carre' ? '0px' : '40px'};
            }
            .title {
              font-size: ${format.titleSize};
              font-weight: 900; line-height: 1.1; text-transform: uppercase;
              margin-bottom: 20px; text-shadow: 0px 4px 15px rgba(0,0,0,0.8);
            }
            .subtitle {
              font-size: ${format.name === 'post-carre' ? '30px' : '40px'};
              font-weight: 400; margin-bottom: 40px; color: #f1f1f1;
              text-shadow: 0px 2px 10px rgba(0,0,0,0.8);
            }
            .promo-box {
              background-color: #ec4899; color: #fff;
              padding: 20px 50px; border-radius: 50px;
              font-size: ${format.name === 'post-carre' ? '32px' : '42px'};
              font-weight: 900; letter-spacing: 1px;
              box-shadow: 0px 10px 30px rgba(236, 72, 153, 0.5); border: 3px solid rgba(255,255,255,0.8);
              margin-bottom: 0;
            }
            .cta { display: none; }
          </style>
        </head>
        <body>
          <div class="background"></div>
          <div class="overlay"></div>
          <div class="content">
            ${logoBase64 ? `<img src="${logoBase64}" class="logo" />` : '<h1 style="font-size: 80px; color: #ec4899;">CLUB NOWME</h1>'}
            
            <div class="bottom-section">
              <div class="title">${message.title}</div>
              <div class="subtitle">${message.subtitle}</div>
              <div class="promo-box">👇 Lien en bio</div>
            </div>
          </div>
        </body>
        </html>
      `;

      await page.setContent(htmlContent, { waitUntil: 'load' });
      await page.waitForTimeout(500); // Laisse le temps aux polices de charger

      const suffix = format.name === 'story' ? '-story' : format.name === 'post-carre' ? '-carre' : '-portrait';
      const outputPath = join(outputDir, `visuel-ambassadrice-${i + 1}${suffix}.png`);

      await page.screenshot({ path: outputPath });
      console.log(`Sauvegardé : ${outputPath}`);
    }
    await page.close();
  }

  await browser.close();
  console.log('Nouvelles images multi-formats générées avec succès !');
}

generateVisuals().catch(console.error);
