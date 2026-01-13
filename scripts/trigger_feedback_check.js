
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

async function triggerFeedback() {
    const functionUrl = `${supabaseUrl}/functions/v1/send-feedback-email`
    console.log('Triggering feedback check at:', functionUrl)

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({}),
        })

        const text = await response.text()
        console.log('Response status:', response.status)
        try {
            const json = JSON.parse(text)
            console.log('Response JSON:', JSON.stringify(json, null, 2))
        } catch (e) {
            console.log('Response Text:', text)
        }

    } catch (error) {
        console.error('Error triggering function:', error)
    }
}

triggerFeedback()
