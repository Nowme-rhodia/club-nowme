-- Create generic newsletter subscribers table (for non-users)
create table if not exists public.newsletter_subscribers (
    email text primary key,
    created_at timestamptz default now(),
    is_active boolean default true,
    source text default 'website' -- 'website', 'checkout', etc.
);

alter table public.newsletter_subscribers enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Anyone can subscribe to newsletter" on public.newsletter_subscribers;
drop policy if exists "Admins can view newsletter subscribers" on public.newsletter_subscribers;

-- Allow anyone to subscribe (insert)
create policy "Anyone can subscribe to newsletter"
    on public.newsletter_subscribers for insert
    with check (true);

-- Only admins can view subscribers
create policy "Admins can view newsletter subscribers"
    on public.newsletter_subscribers for select
    using (
        exists (
            select 1 from public.user_profiles
            where user_id = auth.uid() and is_admin = true
        )
    );

--------------------------------------------------------------------------------
-- Blog Posts Table
--------------------------------------------------------------------------------
-- Drop table to ensure clean slate with new columns
drop table if exists public.blog_posts cascade;

create table public.blog_posts (
    id uuid default gen_random_uuid() primary key,
    slug text not null unique,
    title text not null,
    excerpt text,
    content text, -- Markdown content
    cover_image text,
    category text,
    author_name text default 'Team NowMe',
    location_tags text[] default '{}',
    published_at timestamptz default now(),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    status text default 'published' -- 'draft', 'published'
);

alter table public.blog_posts enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Blog posts are public" on public.blog_posts;
drop policy if exists "Admins can manage blog posts" on public.blog_posts;

-- Public read access
create policy "Blog posts are public"
    on public.blog_posts for select
    using (status = 'published');

-- Admin write access
create policy "Admins can manage blog posts"
    on public.blog_posts for all
    using (
        exists (
            select 1 from public.user_profiles
            where user_id = auth.uid() and is_admin = true
        )
    );

-- Seed some initial blog posts with LONGER content and Team NowMe author
insert into public.blog_posts (slug, title, excerpt, category, cover_image, content, author_name, location_tags, published_at)
values
(
    'charge-mentale-5-astuces-lacher-prise',
    'Charge mentale : 5 astuces pour (vraiment) lâcher prise',
    'Listes de courses, rendez-vous médicaux, dossiers urgents... Votre cerveau ne s''arrête jamais ? Voici 5 techniques concrètes pour appuyer sur pause.',
    'Bien-être',
    'https://images.unsplash.com/photo-1499209971180-41fa05cce389?auto=format&fit=crop&q=80',
    E'# Charge mentale : 5 astuces pour (vraiment) lâcher prise\n\nVous avez l''impression d''être un ordinateur avec 45 onglets ouverts et une musique de cirque en fond sonore ? Bienvenue au club des femmes modernes surchargées. La charge mentale, c''est ce poids invisible mais écrasant qui pèse sur nous, cette nécessité de devoir "penser à tout" pour tout le monde, tout le temps.\n\nMais rassurez-vous, ce n''est pas une fatalité. Il est possible de alléger ce fardeau sans que votre monde ne s''écroule. Voici nos 5 astuces testées et approuvées par la Team NowMe.\n\n## 1. La règle des 2 minutes (Miraculeuse)\nC''est simple : si une tâche prend moins de 2 minutes, faites-la tout de suite. Répondre à ce SMS, ranger ces chaussures, payer cette facture. Ne la notez pas, ne la reportez pas. Faites-la.\n\nPourquoi ? Parce que l''énergie mentale nécessaire pour se souvenir de faire la tâche est souvent supérieure à l''énergie de la faire. En éliminant ces micro-tâches, vous libérez une RAM précieuse dans votre cerveau.\n\n## 2. Déléguez (vraiment, sans reprendre derrière)\nDéléguer, ce n''est pas dire à l''autre "fais ça" et surveiller par-dessus son épaule. C''est lui laisser la responsabilité du résultat.\n\nSi vous demandez à votre conjoint de gérer le dîner, acceptez qu''on mange des pâtes ou que ce ne soit pas prêt à 19h30 pile. Si vous repassez derrière, vous ne déléguez pas, vous managez. Et manager, c''est du travail. Lâchez le contrôle pour gagner en liberté.\n\n## 3. Le "Brain Dump" du soir\nAvant de dormir, prenez un carnet et videz votre cerveau. Notez absolument TOUT ce qui vous préoccupe : la liste de courses, l''idée pour le projet X, le rappel pour le vaccin du chat.\n\nUne fois que c''est écrit, votre cerveau sait que l''information est en sécurité. Il peut donc arrêter de la tourner en boucle. C''est la clé d''un sommeil réparateur.\n\n## 4. Bloquez des créneaux "Rien" dans votre agenda\nOui, "Rien" est une activité à part entière. C''est le moment où votre cerveau se régénère. Pas de téléphone, pas de podcast, juste vous et un thé, ou une balade.\n\nConsidérez ces créneaux comme aussi importants qu''une réunion avec votre boss. Vous n''annuleriez pas votre boss pour une lessive ? Alors ne vous annulez pas vous-même.\n\n## 5. Rejoignez une communauté bienveillante\nParfois, la meilleure façon de lâcher prise, c''est de sortir de chez soi et de penser à autre chose. De rire avec des femmes qui vivent la même chose que vous.\n\nC''est exactement ce qu''on fait au **Club NowMe**. On s''occupe de tout (l''orga, le lieu, l''ambiance), vous n''avez qu''à venir kiffer. C''est votre bulle d''oxygène mensuelle.\n\n> **Envie de souffler ?** Rejoins le Club NowMe et laisse-nous organiser tes moments de déconnexion. Plus besoin de penser à "qu''est-ce qu''on fait ce soir ?", on a déjà tout prévu.\n\n[Je découvre le club](/subscription)',
    'Team NowMe',
    ARRAY['Paris', '75001', '75002'],
    now() - interval '1 day'
),
(
    'sortir-seule-meilleure-chose',
    'Pourquoi sortir seule est la meilleure chose qui puisse vous arriver',
    'Peur du regard des autres ? Envie mais pas osé ? Découvrez pourquoi le "Solo Date" est l''ultime acte de self-love et comment franchir le pas.',
    'Empowerment',
    'https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80',
    E'# Pourquoi sortir seule est la meilleure chose qui puisse vous arriver\n\nAller au cinéma seule ? Manger au resto seule ? L''angoisse totale pour certaines, un pur bonheur pour d''autres. Le "Masterdating" (l''art de sortir avec soi-même) est la tendance qui libère et booste la confiance en soi.\n\nOn attend souvent les autres pour faire des choses. "Je verrais bien cette expo, mais Julie n''est pas dispo". Résultat ? On ne fait rien. Et si on arrêtait d''attendre ?\n\n## 1. La liberté totale et sans compromis\nQuand vous sortez seule, le programme vous appartient à 100%. Pas besoin de négocier le choix du restaurant, l''heure de la séance ou le rythme de la visite au musée.\n\nVous voulez rester 2 heures devant ce tableau ? Faites-le. Vous voulez partir au bout de 10 minutes parce que le film est nul ? Partez. Cette liberté est grisante.\n\n## 2. On est plus ouverte aux rencontres\nParadoxalement, on est beaucoup plus "approchable" quand on est seule que quand on est en groupe ou en couple, fermée sur sa conversation.\n\nEn étant seule, on observe plus, on sourit plus aux inconnus, on est plus attentive aux détails. C''est souvent là que se font les rencontres les plus inattendues et enrichissantes.\n\n## 3. Un booster de confiance incroyable\nSurmonter la peur du "qu''en-dira-t-on" est un boost d''ego phénoménal. La première fois, vous penserez que tout le monde vous regarde et vous juge ("la pauvre, elle n''a pas d''amis").\n\nLa réalité ? Personne ne vous regarde. Les gens sont bien trop occupés avec leur propre assiette ou leur téléphone. Une fois que vous réalisez ça, vous vous sentez invincible.\n\n## Comment commencer ?\nCommencez petit : un café en terrasse avec un livre. Puis un cinéma (facile, on est dans le noir !). Puis un déjeuner rapide. Et enfin, le graal : le dîner au restaurant.\n\n**Tu veux tester mais pas totalement seule ?** C''est là que le Club NowMe est magique. Tu viens seule à nos événements, mais tu repars avec des copines. C''est le marche-pied idéal vers plus d''indépendance. L''équilibre parfait entre autonomie et sororité.',
    'Team NowMe',
    ARRAY['Paris', 'Ile-de-France'],
    now() - interval '2 days'
),
(
    'bars-caches-paris-date-copines',
    'Les 5 bars cachés de Paris pour épater vos copines',
    'Marre des terrasses bondées ? On vous dévoile nos adresses secrètes (Speakeasy) préférées pour une soirée inoubliable à Paris.',
    'Sorties',
    'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80',
    E'# Les 5 bars cachés de Paris pour épater vos copine\n\nRien de tel qu''un bar caché derrière une porte de frigo, une bibliothèque ou une laverie pour pimenter une soirée. Le frisson de l''interdit, l''ambiance feutrée, les cocktails sur-mesure... Voici notre sélection de Speakeasy parisiens pour votre prochaine sortie entre filles.\n\n## 1. Le Lavomatic (10ème arrondissement)\nC''est un classique, mais il fait toujours son petit effet. Vous entrez dans une laverie lambda (où des gens lavent vraiment leur linge !), vous repérez le bouton caché sur la machine à laver du fond, et hop ! Vous voilà dans un petit bar à l''étage, ambiance pop et colorée. Idéal pour commencer la soirée.\n\n## 2. Moonshiner (11ème arrondissement)\nDirection la pizzeria Da Vito. Ne vous arrêtez pas aux pizzas (aussi bonnes soient-elles), filez tout droit vers la chambre froide. Poussez la lourde porte métallique... et voyagez dans le temps. Ambiance Prohibition, jazz, lumière tamisée et cocktails au whisky à tomber. Un de nos préférés.\n\n## 3. Little Red Door (3ème arrondissement)\nIl est régulièrement élu parmi les 50 meilleurs bars du monde, et ce n''est pas pour rien. La petite porte rouge est iconique. À l''intérieur, les menus sont de véritables livres d''art. Les cocktails sont créatifs, surprenants, parfois déroutants, mais toujours délicieux.\n\n## 4. Candelaria (3ème arrondissement)\nUne taqueria mexicaine minuscule et bruyante à l''avant. Un bar à cocktails sombre, sexy et pointu à l''arrière. Les margaritas y sont légendaires, tout comme l''ambiance. Attention, c''est souvent plein, il faut arriver tôt !\n\n## 5. Le Syndicat (10ème arrondissement)\nSous-titré "Organisation de Défense des Spiritueux Français". La façade est recouverte d''affiches et de tags, on passerait devant sans le voir. À l''intérieur, c''est chic et doré (style brut-luxe). Ici, on redécouvre le patrimoine liquide français (Cognac, Armagnac, Calvados) revisité de manière ultra moderne.\n\n> **Tu veux plus d''adresses secrètes ?** Dans le Club NowMe, on te privatise souvent des lieux ou on t''emmène découvrir ces pépites sans que tu aies besoin de faire la queue ou de chercher l''adresse pendant 20 minutes.',
    'Team NowMe',
    ARRAY['Paris', '75010', '75011', '75003'],
    now() - interval '3 days'
),
(
    'faire-nouvelles-amies-30-ans',
    'Comment se faire des nouvelles amies à 30 ans ?',
    'À la trentaine, le cercle social évolue. Déménagements, bébés, carrières... Comment reconstruire sa "tribu" quand on est adulte ? Guide de survie.',
    'Lifestyle',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80',
    E'# Comment se faire des nouvelles amies à 30 ans ?\n\nÀ l''école, c''était facile. "Tu veux être ma copine ?" suffisait pour sceller une amitié pour la vie. Adulte, c''est plus compliqué. On a moins de temps, plus de filtres, et souvent la peur de déranger.\n\nPourtant, à 30 ans, nos cercles changent. Les amies d''enfance déménagent, les copines de fac sont prises par leurs enfants, et on se retrouve parfois un peu seule le vendredi soir. Pas de panique, c''est NORMAL. Et ça se corrige.\n\n## 1. Suivez vos passions (Le filtre naturel)\nLe meilleur moyen de rencontrer des gens qui vous ressemblent, c''est de faire ce que vous aimez. Poterie, boxe, lecture, tricot...\n\nSi vous rencontrez quelqu''un dans un cours de céramique, vous avez déjà deux choses en commun : vous aimez la céramique, et vous êtes disponibles le mardi soir. C''est une base solide !\n\n## 2. La règle de la régularité\nLes psychologues expliquent que l''amitié naît de la répétition des interactions non planifiées. C''est pour ça qu''on se fait des amis au bureau ou à la fac. La "tête connue" devient vite une "connaissance" puis une "amie".\n\nAlors, allez toujours au même café, à la même salle de sport, à la même heure. Soyez régulière dans vos activités.\n\n## 3. Osez proposer (Faites le premier pas)\n"Ça te dit un café après le cours ?" "J''ai vu cette expo, ça t''intéresse ?". Oui, ça fait peur. Oui, on a peur du rejet (comme en drague !). Mais le jeu en vaut la chandelle. La plupart des femmes sont comme vous : elles ont envie de connecter mais n''osent pas demander.\n\n## 4. Soyez vulnérable\nLes amitiés superficielles restent superficielles parce qu''on reste dans le "ça va, et toi ?". Pour créer un vrai lien, il faut oser parler de vrai. De ses doutes, de ses galères. C''est la vulnérabilité qui crée l''intimité.\n\n**Le shortcut ultime ? Rejoindre une communauté.**\nRejoindre un club de femmes comme **NowMe**, c''est appuyer sur l''accélérateur. Tout le monde est là pour la même chose : partager, rire et se connecter. La glace est déjà brisée avant même d''arriver. C''est un espace bienveillant conçu pour favoriser les rencontres authentiques.',
    'Team NowMe',
    ARRAY['France', 'Online'],
    now() - interval '4 days'
),
(
    'me-time-pas-egoiste',
    'Le "Me-Time" : pourquoi ce n''est pas égoïste, mais vital',
    'Culpabilité de laisser les enfants ? De ne pas bosser ? Stop. Prendre du temps pour soi est le meilleur service à rendre aux autres.',
    'Bien-être',
    'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80',
    E'# Le "Me-Time" : pourquoi ce n''est pas égoïste, mais vital\n\nOn nous a appris, en tant que femmes, à faire passer les autres avant nous. Les enfants, le conjoint, le travail, les parents, le chat... Résultat ? On est épuisées, irritables et on n''a plus rien à donner à personne.\n\nImaginez le message de sécurité dans l''avion : "Mettez votre masque à oxygène avant d''aider les autres". C''est la métaphore parfaite de la vie. Si vous ne respirez pas, si vous êtes à bout de souffle, vous ne pouvez aider personne.\n\nLe Me-Time (temps pour soi) vous permet de :\n\n### 1. Recharger vos batteries\nOn ne peut pas rouler avec un réservoir vide. Ce temps est votre carburant.\n\n### 2. Prendre du recul\nQuand on a la tête dans le guidon, on manque de perspective. S''éloigner du quotidien permet de voir les choses plus clairement, de relativiser les petits soucis.\n\n### 3. Retrouver votre identité\nVous n''êtes pas que "Maman", "Chérie" ou "Boss". Vous êtes VOUS. Qu''est-ce que VOUS aimez faire quand personne ne vous demande rien ?\n\n**Besoin d''un alibi pour votre Me-Time ?**\n"Désolée chéri, j''ai un événement prévu avec mon club, je ne peux pas annuler". Works every time.\n\nAbonnez-vous à NowMe et bloquez vos soirées ! C''est votre rendez-vous officiel avec vous-même.',
    'Team NowMe',
    ARRAY['Bien-être', 'Coaching'],
    now() - interval '5 days'
),
(
    'teletravail-lien-social',
    'Télétravail : ne devenez pas hermite !',
    'Le Full Remote a ses avantages, mais attention à l''isolement. Comment garder une vie sociale riche ? Nos conseils.',
    'Carrière',
    'https://images.unsplash.com/photo-1593642632823-8f78536788c6?auto=format&fit=crop&q=80',
    E'# Télétravail : Attention danger d''isolement\n\nTravailler en pyjama, lancer une lessive entre deux calls, éviter les transports... Le télétravail, c''est la belle vie. Mais au bout de quelques mois, le piège se referme : on ne voit plus personne. Les jours se ressemblent, la frontière pro/perso disparaît, et on finit par parler à sa plante verte.\n\nPour éviter de devenir une hermite sociale, suivez **la règle des 3S** :\n\n## 1. Sortir (Dehors, vraiment)\nIl est impératif de sortir de chez soi au moins une fois par jour. Pas juste pour sortir les poubelles. Allez chercher du pain, faites le tour du pâté de maisons. Voyez la lumière du jour, sentez l''air frais.\n\n## 2. Sueur (Bouger son corps)\nLe télétravail favorise la sédentarité extrême. Votre dos vous détestera bientôt. Yoga, marche, salle de sport... bougez ! C''est aussi excellent pour le moral.\n\n## 3. Social (Parler à un humain en 3D)\nLes réunions Zoom ne comptent pas. Vous avez besoin d''interactions réelles, spontanées. Le sourire de la boulangère, la discussion avec un voisin.\n\n**La solution NowMe :**\nNos membres en télétravail se retrouvent souvent pour des sessions de coworking improvisées dans des cafés sympas, ou pour nos déjeuners connectés. C''est l''occasion de bosser dans une bonne ambiance et de networker sans pression. Rejoins le mouvement !',
    'Team NowMe',
    ARRAY['Remote', 'Co-working', 'Paris'],
    now() - interval '10 days'
),
(
    'bienfaits-poterie-manuelle',
    'Les bienfaits insoupçonnés de la poterie',
    'Pourquoi tout le monde s''y met ? Parce que c''est magique pour le cerveau. Zoom sur l''art thérapie tendance du moment.',
    'Bien-être',
    'https://images.unsplash.com/photo-1526401281623-279b498f10f4?auto=format&fit=crop&q=80',
    E'# La Poterie : le nouveau Yoga ?\n\nVous avez remarqué ? Tout le monde se met à la poterie. Céramique par ci, tournage par là. Effet de mode ? Peut-être. Mais surtout, une réponse à notre besoin profond de déconnexion.\n\nToucher la terre, se salir les mains, se concentrer sur le moment présent. La poterie est une forme de méditation active ultrapuissante.\n\nÇa nous force à :\n\n### 1. Accepter l''imperfection\nVotre premier bol sera tordu. Il sera moche. Et c''est OK. Dans un monde où on cherche la perfection sur Instagram, ça fait un bien fou d''accepter le "wabi-sabi" (la beauté de l''imperfection).\n\n### 2. La Patience\nOn ne peut pas accélérer le séchage de la terre. Si on va trop vite à la cuisson, ça casse. La poterie nous réapprend le temps long, à l''opposé de l''immédiateté de nos smartphones.\n\n### 3. Lâcher le mental pour le sensoriel\nQuand vous êtes au tour, vous ne pouvez pas penser à votre to-do list, sinon la terre s''effondre. Vous êtes obligée d''être à 100% là, dans vos mains.\n\nOn organise régulièrement des ateliers initiation poterie ou céramique avec nos partenaires (et avec -20% pour les membres !). Venez mettre les mains dans la terre, c''est thérapeutique.',
    'Team NowMe',
    ARRAY['Paris', '75011'],
    now() - interval '11 days'
)
-- Add more posts as needed following this pattern...
on conflict (slug) do nothing;
