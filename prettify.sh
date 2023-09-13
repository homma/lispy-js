#!/bin/sh

# run prettier for each javascript files

cd ${PWD}
find . -name '*.mjs' | while read i; do (prettier ${i} --write &); done
