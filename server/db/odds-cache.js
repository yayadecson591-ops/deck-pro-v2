import pg from 'pg';

const DATABASE_URL = (() => {
  for (const k of ['DATABASE_URL','POSTGRES_URL','POSTGRES_CONNECTION_STRING','RENDER_DATABASE_URL','DB_URL']) {
    const v = String(process.env[k] || '').trim();
    if (/^postgres(?:ql)?:\/\//i.test(v)) return v;
  }
  return '';
})();

let pool = null;
if (DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

let schemaReady = null;
async function ensureCacheSchema() {
  if (!pool) return false;
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS odds_api_cache (
        cache_key TEXT PRIMARY KEY,
        data_json JSONB NOT NULL,
        source TEXT NOT NULL DEFAULT 'oddspapi',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX IF NOT EXISTS odds_api_cache_expires_idx ON odds_api_cache(expires_at);
    `).catch((e) => { schemaReady = null; throw e; });
  }
  await schemaReady;
  return true;
}

export async function getOddsApiCache(cacheKey, { allowExpired = false } = {}) {
  if (!pool) return null;
  try {
    await ensureCacheSchema();
    const q = allowExpired
      ? 'SELECT data_json, expires_at, updated_at FROM odds_api_cache WHERE cache_key=$1'
      : 'SELECT data_json, expires_at, updated_at FROM odds_api_cache WHERE cache_key=$1 AND expires_at > now()';
    const r = await pool.query(q, [String(cacheKey)]);
    if (!r.rowCount) return null;
    return {
      data: r.rows[0].data_json,
      expiresAt: r.rows[0].expires_at,
      updatedAt: r.rows[0].updated_at,
      stale: allowExpired && new Date(r.rows[0].expires_at).getTime() <= Date.now(),
    };
  } catch (e) {
    console.warn('odds_api_cache get failed:', e?.message || e);
    return null;
  }
}

export async function setOddsApiCache(cacheKey, data, ttlMs = 600000, source = 'oddspapi') {
  if (!pool) return false;
  try {
    await ensureCacheSchema();
    const ttl = Math.max(60_000, Number(ttlMs) || 600_000);
    await pool.query(
      `INSERT INTO odds_api_cache(cache_key, data_json, source, updated_at, expires_at)
       VALUES ($1, $2::jsonb, $3, now(), now() + ($4::text || ' milliseconds')::interval)
       ON CONFLICT (cache_key) DO UPDATE SET
         data_json = EXCLUDED.data_json,
         source = EXCLUDED.source,
         updated_at = now(),
         expires_at = EXCLUDED.expires_at`,
      [String(cacheKey), JSON.stringify(data), String(source || 'oddspapi'), String(ttl)]
    );
    return true;
  } catch (e) {
    console.warn('odds_api_cache set failed:', e?.message || e);
    return false;
  }
}
