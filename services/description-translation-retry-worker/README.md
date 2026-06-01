# Description Translation Retry Worker

Dedicated Python service for description-translation retry/backlog work. The main `math-updater` service owns red-dwarf analysis and immediate first-pass translation when translation is enabled.

```bash
make dev
```

Build and push:

```bash
make image-buildx TAG=1.0.0
make image-push TAG=1.0.0
```
