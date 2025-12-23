import { test, expect } from '@playwright/test';

test.describe('Page d\'accueil', () => {
  test('devrait charger la page d\'accueil et afficher les éléments principaux', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Vérifier le titre
    await expect(page).toHaveTitle(/Nowme/i);
    
    // Vérifier le header
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Vérifier le lien abonnement
    await expect(page.getByRole('link', { name: /abonnement/i }).first()).toBeVisible();
  });
});

test.describe('Authentification', () => {
  test('devrait permettre la navigation vers la page de connexion', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Vérifier le bouton de connexion
    const signInButton = page.getByRole('link', { name: /se connecter/i }).first();
    await expect(signInButton).toBeVisible();
    
    // Cliquer et vérifier la navigation
    await signInButton.click();
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
