#!/bin/sh
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$APP_DIR"

/usr/bin/node scripts/initDatabase.js
/usr/bin/node scripts/bootstrapAdmin.js

exec /usr/bin/node server.js
