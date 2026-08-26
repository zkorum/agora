# Shared Backend

Canonical TypeScript backend source and database schema for Agora services.

## Consumers

- `services/api` receives the complete source tree in `src/shared-backend`.
- `services/conversation-email-update-worker` receives the schema and the shared database, logging, configuration, Valkey, and SNS ingress dependencies it compiles against.
- Python workers receive generated SQLAlchemy models derived directly from `services/shared-backend/src/schema.ts`.

Consumer copies are generated and contain warning headers. Do not edit them directly.

## Usage

After modifying `services/shared-backend/src/`, run:

```bash
make sync-ts-backend
```

After changing schema declarations used by Python workers, run:

```bash
make sync-python-artifacts
```

Normal schema changes must still be generated through the API's Drizzle and Flyway tooling. Do not hand-write schema migrations.

## License

AGPL-3.0. See [COPYING](./COPYING).
