import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, '../agenda_export.html');
const pdfPath = path.join(__dirname, '../agenda_fevrier_avril.pdf');

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await chromium.launch();
        const page = await browser.newPage();
        console.log(`Navigating to file://${htmlPath}`);
        await page.goto(`file://${htmlPath}`);

        console.log('Generating PDF...');
        await page.pdf({
            path: pdfPath,
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0px',
                bottom: '0px',
                left: '0px',
                right: '0px'
            }
        });

        await browser.close();
        console.log(`PDF successfully created at ${pdfPath}`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        process.exit(1);
    }
})();
