---
title: "Que peut faire Ethereum pour l’Inde ? Le défi des fuites de sujets d’examen"
description: "À Devcon 8, à Mumbai, nous avons animé un atelier pour aider la communauté locale à délibérer sur l’un des grands défis de l’éducation en Inde : les fuites de sujets d’examen."
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.png"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

En mai 2026, une fuite de sujets a entraîné l’annulation du NEET, le concours national indien d’entrée en médecine, touchant environ 2,2 millions de candidats (22 lakhs). L’annulation a déclenché [des manifestations étudiantes dans toute l’Inde](https://www.hindustantimes.com/education/competitive-exams/neet-ug-2026-cancelled-amid-paper-leak-row-students-parents-and-educators-react-strongly-101778745473158.html), et la réforme des examens est devenue une revendication commune à [un mouvement de jeunesse plus large](https://apnews.com/article/59d045fbd485635def01b01f3898307b).

À Devcon 8, à Mumbai, nous avons animé un atelier consacré à ce problème. Nous nous sommes demandé comment éviter de nouvelles fuites de sujets. La décision d’annuler l’examen était déjà prise.

Parmi les pistes proposées figurait le passage à un examen sur ordinateur. Cela suffirait-il ? À qui faudrait-il encore faire confiance, et qui pourrait vérifier son travail ?

Nous avons demandé aux participants de former une petite assemblée citoyenne. Aucune connaissance technique de la blockchain n’était nécessaire. L’atelier leur permettait de discuter des garanties attendues du système, par exemple qu’un enregistrement ne puisse plus être modifié après sa création, sans jargon comme « immutabilité ». Il n’y avait pas de bonne réponse attendue. Conclure qu’une blockchain était superflue était une issue valable.

## Deux points de départ, le Coffre-fort et la Bibliothèque

<figure aria-label="Deux approches pour sécuriser les examens" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(0.5rem, 2vw, 1rem);">
  <div style="background: #f2efff; border-radius: 1rem; padding: clamp(0.75rem, 3vw, 1.5rem); text-align: center;">
    <img src="/images/resources/devcon-exam-leak-vault.png" alt="" width="72" height="72" style="display: block; margin: 0 auto 0.75rem; background: #44328e; border-radius: 1rem; padding: 0.6rem;" />
    <strong style="display: block; color: #29205a;">Le Coffre-fort : protéger le secret</strong>
    <span style="display: block; font-size: 0.9em; line-height: 1.4; color: #423a62;">Moins de personnes voient les véritables questions, et chaque étape est sécurisée.</span>
  </div>
  <div style="background: #edf5ff; border-radius: 1rem; padding: clamp(0.75rem, 3vw, 1.5rem); text-align: center;">
    <img src="/images/resources/devcon-exam-leak-library.png" alt="" width="72" height="72" style="display: block; margin: 0 auto 0.75rem; background: #3156a4; border-radius: 1rem; padding: 0.6rem;" />
    <strong style="display: block; color: #202f57;">La Bibliothèque : supprimer le secret</strong>
    <span style="display: block; font-size: 0.9em; line-height: 1.4; color: #344665;">Toutes les questions possibles sont publiques. Le sujet est tiré au sort le jour de l’examen.</span>
  </div>
</figure>

Chacun pouvait changer d’avis en cours de route. Les deux pistes servaient de points de départ.

Mes coanimateurs ont aidé les équipes à élaborer leurs propositions. [PreeGee](https://x.com/preegee), analyste du secteur des cryptomonnaies à Mumbai, a accompagné l’équipe Coffre-fort. Nicolas Gimenez, directeur technique d’Agora, a accompagné l’équipe Bibliothèque.

1. **Premier vote.** Sur leur téléphone, les participants ont indiqué dans Agora s’ils étaient d’accord, en désaccord ou incertains face aux propositions de départ. La carte initiale montrait deux groupes qui correspondaient à peu près aux pistes initiales. Les partisans du contrôle penchaient pour le Coffre-fort, et les technophiles pour la Bibliothèque.

   [![Carte des opinions après le premier vote. Les partisans du contrôle (10 participants, 56 %) privilégiaient des examens préparés à l’avance et une surveillance transparente du personnel. Les technophiles (7 participants, 39 %) privilégiaient des garanties techniques comme la génération de questions par IA et la transparence offerte par la blockchain.](/images/resources/devcon-exam-leak-first-vote.png)](/images/resources/devcon-exam-leak-first-vote.png)

   _Les deux groupes d’opinion après le premier vote. Sélectionnez la carte pour l’afficher en grand._

2. **Travail en équipe.** Environ 60 % des participants ont rejoint l’équipe Coffre-fort et 40 % l’équipe Bibliothèque. Ils avaient sept minutes pour publier des propositions sur le modèle « Pour éviter les fuites, [qui] devrait [faire quoi], à condition que [garantie]. »
3. **Deuxième vote.** Les participants ont voté sur les nouvelles propositions. La carte faisait désormais apparaître cinq groupes d’opinion, contre deux au premier vote.
4. **Mise à l’épreuve.** Les participants ont commencé à mettre à l’épreuve la proposition la plus clivante avant la fin du temps imparti. La séance s’est terminée sans classement final, et nous avons laissé la conversation ouverte dans Agora une semaine de plus.

Agora a constitué les groupes d’opinion à partir des votes. Le texte des propositions et l’équipe de départ n’entraient pas dans le calcul. Un modèle d’IA a ensuite donné un nom et un résumé à chaque groupe. La composition des groupes et leurs accords découlaient des votes.

## Ce que les votes ont révélé

Le rapport Agora recense **18 participants, 330 votes et 22 propositions**. Les participants ont rédigé 12 de ces propositions pendant la séance.

![Carte des opinions Agora après l’atelier avec cinq groupes : décentralisateurs, traditionalistes, partisans de la transparence, sceptiques et technophiles hybrides.](/images/resources/devcon-exam-leak-opinion-map.webp)

_Les cinq groupes d’opinion du rapport Agora. Un des 18 participants n’a rejoint aucun groupe, car il avait voté sur moins de sept propositions._

Sur la carte, les « décentralisateurs » sont les participants qui préféraient confier le choix des questions au vote d’un comité d’experts et répartir ainsi le pouvoir de décision.

### Un point d’accord autour d’un tirage vérifiable par tous

> Si les questions sont tirées au sort, chacun devrait pouvoir vérifier que le tirage n’a pas été truqué.

C’est la seule proposition que le rapport indique comme approuvée par les cinq groupes. **83 % des participants étaient d’accord et aucun ne s’y est opposé.** Cette garantie s’appliquait si un tirage au sort était retenu. Le vote ne tranchait ni le choix du tirage, ni celui d’une banque publique de questions, ni celui d’Ethereum. Les équipes techniques peuvent vérifier si différentes conceptions satisfont à cette exigence de vérifiabilité publique. Ethereum est une piste parmi d’autres. L’atelier a laissé ouvertes deux questions : son utilité dans ce cas et sa capacité à prévenir les fuites à lui seul.

### Les points qui divisaient encore

- **Le passage du NEET sur ordinateur suffirait à empêcher les fuites.** 17 % étaient d’accord, 39 % en désaccord et 39 % incertains.
- **L’examen le plus sûr rend publiques toutes les questions possibles.** 33 % étaient d’accord et 39 % en désaccord.
- **Il est acceptable de courir un faible risque de retrouver une question presque identique à une question d’entraînement.** 61 % étaient d’accord dans l’ensemble. Les deux membres du groupe des sceptiques ont voté contre l’acceptation de ce risque.

Les 50 minutes ont filé. La carte est passée de deux à cinq groupes d’opinion pendant ce temps. Agora a regroupé les participants selon leurs votes, quelle que soit leur équipe de départ. La rédaction des propositions a fait ressortir des désaccords au sein de chaque équipe et des alliances inattendues entre les équipes.

PreeGee l’a résumé ainsi à la fin de l’atelier :

> Au début, ça prenait naturellement la forme d’un débat. C’était A contre B. Mais quand on se plonge vraiment dans le problème et qu’on commence à concevoir une solution, on se rend compte qu’on peut être en désaccord avec quelqu’un dont on partageait l’avis au départ et trouver un terrain d’entente avec des personnes avec lesquelles on ne l’aurait pas imaginé.

En écoutant ce qui compte pour chaque partie, nous pouvons chercher des solutions que plusieurs camps peuvent soutenir ensemble, même si d’autres désaccords subsistent.

Nous espérons que ce petit atelier donnera aux citoyens, aux communautés et aux institutions l’envie d’[essayer Agora](/resources/facilitation-guide) et de chercher ensemble des solutions aux questions qui leur tiennent à cœur.

[Explorer la conversation originale dans Agora](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [Consulter la page officielle dans les archives de Devcon](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

Un merci tout particulier à [GCC](https://www.gccofficial.org/) pour son soutien financier à Agora et à d’autres biens publics.
