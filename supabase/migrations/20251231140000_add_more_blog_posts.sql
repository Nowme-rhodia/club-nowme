-- Insert 10 new SEO-friendly blog posts
insert into public.blog_posts (slug, title, excerpt, category, cover_image, content, author_name, location_tags, published_at, status)
values
(
    'oser-voyager-seule-30-ans',
    'Oser voyager seule après 30 ans : le guide complet',
    'Le grand saut vous tente mais la peur vous retient ? Conseils, destinations sûres et témoignages pour votre première aventure solo.',
    'Voyage',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=80',
    E'# Oser voyager seule après 30 ans : le guide complet\n\n"Mais tu n''as pas peur ?" "Tu vas t''ennuyer !" "C''est dangereux". Si vous avez évoqué votre envie de partir seule, vous avez sûrement entendu ces phrases. Pourtant, voyager seule est l''une des expériences les plus libératrices qui soient.\n\n## Pourquoi se lancer maintenant ?\nÀ 30 ans, on se connaît mieux qu''à 20. On a (généralement) un peu plus de budget, et on sait ce qu''on aime. C''est le moment idéal pour un voyage qui VOUS ressemble, sans compromis.\n\n## Les destinations idéales pour commencer\n1. **Copenhague, Danemark** : Sûr, facile à naviguer, et le "hygge" est partout.\n2. **Lisbonne, Portugal** : Ensoleillé, abordable, et les gens sont adorables.\n3. **Ubud, Bali** : La Mecque du yoga et du voyage solo féminin.\n\n## Nos conseils sécurité\n- Partagez votre itinéraire avec une proche.\n- Faites confiance à votre instinct (toujours).\n- Arrivez de jour dans une nouvelle ville.\n\n> **Tu veux trouver des compagnes de voyage ?** Poste une annonce dans la communauté NowMe ! Beaucoup de nos membres cherchent des binômes pour leurs escapades.',
    'Team NowMe',
    ARRAY['Monde', 'Aventure'],
    now() - interval '1 day',
    'published'
),
(
    'reconnaitre-amitie-toxique',
    'Amitié toxique : comment la reconnaître et s''en libérer ?',
    'On parle souvent d''amour toxique, mais l''amitié peut aussi faire des ravages. Les signes qui ne trompent pas et comment dire stop.',
    'Bien-être',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80',
    E'# Amitié toxique : comment la reconnaître et s''en libérer ?\n\nVous ressortez de ce déjeuner épuisée, vidée, voire triste ? Ce n''est pas normal. L''amitié est censée vous élever, pas vous enfoncer. Zoom sur les "vampires énergétiques".\n\n## Les signes d''alerte\n- **C''est toujours à sens unique** : Elle parle de ses problèmes pendant 2h, mais ne vous écoute pas plus de 5 minutes.\n- **La culpabilité** : "Tu ne m''appelles jamais", "Je pensais que tu étais mon amie".\n- **La critique déguisée** : "C''est courageux de porter ça", "Tu as de la chance d''avoir ce job, même s''il n''est pas très ambitieux".\n\n## Comment rompre ?\nComme en amour, c''est dur. Mais nécessaire. Vous pouvez opter pour le "Slow Fade" (on espace les rencontres) ou la discussion franche si l''amitié a été longue.\n\nEntourez-vous de personnes qui célèbrent vos victoires. Au **Club NowMe**, la bienveillance est la règle n°1. Pas de jugement, juste du soutien.',
    'Team NowMe',
    ARRAY['Psychologie', 'Relations'],
    now() - interval '2 days',
    'published'
),
(
    'digital-detox-48h',
    'J''ai testé 48h sans écran : bilan d''une digital detox',
    'Accro aux notifs ? Je me suis coupée du monde pendant un week-end. Angoisse, ennui puis... révélation. Récit d''une déconnexion.',
    'Lifestyle',
    'https://images.unsplash.com/photo-1496346651079-6674b3867814?auto=format&fit=crop&q=80',
    E'# J''ai testé 48h sans écran : bilan d''une digital detox\n\nVendredi 19h. J''éteins mon téléphone. Je le mets dans un tiroir. C''est parti pour 48h.\n\n## Les premières heures : le manque\nMa main cherche mon téléphone par réflexe. Je me demande ce que font les autres. J''ai peur de rater quelque chose (FOMO : Fear Of Missing Out). C''est physique.\n\n## Le samedi : le temps s''étire\nSoudain, j''ai du temps. Vraiment du temps. Je finis un livre. Je cuisine. Je marche sans podcast. Mes pensées sont plus claires, moins fragmentées.\n\n## Le bilan\nLundi matin, je rallume. Rien de grave ne s''est passé. Le monde a tourné sans moi. Par contre, moi, je suis REPOSÉE. Vraiment.\n\n**Le défi NowMe** : On organise des week-ends "Deconnect" en nature. Pas de wifi, juste des rires et du feu de bois. Cap de venir ?',
    'Team NowMe',
    ARRAY['Déconnexion', 'Santé Mentale'],
    now() - interval '3 days',
    'published'
),
(
    'changer-vie-pro-35-ans',
    'Reconversion professionnelle : changer de vie à 35 ans (c''est possible)',
    'Le "boulot-dodo" ne vous convient plus ? La quête de sens vous chatouille ? Guide pratique pour pivoter sans tout casser.',
    'Carrière',
    'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80',
    E'# Changer de vie pro à 35 ans ? C''est possible\n\nOn dit souvent que 35-40 ans est l''âge du bilan. "Est-ce que je veux faire ça pendant encore 25 ans ?". Si la réponse est non, lisez ceci.\n\n## Ne pas jeter le bébé avec l''eau du bain\nOn rêve de tout plaquer pour ouvrir une maison d''hôtes dans le Larzac. Mais parfois, un simple changement d''entreprise ou de poste suffit. Analysez ce qui vous pèse : le métier ou l''environnement ?\n\n## Le Side-Project : la meilleure école\nAvant de démissionner, testez ! Lancez votre projet le soir ou le week-end. C''est moins risqué et ça permet de valider votre idée.\n\n> **Besoin d''inspiration ?** Nos apéros "Boss Lady" font témoigner des femmes qui ont osé sauter le pas. Venez prendre une dose de courage !',
    'Team NowMe',
    ARRAY['Travail', 'Formation'],
    now() - interval '4 days',
    'published'
),
(
    'survivre-dating-apps',
    'Survival Guide : les applis de rencontre quand on cherche du sérieux',
    'Tinder, Bumble, Hinge... La jungle du dating vous épuise ? Nos stratégies pour garder sa santé mentale et (peut-être) trouver la perle.',
    'Love & Sex',
    'https://images.unsplash.com/photo-1516726817505-f5ed8251b4a8?auto=format&fit=crop&q=80',
    E'# Survivre aux applis de rencontre quand on cherche du sérieux\n\nLe Ghosting. Le Benching. Le Breadcrumbing. Le vocabulaire du dating moderne fait peur. Mais peut-on encore trouver l''amour sur une app ? Oui, si on garde le contrôle.\n\n## 1. Soyez claire dès le profil\nNe jouez pas la "Cool Girl" qui "ne se prend pas la tête" si vous voulez une relation. Écrivez clairement ce que vous cherchez. Ça fera fuir les touristes, et tant mieux.\n\n## 2. Limitez le temps d''écran\nTraitez l''appli comme une tâche, pas un passe-temps. 15 minutes par jour, point. Ne scrollez pas avant de dormir, c''est mauvais pour l''ego.\n\n## 3. Rencontrez vite (IRL)\nOn peut fantasmer des semaines par message pour être déçue en 3 secondes devant un café. Passez au réel rapidement pour vérifier l''alchimie.',
    'Team NowMe',
    ARRAY['Célibat', 'Rencontres', 'Paris'],
    now() - interval '5 days',
    'published'
),
(
    'apprivoiser-ses-complexes',
    'Body Neutrality : et si on arrêtait de se juger ?',
    'Marre de l''injonction à "aimer son corps" ? Découvrez la neutralité corporelle : accepter son corps pour ce qu''il fait, pas ce qu''il est.',
    'Bien-être',
    'https://images.unsplash.com/photo-1581060329037-c7526bb43d1a?auto=format&fit=crop&q=80',
    E'# Body Neutrality : et si on arrêtait de se juger ?\n\nLe mouvement Body Positive nous dit : "Tu es déesse, aime tes bourrelets !". C''est génial, mais parfois... on n''y arrive pas. Et on culpabilise de ne pas s''aimer.\n\n## La Body Neutrality, c''est quoi ?\nC''est dire "Mon corps n''est pas un ornement. C''est un véhicule."\n- "Merci mes jambes de me permettre de marcher", au lieu de "Elles sont trop grosses".\n- "Merci mon ventre de digérer", au lieu de "Il n''est pas plat".\n\nC''est enlever la charge émotionnelle liée à l''apparence. On s''en fout que ce soit beau ou moche. C''est fonctionnel. Et ça, c''est reposant.',
    'Team NowMe',
    ARRAY['Confiance', 'Santé'],
    now() - interval '6 days',
    'published'
),
(
    'afterwork-insolite-paris',
    '5 spots insolites pour un Afterwork qui change à Paris',
    'Le classique pinte en Happy Hour vous lasse ? Voici nos adresses pépites pour surprendre vos collègues ou vos amies.',
    'Sorties',
    'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&q=80',
    E'# 5 spots insolites pour un Afterwork qui change à Paris\n\nSortir du bureau et atterrir dans un autre monde, c''est la promesse de ces lieux atypiques.\n\n## 1. Le Perchoir Ménilmontant\nClassique, mais la vue sur le Sacré-Cœur au coucher du soleil reste imbattable.\n\n## 2. Le Player One\nUn bar rétrogaming ! Mario Kart et bières artisanales. Parfait pour briser la glace.\n\n## 3. La Recyclerie\nBoire un verre sur les rails de la Petite Ceinture, au milieu des poules et du potager urbain. Dépaysement total porte de Clignancourt.\n\n## 4. Le Comptoir Général\nEst-ce un bar ? Un musée ? Une jungle ? Un peu de tout ça. L''ambiance coloniale décalée au bord du canal Saint-Martin est unique.\n\n> **Tu veux tester ces adresses mais tes amies sont casanières ?** Les Afterworks NowMe sont là pour ça ! On privatise des coins sympas et on se retrouve entre membres.',
    'Team NowMe',
    ARRAY['Paris', 'Sorties', '75018', '75010'],
    now() - interval '7 days',
    'published'
),
(
    'livres-femmes-inspirantes',
    '5 livres qui vont booser votre ambition féminine',
    'Besoin d''un coup de pied aux fesses ? Ces biographies et essais féministes vont vous donner envie de conquérir le monde.',
    'Culture',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80',
    E'# 5 livres qui vont booser votre ambition féminine\n\nL''inspiration, ça se cultive. Voici notre bibliothèque idéale pour se sentir badass.\n\n## 1. "Becoming" - Michelle Obama\nL''anti-conte de fées. Du travail, de la résilience, et une authenticité désarmante.\n\n## 2. "King Kong Théorie" - Virginie Despentes\nLe manifeste punk qui déconstruit la féminité imposée. Ça secoue, ça réveille, ça fait du bien.\n\n## 3. "Lean In" - Sheryl Sandberg\nCertes un peu daté, mais les conseils sur la négociation et la "place à table" restent pertinents pour naviguer dans le monde corporate.\n\nOn en discute le mois prochain au **Book Club NowMe** ! Rejoins-nous, on a du vin et des débats passionnés.',
    'Team NowMe',
    ARRAY['Lecture', 'Inspiration'],
    now() - interval '8 days',
    'published'
),
(
    'budget-plaisir-sans-culpabiliser',
    'Gérer son budget "Plaisir" sans finir dans le rouge',
    'Fini les découverts le 15 du mois. La méthode 50/30/20 pour profiter de la vie tout en assurant ses arrières.',
    'Lifestyle',
    'https://images.unsplash.com/photo-1579621970563-ebec7560eb3e?auto=format&fit=crop&q=80',
    E'# Gérer son budget "Plaisir" sans finir dans le rouge\n\nL''argent est souvent tabou chez les femmes. Pourtant, l''indépendance financière est la clé de la liberté.\n\n## La règle du 50/30/20\nC''est la base :\n- **50% de vos revenus** pour les besoins vitaux (loyer, courses, factures).\n- **30% pour les envies** (restos, shopping, voyages).\n- **20% pour l''épargne** (sécurité et projets).\n\nSi vous respectez ça, vous pouvez dépenser vos 30% sans AUCUNE culpabilité. C''est budgété, c''est fait pour !\n\n## Automatiser\nDès que la paie tombe, l''épargne doit partir automatiquement sur un autre compte. "Pay yourself first".\n\nÊtre membre **Club NowMe**, c''est aussi faire des économies grâce aux réductions négociées chez nos partenaires (Sport, Beauté, Coaching). Ton abonnement est vite rentabilisé !',
    'Team NowMe',
    ARRAY['Argent', 'Astuces'],
    now() - interval '9 days',
    'published'
),
(
    'morning-routine-realiste',
    'La Morning Routine réaliste pour celles qui ne sont pas du matin',
    'Oubliez le "Miracle Morning" à 5h du mat. Voici une routine douce pour commencer la journée du bon pied, même la tête dans le pâté.',
    'Bien-être',
    'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&q=80',
    E'# La Morning Routine réaliste pour celles qui ne sont pas du matin\n\nOn voit partout ces routines de PDG qui se lèvent à 4h30 pour courir un marathon et méditer 1h. Spoiler : ce n''est pas pour tout le monde.\n\nSi pour vous, le matin est une épreuve, essayez la méthode douce :\n\n## 1. Pas de téléphone au réveil (Le plus dur)\nAchetez un vrai réveil. Ne laissez pas Instagram dicter votre humeur avant même d''être sortie du lit.\n\n## 2. Un grand verre d''eau\nVotre corps est déshydraté après la nuit. Boire réveille le métabolisme.\n\n## 3. S''étirer 2 minutes\nPas besoin de faire un cours de Yoga complet. Juste s''étirer comme un chat pour dérouiller la machine.\n\nC''est tout. Si vous faites déjà ça, c''est une victoire. Soyez bienveillante avec vous-même !',
    'Team NowMe',
    ARRAY['Routine', 'Morning'],
    now() - interval '10 days',
    'published'
);
