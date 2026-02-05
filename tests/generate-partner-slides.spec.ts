import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('generate instagram partner slides screenshots', async ({ page }) => {
    // Create output directory
    const outputDir = path.join(process.cwd(), 'instagram-partners-output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Set viewport to high resolution
    await page.setViewportSize({ width: 1200, height: 1500 });

    // Navigate to the partner slides page
    await page.goto('http://localhost:5173/instagram-partners');

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Get the toggle button and hide safe zones
    const toggleButton = page.getByTestId('toggle-safe-zone');
    await toggleButton.click();

    // Give it a moment to render
    await page.waitForTimeout(500);

    // Get total number of slides
    const totalSlides = 28;

    // Screenshot each slide
    for (let i = 0; i < totalSlides; i++) {
        console.log(`Processing slide ${i + 1}/${totalSlides}`);

        // Find the Instagram post container by its fixed dimensions
        const container = page.locator('div[style*="width: 400px"][style*="height: 500px"]').first();

        await container.screenshot({
            path: path.join(outputDir, `partner-slide-${i + 1}.png`),
            type: 'png',
            scale: 'device'
        });

        console.log(`✅ Captured slide ${i + 1}/${totalSlides}`);

        // Click next button (except on last slide)
        if (i < totalSlides - 1) {
            console.log(`Clicking next button...`);
            const nextButton = page.getByTestId('next-slide');

            // Check if button exists
            const count = await nextButton.count();
            console.log(`Found ${count} next buttons`);

            if (count > 0) {
                await nextButton.click();
                console.log(`Clicked next button`);
                await page.waitForTimeout(500);
            } else {
                console.error(`Next button not found!`);
                break;
            }
        }
    }

    console.log(`✅ All ${totalSlides} slides captured to ${outputDir}`);
});
