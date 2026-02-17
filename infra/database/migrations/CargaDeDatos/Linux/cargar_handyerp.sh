#!/bin/bash

# Variables de conexión
HOST="127.0.0.1"
PORT="3307"
USER="root"
PASSWORD="rootpass"
DB="handy_erp"

echo "▶ Ejecutando 01_init_schema_multitenant.sql..."
mysql -h $HOST -P $PORT -u $USER -p$PASSWORD $DB < 01_init_schema_multitenant.sql

echo "▶ Ejecutando 02_seed_data.sql..."
mysql -h $HOST -P $PORT -u $USER -p$PASSWORD $DB < 02_seed_data.sql

echo "▶ Ejecutando 03_create_user.sql..."
mysql -h $HOST -P $PORT -u $USER -p$PASSWORD $DB < 03_create_user.sql

echo "✅ Proceso completado."
