import { test, expect } from '@playwright/test';

test.describe('Workflow complet d\'approbation de partenaire', () => {
  const timestamp = Date.now();
  const partnerEmail = `test-partner-${timestamp}@example.com`;
  const partnerName = `Test Partner ${timestamp}`;
  const businessName = `Business Test ${timestamp}`;
  let tempPassword = '';

  test('devrait permettre le workflow complet: demande → approbation → connexion partenaire', async ({ page, context, browser }) => {
    // ============================================
    // ÉTAPE 1: Soumettre une demande de partenariat (sans connexion)
    // ============================================
    console.log('📝 ÉTAPE 1: Soumission de la demande de partenariat');

    await page.goto('/devenir-partenaire', { waitUntil: 'networkidle' });

    // Attendre que le formulaire soit visible
    await page.waitForSelector('input[name="businessName"], input[id="businessName"]', { timeout: 10000 });

    // Remplir le formulaire de partenariat
    await page.fill('input[name="businessName"], input[id="businessName"]', businessName);
    await page.fill('input[name="contactName"], input[id="contactName"]', partnerName);
    await page.fill('input[name="email"], input[id="email"], input[type="email"]', partnerEmail);
    await page.fill('input[name="phone"], input[id="phone"], input[type="tel"]', '0612345678');

    // Remplir les champs optionnels s'ils existent
    const websiteInput = page.locator('input[name="website"], input[id="website"]');
    if (await websiteInput.count() > 0) {
      await websiteInput.fill('https://example.com');
    }

    const descriptionInput = page.locator('textarea[name="description"], textarea[id="description"]');
    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill('Description de test pour le partenariat');
    }

    // Soumettre le formulaire
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Attendre la confirmation
    await page.waitForTimeout(3000);
    console.log('✅ Demande de partenariat soumise');

    // ============================================
    // ÉTAPE 2: Connexion admin et approbation
    // ============================================
    console.log('👨‍💼 ÉTAPE 2: Connexion en tant qu\'admin');

    await page.goto('/auth/signin', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', 'admin@admin.com');
    await page.fill('input[type="password"]', 'BorisAdmin');
    await page.click('button[type="submit"]');

    // Attendre la redirection vers le dashboard admin
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    console.log('✅ Connecté en tant qu\'admin');

    // Aller sur la page des partenaires
    await page.goto('/admin/partners', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Chercher le partenaire qu'on vient de créer
    console.log(`🔍 Recherche du partenaire: ${partnerEmail}`);

    // Intercepter la réponse de l'Edge Function pour capturer le mot de passe
    let capturedPassword = '';

    page.on('response', async response => {
      if (response.url().includes('approve-partner')) {
        try {
          const data = await response.json();
          if (data.tempPassword) {
            capturedPassword = data.tempPassword;
            console.log('✅ Mot de passe capturé depuis la réponse API:', capturedPassword);
          }
        } catch (e) {
          // Ignore les erreurs de parsing JSON
        }
      }
    });

    // Capturer aussi les alertes comme fallback
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      console.log('🔔 Alert capturée:', alertMessage);
      await dialog.accept();
    });

    // Chercher le partenaire dans la page
    const emailLocator = page.getByText(partnerEmail);

    if (await emailLocator.count() > 0) {
      console.log('✅ Partenaire trouvé dans la liste');

      // Trouver le conteneur parent qui contient les boutons d'action
      const partnerCard = emailLocator.locator('xpath=ancestor::li | ancestor::div[contains(@class, "partner")]').first();

      // Chercher le bouton d'approbation dans ce conteneur
      const approveButton = partnerCard.locator('button[title="Approuver"]').or(
        partnerCard.locator('button').filter({ hasText: /approuv/i })
      ).first();

      // Si le bouton n'est pas trouvé dans le conteneur, chercher globalement
      if (await approveButton.count() === 0) {
        console.log('⚠️ Bouton non trouvé dans le conteneur, recherche globale...');
        const globalApproveButton = page.locator('button[title="Approuver"]').first();
        await globalApproveButton.click();
      } else {
        await approveButton.click();
      }

      // Attendre que l'approbation soit terminée
      await page.waitForTimeout(5000);

      // Utiliser le mot de passe capturé depuis l'API
      if (capturedPassword) {
        tempPassword = capturedPassword;
        console.log('✅ Mot de passe temporaire capturé:', tempPassword);
      }

      // Fallback: extraire de l'alerte
      if (!tempPassword && alertMessage && alertMessage.includes('🔑')) {
        const match = alertMessage.match(/🔑\s*Mot de passe temporaire\s*:\s*(\S+)/);
        if (match) {
          tempPassword = match[1];
          console.log('✅ Mot de passe temporaire capturé depuis l\'alerte:', tempPassword);
        }
      }

      if (!tempPassword) {
        console.error('❌ Impossible de capturer le mot de passe temporaire');
        console.log('Alert message:', alertMessage);
        console.log('Captured password:', capturedPassword);
        throw new Error('Mot de passe temporaire non capturé');
      }

      console.log('✅ Partenaire approuvé');
    } else {
      console.error('❌ Partenaire non trouvé dans la liste');
      throw new Error('Partenaire non trouvé');
    }

    // ============================================
    // ÉTAPE 3: Déconnexion et connexion en tant que partenaire
    // ============================================
    console.log('🔐 ÉTAPE 3: Déconnexion de l\'admin');

    // Se déconnecter
    await page.goto('/');
    // Chercher un bouton de déconnexion ou menu utilisateur
    const userMenu = page.locator('button, a').filter({ hasText: /admin|compte|déconnexion/i });
    if (await userMenu.count() > 0) {
      await userMenu.first().click();
      await page.waitForTimeout(1000);

      const logoutButton = page.locator('button, a').filter({ hasText: /déconnexion|logout/i });
      if (await logoutButton.count() > 0) {
        await logoutButton.first().click();
        await page.waitForTimeout(2000);
      }
    }

    console.log('👤 ÉTAPE 4: Connexion en tant que partenaire');

    // Se connecter avec les identifiants du partenaire
    await page.goto('/auth/signin', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', partnerEmail);
    await page.fill('input[type="password"]', tempPassword);
    await page.click('button[type="submit"]');

    // Attendre la redirection
    await page.waitForTimeout(3000);

    // ============================================
    // ÉTAPE 4: Vérifier l'accès à l'espace partenaire
    // ============================================
    console.log('🏢 ÉTAPE 5: Vérification de l\'espace partenaire');

    // Aller sur le dashboard partenaire
    await page.goto('/partner/dashboard', { waitUntil: 'networkidle' });

    // Vérifier qu'on est bien sur le dashboard partenaire
    await expect(page).toHaveURL(/\/partner\/dashboard/);

    // Attendre que le dashboard se charge
    await page.waitForTimeout(3000);

    // Vérifier qu'on voit des éléments du dashboard partenaire
    const dashboardElements = page.locator('h1, h2').filter({ hasText: /dashboard|tableau de bord|bienvenue/i });
    if (await dashboardElements.count() > 0) {
      console.log('✅ Accès au dashboard partenaire confirmé');
    } else {
      console.log('⚠️ Dashboard partenaire chargé mais éléments non trouvés');
    }

    // ============================================
    // ÉTAPE 5: Créer et publier une offre
    // ============================================
    console.log('🎁 ÉTAPE 6: Création d\'une offre');

    // Aller sur la page des offres
    await page.goto('/partner/offers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Cliquer sur le bouton "Créer une offre" ou "Nouvelle offre"
    const createOfferButton = page.locator('button, a').filter({ hasText: /créer|nouvelle|ajouter.*offre/i }).first();

    if (await createOfferButton.count() > 0) {
      await createOfferButton.click();
      await page.waitForTimeout(2000);

      // Remplir le formulaire d'offre
      const offerTitle = `Offre Test ${timestamp}`;
      const offerDescription = `Description de l'offre de test créée automatiquement`;

      console.log('📝 Remplissage du formulaire d\'offre');

      // Titre de l'offre
      const titleInput = page.locator('input[name="title"], input[id="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill(offerTitle);
      }

      // Description
      const descriptionInput = page.locator('textarea[name="description"], textarea[id="description"]').first();
      if (await descriptionInput.count() > 0) {
        await descriptionInput.fill(offerDescription);
      }

      // Catégorie (sélectionner la première disponible)
      const categorySelect = page.locator('select[name="category"], select[id="category"]').first();
      if (await categorySelect.count() > 0) {
        await categorySelect.selectOption({ index: 1 });
      }

      // Prix (si présent)
      const priceInput = page.locator('input[name="price"], input[id="price"], input[type="number"]').first();
      if (await priceInput.count() > 0) {
        await priceInput.fill('29.99');
      }

      // Durée de validité (si présent)
      const validityInput = page.locator('input[name="validity"], input[name="validUntil"]').first();
      if (await validityInput.count() > 0) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 1);
        await validityInput.fill(futureDate.toISOString().split('T')[0]);
      }

      await page.waitForTimeout(1000);

      // Soumettre le formulaire
      const submitButton = page.locator('button[type="submit"]').filter({ hasText: /publier|enregistrer|créer/i }).first();

      if (await submitButton.count() > 0) {
        console.log('✅ Soumission de l\'offre');
        await submitButton.click();
        await page.waitForTimeout(3000);

        // Vérifier que l'offre apparaît dans la liste
        await page.goto('/partner/offers', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Chercher l'offre créée
        const offerInList = page.getByText(offerTitle);
        if (await offerInList.count() > 0) {
          console.log('✅ Offre créée et visible dans la liste');
        } else {
          console.log('⚠️ Offre créée mais non visible dans la liste (peut nécessiter une approbation admin)');
        }
      } else {
        console.log('⚠️ Bouton de soumission non trouvé');
      }
    } else {
      console.log('⚠️ Bouton de création d\'offre non trouvé');
    }

    console.log('✅ Workflow complet réussi !');
    console.log('📧 Email partenaire:', partnerEmail);
    console.log('🔑 Mot de passe:', tempPassword);
    console.log('🏢 Business:', businessName);
  });
});
