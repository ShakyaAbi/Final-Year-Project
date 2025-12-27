import request from 'supertest';
import { Role } from '@prisma/client';
import app from '../src/app';
import { prisma } from '../src/prisma';
import { hashPassword } from '../src/utils/password';

describe('Auth flows', () => {
  const adminEmail = 'admin@test.com';
  const password = 'Passw0rd!';

  beforeAll(async () => {
    await prisma.submission.deleteMany();
    await prisma.indicator.deleteMany();
    await prisma.logframeNode.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, role: Role.ADMIN }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('logs in and returns access token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: adminEmail, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(adminEmail);
  });

  it('returns current user via /auth/me', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email: adminEmail, password });
    const token = login.body.token as string;
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(adminEmail);
    expect(res.body.role).toBe(Role.ADMIN);
  });
});
