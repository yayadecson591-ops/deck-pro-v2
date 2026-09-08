import { migrate, dbStatus } from './db/index.js';
import { ensureHistoryStore } from './history-store.js';

try {
  const status = dbStatus();
  if (status.configured) {
    await migrate();
    await ensureHistoryStore();
    console.log('Deck Pro DB schema and history store ready.');
  } else {
    console.log('Deck Pro DB not configured; starting in legacy-compatible mode.');
  }
} catch (error) {
  console.error('Deck Pro DB migration failed:', error?.message || error);
  process.exit(1);
}

await import('./server.js');
