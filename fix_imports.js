import fs from 'fs';
import path from 'path';

const dir = 'supabase/functions';

function getAllTsFiles(directory) {
    let results = [];
    const list = fs.readdirSync(directory);
    for (const file of list) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getAllTsFiles(filePath));
        } else if (file.endsWith('.ts')) {
            results.push(filePath);
        }
    }
    return results;
}

const files = getAllTsFiles(dir);

for (const f of files) {
    try {
        let content = fs.readFileSync(f, 'utf8');
        let original = content;

        // Replace various module import formats with import map aliases
        content = content.replace(/['"](?:jsr:|npm:|https:\/\/esm\.sh\/)@supabase\/supabase-js(?:@[^'"]+)?['"]/g, '"@supabase/supabase-js"');
        content = content.replace(/['"](?:npm:|https:\/\/esm\.sh\/)resend(?:@[^'"]+)?['"]/g, '"resend"');
        content = content.replace(/['"](?:npm:|https:\/\/esm\.sh\/)stripe(?:@[^'"]+)?['"]/g, '"stripe"');
        content = content.replace(/['"](?:npm:|https:\/\/esm\.sh\/)pdf-lib(?:@[^'"]+)?['"]/g, '"pdf-lib"');

        if (content !== original) {
            fs.writeFileSync(f, content, 'utf8');
            console.log('Fixed imports in ' + f);
        }
    } catch (e) {
        console.error('Error processing ' + f + ':', e);
    }
}
