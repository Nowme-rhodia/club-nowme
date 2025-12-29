import { test, expect } from '@playwright/test';

test.describe('E2E Partner Flow', () => {
    const timestamp = Date.now();
    const partnerEmail = `test-partner-${timestamp}@example.com`;
    const partnerName = `Test Partner ${timestamp}`;
    const businessName = `Business ${timestamp}`;

    test('should submit application and be approved by admin', async ({ page }) => {
        // 1. Submit Application
        console.log(`Step 1: Submitting application for ${partnerEmail}`);
        await page.goto('/devenir-partenaire');

        await page.fill('input[name="businessName"]', businessName);
        await page.fill('input[name="contactName"]', partnerName);
        await page.fill('input[name="email"]', partnerEmail);
        await page.fill('input[name="phone"]', '0612345678');
        await page.fill('textarea[name="message"]', 'Automation test message for partner application.');

        await page.click('button[type="submit"]');

        // Verify submission success
        await expect(page.getByText('Demande envoyée avec succès')).toBeVisible({ timeout: 15000 });

        // 2. Admin Login
        console.log('Step 2: Admin Login');
        await page.goto('/auth/signin');
        await page.fill('input[type="email"]', 'admin@admin.com');
        await page.fill('input[type="password"]', 'BorisAdmin');
        await page.click('button[type="submit"]');

        await page.waitForURL(/\/admin/, { timeout: 15000 });

        // 3. Approve Partner
        console.log('Step 3: Approve Partner');
        await page.goto('/admin/partners');

        // Ensure the new partner is in the list (might need to filter or sort)
        // The default sort is date-desc, so it should be at the top.
        // Wait for the list to load
        await expect(page.getByText(businessName)).toBeVisible({ timeout: 10000 });

        // Handle Alerts (Approving triggers an alert)
        page.on('dialog', async dialog => {
            console.log(`Alert message: ${dialog.message()}`);
            await dialog.accept();
        });

        // Find the row with the business name and click output the Approve button
        // The Approve button is in the same container.
        // We can locate the list item first.
        const partnerRow = page.locator('li').filter({ hasText: businessName });
        await expect(partnerRow).toBeVisible();

        // Click Approve button (green check circle)
        // The button has title="Approuver"
        await partnerRow.locator('button[title="Approuver"]').click();

        // Verify it disappears from the "En attente" (Pending) list
        await expect(partnerRow).toBeHidden({ timeout: 15000 });
        console.log('Partner removed from pending list.');

        // Switch filter to "Approuvé"
        console.log('Switching filter to Approved...');
        await page.locator('select').first().selectOption('approved');

        // Check if partner appears in Approved list
        const approvedRow = page.locator('li').filter({ hasText: businessName });
        await expect(approvedRow).toBeVisible({ timeout: 15000 });
        await expect(approvedRow.getByText('Approuvé')).toBeVisible();

        console.log('Partner approved successfully!');
    });
});

