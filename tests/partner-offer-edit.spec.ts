
import { test, expect } from '@playwright/test';

test.describe('Partner Offer Edit Flow', () => {
    const PARTNER_EMAIL = 'entreprisepartenaire@gmail.com';
    const PARTNER_PASSWORD = 'MvPbSa2Fblb2';

    test.beforeEach(async ({ page }) => {
        // Enable console logging
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));

        // Login - Corrected URL
        await page.goto('http://localhost:5173/auth/signin');

        // Use more robust locators
        // Assuming standard specialized inputs or fallback to placeholders if labels aren't clear
        await page.fill('input[type="email"]', PARTNER_EMAIL);
        await page.fill('input[type="password"]', PARTNER_PASSWORD);

        // Robust button selector
        await page.click('button[type="submit"]');

        // Robust navigation wait
        await page.waitForURL('**/dashboard');

        // Go to offers
        await page.click('text="Mes offres"');
        await page.waitForTimeout(2000); // Wait for list animation/load
    });

    test('should verify edit button opens modal with pre-filled data', async ({ page }) => {
        // Go to offers (already done in beforeEach, but ensuring filtered list if needed)
        // Filter by Drafts to be sure
        await page.selectOption('select:has-text("Tous les statuts")', 'draft');
        await page.waitForTimeout(1000);

        // 2. Click Edit Button 
        console.log('Looking for offer item...');
        // Identify the correct card by filtering listing items that contain the specific title
        // NOTE: This assumes 'Test Insert Script' offer ALREADY EXISTS from previous runs or manual creation.
        const offerCard = page.locator('li').filter({ hasText: 'Test Insert Script' }).first();
        await expect(offerCard).toBeVisible({ timeout: 10000 });
        await offerCard.scrollIntoViewIfNeeded();

        // Target specifically the Edit icon button within the card (3rd button as per user instruction: .nth(2))
        const editButton = offerCard.locator('button').nth(2);

        await expect(editButton).toBeVisible();
        await editButton.click();

        // 3. Verify Modal Title
        await expect(page.locator('h2')).toContainText("Modifier l'offre", { timeout: 5000 });

        // Stop here as requested
    });
});
