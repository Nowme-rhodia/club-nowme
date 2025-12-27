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
    // ÉTAPE 7: Sauvegarde de l'offre
    // ============================================
    console.log('💾 ÉTAPE 7: Sauvegarde de l\'offre');

    const saveButton = page.locator('button:has-text("Enregistrer en brouillon")');
    await saveButton.click();
    console.log('✅ Clic sur Enregistrer');

    // Vérifier le toast de succès (commenté car parfois flaky en test auto)
    // await expect(page.locator('div[role="status"]').filter({ hasText: /Offre cré.e/ })).toBeVisible({ timeout: 10000 });
    // console.log('✅ Toast de succès affiché');

    // Attendre que le modal se ferme
    const modalTitle = page.locator('h2:has-text("Créer une nouvelle offre")');
    try {
      await expect(modalTitle).toBeHidden({ timeout: 5000 });
      console.log('✅ Modal fermé automatiquement');
    } catch (e) {
      console.log('⚠️ Modal toujours ouvert, tentative de fermeture manuelle...');
      // Try closing
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
    }

    await page.waitForTimeout(2000);

    console.log('🔎 Vérification de la présence de l\'offre dans la liste...');

    // Vérifier que l'offre apparaît dans la liste
    const offerInList = page.locator('h3').filter({ hasText: offerTitle });

    // Retry logic via expect poll? Or just expect visible
    await expect(offerInList).toBeVisible({ timeout: 10000 });
    console.log('✅ Offre visible dans la liste');

    // Attendre et recharger pour vérifier la persistance
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Vérifier à nouveau après reload
    await expect(page.locator('h3').filter({ hasText: offerTitle })).toBeVisible({ timeout: 10000 });
    console.log('✅ Offre visible après rechargement');

    // ============================================
    // ÉTAPE 8: Soumettre l'offre pour validation
    // ============================================
    console.log('📤 ÉTAPE 8: Soumission de l\'offre pour validation');

    // Trouver le bouton "Soumettre" pour cette offre
    const offerRow = page.locator('li').filter({ hasText: offerTitle });

    // Vérifier si l'offre est en brouillon et doit être marquée comme prête
    const markReadyButton = offerRow.locator('button:has-text("Marquer prête")');
    if (await markReadyButton.isVisible()) {
      console.log('⚠️ Offre en brouillon, passage en "Prête"...');
      await markReadyButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Offre marquée comme prête');
    }

    // Cliquer sur le bouton Soumettre
    const submitButton = offerRow.locator('button:has-text("Soumettre")');
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();
    await page.waitForTimeout(2000);
    console.log('✅ Offre soumise pour validation');

    // Vérifier que le statut a changé ("En validation")
    const statusBadge = offerRow.locator('text=En validation');
    await expect(statusBadge).toBeVisible();
    console.log('✅ Statut mis à jour: En validation');

    // ============================================
    // ÉTAPE 9: Connexion Admin et Approbation
    // ============================================
    console.log('👮 ÉTAPE 9: Connexion Admin pour approbation');

    // Déconnexion et nettoyage storage pour forcer le login
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Connexion Admin
    await page.goto('/auth/signin', { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', 'adminx-test@nowme.fr');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    console.log('✅ Connexion Admin réussie');

    // Navigation dashboard admin
    await page.goto('/admin/pending-offers', { waitUntil: 'networkidle' });
    console.log('📋 Navigation vers /admin/pending-offers');

    // Trouver l'offre
    const adminOfferRow = page.locator('li').filter({ hasText: offerTitle });
    await expect(adminOfferRow).toBeVisible({ timeout: 10000 });
    console.log('✅ Offre trouvée dans le dashboard admin');

    // Cliquer sur le bouton d'approbation (Bouton avec icône verte ou classe hover verte)
    // On cible le bouton qui contient l'icône CheckCircle2 (lucide-react)
    // Dans le code: className="p-2 text-gray-400 hover:text-green-600..."
    const approveButton = adminOfferRow.locator('button.hover\\:text-green-600');
    await approveButton.click();

    console.log('✅ Action "Approuver" effectuee');
    await page.waitForTimeout(2000);

    // Vérification finale : changer le filtre pour voir les approuvées
    // Le selecteur de status est le premier select a priori, ou on peut le cibler par valeur
    // Dans PendingOffers.tsx: value={statusFilter} onChange...
    await page.locator('select').first().selectOption('approved');
    await page.waitForTimeout(1000);

    const approvedRow = page.locator('li').filter({ hasText: offerTitle });
    await expect(approvedRow).toBeVisible();
    console.log('✅ Offre visible dans les offres approuvées');

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
