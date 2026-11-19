---
title: "¿Qué puede hacer Ethereum por la India? El reto de las filtraciones de preguntas de examen"
description: "En Devcon 8, en Bombay (Mumbai), facilitamos un taller para que la comunidad local deliberara sobre uno de los grandes retos educativos de la India: la filtración de preguntas de examen."
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.webp"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

En mayo de 2026, una filtración de preguntas provocó la cancelación del NEET, el examen nacional de ingreso a medicina en la India, y afectó a unos 2,2 millones de estudiantes (22 lakhs). La cancelación desató [protestas estudiantiles en todo el país](https://www.hindustantimes.com/education/competitive-exams/neet-ug-2026-cancelled-amid-paper-leak-row-students-parents-and-educators-react-strongly-101778745473158.html), y la reforma de los exámenes se convirtió en una reivindicación que movilizó a [un movimiento juvenil más amplio](https://apnews.com/article/59d045fbd485635def01b01f3898307b).

En Devcon 8, en Bombay, facilitamos un taller sobre este problema. En lugar de debatir si cancelar el examen había sido la decisión acertada, preguntamos cómo prevenir futuras filtraciones.

Una de las propuestas era realizar el examen por ordenador. ¿Bastaría con eso? ¿En quién habría que seguir confiando y quién podría comprobar su trabajo?

Pedimos a los participantes que actuaran como una pequeña asamblea ciudadana. No hacía falta conocer la tecnología de cadena de bloques. Diseñamos el taller para hablar de las garantías que debía ofrecer el sistema, como impedir que se cambiara un registro después de crearlo, sin usar términos como «inmutabilidad». No había una respuesta correcta. Concluir que no hacía falta una cadena de bloques era una opción válida.

## Dos puntos de partida: la Bóveda y la Biblioteca

<figure class="resource-comparison" aria-label="Dos formas de proteger los exámenes">
  <div class="resource-comparison-card">
    <img src="/images/resources/devcon-exam-leak-vault.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>La Bóveda: proteger el secreto</strong>
    <span>Menos personas tienen acceso a las preguntas del examen y se protege cada etapa del proceso.</span>
  </div>
  <div class="resource-comparison-card resource-comparison-card--sky">
    <img src="/images/resources/devcon-exam-leak-library.webp" alt="" width="72" height="72" loading="lazy" decoding="async" />
    <strong>La Biblioteca: eliminar el secreto</strong>
    <span>Todas las preguntas posibles son públicas. Las del examen se eligen por sorteo el mismo día.</span>
  </div>
</figure>

Estas ideas servían para empezar. Cada persona podía cambiar de parecer durante el taller.

Mis compañeros facilitadores ayudaron a los equipos a preparar sus propuestas. [PreeGee](https://x.com/preegee), analista del sector de las criptomonedas en Bombay, trabajó con el equipo Bóveda. Nicolas Gimenez, director de tecnología de Agora, trabajó con el equipo Biblioteca.

1. **Primera votación.** Desde el móvil, los participantes votaron sobre las afirmaciones iniciales en Agora con las opciones «De acuerdo», «En desacuerdo» y «No seguro». El primer mapa mostró dos grupos que coincidían a grandes rasgos con los enfoques de partida. Los partidarios de la supervisión se inclinaban por la Bóveda y los tecnólogos por la Biblioteca.

   [![Mapa de opiniones de la primera votación. Los partidarios de la supervisión (10 participantes, 56 %) preferían preparar el examen de antemano y supervisar al personal de forma transparente. Los tecnólogos (7 participantes, 39 %) preferían garantías técnicas como las preguntas generadas con IA y la transparencia de la cadena de bloques.](/images/resources/devcon-exam-leak-first-vote.png)](/images/resources/devcon-exam-leak-first-vote.png)

   _Los dos grupos de opinión tras la primera votación. Seleccione el mapa para verlo a tamaño completo._

2. **Trabajo por equipos.** Cerca del 60 % se unió al equipo Bóveda y el 40 % al equipo Biblioteca. Tenían siete minutos para publicar propuestas con esta fórmula: «Para evitar filtraciones, [quién] debería [hacer qué], siempre que [garantía]».
3. **Segunda votación.** Los participantes votaron sobre las nuevas propuestas. El mapa pasó de mostrar dos grupos de opinión a mostrar cinco.
4. **Puesta a prueba.** Los participantes empezaron a cuestionar la propuesta que más dividía al grupo antes de que se agotara el tiempo. La sesión terminó sin una clasificación final y dejamos abierta la conversación en Agora una semana más.

Agora formó los grupos de opinión a partir de los patrones de votación, sin tener en cuenta el texto de las afirmaciones ni el equipo elegido. Después, un modelo de IA puso nombre a los grupos y los resumió, sin determinar quién pertenecía a cada uno ni en qué coincidían.

## Lo que revelaron los votos

El informe de Agora registra **18 participantes, 330 votos y 22 afirmaciones**. Los participantes escribieron 12 de esas afirmaciones durante la sesión.

![Mapa de opiniones de Agora tras el taller: 3 descentralizadores (17 %), 3 tradicionalistas (17 %), 4 defensores de la transparencia (22 %), 2 escépticos (11 %) y 5 tecnólogos híbridos (28 %).](/images/resources/devcon-exam-leak-opinion-map.webp)

_Los cinco grupos de opinión del informe de Agora. Una de las 18 personas quedó sin grupo porque votó en menos de siete afirmaciones._

En el mapa, «descentralizadores» se refiere a quienes preferían que un comité de expertos votara qué preguntas utilizar en lugar de dejar la decisión en manos de una sola autoridad.

### Un punto de acuerdo sobre un sorteo verificable por cualquiera

> Si las preguntas se eligen por sorteo, cualquiera debería poder comprobar que el sorteo no se manipuló.

Fue la única afirmación que el informe señaló como aprobada en los cinco grupos. **El 83 % estuvo de acuerdo y nadie votó en contra.** Era una garantía que solo se aplicaría si se optaba por el sorteo, no un voto a favor del sorteo, de un banco público de preguntas ni de Ethereum. Los equipos técnicos pueden comprobar si distintas soluciones permiten que cualquiera verifique el sorteo. Ethereum es una opción, pero el taller no demostró que fuera necesario ni que pudiera evitar las filtraciones por sí solo.

### Las cuestiones que seguían dividiendo al grupo

- **Realizar el NEET por ordenador bastaría para evitar las filtraciones.** El 17 % estuvo de acuerdo, el 39 % en desacuerdo y el 39 % tenía dudas.
- **En el examen más seguro, se hacen públicas todas las preguntas posibles.** El 33 % estuvo de acuerdo y el 39 % en desacuerdo.
- **Es aceptable un pequeño riesgo de encontrar una pregunta casi idéntica a una de práctica.** En conjunto, el 61 % estuvo de acuerdo, pero los dos miembros del grupo de escépticos votaron en contra.

Los 50 minutos pasaron volando. En ese tiempo, la visualización pasó de dos grupos de opinión a cinco. Agora agrupó a las personas según sus votos, independientemente del equipo al que se hubieran unido. Al redactar las propuestas, afloraron desacuerdos en cada equipo y surgieron alianzas inesperadas entre ellos.

Así lo expresó PreeGee al cerrar el taller:

> Al principio, esto tomó naturalmente la forma de un debate. Era A contra B. Pero cuando te metes de lleno e intentas diseñar una solución, te das cuenta de que puedes discrepar con alguien con quien al principio estabas de acuerdo y encontrar puntos en común con gente con la que nunca lo habrías imaginado.

En lugar de preguntar qué bando debería ganar, podemos escuchar lo que le importa a cada parte y buscar soluciones que todos los grupos puedan respaldar, aunque persistan otros desacuerdos.

Esperamos que este pequeño taller anime a ciudadanos, comunidades e instituciones a [probar Agora](/resources/facilitation-guide) y buscar soluciones conjuntas a los problemas que les importan.

[Explorar la conversación original en Agora](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [Consultar la ficha oficial en el archivo de Devcon](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

Gracias en especial a [GCC](https://www.gccofficial.org/) por financiar Agora y otros bienes públicos.
