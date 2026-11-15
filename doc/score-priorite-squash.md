> Tu peux nous rappeler ce que veut dire / comment est calculé le score en %
> dans l’algo de priorisation ? Je ne trouve pas l’info ou je ne comprends pas,
> même en lisant le « ? ».

Oui, et ta question montre qu’on doit mieux l’expliquer ! **C’est un score de
priorité issu de Solidago, pas un pourcentage de participants favorables.**
Le symbole `%` est donc ambigu.

**Avant, on utilisait une normalisation min–max :** on ramenait le plus petit
score à 0 et le plus grand à 100, en répartissant les autres entre les deux.
C’était facile à lire, mais ça étirait systématiquement les écarts. Par exemple,
des scores bruts allant de **−0,1 à +0,1** devenaient **0 à 100**, alors qu’ils
étaient très proches. Dans nos tests avec deux groupes aux préférences opposées,
ça donnait notamment un 100 au premier malgré des scores collectifs resserrés.

**Maintenant, on utilise Squash, le post-traitement proposé par Solidago, puis
on ramène son résultat sur 0–100.** La transformation est fixe : un même score
brut donne toujours le même affichage, sans dépendre du minimum et du maximum
de la conversation. Elle conserve l’ordre et comprime les valeurs extrêmes.
Avec les mêmes scores de **−0,1 à +0,1**, on affiche environ **45 à 55**.
Un score brut de **+0,75** donne **80**. Le premier n’est donc plus
automatiquement à 100.

Ce changement concerne l’affichage, pas la règle d’agrégation Solidago.
Mais **80 reste un indice transformé**, pas 80 % d’adhésion ni 80 % de confiance.
Et l’échelle est non linéaire : un écart de 10 points affichés ne correspond pas
partout au même écart de score brut.

Pour l’interface, plusieurs choix sont possibles :

- **Garder Squash et écrire « Score de priorité : 80 / 100 ».** On garde une
  échelle bornée sans suggérer une proportion de personnes. Il faut néanmoins
  expliquer que c’est un indice, pas une mesure absolue d’importance.
- **Afficher seulement le classement : 1, 2, 3…** C’est le plus simple,
  mais on perd l’indication que les scores sont proches ou éloignés.
- **Afficher les scores bruts Solidago.** C’est le plus direct pour quelqu’un
  qui connaît l’algorithme, mais moins lisible pour le grand public.
- **Ajouter des statistiques de choix**, par exemple « choisie comme la plus
  prioritaire 12 fois sur 20 présentations ». Le chiffre est concret, mais
  dépend des propositions présentées en face et ne suit pas nécessairement
  l’ordre Solidago. Ce serait un complément au classement, pas son score.

**Je pencherais pour garder Squash, remplacer le `%` par `/ 100` et mieux
expliquer l’indice dans le « ? ».** Éventuellement, on pourrait mettre les
statistiques de choix dans le détail de chaque proposition.

Tu en penses quoi ? Ce compromis te paraît-il lisible, ou préférerais-tu un
classement sans score, les valeurs brutes, ou des statistiques de choix ?
Qu’est-ce que tu voudrais surtout pouvoir comprendre avec le chiffre affiché ?

Pour référence : [la section 8 « Model post-process » du papier Solidago](https://arxiv.org/html/2211.01179v3#S8),
[le code de Squash](https://github.com/tournesol-app/tournesol/blob/main/solidago/src/solidago/post_process/squash.py)
et [notre intégration dans Agora](https://github.com/zkorum/agora/blob/main/services/scoring-worker/src/scoring_worker/display_scores.py).
Le papier utilise `100 × s / √(1 + s²)` pour afficher entre −100 et +100 ;
dans Agora, on décale et redimensionne cette même transformation vers 0–100.
