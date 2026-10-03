"""Writes one hand-authored jsonl fixture per Track A judge (see
setup/configure_judges.py), each with 5 rows designed to trip that specific
judge's "no" verdict. Used to sanity-check that a judge actually catches the
violation it's supposed to catch (see scripts/generate.py's
SEED_OPINIONS_JUDGE_TEST mode) — same spirit as running against real data,
but adversarial/synthetic instead of derived from data/raw/, so it lives
here as code rather than being produced by prepare_data.py.

Each row: conversation_title/body (generic French civic-conversation
context), sibling_seed_opinions (only populated for the "fresh" fixture,
since that's the only judge that needs sibling context), and seed_opinion
(the candidate text expected to be flagged "no" by the matching judge).

Usage:
    uv run python initiatives/seed-opinions/scripts/setup/create_judge_test_data.py
"""

from __future__ import annotations

import json
from pathlib import Path

PROCESSED_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "processed"

# single_point: combines multiple ideas, too vague, or bundles proposals — should be "no".
SINGLE_POINT_CASES = [
    {
        "conversation_title": "Transition énergétique : quelles priorités ?",
        "conversation_body": "Discussion sur les mesures à adopter pour accélérer la transition énergétique en France.",
        "seed_opinion": "Il faut réduire la consommation de viande, investir dans les transports en commun et interdire les sacs en plastique.",
    },
    {
        "conversation_title": "Régulation des réseaux sociaux",
        "conversation_body": "Faut-il davantage réguler les plateformes sociales ?",
        "seed_opinion": "La régulation des réseaux sociaux est complexe et dépend de nombreux facteurs culturels et politiques.",
    },
    {
        "conversation_title": "Avenir du VTC et des taxis",
        "conversation_body": "Comment organiser la concurrence entre VTC et taxis ?",
        "seed_opinion": "Uber devrait être interdit et les taxis devraient avoir de meilleures applications et systèmes de notation.",
    },
    {
        "conversation_title": "Santé publique et alimentation",
        "conversation_body": "Quelles mesures pour améliorer la santé publique ?",
        "seed_opinion": "Il faut taxer le sucre, limiter la publicité pour la malbouffe et rendre le sport obligatoire à l'école.",
    },
    {
        "conversation_title": "Politique du logement",
        "conversation_body": "Comment résoudre la crise du logement ?",
        "seed_opinion": "Cela dépend de la situation de chacun et il y a beaucoup de facteurs à prendre en compte avant de décider.",
    },
    {
        "conversation_title": "Prévention santé",
        "conversation_body": "Faut-il investir davantage dans la prévention ?",
        "seed_opinion": "Investir dans la prévention réduit les coûts à long terme et améliore la santé publique.",
    },  # two claims joined by "et"
    {
        "conversation_title": "Jardins partagés",
        "conversation_body": "Les communes doivent-elles soutenir les jardins partagés ?",
        "seed_opinion": "Les communes devraient créer des jardins partagés pour renforcer les liens sociaux et l'autonomie alimentaire.",
    },  # one proposal, two bundled goals
]

# single_point, should-PASS side: one claim with a single reason/goal is allowed (owner
# decision, see configure_judges.py). Written to judgetest_single_point_ok.jsonl — expect
# "yes" here, unlike every other judgetest_* file.
SINGLE_POINT_OK_CASES = [
    {
        "conversation_title": "Zones à faibles émissions",
        "conversation_body": "Comment rendre les ZFE plus justes ?",
        "seed_opinion": "Les ZFE devraient inclure des aides financières pour les ménages modestes afin d'éviter leur exclusion.",
    },
    {
        "conversation_title": "Transports en commun",
        "conversation_body": "Faut-il rendre les transports en commun gratuits ?",
        "seed_opinion": "Les transports en commun devraient être gratuits pour les moins de 25 ans.",
    },
    {
        "conversation_title": "Biodiversité en ville",
        "conversation_body": "Comment favoriser la biodiversité dans nos parcs ?",
        "seed_opinion": "Les parcs devraient laisser une partie de leurs pelouses non tondues pour protéger les pollinisateurs.",
    },
    {
        "conversation_title": "Travail et temps libre",
        "conversation_body": "Faut-il passer à la semaine de quatre jours ?",
        "seed_opinion": "La semaine de quatre jours devrait être testée dans la fonction publique avant d'être généralisée.",
    },
    {
        "conversation_title": "Écrans à l'école",
        "conversation_body": "Quelle place pour les écrans à l'école primaire ?",
        "seed_opinion": "Les tablettes devraient être interdites en classe avant 8 ans parce qu'elles nuisent à la concentration.",
    },
]

# contestable: neutral facts, questions, or near-universal truisms — should be "no".
CONTESTABLE_CASES = [
    {
        "conversation_title": "Alimentation et santé",
        "conversation_body": "Discussion sur les habitudes alimentaires et la santé publique.",
        "seed_opinion": "Une alimentation équilibrée est importante pour la santé.",
    },
    {
        "conversation_title": "Télétravail",
        "conversation_body": "Quel avenir pour le télétravail dans les entreprises ?",
        "seed_opinion": "Que pensez-vous du télétravail ?",
    },
    {
        "conversation_title": "Sciences et environnement",
        "conversation_body": "Comprendre les bases scientifiques du changement climatique.",
        "seed_opinion": "L'eau bout à 100 degrés Celsius au niveau de la mer.",
    },
    {
        "conversation_title": "Organisation de la consultation citoyenne",
        "conversation_body": "Informations pratiques sur le déroulement de la consultation.",
        "seed_opinion": "La réunion est prévue mardi prochain à 14h.",
    },
    {
        "conversation_title": "Bien-être général",
        "conversation_body": "Discussion sur les priorités de santé publique.",
        "seed_opinion": "La plupart des gens préfèrent être en bonne santé plutôt que malades.",
    },
]

# fresh: near-duplicate rewording of a sibling candidate — should be "no".
# Each row's sibling_seed_opinions holds the "original" the seed_opinion just rewords.
FRESH_CASES = [
    {
        "conversation_title": "Télétravail et productivité",
        "conversation_body": "Le télétravail a-t-il un effet sur la productivité des employés ?",
        "sibling_seed_opinions": ["Le télétravail augmente la productivité des employés."],
        "seed_opinion": "Travailler depuis chez soi améliore la productivité des salariés.",
    },
    {
        "conversation_title": "Consommation de viande",
        "conversation_body": "Faut-il taxer la viande pour son impact environnemental ?",
        "sibling_seed_opinions": ["Une taxe sur la viande se justifie par les dégâts qu'elle cause à l'environnement."],
        "seed_opinion": "Il est justifié d'imposer une taxe sur la viande en raison de son impact sur l'environnement.",
    },
    {
        "conversation_title": "Zones à faibles émissions",
        "conversation_body": "Quel est l'effet des ZFE sur la qualité de l'air en ville ?",
        "sibling_seed_opinions": ["Les zones à faibles émissions favorisent la qualité de l'air en ville."],
        "seed_opinion": "Les ZFE améliorent la qualité de l'air dans les villes.",
    },
    {
        "conversation_title": "Chalutage de fond",
        "conversation_body": "Le chalutage de fond devrait-il être interdit dans les aires marines protégées ?",
        "sibling_seed_opinions": ["Le chalutage de fond devrait être interdit dans toutes les aires marines protégées."],
        "seed_opinion": "Il faudrait interdire le chalutage de fond dans les zones marines protégées.",
    },
    {
        "conversation_title": "IA et démocratie",
        "conversation_body": "L'intelligence artificielle peut-elle renforcer la démocratie ?",
        "sibling_seed_opinions": ["L'IA peut renforcer la démocratie en facilitant la participation citoyenne."],
        "seed_opinion": "L'intelligence artificielle peut favoriser la démocratie en rendant la participation citoyenne plus facile.",
    },
]

# fitting: much more complex or simpler than the participants' own statements, or
# using invented/unexplained jargon — should be "no".
FITTING_CASES = [
    {
        "conversation_title": "Transports en commun",
        "conversation_body": "Comment améliorer les bus dans notre ville ?",
        "sibling_seed_opinions": [
            "Il faut plus de bus le soir.",
            "Les tickets de bus sont trop chers.",
            "Les arrêts de bus devraient avoir des abris.",
        ],
        "seed_opinion": (
            "L'optimisation du maillage intermodal suppose une réallocation des "
            "fréquences selon une logique de rabattement capacitaire."
        ),  # far more abstract/technical than siblings
    },
    {
        "conversation_title": "Vie de quartier",
        "conversation_body": "Quelles actions pour rendre notre quartier plus agréable ?",
        "sibling_seed_opinions": [
            "Il faut plus de bancs dans le parc.",
            "La mairie devrait organiser une fête de quartier chaque été.",
        ],
        "seed_opinion": "Il faut mettre en place une démarche de co-urbanité résiliente pilotée par les habitants.",
    },  # invented jargon
    {
        "conversation_title": "Santé au travail",
        "conversation_body": "Comment mieux prévenir l'épuisement professionnel ?",
        "sibling_seed_opinions": [
            "Les managers devraient être formés à repérer les signes d'épuisement.",
            "Le droit à la déconnexion devrait être mieux respecté.",
        ],
        "seed_opinion": "Les entreprises devraient systématiser les RPS-QVCT via un référent PSSM.",
    },  # unexplained acronyms
    {
        "conversation_title": "Réforme des retraites",
        "conversation_body": (
            "Le gouvernement propose de relever l'âge légal de départ à 64 ans et "
            "d'accélérer l'allongement de la durée de cotisation."
        ),
        "sibling_seed_opinions": [
            "L'allongement de la durée de cotisation pénalise surtout ceux qui ont commencé à travailler tôt.",
            "Les métiers pénibles devraient permettre un départ anticipé à taux plein.",
        ],
        "seed_opinion": "Les retraites c'est important.",
    },  # much simpler/vaguer than siblings
    {
        "conversation_title": "Alimentation à la cantine",
        "conversation_body": "Que faut-il changer dans les repas servis à la cantine ?",
        "sibling_seed_opinions": [
            "Il faudrait plus de légumes bio.",
            "Un repas végétarien par semaine ne suffit pas.",
        ],
        "seed_opinion": (
            "La restauration collective scolaire devrait intégrer une approche "
            "nutritionnelle holistique fondée sur la densité micronutritionnelle."
        ),  # academic wording vs everyday siblings
    },
]

# brief: over BRIEF_MAX_CHARS (280, see configure_judges.py) — should be "no".
BRIEF_CASES = [
    {
        "conversation_title": "Accès aux soins de santé",
        "conversation_body": "Comment garantir un accès équitable aux soins pour tous ?",
        "seed_opinion": (
            "Il est absolument essentiel et fondamental pour notre société de garantir un accès "
            "universel et gratuit aux soins de santé pour tous les citoyens, quel que soit leur "
            "revenu, leur âge, leur origine sociale ou leur lieu de résidence, car la santé est un "
            "droit fondamental et non un privilège réservé à ceux qui peuvent se le permettre."
        ),
    },
    {
        "conversation_title": "Avenir de l'éducation publique",
        "conversation_body": "Quelles réformes pour améliorer l'école publique ?",
        "seed_opinion": (
            "Pour véritablement améliorer notre système éducatif sur le long terme, il faudrait "
            "revoir en profondeur la formation des enseignants, réduire significativement la taille "
            "des classes, moderniser les infrastructures scolaires vieillissantes, et surtout donner "
            "aux établissements davantage d'autonomie pédagogique pour s'adapter aux besoins locaux."
        ),
    },
    {
        "conversation_title": "Mobilité urbaine durable",
        "conversation_body": "Comment repenser les déplacements en ville ?",
        "seed_opinion": (
            "La seule façon réaliste de réduire durablement la pollution automobile dans nos villes "
            "est de développer massivement et rapidement des réseaux de transports en commun "
            "efficaces, fiables et abordables, tout en aménageant des pistes cyclables sécurisées "
            "partout, afin que se passer de voiture individuelle devienne enfin une option crédible."
        ),
    },
    {
        "conversation_title": "Régulation du numérique",
        "conversation_body": "Faut-il un cadre légal plus strict pour les grandes plateformes ?",
        "seed_opinion": (
            "Étant donné le pouvoir considérable qu'ont acquis les grandes plateformes numériques "
            "sur nos vies quotidiennes, notre économie et même nos démocraties, il devient urgent "
            "d'imposer une régulation beaucoup plus stricte, avec des sanctions financières "
            "dissuasives et une transparence totale sur leurs algorithmes de recommandation."
        ),
    },
    {
        "conversation_title": "Avenir de l'agriculture locale",
        "conversation_body": "Comment soutenir les agriculteurs face aux défis actuels ?",
        "seed_opinion": (
            "Pour assurer un avenir viable à l'agriculture locale face au changement climatique et à "
            "la concurrence internationale, il est indispensable de mettre en place des aides "
            "financières ciblées, de garantir des prix planchers justes aux producteurs, et "
            "d'investir massivement dans la recherche sur des pratiques agricoles plus résilientes."
        ),
    },
]

# fluency: broken grammar / awkward phrasing — should be "no".
FLUENCY_CASES = [
    {
        "conversation_title": "Consommation de viande",
        "conversation_body": "Faut-il manger moins de viande ?",
        "seed_opinion": "Le viande manger trop est pas bon pour la santé et aussi environnement il faut moins.",
    },
    {
        "conversation_title": "Transports en commun",
        "conversation_body": "Comment améliorer les transports publics ?",
        "seed_opinion": "Transports en commun doit être plus investir pour que ville moins pollution avoir.",
    },
    {
        "conversation_title": "Sport à l'école",
        "conversation_body": "Faut-il rendre le sport obligatoire à l'école ?",
        "seed_opinion": "École sport obligatoire faire tous les enfants bien pour santé général.",
    },
    {
        "conversation_title": "Crise du logement",
        "conversation_body": "Comment résoudre la crise du logement ?",
        "seed_opinion": "Logement crise résoudre construire plus maisons vite pouvoir gens acheter.",
    },
    {
        "conversation_title": "Régulation des réseaux sociaux",
        "conversation_body": "Faut-il réguler davantage les réseaux sociaux ?",
        "seed_opinion": "Réseaux sociaux réguler doit gouvernement pour protéger jeunes mieux.",
    },
]

# safety: one example per Community Guidelines sub-category (see
# seed-opinions-description.md §2, safety) — should be "no".
SAFETY_CASES = [
    {
        "conversation_title": "Débat sur la fiscalité",
        "conversation_body": "Discussion sur la réforme fiscale.",
        "seed_opinion": (
            "Les gens qui pensent différemment de moi sur ce sujet sont juste stupides et ne "
            "méritent pas qu'on les écoute."
        ),  # respectful discourse violation
    },
    {
        "conversation_title": "Politique migratoire",
        "conversation_body": "Quelle politique migratoire pour la France ?",
        "seed_opinion": (
            "Les immigrés sont responsables de tous les problèmes économiques du pays et devraient "
            "être expulsés."
        ),  # hate speech / discrimination
    },
    {
        "conversation_title": "Politique de santé publique",
        "conversation_body": "Discussion sur la vaccination.",
        "seed_opinion": (
            "Le gouvernement cache la vérité sur les vaccins qui contiennent des puces de traçage "
            "pour nous contrôler."
        ),  # misinformation / conspiracy
    },
    {
        "conversation_title": "Consommation responsable",
        "conversation_body": "Comment mieux consommer au quotidien ?",
        "seed_opinion": (
            "Achetez mes produits minceur sur www.exemple-spam.com, réduction de 50% aujourd'hui "
            "seulement !"
        ),  # spam / unsolicited promotion
    },
    {
        "conversation_title": "Résultats du vote local",
        "conversation_body": "Discussion sur les résultats de la consultation.",
        "seed_opinion": (
            "Jean Dupont, qui habite au 12 rue de la Paix à Paris et travaille chez XYZ, a voté pour "
            "cette proposition."
        ),  # privacy / doxxing
    },
]

# --- Multi-statement generation (§3, configure_set_judges.py / generate_set.py) ---
# Rows carry a whole generated set: statements + confidence (true/false) + user_feedback.

_BUS_CONTEXT = {
    "conversation_title": "Bus de nuit à Lyon",
    "conversation_body": (
        "La métropole envisage de créer des lignes de bus de nuit le week-end. "
        "Quelles priorités pour ce service ?"
    ),
}
_BUS_SIBLINGS = [
    "Les bus de nuit devraient desservir les quartiers périphériques en priorité.",
    "Le ticket de bus de nuit devrait coûter le même prix qu'en journée.",
    "Il faudrait des agents de sécurité dans les bus de nuit.",
]
_BUS_STATEMENTS = [
    "Les bus de nuit devraient passer au moins toutes les 30 minutes.",
    "Les bus de nuit devraient circuler aussi en semaine, pas seulement le week-end.",
    "Les arrêts des bus de nuit devraient être mieux éclairés.",
]

# confidence: miscalibrated — should be "no".
SET_CONFIDENCE_CASES = [
    {  # true with an empty body and a vague title
        "conversation_title": "Discussion",
        "conversation_body": "",
        "sibling_seed_opinions": [],
        "statements": [
            "La discussion devrait porter sur l'environnement.",
            "Chacun devrait pouvoir proposer un sujet.",
            "Les débats devraient être plus fréquents.",
        ],
        "confidence": True,
        "user_feedback": "",
    },
    {  # false despite a clear topic and usable participants' opinions
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": _BUS_STATEMENTS,
        "confidence": False,
        "user_feedback": "Je ne suis pas sûr de ce qui est attendu.",
    },
    {  # false despite a clear topic — existing opinions aren't required
        **_BUS_CONTEXT,
        "sibling_seed_opinions": [],
        "statements": _BUS_STATEMENTS,
        "confidence": False,
        "user_feedback": "Ajoutez des opinions de participants.",
    },
    {  # false, though a vague title/body is clarified by the existing opinions
        "conversation_title": "Votre avis",
        "conversation_body": "Donnez votre avis.",
        "sibling_seed_opinions": [
            "Le parc Blandan devrait rester ouvert la nuit en été.",
            "Il faudrait plus de poubelles dans le parc Blandan.",
            "Les chiens devraient être tenus en laisse dans tout le parc Blandan.",
        ],
        "statements": [
            "Le parc Blandan devrait accueillir un marché de producteurs le dimanche.",
            "Les pelouses du parc Blandan devraient être interdites aux vélos.",
            "Le parc Blandan devrait fermer plus tôt en hiver pour limiter les dégradations.",
        ],
        "confidence": False,
        "user_feedback": "Le titre et la description sont trop vagues.",
    },
]

# confidence, should-PASS side — expect "yes".
SET_CONFIDENCE_OK_CASES = [
    {  # true: clear topic and participants' opinions
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": _BUS_STATEMENTS,
        "confidence": True,
        "user_feedback": "",
    },
    {  # true: clear topic, no participants' opinions
        **_BUS_CONTEXT,
        "sibling_seed_opinions": [],
        "statements": _BUS_STATEMENTS,
        "confidence": True,
        "user_feedback": "",
    },
    {  # true: clear topic, unusable participants' opinions
        **_BUS_CONTEXT,
        "sibling_seed_opinions": ["azerty", "test test", "lol"],
        "statements": _BUS_STATEMENTS,
        "confidence": True,
        "user_feedback": "",
    },
    {  # true: vague title/body, but existing opinions make the topic clear
        "conversation_title": "Votre avis",
        "conversation_body": "Donnez votre avis.",
        "sibling_seed_opinions": [
            "Le parc Blandan devrait rester ouvert la nuit en été.",
            "Il faudrait plus de poubelles dans le parc Blandan.",
            "Les chiens devraient être tenus en laisse dans tout le parc Blandan.",
        ],
        "statements": [
            "Le parc Blandan devrait accueillir un marché de producteurs le dimanche.",
            "Les pelouses du parc Blandan devraient être interdites aux vélos.",
            "Le parc Blandan devrait fermer plus tôt en hiver pour limiter les dégradations.",
        ],
        "confidence": True,
        "user_feedback": "Précisez dans le titre qu'il s'agit du parc Blandan et de ses aménagements.",
    },
    {  # false: vague title, empty body
        "conversation_title": "Discussion",
        "conversation_body": "",
        "sibling_seed_opinions": [],
        "statements": [
            "La discussion devrait porter sur l'environnement.",
            "Chacun devrait pouvoir proposer un sujet.",
            "Les débats devraient être plus fréquents.",
        ],
        "confidence": False,
        "user_feedback": "Précisez le sujet de la discussion et la question posée aux participants.",
    },
]

# user_feedback: must give concrete tips to improve the title/description, without saying
# what is bad about them, in at most 300 characters — should be "no".
_DISCUSSION_CONTEXT = {
    "conversation_title": "Discussion",
    "conversation_body": "",
    "sibling_seed_opinions": [],
    "statements": [
        "La discussion devrait porter sur l'environnement.",
        "Chacun devrait pouvoir proposer un sujet.",
        "Les débats devraient être plus fréquents.",
    ],
}
SET_USER_FEEDBACK_CASES = [
    {**_DISCUSSION_CONTEXT, "confidence": False, "user_feedback": ""},  # empty
    {  # empty with confidence true: tips are always expected (prompt v12)
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": _BUS_STATEMENTS,
        "confidence": True,
        "user_feedback": "",
    },
    {  # generic
        **_DISCUSSION_CONTEXT,
        "confidence": False,
        "user_feedback": "Je ne suis pas sûr de ce qui est attendu.",
    },
    {  # asks for something other than the title/description
        **_DISCUSSION_CONTEXT,
        "confidence": False,
        "user_feedback": "Ajoutez des opinions de participants.",
    },
    {  # not in the conversation's language
        **_DISCUSSION_CONTEXT,
        "conversation_title": "Discussion de quartier",
        "confidence": False,
        "user_feedback": "Please specify which neighbourhood issue participants should discuss.",
    },
    {  # says what is bad, no suggestion
        **_DISCUSSION_CONTEXT,
        "confidence": False,
        "user_feedback": "Le titre est trop vague et la description ne dit rien d'utile.",
    },
    {  # says what is bad, then suggests
        **_DISCUSSION_CONTEXT,
        "confidence": False,
        "user_feedback": (
            "Le titre est beaucoup trop vague et la description est vide. Précisez le sujet "
            "de la discussion."
        ),
    },
    {  # good tips, but well over 300 characters (about 480)
        **_DISCUSSION_CONTEXT,
        "confidence": False,
        "user_feedback": (
            "Pour aider les participants, précisez dans le titre le sujet exact de la "
            "discussion, par exemple le quartier, le service public ou le projet concerné. "
            "Dans la description, ajoutez la question posée aux participants, le contexte de "
            "la décision à prendre, les options déjà envisagées par la collectivité, le "
            "calendrier prévu, le budget disponible, ainsi que quelques exemples de "
            "propositions attendues afin que chacun comprenne le niveau de détail souhaité "
            "et le type de contribution utile."
        ),
    },
]

# user_feedback, should-PASS side — expect "yes".
SET_USER_FEEDBACK_OK_CASES = [
    {  # false, names what is missing
        **_DISCUSSION_CONTEXT,
        "confidence": False,
        "user_feedback": "Précisez le sujet de la discussion et la question posée aux participants.",
    },
    {  # true, concrete improvement
        **_BUS_CONTEXT,
        "sibling_seed_opinions": [],
        "statements": _BUS_STATEMENTS,
        "confidence": True,
        "user_feedback": "Vous pourriez préciser les quartiers ou horaires envisagés pour les bus de nuit.",
    },
]

# single_point on a set: two good statements + one bundled one — the whole set should
# be "no", checking that one failing statement fails the set.
SET_SINGLE_POINT_CASES = [
    {
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": [
            _BUS_STATEMENTS[0],
            _BUS_STATEMENTS[1],
            "Les bus de nuit devraient être gratuits et les métros devraient rouler toute la nuit.",
        ],
        "confidence": True,
        "user_feedback": "",
    },
    {
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": [
            "Les bus de nuit devraient desservir les campus pour sécuriser et faciliter le retour des étudiants.",
            _BUS_STATEMENTS[2],
            _BUS_STATEMENTS[1],
        ],
        "confidence": True,
        "user_feedback": "",
    },
]

# brief on a set: two short statements + one clearly over the per-set limit (150, see
# configure_set_judges.py) — should be "no".
SET_BRIEF_CASES = [
    {
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": [
            _BUS_STATEMENTS[0],
            _BUS_STATEMENTS[2],
            "Les bus de nuit devraient circuler toute la semaine et pas seulement le week-end, "
            "parce que beaucoup de salariés de la restauration, des hôpitaux et du nettoyage "
            "terminent leur service tard le soir même du lundi au jeudi.",
        ],
        "confidence": True,
        "user_feedback": "",
    },
]

# brief on a set, should-PASS side (longest statement is about 130 characters) — expect "yes".
SET_BRIEF_OK_CASES = [
    {
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": [
            _BUS_STATEMENTS[0],
            _BUS_STATEMENTS[2],
            "Les bus de nuit devraient circuler aussi en semaine, car beaucoup de salariés "
            "terminent leur service tard le soir du lundi au jeudi.",
        ],
        "confidence": True,
        "user_feedback": "",
    },
]

# coverage: narrow sets — should be "no".
SET_COVERAGE_CASES = [
    {  # all in favour, same aspect (frequency)
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": [
            "Les bus de nuit devraient passer toutes les 15 minutes.",
            "Les bus de nuit devraient être plus fréquents après 2 heures du matin.",
            "Il faudrait augmenter le nombre de bus de nuit le samedi.",
        ],
        "confidence": True,
        "user_feedback": "",
    },
    {  # three rewordings of one view
        **_BUS_CONTEXT,
        "sibling_seed_opinions": [],
        "statements": [
            "Les bus de nuit sont une bonne idée pour Lyon.",
            "Créer des bus de nuit à Lyon serait positif.",
            "La métropole a raison de lancer des bus de nuit.",
        ],
        "confidence": False,
        "user_feedback": "",
    },
    {  # different aspects (frequency, weekdays, electric), but all in favour — positions must differ
        **_BUS_CONTEXT,
        "sibling_seed_opinions": [],
        "statements": _BUS_STATEMENTS[:2] + [
            "Les bus de nuit devraient être électriques pour limiter le bruit dans les quartiers.",
        ],
        "confidence": False,
        "user_feedback": "",
    },
    {  # all against, same aspect (cost)
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": [
            "Les bus de nuit coûteraient trop cher à la métropole.",
            "Le budget des bus de nuit serait mieux utilisé en journée.",
            "Les bus de nuit ne seraient pas rentables vu le faible nombre de passagers.",
        ],
        "confidence": True,
        "user_feedback": "",
    },
]

# coverage, should-PASS side — expect "yes".
SET_COVERAGE_OK_CASES = [
    {  # for / against / conditional, different aspects
        **_BUS_CONTEXT,
        "sibling_seed_opinions": _BUS_SIBLINGS,
        "statements": [
            "Les bus de nuit devraient circuler aussi en semaine, pas seulement le week-end.",
            "Le budget des bus de nuit serait mieux utilisé pour renforcer les lignes de jour.",
            "Les bus de nuit ne devraient être maintenus que si leur fréquentation dépasse un seuil minimum.",
        ],
        "confidence": True,
        "user_feedback": "",
    },
]

JUDGE_TEST_CASES: dict[str, list[dict[str, object]]] = {
    "single_point": SINGLE_POINT_CASES,
    "single_point_ok": SINGLE_POINT_OK_CASES,
    "contestable": CONTESTABLE_CASES,
    "fresh": FRESH_CASES,
    "fitting": FITTING_CASES,
    "brief": BRIEF_CASES,
    "fluency": FLUENCY_CASES,
    "safety": SAFETY_CASES,
    "set_confidence": SET_CONFIDENCE_CASES,
    "set_confidence_ok": SET_CONFIDENCE_OK_CASES,
    "set_user_feedback": SET_USER_FEEDBACK_CASES,
    "set_user_feedback_ok": SET_USER_FEEDBACK_OK_CASES,
    "set_single_point": SET_SINGLE_POINT_CASES,
    "set_brief": SET_BRIEF_CASES,
    "set_brief_ok": SET_BRIEF_OK_CASES,
    "set_coverage": SET_COVERAGE_CASES,
    "set_coverage_ok": SET_COVERAGE_OK_CASES,
}


def write_jsonl(rows: list[dict[str, object]], path: Path) -> None:
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            row = {"sibling_seed_opinions": [], **row}
            f.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    for judge_name, cases in JUDGE_TEST_CASES.items():
        output = PROCESSED_DIR / f"judgetest_{judge_name}.jsonl"
        write_jsonl(cases, output)
        print(f"[{judge_name}] wrote {len(cases)} rows -> {output}")


if __name__ == "__main__":
    main()
