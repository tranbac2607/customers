import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '@/app';
import { authRepository } from '@/modules/auth/auth.repository';
import { hashPassword } from '@/utils/password';

let mongo: MongoMemoryServer;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-32chars-long';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-32chars-long';

  // re-import env after MONGODB_URI is set; modules already loaded use cached
  // Strategy: in tests we set env BEFORE app is created. Re-set in a controlled way:
  // easier: connect mongoose directly using the in-memory URI.
  await mongoose.connect(mongo.getUri());

  // Seed admin
  const passwordHash = await hashPassword('Admin@123');
  await authRepository.create({
    email: 'admin@example.com',
    username: 'admin',
    passwordHash,
    name: 'Admin',
    role: 'admin',
  });

  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Auth', () => {
  it('POST /api/auth/login with wrong password → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@example.com', password: 'WrongPass123!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login with username instead of email → 200', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin', password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admin@example.com');
  });

  it('POST /api/auth/login with correct creds → 200 + tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@example.com', password: 'Admin@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('admin@example.com');
    expect(res.body.data.user.username).toBe('admin');
  });

  it('GET /api/auth/me without token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me with token → 200', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@example.com', password: 'Admin@123' });
    const token = login.body.data.accessToken;
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admin@example.com');
  });

  it('POST /api/auth/refresh rotates tokens', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@example.com', password: 'Admin@123' });
    const oldRefresh = login.body.data.refreshToken;
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(oldRefresh);

    // Reuse → 401
    const res2 = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefresh });
    expect(res2.status).toBe(401);
  });
});
