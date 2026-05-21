---
title: "Por que las pruebas de conocimiento cero por si solas no bastan para proteger la privacidad"
description: "Las pruebas de conocimiento cero pueden proteger la prueba de la credencial, pero las plataformas civicas necesitan privacidad en la identidad, los metadatos, las wallets, los dispositivos y la infraestructura open source."
author: "Nicolas Gimenez"
date: "Mayo 2026"
type: "tech"
thumbnail: "https://lh7-us.googleusercontent.com/docs/AHkbwyK44xfmb0zN95CAfiTWJ5ULJ_-8DpfWRTy8r23dsV6kahSE4C4X-cZ8W4Ed-n2MT0jfWuolbqR77m1-rt_yXV4xcoojPDahscs3bQ=w1200-h630-p"
image: "https://lh7-us.googleusercontent.com/docs/AHkbwyK44xfmb0zN95CAfiTWJ5ULJ_-8DpfWRTy8r23dsV6kahSE4C4X-cZ8W4Ed-n2MT0jfWuolbqR77m1-rt_yXV4xcoojPDahscs3bQ=w1200-h630-p"
---

Las pruebas de conocimiento cero suelen presentarse como una respuesta completa a la privacidad. En tecnologia civica, la promesa es especialmente atractiva: una persona puede demostrar que es elegible para participar, que es unica, que supera cierta edad o que reside en una jurisdiccion sin revelar todo el contenido de un documento de identidad.

Esa promesa es real. Tambien es mas limitada de lo que a veces parece.

Una prueba de conocimiento cero protege una prueba. No protege automaticamente la direccion IP de la persona, la huella del navegador, el numero de telefono, la direccion de correo, la implementacion de la wallet, el dispositivo, el sistema operativo ni las muchas marcas de tiempo y senales de comportamiento que se crean alrededor de la prueba. Si esas capas no se disenan con cuidado, un verificador todavia puede aprender quien es la persona usuaria.

Este articulo adapta una presentacion dada a NGI TrustChain en septiembre de 2024. La tesis central es sencilla: las pruebas de conocimiento cero son una pieza importante para la participacion civica privada, pero la privacidad de una persona es una propiedad de toda la pila.

## Por que la identidad entra en las plataformas civicas

No todos los espacios en linea necesitan verificacion de identidad. Existen buenos casos de uso para comunidades puramente seudonimas, donde las personas participan mediante nombres persistentes y reputacion en lugar de credenciales formales.

Las plataformas de participacion civica enfrentan otro problema. Si el objetivo es recoger aportes publicos significativos, resistir el spam, reducir la propaganda computacional o apoyar procesos de una persona, una voz, el sistema necesita alguna forma de resistencia Sybil. En la practica, puede necesitar saber que una persona participante es real, pertenece a una comunidad relevante o cumple una regla de elegibilidad civica.

Hay varias formas de lograr resistencia Sybil, pero todas tienen costes:

- Los sistemas biometricos pueden aportar unicidad, pero crean graves riesgos de privacidad y seguridad.
- Los sistemas de grafo social pueden ayudar en algunos contextos, pero siguen siendo dificiles de escalar y a menudo tienen garantias de privacidad debiles.
- Los enfoques hibridos de web of trust pueden funcionar para ciertas comunidades, pero suelen ofrecer una unicidad mas debil.
- Las credenciales institucionales o gubernamentales pueden dar garantias fuertes, pero no deben convertirse en una capa de vigilancia.

Aqui es donde la identidad autosoberana y las pruebas de conocimiento cero resultan atractivas. Sugieren una manera de verificar elegibilidad sin pedir a las personas que expongan mas datos personales de los necesarios.

## Lo que las pruebas de conocimiento cero hacen bien

En un flujo simplificado de credenciales intervienen tres partes:

- El emisor confirma algo sobre una persona y emite una credencial.
- El titular guarda esa credencial y decide cuando usarla.
- El verificador comprueba una prueba derivada de la credencial.

Las tecnicas de conocimiento cero pueden permitir que el titular demuestre una afirmacion especifica sin revelar la credencial subyacente. Por ejemplo, una persona puede demostrar que tiene mas de 18 anos sin revelar su fecha de nacimiento, o demostrar que recibio una credencial de un emisor confiable sin revelar todo su contenido.

Varios enfoques tecnicos pueden sostener este patron. Las credenciales BBS+ permiten divulgacion selectiva y pruebas no enlazables. Otros enfoques usan credenciales merkelizadas y ZK-SNARKs para hacer mas privados formatos de credenciales que normalmente son enlazables. Las zkVM de proposito general podrian facilitar en el futuro pruebas sobre credenciales ya existentes orientadas a seguridad.

Estas herramientas son valiosas porque pueden ofrecer no enlazabilidad del emisor a nivel de prueba. Es decir, el emisor no deberia saber donde se usa la credencial, y distintos usos de la misma credencial no deberian poder enlazarse trivialmente a traves de la propia prueba.

Eso resuelve un problema importante. No resuelve todos los problemas de privacidad.

## El modelo de amenazas: primero el titular

Para la participacion civica, el modelo de privacidad debe empezar desde la perspectiva del titular. La persona que usa la credencial debe mantener el control sobre que revela y a quien.

Esto exige un modelo de amenazas mas estricto que el de la mayoria de plataformas sociales actuales:

- No se debe confiar ciegamente en el verificador, es decir, la plataforma que solicita la prueba. Puede intentar desanonimizar a la persona a menos que el sistema lo haga dificil y auditable.
- Se confia en el emisor para identificar al titular y emitir una credencial valida, pero no para saber donde, cuando o por que se usa despues esa credencial.
- El emisor y el verificador no deben poder coludirse para identificar personas a traves de presentaciones de pruebas.
- El codigo cliente propietario, el codigo de la wallet y los frontends del verificador deben tratarse como superficies de riesgo salvo que sean open source, inspeccionables e idealmente auditados.

Esto es muy distinto del modelo dominante de redes sociales, donde se suele confiar en que las plataformas gestionen los datos de forma responsable. La historia de las plataformas en linea da muchas razones para desconfiar de esa premisa.

## El resto del iceberg de privacidad

El error mas facil es tratar la prueba de conocimiento cero como si fuera todo el sistema de privacidad. En realidad, la prueba es solo una capa.

### Divulgacion excesiva

Aunque una prueba se genere en conocimiento cero, el verificador puede pedir atributos demasiado precisos, numerosos o raros. Una persona puede no revelar su documento completo, pero una combinacion de atributos puede identificarla.

Por ejemplo, probar una edad exacta, ciudad, profesion y estado de membresia puede bastar para senalar a una persona en una comunidad pequena. Los sistemas que preservan la privacidad deben preferir predicados amplios y la minima divulgacion necesaria.

### Metadatos de red

Un verificador puede intentar vincular una prueba con la persona mediante direcciones IP, huellas de navegador, metadatos de dispositivo o tiempos de solicitud. Si la prueba se envia desde la misma sesion de navegador que un inicio de sesion identificante o una verificacion de correo, la privacidad matematica de la prueba puede dejar de importar.

El conocimiento cero no oculta por defecto la capa de red. Tambien importan la privacidad de transporte, los proxies, las politicas de logs y la separacion cuidadosa de sesiones.

### Cookies y data brokers

Las cookies de terceros, scripts de analitica, identificadores publicitarios y datos comprados pueden debilitar la privacidad de una prueba. Si un verificador incrusta tracking alrededor del flujo de prueba, podria correlacionar una prueba anonima con una identidad web conocida.

Para una plataforma civica, el flujo de prueba debe evitar por completo los trackers de terceros. La privacidad no puede depender de un protocolo criptografico mientras la pagina filtra identidad por infraestructura web ordinaria.

### Correo, telefono y recuperacion de cuenta

El correo electronico y el telefono son practicos, pero tambien son identificadores fuertes. Si el verificador los asocia con una prueba de conocimiento cero, la prueba puede volverse parte de un perfil de identidad mas amplio.

Esto no significa que una plataforma civica nunca pueda usar correo o telefono. Significa que esos identificadores deben aislarse de los eventos de prueba siempre que sea posible, usarse solo cuando sea necesario y regirse por politicas claras de retencion.

### Identificadores permanentes

Una prueba de conocimiento cero aun puede enlazarse si el mismo identificador permanente aparece alrededor de ella. Direcciones de wallet, DIDs, IDs de sujeto de credencial, identificadores de dispositivo o IDs de cuenta estables pueden convertirse en puntos de correlacion.

Los sistemas que necesitan seudonimato deben usar identificadores por contexto o por relacion en lugar de identificadores universales. La persona no deberia llevar por defecto la misma huella entre espacios civicos no relacionados.

### Correlacion temporal

Aunque se oculten los identificadores, el tiempo puede revelar relaciones. Un verificador puede correlacionar el momento en que se genera una prueba con otra solicitud, como un inicio de sesion, un clic en una notificacion o una carga de pagina.

Los disenadores deben tratar las marcas de tiempo como sensibles. El batching, el envio diferido, la minimizacion de logs y la separacion entre autenticacion y presentacion de prueba reducen el riesgo de correlacion.

### Wallets, dispositivos y cadena de suministro

La prueba puede ser criptograficamente correcta, pero la wallet o el cliente aun pueden filtrar datos sensibles. Una wallet propietaria puede enviar telemetria. Un SDK comprometido puede revelar atributos. Un frontend malicioso puede pedir mas de lo que la persona entiende.

El open source no elimina magicamente estos riesgos, pero el codigo cerrado los vuelve mucho mas dificiles de inspeccionar. Para sistemas civicos de alta confianza, los clientes open source, builds reproducibles, auditorias independientes y telemetria minima deben tratarse como infraestructura basica.

### Inferencia conductual

El machine learning puede inferir identidad a partir de patrones que parecen inofensivos por separado. Estilo de escritura, horarios de actividad, comportamiento del dispositivo, patrones de ubicacion e historial de interacciones pueden reducir el conjunto de anonimato.

Por eso la privacidad no puede reducirse a la prueba. La participacion anonima tambien requiere decisiones de producto, moderacion y retencion que eviten construir expedientes conductuales innecesarios.

## Una mejor arquitectura para pruebas creiblemente anonimas

Un flujo de credenciales que preserve la privacidad debe disenarse bajo la suposicion de que el verificador quiere aprender mas de lo que deberia.

Como minimo, una plataforma civica que use pruebas de conocimiento cero deberia considerar estos principios:

- Pedir la prueba menos precisa que satisfaga el requisito civico.
- Evitar combinar presentacion de prueba con flujos de cuenta identificantes.
- No asociar telefonos, correos, direcciones de wallet o DIDs permanentes a eventos de prueba salvo que el caso de uso lo requiera de verdad.
- Mantener cookies de terceros, analitica y trackers fuera del flujo de prueba.
- Minimizar logs, especialmente direcciones IP, marcas de tiempo y metadatos de solicitudes.
- Usar seudonimos especificos por contexto cuando se necesite participacion persistente.
- Hacer open source y auditables el frontend del verificador, la logica de solicitud de pruebas, las integraciones de wallets y los SDK.
- Hacer que las solicitudes de prueba sean comprensibles para las personas, de modo que vean que se esta probando y que no se esta revelando.
- Evitar callbacks al emisor u otros mecanismos que le permitan saber donde se usan las credenciales.

El objetivo no son solo pruebas anonimas. El objetivo es anonimato creible: un sistema donde usuarios, auditores y sociedad civil puedan inspeccionar si las promesas de privacidad de la plataforma coinciden con su comportamiento real.

## Desafios abiertos

Todavia queda trabajo dificil.

Primero, la experiencia de usuario no es suficientemente buena. La mayoria de las personas no puede razonar sobre esquemas de credenciales, divulgacion selectiva, solicitudes de prueba, no enlazabilidad del emisor o ataques de correlacion. Un producto seguro debe explicar sus propiedades de privacidad sin exigir que los usuarios se vuelvan criptografos.

Segundo, el ecosistema de credenciales esta fragmentado. BBS+, SD-JWT, licencias de conducir moviles, chips de pasaporte, credenciales merkelizadas y pruebas basadas en zkVM hacen distintos compromisos. Las plataformas civicas necesitan interoperabilidad sin caer en el minimo comun denominador de privacidad.

Tercero, la resistencia Sybil y la privacidad siguen en tension. Una unicidad mas fuerte suele exigir evidencia de identidad mas fuerte. El reto es verificar solo lo necesario y evitar que esa verificacion se convierta en un grafo de identidad general.

Cuarto, la prevencion de abusos no debe recrear vigilancia. Los espacios anonimos o seudonimos todavia necesitan moderacion, limites de frecuencia y mecanismos de responsabilidad. Esos mecanismos deben disenarse para no reidentificar silenciosamente a todo el mundo.

Finalmente, el open source es necesario pero no suficiente. El codigo publicado ayuda, pero las personas tambien necesitan builds reproducibles, auditorias independientes, gobernanza clara y garantias de despliegue de que el codigo inspeccionado es el codigo que se usa.

## Conclusion

Las pruebas de conocimiento cero son poderosas. Permiten demostrar hechos sin revelar los datos subyacentes y pueden impedir que los emisores rastreen donde se usan las credenciales.

Pero las pruebas no son todo el sistema de privacidad. Un verificador todavia puede atacar las capas circundantes: atributos, metadatos, cookies, correo, telefono, identificadores permanentes, tiempos, wallets, dispositivos y patrones de comportamiento.

Para la tecnologia civica, esta distincion importa. Si la identidad digital se vuelve parte de la participacion publica, no debe convertirse en otra forma de observar a la ciudadania. Las pruebas de conocimiento cero pueden ser parte de la respuesta, pero solo dentro de una arquitectura mas amplia basada en minimizacion de datos, no enlazabilidad, auditabilidad open source y control por parte de la persona usuaria.

La leccion practica es clara: usa conocimiento cero, pero no te detengas ahi.

## Lecturas adicionales

- [Presentacion original](https://docs.google.com/presentation/d/e/2PACX-1vRKRJW4-ZUHso3o-KzzwemuezH7ifLENCpvJCr9552PlRHzOtyxetsLM-4ghHDwCA/pub?start=false&loop=false&delayms=3000)
- [Presentacion de BBS+ en NIST](https://csrc.nist.gov/csrc/media/presentations/2023/crclub-2023-10-18/images-media/20231018-crypto-club--greg-and-vasilis--slides--BBS.pdf)
- [Documentacion de Iden3 sobre arboles de Merkle](https://docs.iden3.io/basics/key-concepts/#why-do-we-use-merkle-trees-at-iden3)
