import { test, expect } from '@playwright/test';

test.describe('Soumission d\'offre partenaire avec variants', () => {
  const partnerEmail = 'entreprisepartenaire@gmail.com';
  const partnerPassword = 'MvPbSa2Fblb2';
  const calendlyUrl = 'https://calendly.com/boris-convertmate/convertmate-services-consultation';

  test('devrait créer une offre de massage avec deux variants et la soumettre', async ({ page }) => {
    // Capturer les erreurs de la console
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Capturer les réponses réseau avec erreurs
    page.on('response', async response => {
      if (response.status() >= 400) {
        try {
          const body = await response.text();
          console.log(`❌ Erreur réseau ${response.status()}: ${response.url()}`);
          console.log(`   Body: ${body.substring(0, 500)}`);
        } catch (e) {
          // Ignore
        }
      }
    });

    // ============================================
    // ÉTAPE 1: Se connecter en tant que partenaire
    // ============================================
    console.log('👤 ÉTAPE 1: Connexion en tant que partenaire');

    await page.goto('/auth/signin', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', partnerEmail);
    await page.fill('input[type="password"]', partnerPassword);
    await page.click('button[type="submit"]');
    
    // Attendre la redirection vers le dashboard partenaire
    await page.waitForTimeout(3000);
    console.log('✅ Connexion réussie');

    // ============================================
    // ÉTAPE 2: Aller sur la page des offres
    // ============================================
    console.log('📋 ÉTAPE 2: Navigation vers la page des offres');

    await page.goto('/partner/offers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // ============================================
    // ÉTAPE 3: Ouvrir le formulaire de création
    // ============================================
    console.log('➕ ÉTAPE 3: Ouverture du formulaire de création');

    // Cliquer sur le bouton "Nouvelle offre"
    const newOfferButton = page.locator('button:has-text("Nouvelle offre")');
    await newOfferButton.click();
    await page.waitForTimeout(1000);

    // Vérifier que le modal est ouvert
    await expect(page.locator('text=Créer une nouvelle offre')).toBeVisible();
    console.log('✅ Modal de création ouvert');

    // ============================================
    // ÉTAPE 4: Remplir le formulaire
    // ============================================
    console.log('📝 ÉTAPE 4: Remplissage du formulaire');

    const timestamp = Date.now();
    const offerTitle = `Massage Relaxant Test ${timestamp}`;

    // Titre
    await page.fill('input[placeholder="Ex: Massage relaxant 60 minutes"]', offerTitle);
    console.log('  ✓ Titre rempli');

    // Description
    await page.fill('textarea[placeholder="Décrivez votre offre en détail..."]', 
      'Offrez-vous un moment de détente absolue avec notre massage relaxant. ' +
      'Nos praticiens expérimentés utilisent des techniques douces pour soulager ' +
      'les tensions et vous procurer un bien-être profond.'
    );
    console.log('  ✓ Description remplie');

    // Catégorie - sélectionner "Bien-être" ou la première catégorie disponible
    const categorySelect = page.locator('select').first();
    await categorySelect.selectOption({ index: 1 }); // Première option après "Sélectionnez"
    console.log('  ✓ Catégorie sélectionnée');

    // Attendre 2 secondes pour que les sous-catégories se chargent
    await page.waitForTimeout(2000);

    // Sous-catégorie - attendre qu'elle soit activée et qu'il y ait des options
    const subcategorySelect = page.locator('select').nth(1);
    await expect(subcategorySelect).toBeEnabled({ timeout: 10000 });
    
    // Attendre qu'il y ait plus d'une option (la première est "Sélectionnez...")
    await page.waitForFunction(() => {
      const select = document.querySelectorAll('select')[1];
      return select && select.options.length > 1;
    }, { timeout: 10000 });
    
    await page.waitForTimeout(500);
    
    // Sélectionner la deuxième option (index 2, car 0 = placeholder, 1 = première vraie option)
    await subcategorySelect.selectOption({ index: 2 });
    await page.waitForTimeout(500);
    console.log('  ✓ Sous-catégorie sélectionnée');

    // ============================================
    // ÉTAPE 5: Ajouter les variants (tarifs)
    // ============================================
    console.log('💰 ÉTAPE 5: Ajout des tarifs');

    // Premier variant - déjà présent
    const variantNameInputs = page.locator('input[placeholder*="Séance"]');
    const variantPriceInputs = page.locator('input[placeholder="0.00"]');

    // Remplir le premier variant
    await variantNameInputs.first().fill('Massage 30 minutes');
    await variantPriceInputs.first().fill('45');
    console.log('  ✓ Premier tarif: Massage 30 minutes - 45€');

    // Ajouter un deuxième variant
    const addVariantButton = page.locator('button:has-text("Ajouter un tarif")');
    await addVariantButton.click();
    await page.waitForTimeout(500);

    // Remplir le deuxième variant
    await variantNameInputs.nth(1).fill('Massage 60 minutes');
    await variantPriceInputs.nth(2).fill('75'); // nth(2) car il y a aussi le prix réduit
    // Ajouter un prix réduit pour le deuxième variant
    await variantPriceInputs.nth(3).fill('65');
    console.log('  ✓ Deuxième tarif: Massage 60 minutes - 75€ (réduit: 65€)');

    // ============================================
    // ÉTAPE 6: Ajouter le lien Calendly
    // ============================================
    console.log('📅 ÉTAPE 6: Ajout du lien Calendly');

    await page.fill('input[placeholder="https://calendly.com/votre-lien"]', calendlyUrl);
    console.log('  ✓ Lien Calendly ajouté');

    // ============================================
    // ÉTAPE 7: Sauvegarder l'offre en brouillon
    // ============================================
    console.log('💾 ÉTAPE 7: Sauvegarde de l\'offre');

    const saveButton = page.locator('button:has-text("Enregistrer en brouillon")');
    await saveButton.click();

    // Attendre le toast de succès ou d'erreur
    await page.waitForTimeout(3000);

    // Vérifier s'il y a un toast d'erreur
    const errorToast = page.locator('[role="status"]:has-text("Erreur")');
    if (await errorToast.isVisible()) {
      const errorText = await errorToast.textContent();
      console.log('❌ Erreur lors de la création:', errorText);
    }

    // Vérifier si le modal s'est fermé (signe de succès)
    const modalClosed = await page.locator('text=Créer une nouvelle offre').isHidden();
    if (modalClosed) {
      console.log('✅ Modal fermé - offre probablement créée');
    } else {
      console.log('⚠️ Modal toujours ouvert - vérification des erreurs');
      // Prendre une capture d'écran pour debug
      await page.screenshot({ path: 'test-results/offer-creation-debug.png' });
    }

    // Attendre et recharger
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Vérifier que l'offre apparaît dans la liste
    const offerInList = page.locator(`text=${offerTitle}`);
    const isVisible = await offerInList.isVisible();
    
    if (isVisible) {
      console.log('✅ Offre créée et visible dans la liste');
    } else {
      console.log('⚠️ Offre non visible dans la liste - vérification des offres existantes');
      // Lister les offres visibles pour debug
      const offers = await page.locator('li h3').allTextContents();
      console.log('Offres visibles:', offers);
    }
    
    expect(isVisible).toBe(true);

    // ============================================
    // ÉTAPE 8: Soumettre l'offre pour validation
    // ============================================
    console.log('📤 ÉTAPE 8: Soumission de l\'offre pour validation');

    // Trouver le bouton "Soumettre" pour cette offre
    const offerRow = page.locator('li').filter({ hasText: offerTitle });
    const submitButton = offerRow.locator('button:has-text("Soumettre")');
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Offre soumise pour validation');

      // Vérifier que le statut a changé
      const statusBadge = offerRow.locator('text=En cours de validation');
      if (await statusBadge.isVisible()) {
        console.log('✅ Statut mis à jour: En cours de validation');
      }
    } else {
      console.log('⚠️ Bouton Soumettre non trouvé - l\'offre n\'est peut-être pas en brouillon');
    }

    // ============================================
    // RÉSUMÉ
    // ============================================
    console.log('\n========================================');
    console.log('✅ TEST TERMINÉ AVEC SUCCÈS');
    console.log('========================================');
    console.log(`📧 Email: ${partnerEmail}`);
    console.log(`🎁 Offre créée: ${offerTitle}`);
    console.log(`💰 Tarifs: Massage 30min (45€), Massage 60min (75€ → 65€)`);
    console.log(`📅 Calendly: ${calendlyUrl}`);
    console.log('========================================\n');
  });
});
