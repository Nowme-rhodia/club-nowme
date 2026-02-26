const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testSend() {
    console.log('--- Testing Resend Delivery to nowme.club@gmail.com ---');
    try {
        const { data, error } = await resend.emails.send({
            from: "Nowme Club <contact@nowme.fr>",
            to: ["nowme.club@gmail.com"],
            subject: "Test Delivery Check",
            html: "<strong>Ceci est un test pour vérifier la délivrabilité.</strong>"
        });

        if (error) {
            console.error('❌ Resend Error:', error);
        } else {
            console.log('✅ Email sent successfully!', data);
        }
    } catch (e) {
        console.error('❌ Critical Error:', e);
    }
}

testSend();
