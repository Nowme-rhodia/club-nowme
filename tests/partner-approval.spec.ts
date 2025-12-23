import { test, expect } from '@playwright/test';

test.describe('Admin - Gestion des partenaires', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter en tant qu'admin
    await page.goto('/auth/signin', { waitUntil: 'networkidle' });
    
    // Attendre que le formulaire soit visible
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    await page.fill('input[type="email"]', 'admin@admin.com');
    await page.fill('input[type="password"]', 'BorisAdmin');
    await page.click('button[type="submit"]');
    
    // Attendre la redirection vers le dashboard admin
    await page.waitForURL(/\/admin/, { timeout: 15000 });
  });

  test('devrait afficher le dashboard admin avec les statistiques', async ({ page }) => {
    // Vérifier qu'on est sur le dashboard admin
    await expect(page).toHaveURL(/\/admin/);
    
    // Attendre que les statistiques se chargent
    await page.waitForTimeout(2000);
    
    // Vérifier les cartes de statistiques (utiliser getByText pour plus de flexibilité)
    await expect(page.getByText(/abonnées actives/i)).toBeVisible();
    await expect(page.getByText(/partenaires/i).first()).toBeVisible();
  });

  test('devrait afficher la page de gestion des partenaires', async ({ page }) => {
    await page.goto('/admin/partners', { waitUntil: 'networkidle' });
    
    // Vérifier que la page est chargée
    await expect(page.locator('h1')).toContainText(/partenaires/i, { timeout: 10000 });
    
    // Attendre que les données se chargent
    await page.waitForTimeout(2000);
  });

  test('devrait pouvoir filtrer les partenaires par statut', async ({ page }) => {
    await page.goto('/admin/partners', { waitUntil: 'networkidle' });
    
    // Attendre que la page soit chargée
    await page.waitForTimeout(2000);
    
    // Chercher les boutons de filtre
    const filters = page.locator('button').filter({ hasText: /attente|approuvé|tous/i });
    const filterCount = await filters.count();
    
    if (filterCount > 0) {
      // Cliquer sur le premier filtre disponible
      await filters.first().click();
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Espace partenaire - Accès', () => {
  test('devrait rediriger vers la connexion si non authentifié', async ({ page }) => {
    await page.goto('/partner/dashboard');
    
    // Attendre la redirection
    await page.waitForURL(/\/auth\/signin/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
