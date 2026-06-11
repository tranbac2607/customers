/* eslint-disable no-console */
/**
 * Boots MongoDB in-memory (downloads binary on first run) and starts the API.
 * Useful for local dev when you don't have a local MongoDB.
 *
 * Usage: `npm run dev:memory`
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import { startServer } from './bootstrap';

(async () => {
  console.log('⏳ Starting in-memory MongoDB…');
  const mem = await MongoMemoryServer.create();
  const uri = mem.getUri();
  console.log(`✅ In-memory Mongo URI: ${uri}`);
  process.env.MONGODB_URI = uri;
  process.env.NODE_ENV = process.env.NODE_ENV ?? 'development';

  await startServer();

  const shutdown = async (): Promise<void> => {
    await mem.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})().catch((err) => {
  console.error('Memory server failed', err);
  process.exit(1);
});
