#!/usr/bin/env node
/**
 * Downloads SAT catalogs from bambucode/catalogos_sat_JSON (GitHub)
 * and generates CSV files + seed SQL for PostgreSQL bulk load.
 *
 * Usage: node infra/database/schema/generate_sat_catalogs.js
 *
 * Outputs:
 *   - infra/database/schema/catalogo_sat_prodserv.csv
 *   - infra/database/schema/catalogo_sat_unidades.csv
 *   - infra/database/schema/seed_catalogo_sat.sql
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROD_SERV_URL = 'https://raw.githubusercontent.com/bambucode/catalogos_sat_JSON/master/c_ClaveProdServ.json';
const UNIDAD_URL = 'https://raw.githubusercontent.com/bambucode/catalogos_sat_JSON/master/c_ClaveUnidad.json';

const OUTPUT_DIR = path.dirname(__filename);

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'HandySales-SAT-Seed' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function escapeCsv(val) {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function main() {
  console.log('Downloading SAT c_ClaveProdServ catalog...');
  const prodServ = await fetchJSON(PROD_SERV_URL);
  console.log(`  -> ${prodServ.length} entries`);

  console.log('Downloading SAT c_ClaveUnidad catalog...');
  const unidades = await fetchJSON(UNIDAD_URL);
  console.log(`  -> ${unidades.length} entries`);

  // Generate ProdServ CSV
  const prodServCsv = ['clave,descripcion'];
  for (const item of prodServ) {
    const clave = item.id;
    const desc = item.descripcion;
    if (clave && desc) {
      prodServCsv.push(`${escapeCsv(clave)},${escapeCsv(desc)}`);
    }
  }
  const prodServPath = path.join(OUTPUT_DIR, 'catalogo_sat_prodserv.csv');
  fs.writeFileSync(prodServPath, prodServCsv.join('\n'), 'utf8');
  console.log(`Written: ${prodServPath} (${prodServCsv.length - 1} rows)`);

  // Generate Unidad CSV
  const unidadCsv = ['clave,nombre'];
  for (const item of unidades) {
    const clave = item.id;
    const nombre = item.nombre;
    if (clave && nombre) {
      unidadCsv.push(`${escapeCsv(clave)},${escapeCsv(nombre)}`);
    }
  }
  const unidadPath = path.join(OUTPUT_DIR, 'catalogo_sat_unidades.csv');
  fs.writeFileSync(unidadPath, unidadCsv.join('\n'), 'utf8');
  console.log(`Written: ${unidadPath} (${unidadCsv.length - 1} rows)`);

  // Generate seed SQL
  // NOTE: Billing DB uses UseSnakeCaseNamingConvention() so all columns are lowercase
  const seedSql = `-- SAT Catalogs Seed for HandySales Billing
-- Generated: ${new Date().toISOString()}
-- Source: bambucode/catalogos_sat_JSON (GitHub)
-- Run: docker exec -i handysales_postgres_dev psql -U handy_user -d handy_billing < infra/database/schema/seed_catalogo_sat.sql

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create tables if not exist (EnsureCreated should handle this, but just in case)
CREATE TABLE IF NOT EXISTS catalogo_prod_serv (
  clave VARCHAR(10) PRIMARY KEY,
  descripcion TEXT NOT NULL,
  pais VARCHAR(5) DEFAULT 'MX',
  activo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS catalogo_unidad (
  clave VARCHAR(10) PRIMARY KEY,
  nombre TEXT NOT NULL,
  pais VARCHAR(5) DEFAULT 'MX',
  activo BOOLEAN DEFAULT true
);

-- Clear existing data (safe to re-run)
TRUNCATE catalogo_prod_serv;
TRUNCATE catalogo_unidad;

-- Bulk load from CSV
\\COPY catalogo_prod_serv(clave, descripcion) FROM '${prodServPath.replace(/\\/g, '/')}' WITH (FORMAT csv, HEADER true);
\\COPY catalogo_unidad(clave, nombre) FROM '${unidadPath.replace(/\\/g, '/')}' WITH (FORMAT csv, HEADER true);

-- GIN trigram indexes for fast fuzzy search (<5ms on 53K rows)
CREATE INDEX IF NOT EXISTS idx_prodserv_desc_trgm ON catalogo_prod_serv USING gin (descripcion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_prodserv_clave_trgm ON catalogo_prod_serv USING gin (clave gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_unidad_nombre_trgm ON catalogo_unidad USING gin (nombre gin_trgm_ops);

-- Verify
SELECT 'catalogo_prod_serv' AS tabla, COUNT(*) AS registros FROM catalogo_prod_serv
UNION ALL
SELECT 'catalogo_unidad', COUNT(*) FROM catalogo_unidad;
`;

  const seedPath = path.join(OUTPUT_DIR, 'seed_catalogo_sat.sql');
  fs.writeFileSync(seedPath, seedSql, 'utf8');
  console.log(`Written: ${seedPath}`);

  console.log('\\nDone! Next steps:');
  console.log('  docker exec -i handysales_postgres_dev psql -U handy_user -d handy_billing < infra/database/schema/seed_catalogo_sat.sql');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
