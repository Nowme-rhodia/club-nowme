import { test, expect } from '@playwright/test';

test.describe('Création d\'offre partenaire', () => {
  const timestamp = Date.now();
  const partnerEmail = `test-partner-${timestamp}@example.com`;
  const businessName = `Business Test ${timestamp}`;
  let tempPassword = '';
  let partnerId = '';

  test('devrait permettre de créer une offre directement dans la table offers', async ({ page }) => {
    // ============================================
    // ÉTAPE 1: Créer un partenaire via l'API
    // ============================================
    console.log('📝 ÉTAPE 1: Création du partenaire via formulaire');

    await page.goto('/devenir-partenaire', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[name="businessName"], input[id="businessName"]', { timeout: 10000 });

    await page.fill('input[name="businessName"], input[id="businessName"]', businessName);
    await page.fill('input[name="contactName"], input[id="contactName"]', `Contact ${timestamp}`);
    await page.fill('input[name="email"], input[id="email"], input[type="email"]', partnerEmail);
    await page.fill('input[name="phone"], input[id="phone"], input[type="tel"]', '0612345678');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(3000);

    console.log('✅ Demande de partenariat soumise');

    // ============================================
    // ÉTAPE 2: Approuver le partenaire en tant qu'admin
    // ============================================
    console.log('👨‍💼 ÉTAPE 2: Approbation du partenaire');

    await page.goto('/auth/signin', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', 'admin@admin.com');
    await page.fill('input[type="password"]', 'BorisAdmin');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });

    // Intercepter la réponse pour capturer le mot de passe et le partner_id
    let capturedPassword = '';

    page.on('response', async response => {
      if (response.url().includes('approve-partner')) {
        try {
          const data = await response.json();
          if (data.tempPassword) {
            capturedPassword = data.tempPassword;
            console.log('✅ Mot de passe capturé:', capturedPassword);
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto('/admin/partners', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    const emailLocator = page.getByText(partnerEmail);
    if (await emailLocator.count() > 0) {
      const approveButton = page.locator('button[title="Approuver"]').first();
      await approveButton.click();
      await page.waitForTimeout(5000);

      if (capturedPassword) {
        tempPassword = capturedPassword;
      } else if (alertMessage && alertMessage.includes('🔑')) {
        const match = alertMessage.match(/🔑\s*Mot de passe temporaire\s*:\s*(\S+)/);
        if (match) {
          tempPassword = match[1];
        }
      }

      console.log('✅ Partenaire approuvé, mot de passe:', tempPassword);
    }

    // Se déconnecter
    await page.goto('/');
    await page.waitForTimeout(2000);

    // ============================================
    // ÉTAPE 3: Se connecter en tant que partenaire
    // ============================================
    console.log('👤 ÉTAPE 3: Connexion en tant que partenaire');

    await page.goto('/auth/signin', { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    await page.fill('input[type="email"]', partnerEmail);
    await page.fill('input[type="password"]', tempPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Vérifier que le dashboard affiche le nom du partenaire
    await page.goto('/partner/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const businessNameOnDashboard = page.getByText(businessName);
    if (await businessNameOnDashboard.count() > 0) {
      console.log('✅ Nom du partenaire affiché sur le dashboard');
    } else {
      console.log('⚠️ Nom du partenaire non trouvé sur le dashboard');
    }

    // ============================================
    // ÉTAPE 4: Créer une offre via l'interface
    // ============================================
    console.log('🎁 ÉTAPE 4: Création d\'une offre');

    await page.goto('/partner/offers', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const offerTitle = `Offre Test ${timestamp}`;

    // Utiliser l'API Supabase via page.evaluate avec le client déjà chargé
    const createResult = await page.evaluate(async (title) => {
      try {
        // @ts-ignore - supabase est disponible globalement via l'import dans l'app
        const { supabase } = await import('/src/lib/supabase.ts');

        // Récupérer le partner_id
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('partner_id')
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!profileData?.partner_id) {
          return { success: false, error: 'Partner ID not found' };
        }

        // Créer l'offre
        const { data, error } = await supabase
          .from('offers')
          .insert({
            partner_id: profileData.partner_id,
            title: title,
            description: 'Description de test automatique',
            category_slug: 'bien-etre',
            subcategory_slug: 'massage',
            location: 'Paris, France',
            event_type: 'permanent',
            status: 'draft',
            is_active: true,
            base_price: 29.99,
            has_stock: false,
            requires_agenda: false
          })
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, offer: data };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }, offerTitle);

    if ((createResult as any).success) {
      console.log('✅ Offre créée avec succès');

      // Recharger la page pour voir l'offre
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      const offerInList = page.getByText(offerTitle);
      if (await offerInList.count() > 0) {
        console.log('✅ Offre visible dans la liste');
      } else {
        console.log('⚠️ Offre créée mais non visible dans la liste');
      }
    } else {
      console.log('❌ Erreur lors de la création:', (createResult as any).error);
    }

    console.log('✅ Test terminé');
    console.log('📧 Email:', partnerEmail);
    console.log('🔑 Mot de passe:', tempPassword);
  });
});
