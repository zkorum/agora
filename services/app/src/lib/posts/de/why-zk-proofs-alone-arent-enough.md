---
title: "Warum Zero-Knowledge-Beweise allein die Privatsphäre nicht schützen"
description: "Zero-Knowledge-Beweise können den Nachweis der Berechtigung selbst schützen, aber zivile Plattformen benötigen Datenschutz über Identität, Metadaten, Wallets, Geräte und Open-Source-Infrastruktur hinweg."
author: "Nicolas Gimenez"
date: "2024-09-01"
type: "tech"
thumbnail: "https://lh7-us.googleusercontent.com/docs/AHkbwyK44xfmb0zN95CAfiTWJ5ULJ_-8DpfWRTy8r23dsV6kahSE4C4X-cZ8W4Ed-n2MT0jfWuolbqR77m1-rt_yXV4xcoojPDahscs3bQ=w1200-h630-p"
image: "https://lh7-us.googleusercontent.com/docs/AHkbwyK44xfmb0zN95CAfiTWJ5ULJ_-8DpfWRTy8r23dsV6kahSE4C4X-cZ8W4Ed-n2MT0jfWuolbqR77m1-rt_yXV4xcoojPDahscs3bQ=w1200-h630-p"
---

Das Versprechen von [Zero-Knowledge-Beweise (ZKP)](https://en.wikipedia.org/wiki/Zero-knowledge_proof) ist real: eine Person kann nachweisen, dass sie teilnahmeberechtigt, einzigartig, über einem bestimmten Alter oder Einwohner einer Gerichtsbarkeit ist, ohne persönliche Daten (PII) preiszugeben.

Allerdings ist ZKP auch enger gefasst, als es oft klingt.

Ein Zero-Knowledge-Beweis schützt einen Beweis. Er schützt nicht automatisch die IP-Adresse, den Browser-Fingerabdruck, die Telefonnummer, die E-Mail-Adresse, die Wallet-Implementierung, das Gerät, das Betriebssystem oder die vielen Zeitstempel und Verhaltenssignale, die um den Beweis herum erzeugt werden. Wenn diese umgebenden Schichten nicht sorgfältig konzipiert sind, kann ein Verifizierer dennoch herausfinden, wer der Nutzer ist.

Dieser Artikel basiert auf einer [Präsentation](https://docs.google.com/presentation/d/e/2PACX-1vRKRJW4-ZUHso3o-KzzwemuezH7ifLENCpvJCr9552PlRHzOtyxetsLM-4ghHDwCA/pub?start=false&loop=false&delayms=3000), die [NGI TrustChain](https://trustchain.ngi.eu/) im September 2024 gehalten wurde. Die zentrale Behauptung ist einfach: Zero-Knowledge-Beweise sind ein wichtiger Baustein für private bürgerschaftliche Teilhabe, aber der Datenschutz ist eine ganzheitliche Eigenschaft.

## Warum Identität in bürgerschaftliche Plattformen einzieht

Nicht jeder Online-Raum benötigt eine Identitätsprüfung. Es gibt legitime Anwendungsfälle für rein pseudonyme Gemeinschaften, in denen Teilnehmende über dauerhafte Handles und Reputation statt über formelle Zugangsdaten teilnehmen.

Bürgerschaftliche Teilhabe-Plattformen stehen vor einem anderen Problem. Wenn das Ziel darin besteht, sinnvolle öffentliche Beiträge zu sammeln, Spam zu verhindern, computergestützte Propaganda zu reduzieren oder Prozesse der Ein-Person-Eine-Stimme zu unterstützen, benötigt das System eine Form der Sybil-Resistenz. In der Praxis muss es möglicherweise wissen, dass ein Teilnehmender eine echte Person ist, zu einer relevanten Gemeinschaft gehört oder eine bürgerschaftliche Berechtigungsvorschrift erfüllt.

Es gibt verschiedene Ansätze zur Sybil-Resistenz, aber jeder hat Kompromisse:

- Biometrische Systeme können Einzigartigkeit gewährleisten, bergen aber ernsthafte Datenschutz- und Sicherheitsrisiken.
- Soziale Graphen-Systeme können in einigen Kontexten nützlich sein, bleiben aber schwer zu skalieren und verfügen oft nicht über starke Datenschutzgarantien.
- Hybride Web-of-Trust-Ansätze können für bestimmte Gemeinschaften funktionieren, bieten jedoch meist eine schwächere Einzigartigkeit.
- Regierungs- oder institutionelle Nachweise können stärkere Zusicherungen bieten, dürfen aber keine Überwachungsschicht werden.

Hier werden selbstbestimmte Identität und Zero-Knowledge-Beweise attraktiv. Sie deuten einen Weg nahe, die Berechtigung zu überprüfen, ohne dass Teilnehmende mehr persönliche Daten offenlegen müssen, als nötig.

## Was Zero-Knowledge gut kann

In einem vereinfachten Nachweisablauf sind drei Parteien beteiligt:

- Der Aussteller bestätigt etwas über eine Person und stellt einen Nachweis aus.
- Der Inhaber speichert diesen Nachweis und entscheidet, wann er ihn verwendet.
- Der Verifizierer prüft einen aus dem Nachweis abgeleiteten Beweis.

Zero-Knowledge-Techniken können es dem Inhaber ermöglichen, eine bestimmte Behauptung zu beweisen, ohne den zugrunde liegenden Nachweis preiszugeben. Beispielsweise könnte ein Teilnehmender beweisen, dass er über 18 Jahre alt ist, ohne sein Geburtsdatum preiszugeben, oder beweisen, dass er einen Nachweis von einem vertrauenswürdigen Aussteller erhalten hat, ohne den vollständigen Inhalt des Nachweises preiszugeben.

Verschiedene technische Ansätze können dieses Muster unterstützen. BBS+-Nachweise ermöglichen selektive Offenlegung und nicht verknüpfbare Beweise. Andere Ansätze nutzen Merkleisierte Nachweise und ZK-SNARKs, um verknüpfbare Nachweisformate datenschutzfreundlicher zu gestalten. Allzweck-zkVMs könnten es irgendwann einfacher machen, Fakten über bestehende sicherheitsorientierte Nachweise zu beweisen.

Diese Werkzeuge sind wertvoll, weil sie eine Aussteller-Nichtverknüpfbarkeit auf Beweisebene bieten können. Mit anderen Worten sollte der Aussteller nicht erfahren, wo der Nachweis verwendet wird, und verschiedene Nutzungen desselben Nachweises sollten nicht trivial durch den Beweis selbst miteinander verknüpft werden.

Das löst ein wichtiges Problem. Es löst nicht jedes Datenschutzproblem.

## Das Bedrohungsmodell: Der Inhaber steht an erster Stelle

Für die bürgerschaftliche Teilhabe sollte das Datenschutzmodell von der Perspektive des Inhabers ausgehen. Die Person, die das Berechtigungsschein nutzt, muss die Kontrolle darüber behalten, was sie offenlegt und gegenüber wem.

Dies erfordert ein strengeres Bedrohungsmodell als das, was die meisten sozialen Plattformen heute verwenden:

- Der Verifizierer, also die Plattform, die den Nachweis anfordert, sollte nicht blind vertraut werden. Er könnte versuchen, die Anonymität des Nutzers aufzuheben, es sei denn, das System macht dies schwierig und überprüfbar.
- Der Aussteller wird darauf vertraut, den Inhaber zu identifizieren und einen gültigen Berechtigungsschein auszustellen, aber ihm sollte nicht vertraut werden, um zu wissen, wo, wann oder warum dieser Berechtigungsschein später verwendet wird.
- Der Aussteller und der Verifizierer sollten nicht in der Lage sein, sich zusammenzutun, um Nutzer durch die Vorlage von Nachweisen zu identifizieren.
- Proprietärer Client-Code, Wallet-Code und Verifizierer-Frontends sollten als Risikoflächen behandelt werden, es sei denn, sie sind Open-Source, inspizierbar und idealerweise auditiert.

Dies unterscheidet sich stark vom vorherrschenden Social-Media-Modell, bei dem Plattformen normalerweise als vertrauenswürdig gelten, persönliche Daten verantwortungsvoll zu sammeln, zu speichern und zu schützen. Die Geschichte der Online-Plattformen gibt den Teilnehmenden viele Gründe, dieser Vertrauensbasis skeptisch gegenüberzustehen.

## Der Rest des Datenschutz-Eisbergs

Der einfachste Fehler ist, den Nullwissen-Nachweis als das gesamte Datenschutzsystem zu betrachten. In Wirklichkeit ist der Nachweis nur eine Schicht.

### Übermäßige Offenlegung

Selbst wenn ein Nachweis im Nullwissen generiert wird, kann der Verifizierer Attribute anfordern, die zu präzise, zu zahlreich oder zu selten sind. Ein Nutzer mag nicht sein gesamtes Ausweisdokument offenlegen, aber eine Kombination von Attributen kann ihn dennoch identifizieren.

Zum Beispiel kann der Nachweis eines genauen Alters, einer Stadt, eines Berufs und eines Mitgliedsstatus ausreichen, um eine Person in einer kleinen Gemeinschaft zu isolieren. Datenschutzfreundliche Systeme sollten grobe Prädikate und die minimal notwendige Offenlegung bevorzugen.

### Netzwerkmetadaten

Ein Verifizierer kann versuchen, einen Beweis über IP-Adressen, Browser-Fingerabdrücke, Gerätedaten oder die Zeit der Anfragen mit dem Nutzer zu verknüpfen. Wenn der Beweis aus derselben Browsersitzung wie eine identifizierende Anmeldung oder E-Mail-Verifizierung eingereicht wird, kann die mathematische Privatsphäre des Beweises nicht mehr gewährleistet sein.

Zero-Knowledge verbirgt die Netzwerkschicht nicht standardmäßig. Transportprivatsphäre, Proxys, Protokollierungsrichtlinien und eine sorgfältige Trennung der Sitzungen sind alle relevant.

### Cookies und Datenhändler

Drittanbieter-Cookies, Analyse-Skripte, Ad-Tech-Identifikatoren und gekaufte Daten können die Beweisprivatsphäre untergraben. Wenn ein Verifizierer Tracking-Code um den Beweisflow einbettet, kann er einen anonymen Beweis mit einer bekannten Web-Identität korrelieren.

Für eine zivile Plattform sollte der Beweisflow Drittanbieter-Tracker vollständig vermeiden. Die Privatsphäre darf nicht von einem kryptografischen Protokoll abhängen, während die umgebende Webseite die Identität durch gewöhnliche Web-Infrastruktur preisgibt.

### E-Mail-Adressen, Telefonnummern und Kontowiederherstellung

E-Mail-Adressen und Telefonnummern sind bequem, aber sie sind auch mächtige Identifikatoren. Wenn der Verifizierer diese mit einem Zero-Knowledge-Beweis in Verbindung bringt, kann der Beweis Teil eines breiteren Identitätsprofils werden.

Dies bedeutet nicht, dass zivile Plattformen niemals E-Mail-Adressen oder Telefonnummern verwenden können. Es bedeutet, dass diese Identifikatoren wann immer möglich von Beweisfällen isoliert, nur bei Bedarf verwendet und durch klare Aufbewahrungsrichtlinien geregelt werden sollten.

### Permanente Identifikatoren

Ein Zero-Knowledge-Beweis kann immer noch verknüpft werden, wenn derselbe permanente Identifikator in seiner Umgebung auftaucht. Wallet-Adressen, DIDs, Credential Subject IDs, Gerätekennungen oder stabile Konten-IDs können alle zu Korrelationshilfen werden.

Systeme, die Pseudonymität erfordern, sollten paarweise oder kontextspezifische Identifikatoren anstelle universeller Identifikatoren verwenden. Die Teilnehmenden sollten nicht standardmäßig dieselbe Spur über verschiedene, nicht zusammenhängende bürgerschaftliche Räume hinweg führen.

### Zeitliche Korrelation

Selbst wenn Identifikatoren verborgen sind, kann die zeitliche Abfolge Beziehungen offenbaren. Ein Verifizierer könnte den Zeitpunkt der Erzeugung eines Nachweises mit einer anderen Anfrage korrelieren, wie beispielsweise einem Login-Ereignis, einem Klick auf eine Benachrichtigung oder dem Laden einer Seite.

Designer sollten Zeitstempel als sensibel behandeln. Batching, verzögerte Einreichung, minimierte Protokollierung und eine sorgfältige Trennung zwischen Authentifizierung und Nachweispräsentation können das Korrelationsrisiko reduzieren.

### Wallet-, Gerätemanagement- und Lieferkettenrisiko

Der Nachweis mag kryptografisch einwandfrei sein, aber die Wallet oder das Client können immer noch sensible Daten preisgeben. Eine proprietäre Wallet könnte Telemetrie senden. Ein kompromittiertes SDK könnte Attribute offenbaren. Ein bösartiges Frontend könnte mehr anfordern, als die Teilnehmenden realisieren.

Open-Source-Code beseitigt diese Risiken nicht magisch, aber geschlossener Code erschwert deren Überprüfung. Für hochvertrauenswürdige bürgerschaftliche Systeme sollten Open-Source-Clients, reproduzierbare Builds, unabhängige Audits und minimale Telemetrie als Kerninfrastruktur betrachtet werden.

### Verhaltensinferenz

Maschinelles Lernen kann Identitäten aus Mustern ableiten, die isoliert harmlos erscheinen. Schreibstil, Aktivitätszeiten, Geräteverhalten, Standortmuster und Interaktionshistorie können alle den Anonymitätsbereich eingrenzen.

Dies ist ein weiterer Grund, warum der Datenschutz nicht auf den Nachweis reduziert werden kann. Anonyme Teilnahme erfordert auch Produkt-, Moderations- und Datenaufbewahrungsentscheidungen, die die Erstellung unnötiger Verhaltensdossiers vermeiden.

## Eine bessere Architektur für glaubwürdig anonyme Nachweise

Ein datenschutzwahrender Credential-Flow sollte unter der Annahme konzipiert werden, dass der Verifizierer mehr erfahren möchte, als er sollte.

Mindestens sollte eine zivile Plattform, die Zero-Knowledge-Proofs verwendet, folgende Grundsätze berücksichtigen:

- Bitten Sie um den am wenigsten präzisen Beweis, der die zivile Anforderung erfüllt.
- Vermeiden Sie die Kombination der Beweispräsentation mit der Identifizierung von Konten.
- Fügen Sie Telefonnummern, E-Mail-Adressen, Wallet-Adressen oder permanente DIDs Beweisereignissen nicht hinzu, es sei denn, der Anwendungsfall erfordert dies wirklich.
- Halten Sie Drittanbieter-Cookies, Analysen und Tracker vom Beweisfluss fern.
- Minimieren Sie Protokolle, insbesondere IP-Adressen, Zeitstempel und Anforderungsmetadaten.
- Verwenden Sie kontextspezifische Pseudonyme, wenn eine dauerhafte Teilnahme erforderlich ist.
- Machen Sie das Verifizierer-Frontend, die Logik der Beweisanforderung, die Wallet-Integrationen und SDKs quelloffen und prüfbar.
- Machen Sie Beweisanfragen für Teilnehmende verständlich, damit diese sehen können, was bewiesen und was nicht offengelegt wird.
- Verhindern Sie Issuer-Callbacks oder andere Mechanismen, die es Emittenten ermöglichen würden, zu erfahren, wo Anmeldeinformationen verwendet werden.

Das Ziel sind nicht nur anonyme Beweise. Das Ziel ist glaubwürdige Anonymität: ein System, bei dem Teilnehmende, Prüfer und die Zivilgesellschaft überprüfen können, ob die Datenschutzansprüche der Plattform mit ihrem tatsächlichen Verhalten übereinstimmen.

## Offene Herausforderungen

Es gibt noch viel Arbeit vor uns.

Erstens ist das Benutzererlebnis noch nicht gut genug. Die meisten Menschen können nicht über Anmeldeinformationsschemata, selektive Offenlegung, Beweisanfragen, Emittenten-Unverknüpfbarkeit oder Korrelationsangriffe nachdenken. Ein sicheres Produkt muss Datenschutzmerkmale erklären, ohne von den Teilnehmenden erwarten zu müssen, Kryptographen zu werden.

Zweitens ist das Anmeldeinformations-Ökosystem fragmentiert. BBS+, SD-JWT, mobile Führerscheine, Reisepasschips, Merkleisierte Anmeldeinformationen und zkVM-basierte Beweise führen alle unterschiedliche Kompromisse ein. Zivile Plattformen benötigen Interoperabilität, ohne in den am wenigsten privaten gemeinsamen Nenner abzugleiten.

Drittens, Sybil-Resistenz und Datenschutz stehen weiterhin im Spannungsfeld. Eine stärkere Einzigartigkeit erfordert oft stärkere Identitätsnachweise. Die Herausforderung besteht darin, nur das zu verifizieren, was notwendig ist, und zu verhindern, dass diese Verifizierung zu einem allgemeinen Identitätsgraphen wird.

Viertens darf die Missbrauchsprävention nicht zu Überwachung führen. Anonyme oder pseudonyme Räume benötigen weiterhin Moderation, Ratenbegrenzungen und Rechenschaftsmechanismen. Diese Mechanismen sollten so gestaltet sein, dass sie niemanden leise reidentifizieren.

Schließlich ist Open Source notwendig, aber nicht hinreichend. Veröffentlichte Codes helfen, aber Teilnehmende benötigen auch reproduzierbare Builds, unabhängige Audits, klare Governance und Zusicherungen zur Bereitstellungszeit, dass der Code, den sie inspizieren, der Code ist, den sie verwenden.

## Fazit

Zero-Knowledge-Proofs sind mächtig. Sie ermöglichen es Menschen, Fakten zu beweisen, ohne die zugrunde liegenden Daten preiszugeben, und sie können verhindern, dass Aussteller verfolgen, wo Anmeldeinformationen verwendet werden.

Aber Beweise sind nicht das gesamte Privatsphäre-System. Ein Verifizierer kann weiterhin die umgebenden Schichten angreifen: Attribute, Metadaten, Cookies, E-Mail, Telefonnummern, permanente Identifikatoren, Timing, Wallets, Geräte und Verhaltensmuster.

Für die Bürgertechnologie ist dieser Unterschied wichtig. Wenn die digitale Identität Teil der öffentlichen Teilhabe wird, darf sie nicht zu einer weiteren Möglichkeit werden, Bürger zu überwachen. Zero-Knowledge-Proofs können Teil der Lösung sein, aber nur, wenn sie in einer breiteren Architektur eingebettet sind, die auf Datenminimierung, Unverknüpfbarkeit, Open-Source-Auditierbarkeit und Benutzerkontrolle ausgelegt ist.

Die praktische Lektion ist klar: Zero-Knowledge nutzen, aber nicht dort aufhören.

## Weiterführende Lektüre

- [Originalpräsentation](https://docs.google.com/presentation/d/e/2PACX-1vRKRJW4-ZUHso3o-KzzwemuezH7ifLENCpvJCr9552PlRHzOtyxetsLM-4ghHDwCA/pub?start=false&loop=false&delayms=3000)
- [BBS+ Präsentation beim NIST](https://csrc.nist.gov/csrc/media/presentations/2023/crclub-2023-10-18/images-media/20231018-crypto-club--greg-and-vasilis--slides--BBS.pdf)
- [Iden3 Dokumentation zu Merkle-Bäumen](https://docs.iden3.io/basics/key-concepts/#why-do-we-use-merkle-trees-at-iden3)
