# Agora Citizen Network

Monorepo for [Agora Citizen Network](https://agoracitizen.network).

## About

We are at a critical moment where social media platforms are increasingly evolving into tools of computational propaganda (the use of bots and algorithms to manipulate public opinion), polarizing society, and threatening democratic values worldwide. Recent advancements in AI have unfortunately accelerated this dangerous trend.

**Agora Citizen Network** was born out of our belief that digital public spaces must be intentionally designed to strengthen the social fabric of our societies. We envision a future where technology transforms social diversity into a catalyst for progress, rather than a driver of division.

### What we're doing differently

- Using zero-knowledge proof (ZKP) cryptography, Agora allows users to anonymously prove they are human - not bots - without disclosing any personal information to anyone, including us.
- Besides, most social networks today use engagement-based ranking algorithms designed to maximize user attention and engagement. Unfortunately, these algorithms often promote polarizing content, which tends to attract the most attention, whether good or bad. In contrast, Agora employs bridging-based ranking algorithms that aim to highlight content appreciated by users across different political viewpoints. The goal is not to censor extreme opinions but to preserve a rich diversity of viewpoints and identify common ground.
- Additionally, we're developing [Racine](https://github.com/zkorum/racine), a metaprotocol built on [UCAN](https://github.com/ucan-wg) and [Rarimo](https://github.com/rarimo), designed to give users full control over their digital identities and data. We believe that while protocols may not be inherently interoperable, verifiable data is. By putting humans at the center, Racine enables users to decide what data to share, with which service providers, and where to store it, ensuring both self-sovereignty and verifiable data provenance.

### Roadmap

- Q1 2025: [Agora MVP](https://agoracitizen.network/feed/) is live and actively seeking your feedback - [Get in touch!](https://linktr.ee/yutingzkorum)
- Q2 2025: Evolving from MVP to SLCP (Simple, Lovable, Complete Product) – Launch mobile apps in May.
- Q2 & Q3 2025: Develop pilot projects with institutions, NGOs, market research firms, newspapers, and other partners looking to engage their audiences through Agora.

#### Check out detailed product development roadmap [here](https://github.com/zkorum/product/issues/34)

## Development

### Prerequisites

Install:

- rsync
- make
- [jq](https://jqlang.github.io/jq/)
- sed
- bash
- [pnpm](https://pnpm.io/)
- [watchman](https://facebook.github.io/watchman/)
- [docker](https://www.docker.com/)

### Run in dev mode

All the components run in watch mode.

With `gnome-terminal`, you can use the following script to automatically open a terminal with one tab per service and a working tab (make sure you edit `BASE_DIR` in the script before running it):

```
./run_all_in_gnome_terminal_tabs.sh
```

Otherwise, open four terminals in the root directory, then run the following commands.

Shared tab - automatically rsync shared files to back and front:

```
make dev-sync
```

OpenAPI tab - automatically generate frontend stub from backends and subsequent openapi changes:

```
make dev-generate
```

Frontend App tab:

```
make dev-app
```

Backend API tab:

```
make dev-back
```

... and start coding!

## Services

### Agora

A Quasar application (frontend)

### Api

A Fastify application supported by a PostgreSQL database (backend).

### Python bridge

A Flask application to enable the Node backend to communicate with the data science libraries written in Python ([reddwarf](https://github.com/polis-community/red-dwarf) especially).

### OpenAPI

We generate an `openapi-zkorum.json` file from the backend, and then use [openapi-generator-cli](https://openapi-generator.tech/) to generate the corresponding front.

### Shared

Some typescript source files are shared directly without using npm packages - by copy-pasting using rsync.

## Embedding Agora on your website

Refer to [the embed documentation](./doc/embed.md).

## Security disclosures

If you discover any security issues, please send an email to <security@zkorum.com>. The email is automatically CCed to the entire team, and we'll respond promptly. See [SECURITY](./SECURITY.md) for more info.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

See [COPYING-README](COPYING-README.md)

## Acknowledgements

<img src="https://ngi.eu/wp-content/uploads/2019/06/Logo-NGI_Explicit-with-baseline-rgb.png" width="200" alt="NGI">

This project has received funding from the European Union's Horizon Europe 2020 research and innovation program through the [NGI TRUSTCHAIN](https://trustchain.ngi.eu/) program under cascade funding agreement No. 101093274 and the [NGI SARGASSO](https://ngisargasso.eu/) project under grant agreement No. 101092887.

In terms of source code, the NGI SARGASSO program exclusively funded the integration with Rarimo. For detailed information, please refer to the commit messages and file headers.
