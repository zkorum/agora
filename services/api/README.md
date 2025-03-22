# Back API (@zkorum/agora-api)

## Installation

We need `jq` for the custom renaming `scripts/`.

```bash
sudo apt install jq
pnpm install
```

## Running the app

```bash
# development
pnpm start:dev

# production mode
pnpm build && pnpm start
```

## Polis Integration

You must have https://github.com/zkorum/polis-wl running locally. For that, run the Polis database, and deploy the schema here: https://github.com/zkorum/polis-wl/tree/main/database and then configure and run the containers there: https://github.com/zkorum/polis-wl/tree/main/deploy/docker

You can also disable the Polis functionality altogether by not setting `POLIS_BASE_URL` at all in `.env` file.

## LLM Integration

LLM Integration cannot be tested locally by design, since it relies on an external cloud service and running a model locally is expensive.

To visualize how it works, checkout the staging environment.

## Nostr Integration

If `NOSTR_PROOF_CHANNEL_EVENT_ID` is undefined, then the proofs won't be broadcast to Nostr.

## Test

```bash
# unit tests
pnpm run test
```

## Database

We use drizzle as ORM, drizzle-kit to generate migration files from drizzle schema, and flyway for actually migrating the PostgreSQL database.

Start by using `env.example` and `flyway.conf.example` as example to configure conf files `.env` and `flyway.conf`.

Run a local PostgreSQL instance:

```bash
docker compose up -d
```

Locally generate new migration files (`.sql`) according to changes in source code:

```bash
pnpm run db:generate
```

Warning: do not use `pnpm drizzle-it generate:pg` directly! We use Flyway to migrate the DB, but Flyway requires special naming convention for the `.sql` migration files, so this generate step rename the files that drizzle generates. There is an [opened issue](https://github.com/drizzle-team/drizzle-orm/issues/852#issuecomment-1646238813) in Drizzle repo to enable customizing filenames directly in drizzle-kit config.

Potentially modify generated `.sql` files before actually migrating.

To delete `.sql` files you don't like use:

```bash
pnpm run db:drop
```

You can also use `pnpm drizzle-kit --help` for more commands.

Migrate the PostgreSQL schema according to `flyway.conf` config:

```bash
pnpm run db:migrate
```

## License

See [COPYING](COPYING)
