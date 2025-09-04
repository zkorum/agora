# Agora Python Bridge

This is a bridge for Agora Node backend API to communicate internally with Python.

All the data science libraries we are using are written in Python, including [reddwarf](https://github.com/polis-community/red-dwarf).

## Development

Install Python 3.11 or insure your python verison is compliant to the minimum requirement. We recommend using [pyenv](https://github.com/pyenv/pyenv) for managing python versions.

Create a virual env to better manage your python dependancies by running `python3 -m venv .venv` or equivalent. 

Activate the virutal env by running `source .venv/bin/activate`

Install dependencies using `pip install .` (If you encounter issues with Python wheels, try to install the dependencies in a separate pip command, close your editor and move to next step. A failed pip install will lead to an inability to run the app.)

And finally run the app with `make dev` or `flask --app main run`

Pro tip: if you change the dependencies in pyproject.toml, you must force reinstall: `pip install --force-reinstall --no-cache-dir .`,`pip install .` is not sufficient.

## Production

Build the docker image, publish it and pull it.

## License

See [COPYING](./COPYING)
