import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.use({
    deviceScaleFactor: 3,
});

test('generate instagram slides screenshots', async ({ page }) => {
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'instagram-slides-output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    await page.goto('/instagram-preview');

    // Wait for the container to be visible
    const container = page.getByTestId('slide-container');
    await expect(container).toBeVisible();

    // Hide the safe zone overlay for clean screenshots
    const toggleButton = page.getByTestId('toggle-safe-zone');

    // Check if safe zone is active (button has bg-red-500)
    // The code defaults to true.
    // We want to turn it OFF.
    // If we click it, it toggles.
    await toggleButton.click();

    // Give it a moment to render
    await page.waitForTimeout(500);

    // Take screenshots of all 19 slides
    for (let i = 1; i <= 19; i++) {
        // Capture the specific element
        await container.screenshot({ path: path.join(outputDir, `slide-${i}.png`) });

        // Click next
        await page.getByTestId('next-button').click();

        // Wait for update
        await page.waitForTimeout(200);
    }
});
