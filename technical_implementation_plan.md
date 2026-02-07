# Plan Technique : Automation Marketing Club Nowme

## 1. Vue d'ensemble
L'objectif est d'automatiser l'envoi d'emails transactionnels ciblés pour deux segments d'utilisateurs via des séquences de 3 emails chacune.

**Segments :**
1.  **Les Hésitantes (Abandoned Signup) :** Utilisateurs inscrits sans abonnement actif.
2.  **Les Exploratrices (Guest Purchasers) :** Clients invités ayant payé pour un événement.

## 2. Segment "Les Hésitantes"
**Séquence :** J+1 (Empathie), J+3 (Trust/Catalogue), J+7 (Preuve Sociale).

### Identification (SQL)
La requête doit être exécutée quotidiennement et identifier les utilisateurs créés il y a 1, 3 ou 7 jours.

```sql
SELECT 
    up.user_id, 
    up.email, 
    up.first_name, 
    up.created_at,
    CASE 
        WHEN up.created_at::date = (CURRENT_DATE - INTERVAL '1 day')::date THEN 'hesitante_j1'
        WHEN up.created_at::date = (CURRENT_DATE - INTERVAL '3 days')::date THEN 'hesitante_j3'
        WHEN up.created_at::date = (CURRENT_DATE - INTERVAL '7 days')::date THEN 'hesitante_j7'
    END as campaign_type
FROM user_profiles up
LEFT JOIN subscriptions s ON up.user_id = s.user_id AND (s.status = 'active' OR s.status = 'trialing')
WHERE 
    s.id IS NULL -- Pas d'abonnement actif
    AND (
        up.created_at::date = (CURRENT_DATE - INTERVAL '1 day')::date OR
        up.created_at::date = (CURRENT_DATE - INTERVAL '3 days')::date OR
        up.created_at::date = (CURRENT_DATE - INTERVAL '7 days')::date
    )
;
```

### Templates
*   **J+1 :** "Et si on t'enlevait une épine du pied ? 🌸" (Empathie + Charge Mentale)
*   **J+3 :** "Arrête de chercher sur Google..." (Catalogue Thérapeutes/Services)
*   **J+7 :** "Elles ont sauté le pas..." (Preuve sociale)

## 3. Segment "Les Exploratrices"
**Séquence :** J+1 Achat (Welcome), J-2 Event (Anticipation), J+1 Post-Event (Conversion).

### Identification (SQL)
Nécessite de lier la commande à l'événement via `bookings`.

```sql
SELECT 
    co.customer_email, 
    co.amount_cents, 
    p.business_name as partner_name,
    o.title as event_title,
    o.event_start_date,
    ov.price as full_price,
    ov.discounted_price as member_price,
    CASE 
        WHEN co.created_at::date = (CURRENT_DATE - INTERVAL '1 day')::date THEN 'exploratrice_j1_achat'
        WHEN o.event_start_date::date = (CURRENT_DATE + INTERVAL '2 days')::date THEN 'exploratrice_j_minus_2_event'
        WHEN o.event_start_date::date = (CURRENT_DATE - INTERVAL '1 day')::date THEN 'exploratrice_j1_post_event'
    END as campaign_type
FROM customer_orders co
JOIN partners p ON co.partner_id = p.id
JOIN bookings b ON co.booking_id = b.id
JOIN offers o ON b.offer_id = o.id
LEFT JOIN offer_variants ov ON b.offer_id = ov.offer_id -- Simplification pour récupérer les prix (à affiner selon variante choisie)
LEFT JOIN user_profiles up ON co.customer_email = up.email
LEFT JOIN subscriptions s ON up.user_id = s.user_id
WHERE 
    (s.status IS NULL OR s.status != 'active') -- Pas membre
    AND p.contact_email = 'rhodia@nowme.fr' -- Events Nowme uniquement
    AND (
        co.created_at::date = (CURRENT_DATE - INTERVAL '1 day')::date OR
        o.event_start_date::date = (CURRENT_DATE + INTERVAL '2 days')::date OR
        o.event_start_date::date = (CURRENT_DATE - INTERVAL '1 day')::date
    )
;
```

### Templates
*   **J+1 Achat :** "Tu vas adorer [Event] ! (Psst : les membres ont payé moins cher)"
*   **J-2 Event :** "J-2 ! Prête pour le kiff ?" (Rappel + Excitation)
*   **J+1 Post-Event :** "On a adoré ce moment avec toi !" (Bilan financier + Invitation au Club)

## 4. Automation Strategy

### Option A : Edge Functions + Cron (Recommandé)
1.  Créer une Edge Function `send-marketing-emails` déclenchée quotidiennement via Cron (pg_cron ou service externe).
2.  Cette fonction exécute les requêtes SQL ci-dessus.
3.  Pour chaque résultat, elle envoie un email via l'API d'envoi (Resend/SendGrid/etc. déjà configuré).
4.  Elle enregistre l'envoi dans une table `email_logs` pour éviter les doublons.

### Prochaines étapes
1.  **Créer la table `marketing_campaign_logs`** pour tracker qui a reçu quoi.
2.  **Développer la Edge Function** TypeScript.
3.  **Intégrer les templates** d'emails.
