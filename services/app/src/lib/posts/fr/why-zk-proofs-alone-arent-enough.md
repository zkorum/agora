---
title: "Pourquoi les preuves zero-knowledge seules ne suffisent pas a proteger la vie privee"
description: "Les preuves zero-knowledge protegent la preuve elle-meme, mais les plateformes civiques doivent aussi proteger l'identite, les metadonnees, les wallets, les appareils et l'infrastructure open source."
author: "Nicolas Gimenez"
date: "Mai 2026"
type: "tech"
thumbnail: "https://lh7-us.googleusercontent.com/docs/AHkbwyK44xfmb0zN95CAfiTWJ5ULJ_-8DpfWRTy8r23dsV6kahSE4C4X-cZ8W4Ed-n2MT0jfWuolbqR77m1-rt_yXV4xcoojPDahscs3bQ=w1200-h630-p"
image: "https://lh7-us.googleusercontent.com/docs/AHkbwyK44xfmb0zN95CAfiTWJ5ULJ_-8DpfWRTy8r23dsV6kahSE4C4X-cZ8W4Ed-n2MT0jfWuolbqR77m1-rt_yXV4xcoojPDahscs3bQ=w1200-h630-p"
---

Les preuves zero-knowledge sont souvent presentees comme une reponse complete a la protection de la vie privee. Dans les technologies civiques, la promesse est particulierement forte : une personne peut prouver qu'elle est eligible pour participer, qu'elle est unique, qu'elle a plus d'un certain age ou qu'elle reside dans une juridiction, sans reveler tout le contenu de son document d'identite.

Cette promesse est reelle. Elle est aussi plus limitee qu'elle n'en a l'air.

Une preuve zero-knowledge protege une preuve. Elle ne protege pas automatiquement l'adresse IP, l'empreinte du navigateur, le numero de telephone, l'adresse e-mail, l'implementation du wallet, l'appareil, le systeme d'exploitation, ni les nombreux horodatages et signaux comportementaux crees autour de la preuve. Si ces couches ne sont pas concues avec soin, un verificateur peut encore apprendre qui est l'utilisateur.

Cet article adapte une presentation donnee a NGI TrustChain en septembre 2024. L'idee centrale est simple : les preuves zero-knowledge sont une brique importante pour la participation civique privee, mais la vie privee est une propriete de toute la pile technique.

## Pourquoi l'identite entre dans les plateformes civiques

Tous les espaces en ligne n'ont pas besoin de verification d'identite. Il existe de tres bons cas d'usage pour des communautes purement pseudonymes, ou les utilisateurs participent avec des pseudonymes persistants et de la reputation plutot qu'avec des justificatifs formels.

Les plateformes de participation civique font face a un probleme different. Si l'objectif est de recueillir une contribution publique significative, de resister au spam, de reduire la propagande computationnelle ou de soutenir des processus une personne, une voix, le systeme a besoin d'une forme de resistance aux attaques Sybil. En pratique, il peut devoir savoir qu'un participant est une personne reelle, appartient a une communaute pertinente ou respecte une regle d'eligibilite civique.

Plusieurs approches existent, chacune avec ses compromis :

- Les systemes biometriques peuvent fournir l'unicite, mais ils creent de graves risques de vie privee et de securite.
- Les systemes de graphe social peuvent aider dans certains contextes, mais ils restent difficiles a passer a l'echelle et offrent souvent de faibles garanties de confidentialite.
- Les approches hybrides de web of trust peuvent fonctionner pour certaines communautes, mais fournissent generalement une unicite plus faible.
- Les justificatifs institutionnels ou gouvernementaux peuvent apporter de fortes garanties, mais ils ne doivent pas devenir une couche de surveillance.

C'est ici que l'identite auto-souveraine et les preuves zero-knowledge deviennent attractives. Elles suggerent une facon de verifier l'eligibilite sans demander aux utilisateurs de reveler plus de donnees personnelles que necessaire.

## Ce que les preuves zero-knowledge font bien

Dans un flux de justificatif simplifie, trois parties interviennent :

- L'emetteur confirme quelque chose a propos d'une personne et emet un justificatif.
- Le titulaire conserve ce justificatif et decide quand l'utiliser.
- Le verificateur controle une preuve derivee de ce justificatif.

Les techniques zero-knowledge peuvent permettre au titulaire de prouver une affirmation precise sans reveler le justificatif sous-jacent. Par exemple, un utilisateur peut prouver qu'il a plus de 18 ans sans reveler sa date de naissance, ou prouver qu'il a recu un justificatif d'un emetteur de confiance sans reveler tout son contenu.

Plusieurs approches techniques soutiennent ce modele. Les justificatifs BBS+ permettent la divulgation selective et les preuves non liables. D'autres approches utilisent des justificatifs merkelises et des ZK-SNARKs pour rendre des formats plus liables plus respectueux de la vie privee. Les zkVM generalistes pourraient a terme faciliter les preuves portant sur des justificatifs deja existants et orientes securite.

Ces outils sont utiles parce qu'ils peuvent fournir une non-liabilite de l'emetteur au niveau de la preuve. Autrement dit, l'emetteur ne devrait pas apprendre ou le justificatif est utilise, et differents usages du meme justificatif ne devraient pas etre trivialement relies par la preuve elle-meme.

Cela resout un probleme important. Cela ne resout pas tous les problemes de vie privee.

## Le modele de menace : le titulaire d'abord

Pour la participation civique, le modele de confidentialite doit partir du point de vue du titulaire. La personne qui utilise le justificatif doit garder le controle de ce qu'elle revele et a qui.

Cela exige un modele de menace plus strict que celui de la plupart des plateformes sociales actuelles :

- Le verificateur, c'est-a-dire la plateforme qui demande la preuve, ne doit pas etre aveuglement fiable. Il peut chercher a deanonymiser l'utilisateur, sauf si le systeme rend cela difficile et auditable.
- L'emetteur est fiable pour identifier le titulaire et emettre un justificatif valide, mais il ne doit pas savoir ou, quand ni pourquoi ce justificatif est ensuite utilise.
- L'emetteur et le verificateur ne doivent pas pouvoir collaborer pour identifier les utilisateurs a partir des presentations de preuves.
- Le code client proprietaire, le code du wallet et les frontends de verification doivent etre consideres comme des surfaces de risque, sauf s'ils sont open source, inspectables et idealement audites.

C'est tres different du modele dominant des reseaux sociaux, ou l'on fait habituellement confiance aux plateformes pour collecter, stocker et proteger les donnees personnelles de facon responsable. L'histoire des plateformes donne aux utilisateurs de nombreuses raisons d'etre sceptiques.

## Le reste de l'iceberg de la vie privee

L'erreur la plus facile est de prendre la preuve zero-knowledge pour tout le systeme de confidentialite. En realite, la preuve n'est qu'une couche.

### Sur-divulgation

Meme lorsqu'une preuve est generee en zero-knowledge, le verificateur peut demander des attributs trop precis, trop nombreux ou trop rares. L'utilisateur ne revele peut-etre pas son document complet, mais une combinaison d'attributs peut encore l'identifier.

Par exemple, prouver un age precis, une ville, une profession et un statut de membre peut suffire a isoler une personne dans une petite communaute. Les systemes respectueux de la vie privee doivent privilegier des predicats grossiers et la divulgation minimale necessaire.

### Metadonnees reseau

Un verificateur peut tenter de relier une preuve a l'utilisateur via les adresses IP, les empreintes navigateur, les metadonnees d'appareil ou le timing des requetes. Si la preuve est envoyee depuis la meme session navigateur qu'une connexion identifiante ou une verification e-mail, la confidentialite mathematique de la preuve peut ne plus compter.

Zero-knowledge ne masque pas automatiquement la couche reseau. La confidentialite du transport, les proxys, les politiques de journalisation et la separation des sessions comptent aussi.

### Cookies et courtiers de donnees

Les cookies tiers, scripts d'analyse, identifiants publicitaires et donnees achetees peuvent tous affaiblir la confidentialite de la preuve. Si un verificateur integre du tracking autour du flux de preuve, il peut correler une preuve anonyme avec une identite web connue.

Pour une plateforme civique, le flux de preuve doit eviter entierement les trackers tiers. La vie privee ne peut pas dependre d'un protocole cryptographique pendant que la page fuit l'identite via une infrastructure web ordinaire.

### E-mail, telephone et recuperation de compte

Les adresses e-mail et numeros de telephone sont pratiques, mais ce sont aussi de puissants identifiants. Si le verificateur les associe a une preuve zero-knowledge, la preuve peut devenir une partie d'un profil d'identite plus large.

Cela ne signifie pas qu'une plateforme civique ne peut jamais utiliser l'e-mail ou le telephone. Cela signifie que ces identifiants doivent etre isoles des evenements de preuve autant que possible, utilises seulement quand c'est necessaire et soumis a des politiques claires de retention.

### Identifiants permanents

Une preuve zero-knowledge peut encore etre liee si le meme identifiant permanent apparait autour d'elle. Adresses de wallet, DIDs, identifiants de sujet de justificatif, identifiants d'appareil ou identifiants de compte stables peuvent tous devenir des points de correlation.

Les systemes qui ont besoin de pseudonymat doivent utiliser des identifiants contextuels ou pairwise au lieu d'identifiants universels. Par defaut, l'utilisateur ne devrait pas porter la meme trace entre espaces civiques sans lien.

### Correlation temporelle

Meme si les identifiants sont caches, le timing peut reveler des relations. Un verificateur peut correler le moment ou une preuve est generee avec une autre requete, comme une connexion, un clic de notification ou un chargement de page.

Les concepteurs doivent traiter les horodatages comme sensibles. Le batching, la soumission differee, la minimisation des logs et la separation entre authentification et presentation de preuve peuvent reduire le risque de correlation.

### Wallets, appareils et chaine d'approvisionnement

La preuve peut etre cryptographiquement correcte, mais le wallet ou le client peut encore divulguer des donnees sensibles. Un wallet proprietaire peut envoyer de la telemetrie. Un SDK compromis peut reveler des attributs. Un frontend malveillant peut demander plus que ce que l'utilisateur comprend.

L'open source ne supprime pas magiquement ces risques, mais le code ferme les rend beaucoup plus difficiles a inspecter. Pour des systemes civiques de confiance, les clients open source, builds reproductibles, audits independants et telemetrie minimale doivent etre consideres comme de l'infrastructure de base.

### Inference comportementale

Le machine learning peut inferer l'identite a partir de motifs qui semblent inoffensifs isoles. Style d'ecriture, horaires d'activite, comportement d'appareil, motifs de localisation et historique d'interaction peuvent tous reduire l'ensemble d'anonymat.

C'est une autre raison pour laquelle la vie privee ne peut pas etre reduite a la preuve. La participation anonyme exige aussi des choix produit, de moderation et de retention qui evitent de constituer des dossiers comportementaux inutiles.

## Une meilleure architecture pour des preuves crediblement anonymes

Un flux de justificatif respectueux de la vie privee doit etre concu avec l'hypothese que le verificateur veut apprendre plus qu'il ne devrait.

Au minimum, une plateforme civique utilisant des preuves zero-knowledge devrait appliquer ces principes :

- Demander la preuve la moins precise qui satisfait l'exigence civique.
- Eviter de combiner presentation de preuve et flux de compte identifiants.
- Ne pas attacher numeros de telephone, e-mails, adresses de wallet ou DIDs permanents aux evenements de preuve sauf necessite reelle.
- Exclure cookies tiers, analytics et trackers du flux de preuve.
- Minimiser les logs, en particulier adresses IP, horodatages et metadonnees de requetes.
- Utiliser des pseudonymes propres a chaque contexte quand une participation persistante est necessaire.
- Rendre open source et auditables le frontend de verification, la logique de demande de preuve, les integrations wallet et les SDK.
- Rendre les demandes de preuve comprehensibles pour les utilisateurs, afin qu'ils voient ce qui est prouve et ce qui n'est pas revele.
- Empecher les callbacks vers l'emetteur et autres mecanismes qui lui permettraient d'apprendre ou les justificatifs sont utilises.

Le but n'est pas seulement des preuves anonymes. Le but est une anonymite credible : un systeme ou les utilisateurs, auditeurs et acteurs de la societe civile peuvent verifier que les promesses de confidentialite correspondent au comportement reel de la plateforme.

## Defis ouverts

Il reste beaucoup de travail difficile.

D'abord, l'experience utilisateur n'est pas assez bonne. La plupart des personnes ne peuvent pas raisonner sur les schemas de justificatifs, la divulgation selective, les demandes de preuve, la non-liabilite de l'emetteur ou les attaques par correlation. Un produit sur doit expliquer ses proprietes de confidentialite sans demander aux utilisateurs de devenir cryptographes.

Ensuite, l'ecosysteme des justificatifs est fragmente. BBS+, SD-JWT, permis de conduire mobiles, puces de passeport, justificatifs merkelises et preuves basees sur zkVM font tous des compromis differents. Les plateformes civiques ont besoin d'interoperabilite sans se rabattre sur le plus petit denominateur commun de la vie privee.

Troisiemement, la resistance aux attaques Sybil et la vie privee restent en tension. Une unicite plus forte exige souvent une preuve d'identite plus forte. Le defi consiste a verifier seulement ce qui est necessaire et a eviter que cette verification devienne un graphe d'identite generalise.

Quatriemement, la prevention des abus ne doit pas recreer la surveillance. Les espaces anonymes ou pseudonymes ont tout de meme besoin de moderation, de limites de frequence et de mecanismes de responsabilite. Ces mecanismes doivent etre concus pour ne pas reidentifier silencieusement tout le monde.

Enfin, l'open source est necessaire mais pas suffisant. Le code publie aide, mais les utilisateurs ont aussi besoin de builds reproductibles, d'audits independants, d'une gouvernance claire et de garanties au deploiement que le code inspecte est bien celui qui est utilise.

## Conclusion

Les preuves zero-knowledge sont puissantes. Elles permettent de prouver des faits sans reveler les donnees sous-jacentes et peuvent empecher les emetteurs de suivre l'usage des justificatifs.

Mais les preuves ne sont pas tout le systeme de confidentialite. Un verificateur peut encore attaquer les couches voisines : attributs, metadonnees, cookies, e-mail, telephone, identifiants permanents, timing, wallets, appareils et comportements.

Pour les technologies civiques, cette distinction est essentielle. Si l'identite numerique devient une partie de la participation publique, elle ne doit pas devenir une nouvelle facon de surveiller les citoyens. Les preuves zero-knowledge peuvent faire partie de la reponse, mais seulement dans une architecture plus large fondee sur la minimisation des donnees, la non-liabilite, l'auditabilite open source et le controle par l'utilisateur.

La lecon pratique est claire : utilisez zero-knowledge, mais ne vous arretez pas la.

## Pour aller plus loin

- [Presentation originale](https://docs.google.com/presentation/d/e/2PACX-1vRKRJW4-ZUHso3o-KzzwemuezH7ifLENCpvJCr9552PlRHzOtyxetsLM-4ghHDwCA/pub?start=false&loop=false&delayms=3000)
- [Presentation BBS+ au NIST](https://csrc.nist.gov/csrc/media/presentations/2023/crclub-2023-10-18/images-media/20231018-crypto-club--greg-and-vasilis--slides--BBS.pdf)
- [Documentation Iden3 sur les arbres de Merkle](https://docs.iden3.io/basics/key-concepts/#why-do-we-use-merkle-trees-at-iden3)
