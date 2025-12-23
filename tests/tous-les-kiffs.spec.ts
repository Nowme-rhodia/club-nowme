
import { test, expect } from '@playwright/test';

test.describe('E2E - Workflow complet Offre Partenaire', () => {
    const timestamp = Date.now();
    const partnerEmail = `e2e-partner-${timestamp}@example.com`;
    const partnerName = `E2E Partner ${timestamp}`;
    const businessName = `E2E Business ${timestamp}`;
    const offerTitle = `E2E Offer ${timestamp}`;
    let tempPassword = '';

    test('devrait créer un partenaire, publier une offre, valider l’offre en admin, et la voir sur Tous les Kiffs', async ({ page }) => {
        // Handle dialogs (alerts, etc.)
        page.on('dialog', async dialog => {
            console.log(`💬 Dialog: [${dialog.type()}] ${dialog.message()}`);
            await dialog.accept();
        });

        // ============================================
        // ÉTAPE 1: Inscription du partenaire (via le formulaire public)
        // ============================================
        console.log('📝 Étape 1: Inscription partenaire...');
        await page.goto('/devenir-partenaire');
        await page.fill('#businessName', businessName);
        await page.fill('#contactName', partnerName);
        await page.fill('#email', partnerEmail);
        await page.fill('#phone', '0612345678');

        // Soumission du formulaire de partenariat
        await page.locator('button[type="submit"]').click();

        // Attendre un peu que l'inscription soit traitée
        await page.waitForTimeout(2000);

        // ============================================
        // ÉTAPE 2: Connexion Admin pour approuver le partenaire
        // ============================================
        console.log('👨‍💼 Étape 2: Approbation partenaire par admin...');
        await page.goto('/auth/signin');
        await page.fill('input[type="email"]', 'admin@admin.com');
        await page.fill('input[type="password"]', 'BorisAdmin');
        await page.click('button[type="submit"]');

        // Attendre d'être sur le dashboard admin
        await expect(page).toHaveURL(/\/admin/);

        // Aller sur la page de gestion des partenaires
        await page.goto('/admin/partners');

        // Configurer l'écouteur de réponse pour capturer le mot de passe généré
        const approveResponsePromise = page.waitForResponse(response =>
            response.url().includes('approve-partner') && response.status() === 200
        );

        // Trouver le partenaire dans la liste
        const partnerRow = page.locator('li').filter({ hasText: partnerEmail }).first();
        await expect(partnerRow).toBeVisible({ timeout: 10000 });

        // Cliquer sur le bouton Approuver
        await partnerRow.locator('button[title="Approuver"]').click();

        // Capturer le mot de passe depuis l'Edge Function
        const response = await approveResponsePromise;
        const responseBody = await response.json();
        tempPassword = responseBody.tempPassword;
        console.log(`✅ Partenaire approuvé. Mot de passe temporaire : ${tempPassword}`);

        // Nettoyage de la session admin et attente que le profil Auth soit prêt
        await page.evaluate(() => localStorage.clear());
        await page.waitForTimeout(2000);
        await page.goto('/partner/signin');

        // ============================================
        // ÉTAPE 3: Connexion Partenaire et Création d'Offre
        // ============================================
        console.log('🎁 Étape 3: Création d\'offre par le partenaire...');
        await page.fill('input[type="email"]', partnerEmail);
        await page.fill('input[type="password"]', tempPassword);
        await page.click('button[type="submit"]');

        // Attendre l'accès à l'espace partenaire
        await expect(page).toHaveURL(/\/partner/);

        // Aller dans la section offres
        await page.goto('/partner/offers');

        // Cliquer sur le bouton pour créer une offre
        await page.locator('button').filter({ hasText: 'Nouvelle offre' }).click();

        // Remplir le formulaire (dans une modale)
        await page.waitForSelector('form');
        await page.fill('input[placeholder*="Ex: Massage"]', offerTitle);
        await page.fill('textarea[placeholder*="Décrivez votre offre"]', 'Description générée par test E2E.');

        // Sélection des catégories
        const selects = page.locator('select');
        await selects.nth(0).selectOption({ index: 1 }); // Catégorie
        await selects.nth(1).selectOption({ index: 1 }); // Sous-catégorie

        await page.fill('input[placeholder="0.00"]', '45'); // Prix

        // Soumission du formulaire (Enregistrer en brouillon)
        await page.locator('button[type="submit"]').filter({ hasText: 'Enregistrer en brouillon' }).click();

        // Vérification de la création en brouillon
        await expect(page.getByText('Offre créée en brouillon')).toBeVisible();

        // Étape 3.5: Soumettre pour validation
        console.log('📤 Étape 3.5: Soumission pour validation...');
        const offerRowDraft = page.locator(`div:has-text("${offerTitle}")`).last();
        await offerRowDraft.locator('button:has-text("Soumettre pour validation")').click();
        await expect(page.getByText('Offre soumise pour validation')).toBeVisible();
        console.log(`✅ Offre "${offerTitle}" soumise.`);

        // Nettoyage de la session partenaire
        await page.evaluate(() => localStorage.clear());
        await page.goto('/auth/signin');

        // ============================================
        // ÉTAPE 4: Approbation de l'offre par l'Admin
        // ============================================
        console.log('✅ Étape 4: Approbation de l\'offre par l\'admin...');
        await page.fill('input[type="email"]', 'admin@admin.com');
        await page.fill('input[type="password"]', 'BorisAdmin');
        await page.click('button[type="submit"]');

        await page.goto('/admin/pending-offers');

        // Trouver l'offre en attente
        const offerRow = page.locator('li').filter({ hasText: offerTitle }).first();
        await expect(offerRow).toBeVisible();

        // Approuver l'offre via l'icône check
        await offerRow.locator('button:has(svg.lucide-check-circle-2)').click();

        // Vérifier qu'elle n'est plus en attente
        await expect(offerRow).not.toBeVisible();

        // ============================================
        // ÉTAPE 5: Vérification de la visibilité sur "Tous les kiffs"
        // ============================================
        console.log('👀 Étape 5: Vérification publique...');
        await page.goto('/tous-les-kiffs');

        // Rechercher l'offre
        const offerCard = page.getByText(offerTitle);
        await expect(offerCard).toBeVisible({ timeout: 15000 });

        // Vérifier le prix affiché
        await expect(page.getByText('45€')).toBeVisible();

        // Cliquer pour voir la page produit
        await offerCard.click();

        // Vérification finale sur la page produit
        await expect(page.locator('h1')).toHaveText(offerTitle);
        await expect(page.getByText('45€')).toBeVisible();

        console.log('🎉 Workflow complet E2E réussi !');
    });
});
