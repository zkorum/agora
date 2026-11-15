export const qvVotingTranslations = {
  en: {
    title: "Quadratic voting",
    instruction: "Give more votes to the statements you care about.",
    explanation:
      "Each statement’s cost is its votes squared: 3 votes cost 9 credits. You have {budget} credits in total.",
    signedHelp:
      "Use positive votes to support a statement and negative votes to express that you do not support it.",
    supportOnlyHelp:
      "This activity accepts support votes only. Reduce votes to zero to remove your support.",
    support: "Support",
    notSupport: "Not support",
    statement: "Statement",
    votes: "Votes",
    credits: "Credits",
    creditCost: "{credits} credits",
    oneCredit: "1 credit",
    increase: "Increase support for: {title}",
    decrease: "Decrease support for: {title}",
    voteValue: "{votes} votes for: {title}",
    squareLabel: "{votes} votes use {credits} of {budget} credits",
    remaining: "{remaining} / {budget} credits remaining",
    unused: "You do not have to spend all your credits.",
    unsaved: "You have unsaved changes.",
    localOnly: "These changes exist only in this page and are not counted.",
    save: "Save response",
    retryCommand: "Retry pending request",
    savedBaseline:
      "Your saved response counts. Local changes do not replace it until you save again.",
    notSaved: "No response saved yet. Only an explicit save counts.",
    saved: "Response saved.",
    withdrawn: "Saved response withdrawn.",
    saveError:
      "The request was not accepted. Your local changes have been kept.",
    commandUncertain:
      "We could not confirm the outcome. Retry the pending request before saving further changes or discarding.",
    sessionRefreshError:
      "Your response was saved, but your session could not be refreshed. Reload before continuing.",
    responseConflict:
      "Your saved response changed elsewhere or this snapshot is stale. Discard local changes to load the current saved response.",
    withdraw: "Withdraw saved response",
    withdrawTitle: "Withdraw your saved response?",
    withdrawMessage:
      "Your saved response will no longer count. Local changes will be cleared. You can save a new response while voting is open.",
    savingUnavailable:
      "Preview only. These allocations are not saved or counted.",
    discard: "Discard changes",
    discardTitle: "Discard your changes?",
    discardMessage:
      "Your unsaved changes will be lost. Your saved response, if any, will not be changed.",
    keepEditing: "Keep editing",
    pendingLeaveMessage:
      "A response request is still pending and may already have been saved. Leaving discards local edits but does not cancel that request.",
    closed: "Voting is closed. You cannot change your response.",
    locked: "Voting is unavailable while this activity is locked.",
    changed:
      "The statements have changed. Discard your local changes to load the current statements.",
    loadError: "Unable to load the statements.",
    retry: "Retry",
    empty: "No statements to prioritize yet.",
    statementUnavailable:
      "Statement text is unavailable. Voting on this statement is disabled.",
    analysisTitle: "Quadratic voting results",
    analysisOpen:
      "Community results will be available after this activity closes.",
    analysisUnavailable: "Results are not available yet.",
    analysisCalculating: "Calculating results…",
    analysisFailed: "Results could not be calculated.",
    analysisEmpty: "No eligible saved responses were included.",
    basedOnParticipants: "Based on {count} participants.",
    netVotes: "Net votes: {count}",
    supportVotes: "Support votes: {count}",
    oppositionVotes: "Opposition votes: {count}",
    backToStatements: "View statements",
  },
  fr: {
    analysisCalculating: "Calcul des résultats…",
    analysisFailed: "Les résultats n’ont pas pu être calculés.",
    analysisEmpty: "Aucune réponse enregistrée admissible n’a été incluse.",
    basedOnParticipants: "Sur la base de {count} participants.",
    netVotes: "Voix nettes : {count}",
    supportVotes: "Voix de soutien : {count}",
    oppositionVotes: "Voix d’opposition : {count}",
    title: "Vote quadratique",
    instruction:
      "Accordez plus de voix aux propositions qui vous tiennent à cœur.",
    explanation:
      "Le coût de chaque proposition est le carré de ses voix : 3 voix coûtent 9 crédits. Vous disposez de {budget} crédits au total.",
    signedHelp:
      "Utilisez des voix positives pour soutenir une proposition et des voix négatives pour exprimer que vous ne la soutenez pas.",
    supportOnlyHelp:
      "Cette activité accepte uniquement des voix de soutien. Ramenez les voix à zéro pour retirer votre soutien.",
    support: "Soutenir",
    notSupport: "Ne pas soutenir",
    statement: "Proposition",
    votes: "Voix",
    credits: "Crédits",
    creditCost: "{credits} crédits",
    oneCredit: "1 crédit",
    increase: "Augmenter le soutien à : {title}",
    decrease: "Diminuer le soutien à : {title}",
    voteValue: "{votes} voix pour : {title}",
    squareLabel: "{votes} voix utilisent {credits} crédits sur {budget}",
    remaining: "{remaining} / {budget} crédits restants",
    unused: "Vous n’avez pas à dépenser tous vos crédits.",
    unsaved: "Vous avez des modifications non enregistrées.",
    localOnly:
      "Ces modifications existent uniquement dans cette page et ne sont pas comptées.",
    save: "Enregistrer la réponse",
    retryCommand: "Réessayer la demande en attente",
    savedBaseline:
      "Votre réponse enregistrée est comptée. Les modifications locales ne la remplacent qu’après un nouvel enregistrement.",
    notSaved:
      "Aucune réponse enregistrée. Seul un enregistrement explicite est compté.",
    saved: "Réponse enregistrée.",
    withdrawn: "Réponse enregistrée retirée.",
    saveError:
      "La demande n’a pas été acceptée. Vos modifications locales ont été conservées.",
    commandUncertain:
      "Le résultat n’a pas pu être confirmé. Réessayez la demande en attente avant d’enregistrer d’autres modifications ou de les abandonner.",
    sessionRefreshError:
      "Votre réponse a été enregistrée, mais votre session n’a pas pu être actualisée. Rechargez la page avant de continuer.",
    responseConflict:
      "Votre réponse enregistrée a changé ailleurs ou cet aperçu est périmé. Abandonnez les modifications locales pour charger la réponse actuelle.",
    withdraw: "Retirer la réponse enregistrée",
    withdrawTitle: "Retirer votre réponse enregistrée ?",
    withdrawMessage:
      "Votre réponse enregistrée ne sera plus comptée. Les modifications locales seront effacées. Vous pourrez enregistrer une nouvelle réponse tant que le vote est ouvert.",
    savingUnavailable:
      "Aperçu uniquement. Ces allocations ne sont ni enregistrées ni comptées.",
    discard: "Abandonner les modifications",
    discardTitle: "Abandonner vos modifications ?",
    discardMessage:
      "Vos modifications non enregistrées seront perdues. Votre éventuelle réponse enregistrée ne sera pas modifiée.",
    keepEditing: "Continuer à modifier",
    pendingLeaveMessage:
      "Une demande est en attente et a peut-être déjà été enregistrée. Quitter abandonne les modifications locales, mais n’annule pas cette demande.",
    closed: "Le vote est fermé. Vous ne pouvez pas modifier votre réponse.",
    locked:
      "Le vote n’est pas disponible lorsque cette activité est verrouillée.",
    changed:
      "Les propositions ont changé. Abandonnez vos modifications locales pour charger les propositions actuelles.",
    loadError: "Impossible de charger les propositions.",
    retry: "Réessayer",
    empty: "Aucune proposition à prioriser pour le moment.",
    statementUnavailable:
      "Le texte de la proposition n’est pas disponible. Le vote sur cette proposition est désactivé.",
    analysisTitle: "Résultats du vote quadratique",
    analysisOpen:
      "Les résultats collectifs seront disponibles après la fermeture de cette activité.",
    analysisUnavailable: "Les résultats ne sont pas encore disponibles.",
    backToStatements: "Voir les propositions",
  },
};
