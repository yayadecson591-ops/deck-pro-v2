import express from 'express';
import accountRouter from './account-api.js';
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

// server.js owns the HTTP app; mount account routes immediately before listen
// without altering the existing V126 routes. The patch is installed only once.
const originalListen = express.application.listen;
express.application.listen = function(...args) {
  if (!this.__deckAccountApiMounted) {
    this.use(accountRouter);
    this.__deckAccountApiMounted = true;
  }
  return originalListen.apply(this,args);
};

await import('./server.js');
