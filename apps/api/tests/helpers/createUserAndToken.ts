import app from '../../src/app';
import request from 'supertest';
import { prisma } from '../../src/prisma';
import { hashPassword } from '../../src/utils/password';
import { Role } from '@prisma/client';

export async function createUserAndToken(
  email = 'user@example.com',
  password = 'Passw0rd!',
  role: Role = Role.DATA_ENTRY,
  orgName = 'Test RBAC Org'
) {
  // Clean invitations that might block creation
  try {
    await prisma.invitation.deleteMany();
  } catch (err) {
    // ignore
  }

  const organization = await prisma.organization.upsert({
    where: { name: orgName },
    update: {},
    create: { name: orgName },
  });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: email.split('@')[0],
        role,
        organization: { connect: { id: organization.id } },
      },
    });
  } else {
    const updates: any = {};
    if (existing.role !== role) updates.role = role;
    if (!existing.organizationId) updates.organization = { connect: { id: organization.id } };
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: existing.id }, data: updates });
    }
  }

  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`Unable to login test user ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }

  return { token: res.body.token as string, user: res.body.user, organizationId: organization.id };
}
