#!/bin/bash
# 1-Click connect directly to NomNa Postgres Lab via psql
docker exec -it nomna_postgres_lab psql -U lab_user -d NomNaLab

