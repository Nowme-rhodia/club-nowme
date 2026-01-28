import { stripHtmlAndDecode } from '../src/utils/textFormatters';

// Simple mock for browser implementation since we are running in node
if (typeof global.window === 'undefined') {
    // @ts-ignore
    global.window = {};
}

// Test cases
const tests = [
    { input: '<p>Hello</p>', expected: 'Hello' },
    { input: 'Hello &lt;br&gt; World', expected: 'Hello <br> World' }, // The browser decoder actually decodes encoded tags to their char representation but keeps them as text?
    // Wait, my implementation:
    // 1. Decodes "&lt;br&gt;" -> "<br>"
    // 2. Strips HTML "<br>" -> ""
    // 3. Decodes again -> ""
    // So "Hello &lt;br&gt; World" -> "Hello World"
    { input: '&lt;p&gt;Encoded Paragraph&lt;/p&gt;', expected: 'Encoded Paragraph' },
    { input: 'Simple text', expected: 'Simple text' },
    { input: 'Text with &nbsp; nbsp', expected: 'Text with   nbsp' },
];

console.log("Running Text Formatter Tests...\n");

tests.forEach(({ input, expected }, idx) => {
    // We can't easily test DOMParser dependent logic in Node without JSDOM
    // But we can verify the fallback path logic if we force "window" to be undefined temporarily or test the logic that runs in node.
    // The current implementation checks "typeof window !== 'undefined'".
    // In this script node, it returns false.

    // Let's test the fallback path since that's what we can test here easily without setup.
    // Ideally we trust the browser path works via DOMParser.

    // BUT WAIT, if the fallback path is used in SSR (unlikely here since it's SPA), it matters.
    // Actually the standard implementation I wrote uses a fallback that does simple replacement.

    // Let's just output what happens.
    // I need to copy the function here to test it isolated without TS compilation or import issues if I just run `node`.
    // OR I can use `ts-node` if available.
});

// Since I can't easily run TS files, I will write a JS test file with the function embedded to verify logic.
console.log("Skipping direct TS execution, creating JS test file.");
