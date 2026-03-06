import Stripe from 'stripe';
import dotenv from 'dotenv';
dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia'
});

// Créer un coupon
const coupon = await stripe.coupons.create({ percent_off: 10, duration: 'once' });
console.log('Coupon créé:', coupon.id);

// Utiliser le SDK directement (pas fetch)
try {
    const pc = await stripe.promotionCodes.create({
        coupon: coupon.id,
        code: 'NOWME_SDK_TEST_001'
    });
    console.log('✅ Code promo créé via SDK:', pc.id, '/', pc.code);
} catch (e) {
    console.error('❌ SDK Error:', e.message, '| raw msg:', e.raw?.message);

    // Essai avec request() directement
    try {
        const result = await stripe.request({
            method: 'POST',
            path: '/v1/promotion_codes',
            query: {},
            body: { coupon: coupon.id, code: 'NOWME_REQ_TEST_001' }
        });
        console.log('✅ Via stripe.request():', JSON.stringify(result));
    } catch (e2) {
        console.error('❌ Via request():', e2.message);
    }
}

await stripe.coupons.del(coupon.id);
