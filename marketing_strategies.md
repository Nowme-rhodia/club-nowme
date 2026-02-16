# Stratégies d'Activation & Conversion - Club Nowme (100% Automatisées)

En tant qu'expert marketing ciblant les femmes de 30+, voici une analyse différenciée pour tes deux segments d'audience. La psychologie de la femme de 30+ repose sur **la confiance, la recherche de lien social authentique et la valorisation du temps pour soi**.
*Ton : Tutoiement, complice, bienveillant, encourageant.*

## 1. Le Segment "Les Hésitantes" (Compte créé, pas d'abonnement)

**Profil :** Elles ont fait la démarche de s'inscrire (création de compte) mais ont abandonné au moment de payer.
**Frein psychologique :** "Est-ce que je vais vraiment l'utiliser ?", "Est-ce que ça vaut le coût ?".
**Levier émotionnel :** L'empathie, la compréhension de la charge mentale et l'invitation à la légèreté.

### Séquence Automatisée (3 Emails)

#### Email 1 : L'Empathie (J+1 après inscription)
*   **Sujet :** "Et si on t'enlevait une épine du pied ? 🌸"
*   **Message :** "On sait ce que c'est... La charge mentale, le temps qui file, l'envie de bien faire mais l'énergie qui manque parfois pour chercher les bons plans ou les bonnes personnes.
    C'est exactement pour ça qu'on a créé le Club. Pour que tu n'aies plus à gérer tout ça toute seule.
    Tu as juste à te laisser porter. Viens voir à quel point la vie est plus douce de l'autre côté.
    Rejoins-nous pour seulement **12,99€ le premier mois**."

#### Email 2 : La Confiance / Le Carnet d'Adresses (J+3)
*   **Sujet :** "Arrête de chercher sur Google..."
*   **Message :** "Arrête de payer ton cocktail plein pot.
    Arrête de chercher une bonne thérapeute au hasard sur internet.
    Arrête de perdre du temps à trouver des services à domicile fiables.

    On les a ici. On les a testés pour toi. Ils sont validés par la commu.
    En ne validant pas ton abonnement, tu te prives de ce carnet d'adresses secret et de toutes ces économies (Cocktails, Soins, Services...)."

#### Email 3 : La Preuve Sociale (J+7)
*   **Sujet :** "Elles ont sauté le pas (et elles ne regrettent pas)"
*   **Message :** "Rejoindre un club, c'est parfois intimidant. Mais regarde autour de toi : des femmes comme toi, qui voulaient juste kiffer, rencontrer et souffler.
    Elles sont là, elles t'attendent. Ne reste pas sur le pas de la porte. Investit en toi. Investit en ton bien être.
    Le Club Nowme, N'attend qu'une chose, que tu sautes le pas."

---

## 2. Le Segment "Les Exploratrices" (Compte Invité / Achat Unique)

**Profil :** Elles ont acheté un ticket pour un événement Nowme. Elles sont convaincues par le produit mais pas encore abonnées.
**Frein psychologique :** "Je n'ai pas besoin d'un abonnement pour juste une sortie".
**Levier émotionnel :** L'expérience VIP, le sentiment d'appartenance et la rationalité économique.

### Séquence Automatisée (3 Emails)

#### Email 1 : Bienvenue & Teasing (J+1 après achat)
*   **Sujet :** "Tu vas adorer [Nom de l'événement] ! 🎉"
*   **Message :** "Bravo ! Tu as ta place pour **[Nom de l'événement]**. On a tellement hâte de t'y voir.
    Petite info entre nous : savais-tu que nos membres ont accès à ce même événement pour **[Prix Membre]€** ?
    C'est pas grave pour cette fois, l'important c'est que tu sois là. Mais sache que le Club réserve plein de petites attentions comme ça à ses membres."

#### Email 2 : Anticipation (J-2 avant l'événement)
*   **Sujet :** "J-2 ! Prête pour le kiff ?"
*   **Message :** "Plus que deux jours avant **[Nom de l'événement]**.
    Prépare ta tenue, ton sourire (et ta voix si c'est du karaoké !).
    Toute l'équipe et les membres du Club ont hâte de t'accueillir. À très vite !"

#### Email 3 : Le Bilan & L'Invitation (J+1 après l'événement)
*   **Sujet :** "On a adoré ce moment avec toi !"
*   **Message :** "Hello !
    On a adoré partager ce moment avec toi chez **Nowme** ! J'espère que ça t'a fait autant de bien qu'à nous.

    Pour la prochaine fois, on aimerait te gâter encore plus.
    En tant que membre, cette place t'aurait coûté **[Prix Membre]€** au lieu de **[Prix Payé]€**.

    Mais au-delà de l'économie, c'est tout un accès qu'on veut t'offrir :
    - Nos meilleures thérapeutes recommandées
    - Nos adresses secrètes (cocktails, restos...)
    - Nos services testés pour toi

    L'abonnement est à **12,99€/mois**. Viens nous rejoindre, on t'attend de l'autre côté !"

---

## Implémentation Technique Automatisée

1.  **Récupération des Assets :** Identifier l'image "Pas de filtres" dans le code pour l'insérer dynamiquement dans l'email.
2.  **Requête SQL "Exploratrices" :**
    *   Utiliser `customer_orders` lié à `bookings` pour récupérer `event_start_date` dans `offers`.
    *   Calculer les dates d'envoi basées sur `event_start_date` (J-2, J+1 Post).
3.  **Automation :**
    *   Cron job quotidien ou Edge est déclenché pour vérifier les dates.
    *   Envoi via le système d'email transactionnel existant.

---

## 3. Stratégie d'Affiliation (Partenaires Approuvés & À intégrer)

Voici la liste officielle des 11 partenaires **validés** à intégrer dès maintenant sur la plateforme.

### A. Beauté & Bien-être
*   **Hairlust FR** (Cheveux) : Soins capillaires naturels et innovants.
    *   *Offre à créer :* "Découverte Hairlust : Soins cheveux naturels"
*   **Maison des Fragrances** (Parfums) : Grand catalogue de parfums et déodorants.
    *   *Offre à créer :* "Vos parfums préférés à prix doux"
*   **Bonjour Drink** (Bien-être/Food) : Boissons adaptogènes naturelles.
    *   *Offre à créer :* "Energie & Focus au naturel avec Bonjour Drink"
*   **French Mush** (Santé/Bien-être) : Champignons adaptogènes (Lions Mane, etc.).
    *   *Offre à créer :* "Boostez votre immunité avec French Mush"

### B. Maison & Déco
*   **La Couette Française** (Maison) : Literie premium Made in France.
    *   *Offre à créer :* "Nuits de rêve Made in France"
*   **Deesup** (Déco/Design) : Mobilier design de seconde main.
    *   *Offre à créer :* "Design iconique de seconde main"
*   **Darty** (Électroménager/Tech) : L'incontournable pour la maison.
    *   *Offre à créer :* "Tout l'équipement maison avec Darty"

### C. Lifestyle & Loisirs
*   **Fnac** (Culture/Tech) : Livres, Billetterie, High-Tech.
    *   *Offre à créer :* "Culture & Loisirs : Vos envies à portée de clic"
*   **MonBento** (Lifestyle/Food) : Lunchbox design et pratiques.
    *   *Offre à créer :* "Vos déjeuners nomades avec style"
*   **Sport Découverte** (Loisirs/Cadeaux) : Stages, baptêmes, activités insolites.
    *   *Offre à créer :* "Offrez des sensations : Pilotage, Saut, Bien-être..."
*   **ASMC** (Outdoor/Aventure) : Camping, survie, nature.
    *   *Offre à créer :* "L'appel de l'aventure : Équipement Outdoor"

---

### 🛠️ Procédure d'Intégration (Pas à Pas)

Pour chaque partenaire ci-dessus :

1.  **Créer le compte Partenaire (Admin)**
    *   Aller dans **Admin > Utilisateurs > Créer un partenaire**.
    *   **Nom :** [Nom du Partenaire] (ex: MonBento).
    *   **Email :** `rhodia+[nompartenaire]@nowme.fr` (ex: `rhodia+monbento@nowme.fr`).
    *   **Catégorie :** Choisir la plus pertinente (Maison, Beauté, etc.).

2.  **Récupérer le Lien d'Affiliation (Awin)**
    *   Aller sur Awin > Outils > **Générateur de liens**.
    *   Choisir le partenaire.
    *   Coller l'URL de destination (ex: la page d'accueil de leur site ou une page promo).
    *   Copier le **lien long** généré (commençant souvent par `https://www.awin1.com...`).

3.  **Créer l'Offre (Admin)**
    *   Aller dans **Admin > Offres > Créer une offre**.
    *   Sélectionner le partenaire créé à l'étape 1.
    *   **Titre :** Voir suggestions ci-dessus.
    *   **Type de réservation :** "Lien Externe".
    *   **Lien :** Coller le lien Awin généré.
    *   **Image :** Utiliser une belle image produit ou le logo (dispo sur Awin).
    *   **Description :** Décrire en une phrase l'avantage (ex: "Profitez de la livraison offerte" ou "Découvrez la sélection").
