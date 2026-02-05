import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadPartnerImages() {
    const images = [
        {
            file: 'C:/Users/rhodi/.gemini/antigravity/brain/8a17ca82-1e19-476c-bbe3-453e7e262982/uploaded_media_0_1770299317836.png',
            partner: 'cosmiquelife',
            name: 'cosmiquelife-cover.png'
        },
        {
            file: 'C:/Users/rhodi/.gemini/antigravity/brain/8a17ca82-1e19-476c-bbe3-453e7e262982/uploaded_media_1_1770299317836.png',
            partner: 'dj-prive',
            name: 'dj-prive-cover.png'
        },
        {
            file: 'C:/Users/rhodi/.gemini/antigravity/brain/8a17ca82-1e19-476c-bbe3-453e7e262982/uploaded_media_2_1770299317836.png',
            partner: 'sabrina-talot',
            name: 'sabrina-talot-cover.png'
        },
        {
            file: 'C:/Users/rhodi/.gemini/antigravity/brain/8a17ca82-1e19-476c-bbe3-453e7e262982/uploaded_media_3_1770299317836.png',
            partner: 'level-up-event',
            name: 'level-up-event-cover.png'
        },
        {
            file: 'C:/Users/rhodi/.gemini/antigravity/brain/8a17ca82-1e19-476c-bbe3-453e7e262982/uploaded_media_4_1770299317836.png',
            partner: 'cabinet-borges',
            name: 'cabinet-borges-cover.png'
        }
    ];

    console.log('📤 Uploading partner images to Supabase...\n');

    for (const img of images) {
        try {
            const fileBuffer = fs.readFileSync(img.file);

            const { data, error } = await supabase.storage
                .from('partner-assets')
                .upload(`instagram-covers/${img.name}`, fileBuffer, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (error) {
                console.error(`❌ Error uploading ${img.partner}:`, error.message);
            } else {
                const { data: urlData } = supabase.storage
                    .from('partner-assets')
                    .getPublicUrl(`instagram-covers/${img.name}`);

                console.log(`✅ ${img.partner}:`);
                console.log(`   ${urlData.publicUrl}\n`);
            }
        } catch (err) {
            console.error(`❌ Failed to upload ${img.partner}:`, err.message);
        }
    }

    console.log('✅ Upload complete!');
}

uploadPartnerImages().catch(console.error);
