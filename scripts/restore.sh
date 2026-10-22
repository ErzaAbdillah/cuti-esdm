#!/bin/sh
# Pulihkan dari backup. Jalankan di container backup (variabel PG* sudah terisi):
#   docker compose -f docker-compose.prod.yml stop app cron
#   docker compose -f docker-compose.prod.yml run --rm -v berkas:/data/berkas backup /scripts/restore.sh /backups/db-YYYYmmdd-HHMM.dump [/backups/berkas-YYYYmmdd-HHMM.tar.gz]
#   docker compose -f docker-compose.prod.yml start app cron
# PERINGATAN: isi database (dan folder berkas bila tar diberikan) diganti dengan isi backup.
set -eu
DUMP=${1:?Pemakaian: restore.sh <db-*.dump> [berkas-*.tar.gz]}
TAR=${2:-}
BERKAS=${BERKAS_DIR:-/data/berkas}
pg_restore --clean --if-exists --no-owner --single-transaction -d "$PGDATABASE" "$DUMP"
echo "database dipulihkan dari $DUMP"
if [ -n "$TAR" ]; then
  find "$BERKAS" -mindepth 1 -delete
  tar -xzf "$TAR" -C "$(dirname "$BERKAS")"
  echo "berkas dipulihkan dari $TAR"
fi
