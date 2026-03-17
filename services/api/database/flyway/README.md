# Post-Migration Scripts

Scripts in this directory are **not** executed by `pnpm db:migrate`. This directory is outside the flyway mount path (`database/flyway/`), so flyway never sees these files. Note: flyway scans subdirectories recursively, so a subdirectory *inside* `database/flyway/` would NOT be safe.

## Naming convention

Use sub-version numbers tied to the related migration series (e.g., `V0037.3` for a cleanup related to V0037).

## Usage

1. Write deferred migration scripts here using the standard `V####__name.sql` naming
2. When ready to apply, move the file to `database/flyway/`
3. Run `pnpm db:migrate`
