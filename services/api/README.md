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

Acces pgadmin on `http://localhost:5050`. Note that Email/Username and password are defined in the docker-compose.yml file

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

### CSV Export Feature

The API provides a conversation export feature that allows users to download conversation data (opinions and votes) as CSV files. Exports are stored in AWS S3 with secure pre-signed download URLs.

#### Environment Variables

**Required for CSV export:**

```bash
# S3 bucket configuration
EXPORT_CONVOS_AWS_S3_REGION=us-east-1                      # AWS region for S3 bucket
EXPORT_CONVOS_AWS_S3_BUCKET_NAME=agora-conversation-exports # S3 bucket name

# Optional configuration (with defaults)
EXPORT_CONVOS_EXPIRY_DAYS=30                               # Days until exports auto-delete (default: 30)
EXPORT_CONVOS_COOLDOWN_SECONDS=300                         # Cooldown between exports for same conversation (default: 300s/5min)
EXPORT_CONVOS_S3_PRESIGNED_URL_EXPIRY_SECONDS=3600         # Presigned URL validity (default: 3600s/1 hour)
EXPORT_CONVOS_ENABLED=true                                 # Enable/disable export feature (default: true)

# Optional: Valkey for export queue persistence across instances
QUEUE_VALKEY_URL=redis://localhost:6379                          # If not set, uses in-memory storage (lost on restart)
```

**Export Queue System:**

The export feature uses a queue system to manage load:

- Requests are batched and processed every 1 second (configurable batch size: 100)
- Duplicate requests within the same batch are automatically filtered
- Cooldown prevents re-exporting the same conversation too frequently
- Individual export failures don't affect other exports in the batch
- Valkey persistence (optional) enables queue survival across server restarts

**AWS Credentials:**

The application uses the AWS SDK default credential provider chain, which checks (in order):

1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. Shared credentials file (`~/.aws/credentials`)
3. IAM role attached to EC2 instance (recommended for production)
4. ECS task role (for containerized deployments)

**For production**, use IAM roles attached to your EC2 instance or ECS task. **For development**, you can use environment variables or the shared credentials file.

#### IAM Permissions

The IAM role or user must have the following S3 permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::agora-conversation-exports/*",
                "arn:aws:s3:::agora-conversation-exports"
            ]
        }
    ]
}
```

#### S3 Bucket Setup

**Using AWS CLI:**

```bash
# Create bucket (us-east-1 requires no --create-bucket-configuration)
aws s3api create-bucket --bucket agora-conversation-exports --region us-east-1

# Enable default encryption (SSE-S3)
aws s3api put-bucket-encryption --bucket agora-conversation-exports \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'

# Block public access (security best practice)
aws s3api put-public-access-block --bucket agora-conversation-exports \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Set lifecycle policy (auto-delete after 30 days - should match EXPORT_CONVOS_EXPIRY_DAYS)
aws s3api put-bucket-lifecycle-configuration --bucket agora-conversation-exports \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "DeleteOldExports",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "exports/conversations/"
      },
      "Expiration": {
        "Days": 30
      }
    }]
  }'
```

**Using AWS Console:**

1. Go to S3 console and create a new bucket
2. Enable "Block all public access"
3. Enable "Default encryption" with SSE-S3
4. Create a lifecycle rule to delete objects after 30 days in the `exports/conversations/` prefix

#### Disabling CSV Export

To disable the CSV export feature entirely:

```bash
EXPORT_CONVOS_ENABLED=false
```

When disabled, export API endpoints will return 404 Not Found.

## Test

```bash
# unit tests
pnpm run test
```

## Troubleshooting

### "Backend is stale" / Requests pending in development

If you observe that backend requests are hanging or the UI reports the backend is "stale" while running locally, you likely hit the **browser's connection limit**.

- **Cause:** Browsers limit the number of persistent connections per domain (typically 6 for HTTP/1.1).
- **Context:** The local dev server runs on HTTP/1.1. Since each app tab opens a persistent SSE connection for notifications, opening **6 or more tabs** consumes all available sockets. Subsequent requests from any tab will queue indefinitely.
- **Solution:**
  - Close unused tabs (keep open tabs < 6).
  - Use a different browser (Chrome, Firefox, Safari each have their own pool).
  - Access the app via `127.0.0.1` for a second set of connections (treated as a different origin than `localhost`).
- **Note:** This issue does not affect staging/production environments that use HTTP/2 (which supports multiplexing).

## License

See [COPYING](COPYING)
