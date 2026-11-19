---
title: "L’idéalisme en pratique : comment rendre la civic tech open source durable"
description: "Ce qu’Agora Citizen Network et Lyfe Catalyst apprennent sur l’adéquation produit-marché, le financement des communs, l’interopérabilité et la durabilité de la civic tech open source."
author: "Yuting Jiang"
date: "2026-09-22"
type: "vision"
thumbnail: "/images/resources/idealism-in-practice-title-slide.webp"
image: "/images/resources/idealism-in-practice-title-slide.webp"
---

La civic tech open source crée de la valeur publique, mais beaucoup d’équipes qui la construisent peinent à la maintenir en vie. Le 22 septembre 2026, nous avons porté ce problème lors d’un [appel communautaire de Metagov](https://www.youtube.com/watch?v=UmP1Rpi8-68), avec [Jean-Lou Fourquet](https://www.linkedin.com/in/jean-lou-fourquet) de [Lyfe Catalyst](https://lyfe-catalyst.org/).

Nous sommes venus comme une équipe de construction et un praticien. [Agora Citizen Network](https://www.agoracitizen.network/) est une plateforme de délibération [open source](https://github.com/zkorum/agora) qui aide les groupes à passer du désaccord à une décision partagée. Lyfe Catalyst conçoit des processus délibératifs pour les institutions publiques et les entreprises. Voici ce que nous avons présenté, les paris que nous faisons et ce que nous n’avons pas encore résolu.

[Voir l’enregistrement complet sur YouTube](https://www.youtube.com/watch?v=UmP1Rpi8-68)

## Deux parcours, un point de rencontre

Agora n’est pas né comme projet de civic tech. Tout a commencé par un forum anonyme dans une école française. Grâce aux [preuves à divulgation nulle de connaissance](https://www.agoracitizen.network/resources/why-zk-proofs-alone-arent-enough), les étudiants pouvaient prouver leur appartenance à l’école sans révéler leur identité. Ils pouvaient ainsi parler en sécurité de leur salaire, de leur expérience professionnelle, de leur intégration ou de leur insatisfaction envers l’école.

Cette expérience nous a aussi montré les limites d’un forum ordinaire. Une discussion demandant aux étudiants s’ils regrettaient d’avoir rejoint l’école est rapidement devenue tendue. Nous avons envisagé qu’un modèle de langage avertisse les personnes lorsque leur ton semblait agressif, puis abandonné l’idée : les participants auraient eu raison de se sentir surveillés. La découverte de [Polis](https://pol.is/) et de ses usages dans le monde nous a indiqué une meilleure voie : cartographier les votes, révéler les groupes d’opinion et repérer les propositions qui créent des ponts. Ce passage du réseau social au réseau citoyen est devenu Agora.

Jean-Lou est arrivé par un autre chemin. Son travail sur la communication climatique et avec [Tournesol](https://tournesol.app/) l’a convaincu que le manque d’information n’était pas le principal obstacle. Les systèmes de recommandation décident de ce qui est amplifié et récompensent souvent l’émotion et la polarisation. Ce qui manque aux groupes, c’est la coordination. Cette conviction l’a conduit à cofonder Lyfe Catalyst.

Nous nous sommes retrouvés au milieu : une équipe cherchant des partenaires, pas seulement des clients, et un praticien convaincu que chaque organisation a besoin de tels outils.

## Trouver ensemble l’adéquation produit-marché

Dans une conversation Agora, les participants répondent **d’accord**, **incertain** ou **pas d’accord** à de courtes propositions et ajoutent les leurs. Les facilitateurs proposent quelques affirmations initiales pour que personne n’arrive devant une page blanche. Agora montre ensuite les groupes d’opinion qui expliquent le mieux la conversation, accompagnés de synthèses générées avec l’IA. Le résultat le plus utile est souvent l’ensemble des propositions soutenues par tous les groupes malgré leurs différences : un terrain commun sur lequel la communauté peut construire.

Les déploiements réels nous ont appris la suite.

À mesure que Jean-Lou et d’autres facilitateurs utilisaient Agora, une question s’est imposée : qu’arrive-t-il après qu’un groupe a atteint un consensus ?

Le [Mode Priorisation](https://www.agoracitizen.network/resources/facilitation-guide) est notre réponse : les participants comparent de petits ensembles d’options et Agora produit un classement partagé. Le Mode Conversation indique où un groupe s’accorde ; le Mode Priorisation montre ce qui compte le plus maintenant. Découvrez ce processus dans [30 personnes peuvent-elles se mettre d’accord sur des règles d’IA en une journée ?](https://www.agoracitizen.network/resources/ai-charter-workshop), un atelier mené avec Jean-Lou pendant lequel une startup d’IA a corédigé puis priorisé sa propre charte.

Chaque déploiement a façonné le produit, puis chaque fonctionnalité a servi tous les facilitateurs, pas seulement le client qui l’avait demandée.

## Vendre aux entreprises, financer les communs

Lyfe Catalyst expérimente une réponse au déficit de financement. Les outils et processus délibératifs conçus pour le secteur public fonctionnent aussi dans les entreprises, qui peuvent les financer. Lyfe Catalyst vend des missions de facilitation et de conseil, puis reverse **10 % du chiffre d’affaires éligible** aux outils open source dont il dépend. Le montant éligible est calculé après les dépenses directes du projet et avant les salaires. Pour la première année, Tournesol et Agora doivent en bénéficier, et d’autres pourront les rejoindre.

Ce n’est pas la réponse unique. C’est une tentative pour faire circuler la valeur des organisations capables de payer l’innovation démocratique vers les communautés qui construisent les communs sous-jacents.

De notre côté, nous distinguons clients et partenaires. Un client s’intéresse à un outil. Un partenaire croit dans l’équipe, apporte de véritables cas d’usage et aide le produit à grandir. Pour un jeune projet de civic tech, quelques partenaires proches valent davantage qu’une multitude de relations fournisseur-client. Le marché de la délibération continue d’évoluer ; rester proche des facilitateurs nous permet de comprendre les prochains besoins des groupes.

## Ouvert, interopérable et durable : peut-on avoir les trois ?

L’open source ne suffit pas à créer un écosystème. Des déploiements séparés du même outil peuvent rester isolés, empêchant les communautés travaillant sur des sujets similaires d’apprendre les unes des autres. Notre stratégie repose sur deux éléments.

- **Les partenariats.** Nous travaillons avec les facilitateurs qui apportent le processus et avec des équipes dont les outils complètent les nôtres, plutôt que de tout construire en interne.
- **L’interopérabilité.** Nous avons proposé le [Decentralized Deliberation Stack (DDS)](https://www.w3.org/community/dds/), afin que les outils de délibération puissent interopérer au niveau du protocole. C’est désormais un groupe communautaire du W3C, ouvert à d’autres approches.

Cela implique un véritable compromis. L’ouverture et l’interopérabilité réduisent les coûts de développement, mais aussi les coûts de changement pour les clients. Un client peut nous quitter plus facilement qu’une plateforme fermée. Nous n’avons pas résolu cette tension. Notre pari est simple : **la confiance retient mieux que le verrouillage**.

## Ce que la communauté a ajouté

Après la présentation, les groupes de discussion ont abordé deux obstacles pratiques : transformer la participation en action institutionnelle et donner réellement envie d’utiliser la civic tech.

Pour obtenir l’adhésion des institutions, les participants ont proposé de :

- faire participer tôt les responsables publics, à travers de petites démonstrations à faible risque ;
- trouver des soutiens au-delà des clivages partisans ;
- travailler avec les responsables de la mise en œuvre, les associations professionnelles et les rédacteurs de modèles de politiques publiques, pas seulement avec les élus ;
- commencer par le budget participatif, car il est lié à une véritable allocation d’argent.

Les décideurs doivent aussi être convaincus qu’un processus sera légitime et gérable. Dans des contextes polarisés ou touchés par un conflit, la confiance, la sécurité et l’accessibilité peuvent compter autant que les fonctionnalités de la plateforme.

Sur l’adoption, Jean-Lou a souligné l’expérience mobile d’Agora et la curiosité créée par les synthèses de groupes d’opinion générées avec l’IA. Pour nous, la civic tech ne peut pas considérer le design comme une décoration. Les outils destinés aux participants doivent être au moins aussi séduisants que les applications commerciales. L’analyse avancée peut rester du côté des facilitateurs, tandis que l’expérience des participants demeure simple, sociale et engageante.

## Nous n’avons pas résolu ce problème

Nous avons terminé l’appel avec deux questions ouvertes, qui le restent encore :

1. L’ouverture est un bien public ; la captation est privée. Comment éviter que la valeur des outils ouverts soit captée par celui qui sait le mieux les emballer ?
2. Comment la valeur doit-elle revenir aux personnes qui construisent les communs ?

Le modèle de redistribution de Lyfe Catalyst, notre approche partenariale et DDS sont des réponses partielles. Aucune ne suffit seule. Si vous facilitez des processus délibératifs, financez l’infrastructure démocratique ou développez des outils complémentaires, nous voulons comprendre votre approche et découvrir si nous pouvons répondre ensemble à ces questions.

[Essayer Agora](https://www.agoracitizen.app/conversation/new/create) · [Voir l’appel](https://www.youtube.com/watch?v=UmP1Rpi8-68) · [Lyfe Catalyst](https://lyfe-catalyst.org/)
