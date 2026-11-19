---
title: "¿Qué puede hacer Ethereum por India? El reto de las filtraciones de exámenes"
description: "En Devcon 8, en Bombay, facilitamos un taller para que la comunidad local deliberara sobre uno de los grandes retos educativos de India: la filtración de preguntas de examen."
author: "Yuting Jiang"
date: "2026-11-14"
type: "case-study"
thumbnail: "/images/resources/devcon8-banner.png"
image: "/images/resources/devcon-exam-leak-opinion-map.webp"
---

En mayo de 2026, una filtración provocó la cancelación del NEET, el examen nacional de ingreso a medicina en India, y afectó a unos 2,2 millones de estudiantes (22 lakhs). La cancelación desató [protestas estudiantiles en todo el país](https://www.hindustantimes.com/education/competitive-exams/neet-ug-2026-cancelled-amid-paper-leak-row-students-parents-and-educators-react-strongly-101778745473158.html) y la reforma de los exámenes se convirtió en una reivindicación de [un movimiento juvenil más amplio](https://apnews.com/article/59d045fbd485635def01b01f3898307b).

En Devcon 8, en Bombay, facilitamos un taller sobre este problema. Centramos la pregunta en cómo prevenir futuras filtraciones de preguntas de examen. La decisión de cancelar el examen ya se había tomado.

Una de las propuestas era realizar el examen por ordenador. ¿Bastaría con eso? ¿En quién habría que seguir confiando y quién podría comprobar su trabajo?

Pedimos a los participantes que actuaran como una pequeña asamblea ciudadana. No hacía falta saber de tecnología blockchain. Diseñamos el taller para hablar de las garantías que debía ofrecer el sistema, como impedir que se cambiara un registro después de crearlo, sin usar términos como «inmutabilidad». No había una respuesta correcta. Concluir que no hacía falta una cadena de bloques era una opción válida.

## Dos puntos de partida, la Bóveda y la Biblioteca

<figure aria-label="Dos formas de proteger los exámenes" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: clamp(0.5rem, 2vw, 1rem);">
  <div style="background: #f2efff; border-radius: 1rem; padding: clamp(0.75rem, 3vw, 1.5rem); text-align: center;">
    <img src="/images/resources/devcon-exam-leak-vault.png" alt="" width="72" height="72" style="display: block; margin: 0 auto 0.75rem; background: #44328e; border-radius: 1rem; padding: 0.6rem;" />
    <strong style="display: block; color: #29205a;">La Bóveda: proteger el secreto</strong>
    <span style="display: block; font-size: 0.9em; line-height: 1.4; color: #423a62;">Menos personas ven las preguntas reales y se protege cada etapa del proceso.</span>
  </div>
  <div style="background: #edf5ff; border-radius: 1rem; padding: clamp(0.75rem, 3vw, 1.5rem); text-align: center;">
    <img src="/images/resources/devcon-exam-leak-library.png" alt="" width="72" height="72" style="display: block; margin: 0 auto 0.75rem; background: #3156a4; border-radius: 1rem; padding: 0.6rem;" />
    <strong style="display: block; color: #202f57;">La Biblioteca: eliminar el secreto</strong>
    <span style="display: block; font-size: 0.9em; line-height: 1.4; color: #344665;">Todas las preguntas posibles son públicas. Las del examen se eligen por sorteo el mismo día.</span>
  </div>
</figure>

Estas ideas servían para empezar. Cada persona podía cambiar de parecer durante el taller.

Mis compañeros facilitadores ayudaron a los equipos a preparar sus propuestas. [PreeGee](https://x.com/preegee), analista del sector de las criptomonedas en Bombay, trabajó con el equipo Bóveda. Nicolas Gimenez, director de tecnología de Agora, trabajó con el equipo Biblioteca.

1. **Primera votación.** Desde el móvil, los participantes indicaron en Agora si estaban de acuerdo, en desacuerdo o tenían dudas sobre los enunciados iniciales. El primer mapa mostró dos grupos que coincidían a grandes rasgos con las dos propuestas. Los partidarios de la supervisión se inclinaban por la Bóveda y los tecnólogos por la Biblioteca.

   [![Mapa de opiniones de la primera votación. Los partidarios de la supervisión (10 participantes, 56 %) preferían preparar el examen de antemano y supervisar al personal de forma transparente. Los tecnólogos (7 participantes, 39 %) preferían garantías técnicas como las preguntas generadas con IA y la transparencia de la cadena de bloques.](/images/resources/devcon-exam-leak-first-vote.png)](/images/resources/devcon-exam-leak-first-vote.png)

   _Los dos grupos de opinión tras la primera votación. Selecciona el mapa para verlo a tamaño completo._

2. **Trabajo por equipos.** Cerca del 60 % se unió al equipo Bóveda y el 40 % al equipo Biblioteca. Tenían siete minutos para publicar propuestas con esta fórmula: «Para evitar filtraciones, [quién] debería [hacer qué], siempre que [garantía]».
3. **Segunda votación.** Los participantes votaron sobre las nuevas propuestas. El mapa pasó de mostrar dos grupos de opinión a mostrar cinco.
4. **Puesta a prueba.** Los participantes empezaron a cuestionar la propuesta que más dividía al grupo antes de que se agotara el tiempo. La sesión terminó sin una clasificación final y dejamos abierta la conversación en Agora una semana más.

Agora formó los grupos de opinión a partir de los patrones de voto. Ni el texto de los enunciados ni el equipo elegido contaban para la agrupación. Después, un modelo de IA dio nombre y resumió cada grupo. Los votos determinaron su composición y sus puntos de acuerdo.

## Lo que revelaron los votos

El informe de Agora registra **18 participantes, 330 votos y 22 enunciados**. Los participantes escribieron 12 de esos enunciados durante la sesión.

![Mapa de opiniones de Agora tras el taller. Muestra cinco grupos: descentralizadores, tradicionalistas, defensores de la transparencia, escépticos y tecnólogos híbridos.](/images/resources/devcon-exam-leak-opinion-map.webp)

_Los cinco grupos de opinión del informe de Agora. Una de las 18 personas quedó sin grupo porque votó en menos de siete enunciados._

En el mapa, «descentralizadores» se refiere a quienes preferían que un comité de expertos votara qué preguntas utilizar y que el poder de decidir quedara repartido.

### Un punto de acuerdo sobre un sorteo verificable por cualquiera

> Si las preguntas se eligen por sorteo, cualquiera debería poder comprobar que el sorteo no se manipuló.

El informe registró este como el único enunciado aprobado en los cinco grupos. **El 83 % estuvo de acuerdo y nadie votó en contra.** La garantía se aplicaría si se usara un sorteo. La votación no decidió si se debía recurrir a un sorteo, a un banco público de preguntas o a Ethereum. Los equipos técnicos pueden comprobar si distintos diseños permiten que cualquiera verifique el sorteo. Ethereum ofrece una posible vía. El taller dejó abiertas su necesidad y su capacidad de impedir filtraciones por sí solo.

### Las cuestiones que seguían dividiendo al grupo

- **Pasar el NEET a un ordenador bastaría para evitar las filtraciones.** El 17 % estuvo de acuerdo, el 39 % en desacuerdo y el 39 % tenía dudas.
- **En el examen más seguro, se hacen públicas todas las preguntas posibles.** El 33 % estuvo de acuerdo y el 39 % en desacuerdo.
- **Es aceptable un pequeño riesgo de encontrar una pregunta casi idéntica a una de práctica.** En conjunto, el 61 % estuvo de acuerdo. Los dos miembros del grupo de escépticos votaron en contra de aceptar ese riesgo.

Los 50 minutos pasaron volando. En ese tiempo, la visualización pasó de dos grupos de opinión a cinco. Agora agrupó a las personas según sus votos, independientemente del equipo al que se hubieran unido. Al redactar las propuestas, afloraron desacuerdos en cada equipo y surgieron alianzas inesperadas entre ellos.

Así lo expresó PreeGee al cerrar el taller:

> Al principio, esto tomó naturalmente la forma de un debate. Era A contra B. Pero cuando te metes de lleno e intentas diseñar una solución, te das cuenta de que puedes discrepar con alguien con quien al principio estabas de acuerdo y encontrar puntos en común con gente con la que nunca lo habrías imaginado.

Al escuchar lo que importa a las personas de todos los grupos podemos buscar soluciones que puedan apoyar en común, incluso cuando persistan otros desacuerdos.

Esperamos que este pequeño taller anime a ciudadanos, comunidades e instituciones a [probar Agora](/resources/facilitation-guide) y buscar soluciones conjuntas a los problemas que les importan.

[Explora la conversación original en Agora](https://www.agoracitizen.app/project/devcon8/conversation/Z-n7k2Q) · [Consulta la ficha oficial en el archivo de Devcon](https://archive.devcon.org/devcon8/what-can-ethereum-do-for-india-the-exam-leak-challenge/)

Gracias en especial a [GCC](https://www.gccofficial.org/) por financiar Agora y otros bienes públicos.
