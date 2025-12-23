
const { execSync } = require('child_process');
try {
    const output = execSync('npx playwright test tests/tous-les-kiffs.spec.ts', { encoding: 'utf8' });
    console.log(output);
} catch (error) {
    console.log('TEST FAILED');
    console.log(error.stdout);
    console.log(error.stderr);
}
