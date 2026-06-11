/* eslint-disable no-console */
import { MongoMemoryServer } from 'mongodb-memory-server';

(async () => {
  console.log('⏳ Starting in-memory MongoDB for seed…');
  const mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  process.env.NODE_ENV = 'development';
  process.env.JWT_ACCESS_SECRET ??= 'seed-access-secret-32chars';
  process.env.JWT_REFRESH_SECRET ??= 'seed-refresh-secret-32chars';

  // Import after env is set so config/env picks up the URI
  const { seed } = await import('./seed.js');
  await seed();
  await mem.stop();
  process.exit(0);
})().catch((err) => {
  console.error('Seed (memory) failed', err);
  process.exit(1);
});
