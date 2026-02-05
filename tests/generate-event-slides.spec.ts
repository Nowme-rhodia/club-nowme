import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.use({
    deviceScaleFactor: 3,
});

test('generate instagram event slides screenshots', async ({ page }) => {
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'instagram-events-output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    await page.goto('/instagram-events');

    // Wait for the container to be visible
    const container = page.getByTestId('slide-container');
    await expect(container).toBeVisible();

    // Hide the safe zone overlay for clean screenshots
    const toggleButton = page.getByTestId('toggle-safe-zone');

    // Toggle off safe zone
    // Toggle off safe zone
    await toggleButton.click();

    // Give it a moment to render
    await page.waitForTimeout(500);

    // Take screenshots of all 6 slides (Cover + 4 Events + CTA)
    for (let i = 1; i <= 6; i++) {
        // Capture the specific element
        await container.screenshot({ path: path.join(outputDir, `event-slide-${i}.png`) });

        // Click next
        if (i < 6) {
            await page.getByTestId('next-button').click();
            // Wait for update
            await page.waitForTimeout(500);
        }
    }
});
