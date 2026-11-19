---
title: "Que peut faire Ethereum pour l’Inde ? Le défi des fuites de sujets d’examen"
description: "À Devcon 8, à Mumbai, nous avons animé un atelier pour aider la communauté locale à délibérer sur l’un des grands défis de l’éducation en Inde : les fuites de sujets d’examen."
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.webp"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

En mai 2026, une fuite de sujets a entraîné l’annulation du NEET, le concours national indien d’entrée en médecine, touchant environ 2,2 millions de candidats (22 lakhs). L’annulation a déclenché [des manifestations étudiantes dans toute l’Inde](https://www.hindustantimes.com/education/competitive-exams/neet-ug-2026-cancelled-amid-paper-leak-row-students-parents-and-educators-react-strongly-101778745473158.html), et la réforme des examens est devenue une revendication commune à [un mouvement de jeunesse plus large](https://apnews.com/article/59d045fbd485635def01b01f3898307b).

À Devcon 8, à Mumbai, nous avons animé un atelier consacré à ce problème. Plutôt que de débattre du bien-fondé de l’annulation, nous nous sommes demandé comment éviter de nouvelles fuites de sujets.

Parmi les pistes proposées figurait le passage à un examen sur ordinateur. Cela suffirait-il ? À qui faudrait-il encore faire confiance, et qui pourrait vérifier son travail ?

Nous avons demandé aux participants de former une petite assemblée citoyenne. Aucune connaissance technique de la blockchain n’était nécessaire. L’atelier leur permettait de discuter des garanties attendues du système, par exemple qu’un enregistrement ne puisse plus être modifié après sa création, sans jargon comme « immutabilité ». Il n’y avait pas de bonne réponse attendue. Conclure qu’une blockchain était superflue était une issue valable.

## Deux points de départ : le Coffre-fort et la Bibliothèque

<figure class="resource-comparison" aria-label="Deux approches pour sécuriser les examens">
  <div class="resource-comparison-card">
    <img src="/images/resources/devcon-exam-leak-vault.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>Le Coffre-fort : protéger le secret</strong>
    <span>Moins de personnes ont accès aux questions de l’examen, et chaque étape est sécurisée.</span>
  </div>
  <div class="resource-comparison-card resource-comparison-card--sky">
    <img src="/images/resources/devcon-exam-leak-library.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>La Bibliothèque : supprimer le secret</strong>
    <span>Toutes les questions possibles sont publiques. Le sujet est tiré au sort le jour de l’examen.</span>
  </div>
</figure>

Chacun pouvait changer d’avis en cours de route. Les deux pistes servaient de points de départ.

Mes coanimateurs ont aidé les équipes à élaborer leurs propositions. [PreeGee](https://x.com/preegee), analyste du secteur des cryptomonnaies à Mumbai, a accompagné l’équipe Coffre-fort. Nicolas Gimenez, directeur technique d’Agora, a accompagné l’équipe Bibliothèque.

1. **Premier vote.** Sur leur téléphone, les participants ont choisi « D’accord », « Pas d’accord » ou « Incertain » pour voter sur les propositions de départ dans Agora. La première carte montrait deux groupes qui correspondaient à peu près aux deux pistes. Les partisans du contrôle penchaient pour le Coffre-fort et les technophiles pour la Bibliothèque.

   [![Carte des opinions après le premier vote. Les partisans du contrôle (10 participants, 56 %) privilégiaient des examens préparés à l’avance et une surveillance transparente du personnel. Les technophiles (7 participants, 39 %) privilégiaient des garanties techniques comme la génération de questions par IA et la transparence offerte par la blockchain.](/images/resources/devcon-exam-leak-first-vote.png)](/images/resources/devcon-exam-leak-first-vote.png)

   _Les deux groupes d’opinion après le premier vote. Sélectionnez la carte pour l’afficher en grand._

2. **Travail en équipe.** Environ 60 % des participants ont rejoint l’équipe Coffre-fort et 40 % l’équipe Bibliothèque. Ils avaient sept minutes pour publier des propositions sur le modèle « Pour éviter les fuites, [qui] devrait [faire quoi], à condition que [garantie]. »
3. **Deuxième vote.** Les participants ont voté sur les nouvelles propositions. La carte faisait désormais apparaître cinq groupes d’opinion, contre deux au premier vote.
4. **Mise à l’épreuve.** Les participants ont commencé à mettre à l’épreuve la proposition la plus clivante avant la fin du temps imparti. La séance s’est terminée sans classement final, et nous avons laissé la conversation ouverte dans Agora une semaine de plus.

Agora a constitué les groupes d’opinion à partir des tendances de vote, sans tenir compte du texte des propositions ni de l’équipe choisie. Un modèle d’IA a ensuite nommé et résumé les groupes, sans déterminer leur composition ni leurs points d’accord.

## Ce que les votes ont révélé

Le rapport Agora recense **18 participants, 330 votes et 22 propositions**. Les participants ont rédigé 12 de ces propositions pendant la séance.

![Carte des opinions d’Agora après l’atelier : 3 décentralisateurs (17 %), 3 traditionalistes (17 %), 4 partisans de la transparence (22 %), 2 sceptiques (11 %) et 5 technophiles hybrides (28 %).](/images/resources/devcon-exam-leak-opinion-map.webp)

_Les cinq groupes d’opinion du rapport Agora. Un des 18 participants n’a été rattaché à aucun groupe, car il avait voté sur moins de sept propositions._

Sur la carte, les « décentralisateurs » sont les participants qui préféraient soumettre le choix des questions au vote d’un comité d’experts plutôt que de le confier à une seule autorité.

### Un point d’accord autour d’un tirage vérifiable par tous

> Si les questions sont tirées au sort, chacun devrait pouvoir vérifier que le tirage n’a pas été truqué.

C’est la seule proposition que le rapport indique comme approuvée par les cinq groupes. **83 % étaient d’accord et personne ne s’y est opposé.** C’était une garantie conditionnelle, pas un vote en faveur du tirage au sort, d’une banque publique de questions ou d’Ethereum. Les équipes techniques peuvent vérifier, pour chaque solution envisagée, si elle permet à tous de contrôler le tirage. Ethereum est une piste parmi d’autres : l’atelier n’a pas établi qu’il était nécessaire ni qu’il pourrait, à lui seul, prévenir les fuites.

### Les points qui divisaient encore

- **Le passage du NEET sur ordinateur suffirait à empêcher les fuites.** 17 % étaient d’accord, 39 % en désaccord et 39 % incertains.
- **L’examen le plus sûr rend publiques toutes les questions possibles.** 33 % étaient d’accord et 39 % en désaccord.
- **Il est acceptable de courir un faible risque de retrouver une question presque identique à une question d’entraînement.** Au total, 61 % étaient d’accord, mais les deux membres du groupe des sceptiques ont voté contre.

Les 50 minutes ont filé. La carte est passée de deux à cinq groupes d’opinion pendant ce temps. Agora a regroupé les participants selon leurs votes, quelle que soit leur équipe de départ. La rédaction des propositions a fait ressortir des désaccords au sein de chaque équipe et des alliances inattendues entre les équipes.

PreeGee l’a résumé ainsi à la fin de l’atelier :

> Au début, ça prenait naturellement la forme d’un débat. C’était A contre B. Mais quand on se plonge vraiment dans le problème et qu’on commence à concevoir une solution, on se rend compte qu’on peut être en désaccord avec quelqu’un dont on partageait l’avis au départ et trouver un terrain d’entente avec des personnes avec lesquelles on ne l’aurait pas imaginé.

Au lieu de nous demander quel camp doit l’emporter, nous pouvons écouter ce qui compte pour chacun et chercher des solutions que tous les camps puissent soutenir, même si d’autres désaccords subsistent.

Nous espérons que ce petit atelier donnera aux citoyens, aux communautés et aux institutions l’envie d’[essayer Agora](/resources/facilitation-guide) et de chercher ensemble des solutions aux questions qui leur tiennent à cœur.

[Explorer la conversation originale dans Agora](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [Consulter la page officielle dans les archives de Devcon](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

Un merci tout particulier à [GCC](https://www.gccofficial.org/) pour son soutien financier à Agora et à d’autres biens publics.
