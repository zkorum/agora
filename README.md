# Agora Citizen Network

Monorepo for [Agora Citizen Network](https://agoracitizen.network).

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

With `gnome-terminal`, you can use the following script to automatically open a terminal with one tab per service and a working tab:

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

Frontend tab:

```
make dev-front
```

Backend tab:

```
make dev-back
```

... and start coding!

## Services

### Agora

A Quasar application (frontend)

### Api

A Fastify application supported by a PostgreSQL database (backend).

### OpenAPI

We generate an `openapi-zkorum.json` file from the backend, and then use [openapi-generator-cli](https://openapi-generator.tech/) to generate the corresponding front.

### Shared

Some typescript source files are shared directly without using npm packages - by copy-pasting using rsync.

## Security disclosures

If you discover any security issues, please send an email to security@zkorum.com. The email is automatically CCed to the entire team, and we'll respond promptly. See [SECURITY](./SECURITY.md) for more info.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

See [COPYING-README](COPYING-README.md)

## Acknowledgements

<img src="https://ngi.eu/wp-content/uploads/2019/06/Logo-NGI_Explicit-with-baseline-rgb.png" width="200" alt="NGI">

This project has received funding from the European Union’s Horizon Europe 2020 research and innovation program through the [NGI TRUSTCHAIN](https://trustchain.ngi.eu/) program under cascade funding agreement No. 101093274 and the [NGI SARGASSO](https://ngisargasso.eu/) project under grant agreement No. 101092887.

In terms of source code, the NGI SARGASSO program exclusively funded the integration with Rarimo. For detailed information, please refer to the commit messages and file headers.
