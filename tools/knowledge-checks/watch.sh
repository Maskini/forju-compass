#!/bin/sh
# Run from any directory. Snapshots stay under the repository's ignored work/.
set -eu
here=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
cache="$here/../../work/source-watch"
mkdir -p "$cache"
local_tool="$here/../../work/quality-tools/bin/urlwatch"
if [ ! -x "$local_tool" ]; then local_tool=urlwatch; fi
exec "$local_tool" --config "$here/watch.yaml" --urls "$here/pages.yaml" --hooks "$cache/no-hooks.py" --cache "$cache/pages.sqlite" "$@"
