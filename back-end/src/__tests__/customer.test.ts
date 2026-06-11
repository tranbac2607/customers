import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '@/app';
import { authRepository } from '@/modules/auth/auth.repository';
import { hashPassword } from '@/utils/password';

let mongo: MongoMemoryServer;
let app: ReturnType<typeof createApp>;
let token: string;
let userId: string;

const VALID_CUSTOMER = {
  fullName: 'Nguyen Van A',
  dateOfBirth: '1990-05-12',
  address: '12 Le Loi, District 1, HCMC',
  phone: '+84 901 234 567',
  email: 'nguyen.a@example.com',
  gender: 'male' as const,
  nationality: 'Vietnamese',
  occupation: 'Engineer',
  identityDocuments: [
    { type: 'CCCD' as const, number: '079090012345', issueDate: '2020-06-15', issuePlace: 'HCMC PS' },
  ],
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-32chars-long';
  process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-32chars-long';

  await mongoose.connect(mongo.getUri());

  const passwordHash = await hashPassword('Admin@123');
  const admin = await authRepository.create({
    email: 'admin@example.com',
    passwordHash,
    name: 'Admin',
    role: 'admin',
  });
  userId = admin._id.toString();

  app = createApp();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@example.com', password: 'Admin@123' });
  token = login.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Customers', () => {
  it('POST /api/customers with valid body → 201', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_CUSTOMER);
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.email).toBe(VALID_CUSTOMER.email);
    expect(res.body.data.identityDocuments).toHaveLength(1);
  });

  it('POST with invalid email → 400', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_CUSTOMER, email: 'not-an-email', fullName: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fieldErrors.email).toBeDefined();
  });

  it('POST with duplicate email → 409', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_CUSTOMER);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST with duplicate doc type in array → 400', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...VALID_CUSTOMER,
        email: 'dup.doc@example.com',
        identityDocuments: [
          { type: 'CCCD', number: '1', issueDate: '2020-01-01', issuePlace: 'A' },
          { type: 'CCCD', number: '2', issueDate: '2021-01-01', issuePlace: 'B' },
        ],
      });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error.details)).toContain('Duplicate');
  });

  it('GET /api/customers → list with pagination', async () => {
    const res = await request(app)
      .get('/api/customers?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.pagination.total).toBeGreaterThan(0);
  });

  it('GET with search filter', async () => {
    const res = await request(app)
      .get('/api/customers?search=nguyen')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });

  it('GET /api/customers/:id → 200; non-existent → 404', async () => {
    const list = await request(app)
      .get('/api/customers?limit=1')
      .set('Authorization', `Bearer ${token}`);
    const id = list.body.data.items[0].id;

    const ok = await request(app)
      .get(`/api/customers/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.id).toBe(id);

    const notFound = await request(app)
      .get('/api/customers/507f1f77bcf86cd799439011')
      .set('Authorization', `Bearer ${token}`);
    expect(notFound.status).toBe(404);
  });

  it('PUT /api/customers/:id → 200', async () => {
    const list = await request(app)
      .get('/api/customers?limit=1')
      .set('Authorization', `Bearer ${token}`);
    const id = list.body.data.items[0].id;

    const res = await request(app)
      .put(`/api/customers/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ occupation: 'Senior Engineer' });
    expect(res.status).toBe(200);
    expect(res.body.data.occupation).toBe('Senior Engineer');
  });

  it('DELETE /api/customers/:id → 204', async () => {
    const create = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...VALID_CUSTOMER, email: 'to.delete@example.com' });
    const id = create.body.data.id;

    const del = await request(app)
      .delete(`/api/customers/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get(`/api/customers/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });

  it('unauthenticated requests → 401', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });
});
