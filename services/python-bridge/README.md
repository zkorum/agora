# Agora Python Bridge

This is a bridge for Agora Node backend API to communicate internally with Python.

All the data science libraries we are using are written in Python, including [reddwarf](https://github.com/polis-community/red-dwarf).

## Development

Install Python 3.11, pip, and virtual env.

I recommend using <https://github.com/pyenv/pyenv> for managing python versions on your computer.

Create a virual env locally.

Then activate the virutal env by running `source .venv/bin/activate`

Then install dependencies: `pip install .`

And finally run the app:

```bash
flask --app main run
```

## Production

Build the docker image, publish it and pull it.

## License

See [COPYING](./COPYING)
