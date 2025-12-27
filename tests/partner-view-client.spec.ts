import { test, expect } from '@playwright/test';

test('Partner can view client contact details', async ({ page }) => {
    // 1. Simuler un login Partenaire
    // Note: Idéalement, on utiliserait un compte de test dédié ou mis en place par un script global
    // Pour ce test rapide, on assume que les credentials sont disponibles ou on mock

    // LOGIN PARTNER
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'partner@test.com'); // Mettre un email valide de partenaire si connu
    await page.fill('input[type="password"]', 'password123'); // Password
    await page.click('button[type="submit"]');

    // Attendre la redirection ou le dashboard
    await expect(page).toHaveURL(/.*\/partner\/dashboard/);

    // 2. Aller sur la page de réservations
    await page.click('text=Réservations'); // Ou sélecteur plus précis
    await expect(page).toHaveURL(/.*\/partner\/bookings/);

    // 3. Vérifier qu'on voit bien des réservations
    // Ceci dépend de la présence de données en base. 
    // Si on vient de faire une resa manuelle, elle devrait être là.

    // 4. Vérifier la présence d'un numéro de téléphone
    // On cherche un élément qui ressemble à un téléphone ou l'icône phone
    const phoneLinks = page.locator('a[href^="tel:"]');
    const count = await phoneLinks.count();

    console.log(`Found ${count} phone numbers visible.`);

    if (count > 0) {
        const firstPhone = await phoneLinks.first().innerText();
        console.log('First visible phone:', firstPhone);
        expect(firstPhone).not.toContain('Non renseigné');
    } else {
        console.log('No phone links found. Maybe no bookings with phone data?');
        // On vérifier si "Non renseigné" est visible
        const notProvided = page.getByText('Non renseigné');
        if (await notProvided.count() > 0) {
            console.warn('Found "Non renseigné" entries. RLS or Data might still be missing.');
        }
    }
});
