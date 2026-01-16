import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/prisma';
import { Role, IndicatorDataType } from '@prisma/client';

describe('Reporting Gap Detection', () => {
  let authToken: string;
  let userId: number;
  let projectId: number;
  let nodeId: number;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: 'gap-test@test.com',
        passwordHash: '$2b$10$validhash',
        role: Role.ADMIN,
        name: 'Gap Tester'
      }
    });
    userId = user.id;

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'gap-test@test.com', password: 'password123' });
    authToken = loginRes.body.token;

    const project = await prisma.project.create({
      data: { name: 'Gap Test Project', status: 'ACTIVE' }
    });
    projectId = project.id;

    const node = await prisma.logframeNode.create({
      data: {
        projectId,
        type: 'OUTPUT',
        title: 'Test Output',
        sortOrder: 0
      }
    });
    nodeId = node.id;
  });

  afterAll(async () => {
    await prisma.submission.deleteMany();
    await prisma.indicator.deleteMany();
    await prisma.logframeNode.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { email: 'gap-test@test.com' } });
    await prisma.$disconnect();
  });

  describe('GET /indicators/:id/gaps', () => {
    test('should detect monthly reporting gaps', async () => {
      const indicator = await prisma.indicator.create({
        data: {
          projectId,
          logframeNodeId: nodeId,
          name: 'Monthly Gap Indicator',
          unit: 'units',
          dataType: IndicatorDataType.NUMBER
        }
      });

      // Create submissions with a 3-month gap
      await prisma.submission.create({
        data: {
          indicatorId: indicator.id,
          reportedAt: new Date(2025, 0, 1),
          value: '10',
          createdByUserId: userId
        }
      });

      await prisma.submission.create({
        data: {
          indicatorId: indicator.id,
          reportedAt: new Date(2025, 3, 1), // 3 months later
          value: '15',
          createdByUserId: userId
        }
      });

      const res = await request(app)
        .get(`/api/indicators/${indicator.id}/gaps?frequency=MONTHLY`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gaps).toBeDefined();
      expect(res.body.gaps.length).toBeGreaterThan(0);
      expect(res.body.gaps[0].daysMissing).toBeGreaterThan(0);
      expect(res.body.gaps[0].expectedSubmissions).toBeGreaterThan(0);

      await prisma.submission.deleteMany({ where: { indicatorId: indicator.id } });
      await prisma.indicator.delete({ where: { id: indicator.id } });
    });

    test('should detect weekly reporting gaps', async () => {
      const indicator = await prisma.indicator.create({
        data: {
          projectId,
          logframeNodeId: nodeId,
          name: 'Weekly Gap Indicator',
          unit: 'units',
          dataType: IndicatorDataType.NUMBER
        }
      });

      // Create submissions with a 4-week gap
      await prisma.submission.create({
        data: {
          indicatorId: indicator.id,
          reportedAt: new Date(2025, 0, 1),
          value: '10',
          createdByUserId: userId
        }
      });

      await prisma.submission.create({
        data: {
          indicatorId: indicator.id,
          reportedAt: new Date(2025, 0, 29), // 28 days later
          value: '15',
          createdByUserId: userId
        }
      });

      const res = await request(app)
        .get(`/api/indicators/${indicator.id}/gaps?frequency=WEEKLY`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gaps).toBeDefined();
      expect(res.body.gaps.length).toBeGreaterThan(0);

      await prisma.submission.deleteMany({ where: { indicatorId: indicator.id } });
      await prisma.indicator.delete({ where: { id: indicator.id } });
    });

    test('should detect daily reporting gaps', async () => {
      const indicator = await prisma.indicator.create({
        data: {
          projectId,
          logframeNodeId: nodeId,
          name: 'Daily Gap Indicator',
          unit: 'units',
          dataType: IndicatorDataType.NUMBER
        }
      });

      // Create submissions with a 5-day gap
      await prisma.submission.create({
        data: {
          indicatorId: indicator.id,
          reportedAt: new Date(2025, 0, 1),
          value: '10',
          createdByUserId: userId
        }
      });

      await prisma.submission.create({
        data: {
          indicatorId: indicator.id,
          reportedAt: new Date(2025, 0, 6), // 5 days later
          value: '15',
          createdByUserId: userId
        }
      });

      const res = await request(app)
        .get(`/api/indicators/${indicator.id}/gaps?frequency=DAILY`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gaps).toBeDefined();
      expect(res.body.gaps.length).toBeGreaterThan(0);

      await prisma.submission.deleteMany({ where: { indicatorId: indicator.id } });
      await prisma.indicator.delete({ where: { id: indicator.id } });
    });

    test('should return no gaps for consistent reporting', async () => {
      const indicator = await prisma.indicator.create({
        data: {
          projectId,
          logframeNodeId: nodeId,
          name: 'Consistent Indicator',
          unit: 'units',
          dataType: IndicatorDataType.NUMBER
        }
      });

      // Create weekly submissions without gaps
      for (let i = 0; i < 8; i++) {
        await prisma.submission.create({
          data: {
            indicatorId: indicator.id,
            reportedAt: new Date(2025, 0, 1 + i * 7),
            value: String(10 + i),
            createdByUserId: userId
          }
        });
      }

      const res = await request(app)
        .get(`/api/indicators/${indicator.id}/gaps?frequency=WEEKLY`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gaps).toBeDefined();
      expect(res.body.gaps.length).toBe(0);

      await prisma.submission.deleteMany({ where: { indicatorId: indicator.id } });
      await prisma.indicator.delete({ where: { id: indicator.id } });
    });

    test('should return empty array for insufficient data', async () => {
      const indicator = await prisma.indicator.create({
        data: {
          projectId,
          logframeNodeId: nodeId,
          name: 'Single Submission Indicator',
          unit: 'units',
          dataType: IndicatorDataType.NUMBER
        }
      });

      await prisma.submission.create({
        data: {
          indicatorId: indicator.id,
          reportedAt: new Date(2025, 0, 1),
          value: '10',
          createdByUserId: userId
        }
      });

      const res = await request(app)
        .get(`/api/indicators/${indicator.id}/gaps?frequency=MONTHLY`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.gaps).toEqual([]);

      await prisma.submission.deleteMany({ where: { indicatorId: indicator.id } });
      await prisma.indicator.delete({ where: { id: indicator.id } });
    });

    test('should include gap metadata', async () => {
      const indicator = await prisma.indicator.create({
        data: {
          projectId,
          logframeNodeId: nodeId,
          name: 'Gap Metadata Indicator',
          unit: 'units',
          dataType: IndicatorDataType.NUMBER
        }
      });

      await prisma.submission.create({
        data: {
          indicatorId: indicator.id,
          reportedAt: new Date(2025, 0, 1),
          value: '10',
          createdByUserId: userId
        }
      });

      await prisma.submission.create({
        data: {
          indicatorId: indicator.id,
          reportedAt: new Date(2025, 2, 1),
          value: '15',
          createdByUserId: userId
        }
      });

      const res = await request(app)
        .get(`/api/indicators/${indicator.id}/gaps?frequency=MONTHLY`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.indicatorId).toBe(indicator.id);
      expect(res.body.frequency).toBe('MONTHLY');
      expect(res.body.totalSubmissions).toBeGreaterThanOrEqual(2);

      if (res.body.gaps.length > 0) {
        expect(res.body.gaps[0]).toHaveProperty('from');
        expect(res.body.gaps[0]).toHaveProperty('to');
        expect(res.body.gaps[0]).toHaveProperty('daysMissing');
        expect(res.body.gaps[0]).toHaveProperty('expectedSubmissions');
      }

      await prisma.submission.deleteMany({ where: { indicatorId: indicator.id } });
      await prisma.indicator.delete({ where: { id: indicator.id } });
    });
  });
});
