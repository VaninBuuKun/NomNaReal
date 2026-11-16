#!/bin/bash
set -e

COUNT=${1:-1000000}

echo "============================================================="
echo " NomNa High-Speed Database Seeder (Zero-Dependency)         "
echo " Target: nomna_postgres_lab -> NomNaLab                     "
echo " Quantity: $COUNT messages                                  "
echo "============================================================="

docker exec -it nomna_postgres_lab psql -U lab_user -d NomNaLab -c "CALL seed_messages_bulk($COUNT);"

