
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

const envConfig = dotenv.parse(fs.readFileSync('.env'))
const supabaseUrl = envConfig.VITE_SUPABASE_URL
const supabaseKey = envConfig.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
    const { data, error } = await supabase.from('offers').select('video_url').limit(1)
    if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
            console.log('MISSING')
        } else {
            console.log('ERROR: ' + error.message)
        }
    } else {
        console.log('EXISTS')
    }
}

check()
