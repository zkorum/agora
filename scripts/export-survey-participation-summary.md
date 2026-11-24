# Bilan du questionnaire à transmettre aux facilitateurs

Le CSV décrit une seule conversation Polis, à la date de l’export. Il contient
une ligne de compteurs, sans identifiant, date individuelle, texte, choix de
réponse ou sens du vote.

| Colonne | Comment la lire |
| --- | --- |
| `questionnaires_commences` | Comptes non supprimés avec un questionnaire non retiré et au moins une étape encore enregistrée, y compris une question facultative passée. Ce ne sont pas les visites ni les clics sur « Participer ». |
| `sans_commentaire_ni_vote` | Parmi ces comptes, ceux pour lesquels il ne reste aucune trace de commentaire envoyé ni de vote exprimé dans cette consultation. Les commentaires initiaux des facilitateurs (`is_seed`) ne comptent pas ; voter sur l’un d’eux compte. |
| `questionnaires_termines`, `taux_completion_pct` | Nombre de complétions enregistrées (`completed_at`), puis pourcentage des questionnaires commencés. Il ne s’agit pas d’une revalidation selon la dernière version du questionnaire. |
| `personnes_avec_commentaire_inactif` | Comptes ayant au moins un commentaire avec une version enregistrée mais sans contenu courant. Un commentaire simplement modéré dont le contenu reste courant ne suffit pas. |
| `personnes_avec_vote_inactif` | Comptes ayant au moins un vote avec une version enregistrée mais sans vote courant. Une tentative annulée sans vote enregistré ne suffit pas. |

La vérification d’une adresse e-mail, lorsqu’elle est exigée pour répondre,
précède la première étape enregistrée et ne suffit pas pour être compté.

Les deux derniers compteurs peuvent se recouper. Un ancien commentaire ou vote
dont il reste une version compte comme participation, même s’il n’est plus
visible. L’absence de contenu courant ne permet pas à elle seule de qualifier
une suppression ou un retrait. Les comptes supprimés sont exclus de toutes les
colonnes : ce bilan ne permet pas d’estimer combien ont participé avant suppression.

Sur le schéma de `main` (`V0115`), ces deux indicateurs décrivent un état,
pas sa cause : ils ne mesurent pas les retraits volontaires. Un vote retiré
puis réactivé est de nouveau courant.

Une cellule vide signifie **non publié**, pas zéro : le seuil est de cinq comptes
pour un effectif et, lorsqu’on publie une partie d’un total, pour son complément.
Pour les deux derniers compteurs, ce complément est calculé parmi les personnes
ayant participé. Transmettre un seul bilan pour la consultation : comparer des
exports successifs peut révéler l’activité d’un petit nombre de personnes.
