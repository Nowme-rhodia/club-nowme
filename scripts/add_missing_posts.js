
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const posts = [
    {
        title: "20 idées d'activités pour s'amuser entre filles",
        slug: "20-idees-activites-samuser-entre-filles",
        excerpt: "La beauté d'une activité entre filles est qu'on peut se lâcher. Trouvez ici mes bons plans pour ne jamais manquer d'inspiration de sorties pour s'amuser entre filles.",
        category: "Sorties",
        cover_image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80",
        author_name: "Team NowMe",
        status: "published",
        published_at: new Date().toISOString(),
        content: `# 20 Idées d'activités pour s'amuser entre filles

Il n’y a rien de tel que de passer du temps entre filles pour rire, se détendre et créer des souvenirs. Que ce soit pour célébrer une amitié, organiser un événement spécial ou simplement s’évader du quotidien, voici 20 idées d’activités pour passer des moments mémorables entre filles.

## Pour les actives et les sportives
1. **Une séance de yoga ou de Pilates en plein air** : Profitez du beau temps pour vous étirer et vous relaxer ensemble.
2. **Une randonnée en nature** : Explorez les sentiers locaux pour une bouffée d’air frais et de belles vues.
3. **Un cours de danse** : Salsa, hip-hop ou danse classique, trouvez un style qui vous plaît à toutes.
4. **Une sortie à vélo** : Parcourez la ville ou la campagne pour une journée dynamique.
5. **Session de fitness ou de crossfit** : Encouragez-vous mutuellement lors d’un entraînement intense.

## Pour les créatives
6. **Un atelier de poterie ou de peinture** : Laissez libre cours à votre imagination en créant des objets uniques.
7. **Un cours de cuisine ou de pâtisserie** : Apprenez à préparer de nouveaux plats et dégustez-les ensuite.
8. **Création de bijoux** : Fabriquez vos propres accessoires personnalisés.
9. **Atelier DIY (Do It Yourself)** : Décoration d'intérieur, couture ou cosmétiques naturels.
10. **Un club de lecture** : Partagez vos impressions sur vos livres préférés autour d'un thé.

## Pour se détendre et se faire chouchouter
11. **Une journée au spa** : Massage, sauna et hammam pour une déconnexion totale.
12. **Une séance de manucure/pédicure** : Prenez soin de vous tout en discutant.
13. **Un pique-nique chic** : Préparez de bons petits plats et installez-vous dans un beau parc.
14. **Une séance de cinéma ou de marathon de séries** : Installez-vous confortablement avec du pop-corn.
15. **Un après-midi shopping** : Découvrez les dernières tendances ensemble.

## Pour les soirées mémorables
16. **Une soirée karaoké** : Chantez vos chansons préférées sans complexe.
17. **Dîner dans un nouveau restaurant** : Testez une cuisine que vous n’avez jamais goûtée.
18. **Soirée jeux de société** : Une compétition amicale pour briser la glace.
19. **Cocktails ou mocktails à la maison** : Apprenez à mixer vos propres boissons.
20. **Rejoindre un club de femmes comme NowMe** : La solution ultime pour ne plus jamais manquer d'idées et rencontrer d'autres femmes formidables !

> [!TIP]
> L'important n'est pas tant l'activité que le moment partagé. N'oubliez pas de prendre des photos !
`
    },
    {
        title: "Où fêter son anniversaire entre copines à Paris ? Le top 5 testé et validé",
        slug: "ou-feter-son-anniversaire-entre-copines-paris",
        excerpt: "Trouver le lieu parfait pour fêter son anniversaire entre filles à Paris peut être un vrai casse-tête. Voici nos 5 concepts préférés.",
        category: "Ville",
        cover_image: "https://images.unsplash.com/photo-1530103862676-de8892b12320?auto=format&fit=crop&q=80",
        author_name: "Team NowMe",
        status: "published",
        published_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        content: `# Où fêter son anniversaire entre copines à Paris ?

Fêter son anniversaire entre copines à Paris... on adore l'idée. Sauf quand vient le moment de choisir le lieu ! Pour vous éviter le casse-tête logistique, voici notre sélection testée et validée par la communauté.

## 1. Le karaoké privatif (BAM Karaoke Box)
C'est le défouloir ultime. Privatisez une salle, choisissez vos playlists et lancez-vous. Personne ne vous entend à part vos amies, c'est idéal pour lâcher prise.

## 2. Un brunch buffet à volonté
Rien de tel qu'un dimanche matin pour célébrer. Choisissez un lieu avec une belle verrière ou une terrasse pour une ambiance lumineuse et festive.

## 3. L'atelier créatif (Poterie ou Peinture & Vin)
Allier création et apéro, c'est le combo gagnant. Vous repartez avec un souvenir concret de votre journée.

## 4. Un Rooftop avec vue sur la Tour Eiffel
Pour marquer le coup et faire de superbes photos. L'ambiance y est toujours électrique.

## 5. Une soirée exclusive avec le Club NowMe
Et si vous rejoigniez un de nos événements ? On s'occupe de toute l'organisation, vous n'avez qu'à venir avec votre bonne humeur.
`
    },
    {
        title: "Sortir seule quand on est une femme : les meilleures idées sans se prendre la tête",
        slug: "sortir-seule-femme-paris-idees",
        excerpt: "Envie de faire un truc cool mais personne de dispo ? Sortir seule peut faire peur au début, mais c'est le meilleur moyen de se reconquérir.",
        category: "Lifestyle",
        cover_image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80",
        author_name: "Team NowMe",
        status: "published",
        published_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        content: `# Sortir seule quand on est une femme

Sortir seule n'est pas un aveu d'échec social, c'est une preuve de liberté. Voici quelques pistes pour apprivoiser la sortie solo.

## Le "Solo Date" au café
Prenez un livre, installez-vous en terrasse et profitez simplement. C'est l'exercice parfait pour s'habituer au regard des autres.

## Une séance de cinéma en milieu de journée
Dans l'obscurité, personne ne sait si vous êtes seule ou accompagnée. C'est un excellent moyen de se faire plaisir sans pression.

## Participer à un atelier de groupe
Inscrivez-vous seule à un cours de cuisine ou de sport. L'activité servira de filtre et facilitera les échanges si vous le souhaitez.

## Rejoindre NowMe
Nos événements sont pensés pour celles qui viennent seules. C'est le pont idéal : vous venez seule, mais vous n'êtes jamais isolée.
`
    },
    {
        title: "Maman sur les rotules ? 3 idées pour décompresser (sans les enfants)",
        slug: "mamans-idees-sorties-entre-amies-decompresser",
        excerpt: "Parce qu'un apéro au parc avec un œil sur le toboggan n'est pas vraiment une pause. Voici 3 idées pour lâcher prise.",
        category: "Lifestyle",
        cover_image: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?auto=format&fit=crop&q=80",
        author_name: "Team NowMe",
        status: "published",
        published_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        content: `# Maman sur les rotules ? Décompressez !

On le sait, être maman est un job à plein temps. Mais pour être une maman épanouie, il faut savoir redevenir une femme tout court de temps en temps.

## 1. La cure de silence au Spa
Pas de cris, pas de "Maman !", juste le bruit de l'eau et une odeur d'eucalyptus. 2 heures de déconnexion totale.

## 2. Un dîner tardif entre amies
Laissez le papa ou la baby-sitter gérer le coucher. Sortez, parlez d'autre chose que des couches et profitez de votre soirée.

## 3. Une soirée Comedy Club
Le rire est la meilleure thérapie contre le stress. Une heure de stand-up vous fera oublier toutes les galères de la semaine.

> [!NOTE]
> Prendre du temps pour soi n'est pas égoïste, c'est nécessaire pour mieux revenir vers sa famille.
`
    }
];

async function restorePosts() {
    console.log('Starting restoration...');
    for (const post of posts) {
        const { data, error } = await supabase
            .from('blog_posts')
            .upsert(post, { onConflict: 'slug' });

        if (error) {
            console.error(`Error with ${post.slug}:`, error.message);
        } else {
            console.log(`Successfully restored: ${post.slug}`);
        }
    }
    console.log('Restoration complete.');
}

restorePosts();
