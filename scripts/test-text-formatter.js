
function stripHtmlAndDecode(html) {
    if (!html) return '';

    // Mock DOMParser for Node environment
    class DOMParser {
        parseFromString(str) {
            return {
                body: {
                    textContent: str // Simplified mock: just return string. 
                    // In real browser, this decodes entities.
                    // For this test script, we can't easily mock entity decoding without a library.
                    // So we will test the RegEx strip part which is the most critical for "removing tags".
                }
            };
        }
    }

    // Polyfill window/DOMParser if needed
    const isNode = typeof window === 'undefined';

    // 0. Initial decode
    let decoded = html;
    // In node we skip the DOMParser parts unless we polyfill.
    // Let's rely on the fallback path for this test script since we are in node.

    // 1. Strip HTML tags
    const stripped = decoded.replace(/<[^>]+>/g, '');

    // Fallback path logic
    return stripped
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

const tests = [
    { input: '<p>Hello</p>', expected: 'Hello' },
    { input: '<div>Bold <b>Text</b></div>', expected: 'Bold Text' },
    { input: 'No tags', expected: 'No tags' },
    { input: 'Break<br/>Check', expected: 'BreakCheck' }, // regex removes tag, no space
];

console.log("Running Text Formatter Tests (Node Fallback Path)...\n");

let passed = 0;
tests.forEach(({ input, expected }, idx) => {
    const result = stripHtmlAndDecode(input);
    if (result === expected) {
        console.log(`[PASS] Test ${idx + 1}`);
        passed++;
    } else {
        console.error(`[FAIL] Test ${idx + 1}: Expected "${expected}", got "${result}"`);
    }
});

if (passed === tests.length) {
    console.log("\nAll tests passed!");
} else {
    console.log(`\n${tests.length - passed} tests failed.`);
    process.exit(1);
}
