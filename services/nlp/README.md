# nlp

Simple Python web server running Natural Language Processing endpoints, used directly by the nodejs server.

Used for classifying comments (toxicity, etc), and eventually send reports to moderators.

We can also use Jigsaw and https://perspectiveapi.com/ in the future.

## Development

The project uses [pdm](https://pdm-project.org/) as a package manager.

### Install

```bash
pdm install
```

### Run locally

```bash
pdm run src/nlp/toxicity_classifier.py
```

### Run in prod

For simplicity sake, both `nlp` and `back` are ran in the same machine and communicate via port within the same localhost.

TODO: containerize

## License

See [COPYING](./COPYING).
