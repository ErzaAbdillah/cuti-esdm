#!/bin/sh
# Backup database (pg_dump format custom) + berkas unggahan (tar.gz).
#   backup.sh          → berjalan terus, backup sekali sehari pada jam JAM_BACKUP (WITA)
#   backup.sh sekali   → backup sekarang lalu keluar
# Berkas pribadi di dalam tar tetap terenkripsi; simpan BERKAS_KUNCI terpisah dari backup.
set -eu
TUJUAN=${BACKUP_DIR:-/backups}
RETENSI=${RETENSI_HARI:-14}
JAM=${JAM_BACKUP:-01}
BERKAS=${BERKAS_DIR:-/data/berkas}
mkdir -p "$TUJUAN"

cadangkan() {
  s=$(date +%Y%m%d-%H%M)
  pg_dump -Fc -f "$TUJUAN/db-$s.dump.tmp" && mv "$TUJUAN/db-$s.dump.tmp" "$TUJUAN/db-$s.dump"
  if [ -d "$BERKAS" ]; then
    tar -czf "$TUJUAN/berkas-$s.tar.gz.tmp" -C "$(dirname "$BERKAS")" "$(basename "$BERKAS")" && mv "$TUJUAN/berkas-$s.tar.gz.tmp" "$TUJUAN/berkas-$s.tar.gz"
  fi
  find "$TUJUAN" -maxdepth 1 \( -name 'db-*.dump' -o -name 'berkas-*.tar.gz' \) -mtime +"$RETENSI" -delete
  echo "$(date '+%F %T') backup $s selesai"
}

if [ "${1:-}" = "sekali" ]; then cadangkan; exit 0; fi
while true; do
  hari=$(date +%Y%m%d)
  if [ "$(date +%H)" = "$JAM" ] && [ ! -f "$TUJUAN/.selesai-$hari" ]; then
    cadangkan && rm -f "$TUJUAN"/.selesai-* && touch "$TUJUAN/.selesai-$hari"
  fi
  sleep 300
done
