# Shared App-API

Shared TypeScript code for the `agora` frontend and `api` backend.

This package contains app/API boundary code such as UCAN, DID, client-side crypto, and app-specific utilities that are needed by both the browser application and the backend API. It is synced to TypeScript services only; Python workers do not consume this package directly.

After modifying code in `services/shared-app-api/src/`, run from the repository root:

```bash
make sync-app-api
```

For automatic syncing during development, use:

```bash
make dev-sync-app-api
```

## License

See [COPYING](./COPYING).
