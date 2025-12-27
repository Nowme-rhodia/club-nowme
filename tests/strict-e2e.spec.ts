import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });


const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Create admin client for verification
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

test.describe('Strict E2E Flow: Offer Submission & Approval', () => {
    const partnerEmail = 'entreprisepartenaire@gmail.com';
    const partnerPassword = 'MvPbSa2Fblb2';

    // Use a unique title to find the offer easily in DB
    const timestamp = Date.now();
    const offerTitle = `Strict Test Offer ${timestamp}`;

    test('should create offer, verify DB draft, submit, verify DB pending, approve, verify DB approved', async ({ page }) => {
        // Listen for errors
        page.on('console', msg => {
            if (msg.type() === 'error') console.log(`[Browser Console Error]: ${msg.text()}`);
        });
        page.on('pageerror', err => console.log(`[Browser Page Error]: ${err.message}`));
        // Mock profile/partner data to bypass network flakiness
        await page.route(/.*user_profiles.*/, async route => {
            const json = {
                id: '23d30294-9e00-421e-a577-4524c5834817',
                user_id: '23d30294-9e00-421e-a577-4524c5834817',
                partner_id: 'c78f1403-22b5-43e9-ac0d-00577701731b',
                first_name: 'Partenaire',
                last_name: 'Seeded'
            };
            await route.fulfill({ json });
        });

        await page.route(/.*partners.*/, async route => {
            const json = {
                id: 'c78f1403-22b5-43e9-ac0d-00577701731b',
                business_name: 'Entreprise Partenaire Seeded',
                status: 'approved',
                full_address: '10 Rue de Paris',
                commission_rate: 0.2
            };
            await route.fulfill({ json: [json] });
        });

        // Remove Google Maps block - causes address input to fail/timeout if script missing
        // await page.route('**/*maps.googleapis.com/**', route => route.abort());

        // ============================================
        // 1. Partner Login
        // ============================================
        console.log('🔹 1. Partner Login');
        await page.goto('/auth/signin');
        await page.fill('input[type="email"]', partnerEmail);
        await page.fill('input[type="password"]', partnerPassword);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/partner\/dashboard/, { timeout: 15000 });
        await expect(page).toHaveURL(/\/partner\/dashboard/, { timeout: 15000 });
        console.log('✅ Partner logged in');

        // ============================================
        // 2. Create Offer (Draft)
        // ============================================
        console.log('🔹 2. Create Offer (Draft)');
        await page.goto('/partner/offers');

        // WAIT for profile data to load to avoid "Partner ID not found"
        try {
            await page.waitForResponse(response =>
                response.url().includes('user_profiles') && response.status() === 200,
                { timeout: 5000 }
            );
        } catch (e) {
            console.log('⚠️ Profile load wait timeout (might be cached)');
        }
        await page.waitForTimeout(2000); // Safety buffer

        await page.click('button:has-text("Nouvelle offre")');
        await expect(page.locator('text=Créer une nouvelle offre')).toBeVisible();

        await page.fill('input[placeholder*="Ex: Massage"]', offerTitle);
        await page.fill('textarea[placeholder*="Décrivez"]', 'Strict test description');

        // Select category (Bien-être)
        const categorySelect = page.locator('select').first();
        await categorySelect.selectOption({ index: 1 });
        await page.waitForTimeout(1000); // wait for subcats

        // Select subcategory
        const subSelect = page.locator('select').nth(1);
        await expect(subSelect).toBeEnabled();
        await subSelect.selectOption({ index: 2 }); // First real option

        // Add price
        const priceInput = page.locator('input[placeholder="0.00"]').first();
        await priceInput.click();
        await priceInput.fill('50');

        // Add tarif name
        const tarifInput = page.locator('input[placeholder*="Ex: Séance"]').first();
        await tarifInput.click();
        await tarifInput.fill('Séance Test');

        // Add address - Trigger Autocomplete
        const addressInput = page.locator('input[placeholder*="adresse"]');
        await addressInput.click();
        await addressInput.fill('10 Rue de Paris');
        await page.waitForTimeout(1000);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Save Draft
        await page.click('button:has-text("Enregistrer en brouillon")');

        // FORCE NAVIGATION / RELOAD
        await page.waitForTimeout(3000);
        await page.goto('/partner/offers');
        await page.reload();

        // Verify modal/page closed
        await expect(page.locator('text=Créer une nouvelle offre')).toBeHidden();

        // ============================================
        // 3. DB Verification (Draft)
        // ============================================
        console.log('🔹 3. DB Verification (Draft)');
        const { data: offerDraft, error: errDraft } = await supabaseAdmin
            .from('offers')
            .select('*')
            .eq('title', offerTitle)
            .single();

        if (errDraft) console.error('DB Error:', errDraft);
        expect(errDraft).toBeNull();
        expect(offerDraft).toBeDefined();
        expect(offerDraft.status).toBe('draft');
        expect(offerDraft.is_approved).toBe(false);
        console.log(`✅ DB Verified: Status=${offerDraft.status}, Approved=${offerDraft.is_approved}`);

        // Verify in UI list
        await expect(page.locator('h3').filter({ hasText: offerTitle })).toBeVisible();
        console.log('✅ Offer created in UI');

        // ============================================
        // 4. Mark Ready & Submit (Partner)
        // ============================================
        console.log('🔹 4. Submit Offer');
        const offerRow = page.locator('li').filter({ hasText: offerTitle });

        // Mark Ready
        if (await offerRow.locator('button:has-text("Marquer prête")').isVisible()) {
            await offerRow.locator('button:has-text("Marquer prête")').click();
            await page.waitForTimeout(1000);
        }

        // Submit
        await offerRow.locator('button:has-text("Soumettre")').click();
        await expect(offerRow.locator('text=En validation')).toBeVisible();
        console.log('✅ Offer submitted in UI');

        // ============================================
        // 5. DB Verification (Pending)
        // ============================================
        console.log('🔹 5. DB Verification (Pending)');
        // Wait a bit for DB propagation if async
        // await page.waitForTimeout(1000); 

        const { data: offerPending, error: errPending } = await supabaseAdmin
            .from('offers')
            .select('*')
            .eq('id', offerDraft.id)
            .single();

        expect(errPending).toBeNull();
        console.log(`ℹ️ DB State: Status=${offerPending.status}, Approved=${offerPending.is_approved}`);

        // ASSERTION
        expect(offerPending.status).toBe('pending');
        expect(offerPending.is_approved).toBe(false);
        console.log('✅ DB Verified: Status=pending');

        // ============================================
        // 6. Admin Login & Approve
        // ============================================
        console.log('🔹 6. Admin Approve');

        // Logout
        await page.context().clearCookies();
        await page.evaluate(() => localStorage.clear());

        // Login Admin
        await page.goto('/auth/signin');
        await page.fill('input[type="email"]', 'adminx-test@nowme.fr');
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/\/partner\/dashboard|\/admin\/dashboard/, { timeout: 15000 });

        // Navigate to Pending Offers
        await page.goto('/admin/pending-offers');
        await expect(page.locator('h1:has-text("Offres en attente")')).toBeVisible();

        // Find Offer
        const adminRow = page.locator('li').filter({ hasText: offerTitle });
        await expect(adminRow).toBeVisible();

        // Approve
        const approveBtn = adminRow.locator('button.hover\\:text-green-600');
        await approveBtn.click();

        // Verify it disappears from pending list
        await expect(adminRow).toBeHidden({ timeout: 10000 }); // Can take a moment
        console.log('✅ Offer approved in UI');

        // ============================================
        // 7. DB Verification (Approved)
        // ============================================
        console.log('🔹 7. DB Verification (Approved)');

        const { data: offerApproved, error: errApproved } = await supabaseAdmin
            .from('offers')
            .select('*')
            .eq('id', offerDraft.id)
            .single();

        expect(errApproved).toBeNull();
        console.log(`ℹ️ DB State: Status=${offerApproved.status}, Approved=${offerApproved.is_approved}`);

        // ASSERTION
        expect(offerApproved.status).toBe('approved');
        expect(offerApproved.is_approved).toBe(true);
        console.log('✅ DB Verified: Status=approved, Approved=true');

        console.log('🎉 STRICT TEST PASSED SUCCESSFULLY');
    });
});
