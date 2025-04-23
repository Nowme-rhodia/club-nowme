# Installation

## Prérequis

- [Node.js](https://nodejs.org)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

## Setup local

```bash
git clone https://github.com/NowmeClub/backend.git
cd backend
npm install

# Lancer les fonctions
supabase functions serve stripe-webhook --no-verify-jwt --env-file supabase/functions/stripe-webhook/.env
```