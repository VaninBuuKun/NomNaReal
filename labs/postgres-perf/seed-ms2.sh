#!/bin/bash
set -e

COUNT=${1:-1000000}

echo "============================================================="
echo " NomNa High-Speed UUIDv7 Seeder (Table: ms2)                 "
echo " Target: nomna_postgres_lab -> NomNaLab (ms2)                "
echo " Quantity: $COUNT messages (Time-Ordered UUIDv7)             "
echo "============================================================="

docker exec -i nomna_postgres_lab psql -U lab_user -d NomNaLab < "$(dirname "$0")/03_uuidv7_lab.sql" > /dev/null
docker exec -it nomna_postgres_lab psql -U lab_user -d NomNaLab -c "CALL seed_ms2_uuidv7($COUNT);"

