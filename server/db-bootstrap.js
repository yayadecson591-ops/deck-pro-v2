import { migrate, dbStatus } from './db/index.js';

try {
  const status = dbStatus();
  if (status.configured) {
    await migrate();
    console.log('Deck Pro DB schema ready.');
  } else {
    console.log('Deck Pro DB not configured; starting in legacy-compatible mode.');
  }
} catch (error) {
  console.error('Deck Pro DB migration failed:', error?.message || error);
  process.exit(1);
}

await import('./server.js');
