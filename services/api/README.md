# Back API (@zkorum/agora-api)

## Installation

We need `jq` for the custom renaming `scripts/`.

```bash
sudo apt install jq
pnpm install
```

## Starting or creating the database

We use drizzle as ORM, drizzle-kit to generate migration files from drizzle schema, and flyway for actually migrating the PostgreSQL database. You can also use `pnpm drizzle-kit --help` for more commands.

Start by using `env.example` and `database/flyway/flyway.conf.example` to configure conf files `.env` and `flyway.conf`.

Note that the `CONNECTION_STRING` and `flyway.password` variables should be determined by the values you have in the docker-compose.yml file.

Run a local PostgreSQL instance:

```bash
docker compose up -d
```
Acces pgadmin on ```http://localhost:5050```. Note that Email/Username and password are defined in the docker-compose.yml file


Prepare the databse migration:
```bash
pnpm run db:generate
```

Warning: do not use `pnpm drizzle-it generate:pg` directly! We use Flyway to migrate the DB, but Flyway requires special naming convention for the `.sql` migration files, so this generate step rename the files that drizzle generates. There is an [opened issue](https://github.com/drizzle-team/drizzle-orm/issues/852#issuecomment-1646238813) in Drizzle repo to enable customizing filenames directly in drizzle-kit config.

Potentially modify generated `.sql` files before actually migrating.

Migrate the PostgreSQL schema according to `flyway.conf` config:
```bash
pnpm run db:migrate
```


At this stage, you should have a docker container running, have access to the the pgadmin home page and have a with correct schema's.



## Running the api

```bash
# development
pnpm start:dev

# production mode
pnpm build && pnpm start
```

## Moderation

To grant a user moderator status, set the `is_moderator` column to true in the `user` table for the selected user.

## Integrations

### Polis Integration

You must have https://github.com/zkorum/polis-wl running locally. For that, run the Polis database, and deploy the schema here: https://github.com/zkorum/polis-wl/tree/main/database and then configure and run the containers there: https://github.com/zkorum/polis-wl/tree/main/deploy/docker

You can also disable the Polis functionality altogether by not setting `POLIS_BASE_URL` at all in `.env` file.

### LLM Integration

LLM Integration cannot be tested locally by design, since it relies on an external cloud service and running a model locally is expensive.

To visualize how it works, checkout the staging environment.

### Nostr Integration

If `NOSTR_PROOF_CHANNEL_EVENT_ID` is undefined, then the proofs won't be broadcast to Nostr.

## Test

```bash
# unit tests
pnpm run test
```

## License

See [COPYING](COPYING)
