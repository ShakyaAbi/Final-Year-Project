import request from "supertest";
import app from "../src/app";
import { prisma } from "../src/prisma";
import { Role, IndicatorDataType, AnomalyStatus } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

describe("Anomaly Detection System", () => {
  let authToken: string;
  let userId: number;
  let projectId: number;
  let nodeId: number;
  let indicatorId: number;

  beforeAll(async () => {
    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: {
        email: "anomaly-test@test.com",
        passwordHash,
        role: Role.ADMIN,
        name: "Anomaly Tester",
        organization: { create: { name: "Anomaly Test Org" } },
      },
    });
    userId = user.id;

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "anomaly-test@test.com", password: "password123" });
    authToken = loginRes.body.token;

    const project = await prisma.project.create({
      data: {
        name: "Anomaly Test Project",
        status: "ACTIVE",
        organization: { connect: { id: user.organizationId } },
      },
    });
    projectId = project.id;

    const node = await prisma.logframeNode.create({
      data: {
        projectId,
        type: "OUTPUT",
        title: "Test Output",
        sortOrder: 0,
      },
    });
    nodeId = node.id;
  });

  afterAll(async () => {
    await prisma.submission.deleteMany();
    await prisma.indicator.deleteMany();
    await prisma.logframeNode.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { email: "anomaly-test@test.com" } });
    await prisma.$disconnect();
  });

  describe("Rule-based Range Detection", () => {
    beforeEach(async () => {
      const indicator = await prisma.indicator.create({
      data: {
           projectId,
           logframeNodeId: nodeId,
           name: "Range Test Indicator",
           unit: "units",
           dataType: IndicatorDataType.NUMBER,
           minValue: 10,
           maxValue: 100,
           anomalyConfig: {
             enabled: true,
             mode: "RULES",
             rules: { range: true, maxChangePercent: 0 },
           },
           createdByUserId: userId,
         },
      });
      indicatorId = indicator.id;
    });

    afterEach(async () => {
      await prisma.submission.deleteMany({ where: { indicatorId } });
      await prisma.indicator.delete({ where: { id: indicatorId } });
    });

    test("should flag values below minimum as anomaly", async () => {
      const res = await request(app)
        .post(`/api/v1/indicators/${indicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: new Date(2025, 0, 1).toISOString(),
          value: 5,
        });

      expect(res.status).toBe(201);
      expect(res.body.isAnomaly).toBe(true);
      expect(res.body.anomalyReason).toContain("minimum");
      expect(res.body.anomalyStatus).toBe(AnomalyStatus.DETECTED);
    });

    test("should flag values above maximum as anomaly", async () => {
      const res = await request(app)
        .post(`/api/v1/indicators/${indicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: new Date(2025, 0, 2).toISOString(),
          value: 150,
        });

      expect(res.status).toBe(201);
      expect(res.body.isAnomaly).toBe(true);
      expect(res.body.anomalyReason).toContain("maximum");
    });
  });

  describe("Rule-based Change Detection", () => {
    beforeEach(async () => {
      const indicator = await prisma.indicator.create({
          data: {
            projectId,
            logframeNodeId: nodeId,
            name: "Change Test Indicator",
            unit: "units",
            dataType: IndicatorDataType.NUMBER,
            anomalyConfig: {
              enabled: true,
              mode: "RULES",
              rules: { range: false, maxChangePercent: 50 },
            },
            createdByUserId: userId,
          },
      });
      indicatorId = indicator.id;

      await request(app)
        .post(`/api/v1/indicators/${indicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: new Date(2025, 0, 1).toISOString(),
          value: 100,
        });
    });

    afterEach(async () => {
      await prisma.submission.deleteMany({ where: { indicatorId } });
      await prisma.indicator.delete({ where: { id: indicatorId } });
    });

    test("should flag large percent change as anomaly", async () => {
      const res = await request(app)
        .post(`/api/v1/indicators/${indicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: new Date(2025, 0, 2).toISOString(),
          value: 200,
        });

      expect(res.status).toBe(201);
      expect(res.body.isAnomaly).toBe(true);
      expect(res.body.anomalyReason).toContain("Change > 50%");
    });

    test("should not flag small change", async () => {
      const res = await request(app)
        .post(`/api/v1/indicators/${indicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: new Date(2025, 0, 3).toISOString(),
          value: 120,
        });

      expect(res.status).toBe(201);
      expect(res.body.isAnomaly).toBe(false);
    });
  });

  describe("Anomaly Management", () => {
    let anomalySubmissionId: number;

    beforeEach(async () => {
      const indicator = await prisma.indicator.create({
        data: {
            projectId,
            logframeNodeId: nodeId,
            name: "Management Test Indicator",
            unit: "units",
            dataType: IndicatorDataType.NUMBER,
            createdByUserId: userId,
          },
      });
      indicatorId = indicator.id;

      const submission = await prisma.submission.create({
        data: {
          indicatorId,
          reportedAt: new Date(),
          value: "150",
          createdByUserId: userId,
          isAnomaly: true,
          anomalyReason: "Value exceeds expected maximum (100)",
          anomalyStatus: AnomalyStatus.DETECTED,
        },
      });
      anomalySubmissionId = submission.id;
    });

    afterEach(async () => {
      await prisma.submission.deleteMany({ where: { indicatorId } });
      await prisma.indicator.delete({ where: { id: indicatorId } });
    });

    test("should acknowledge anomaly", async () => {
    const res = await request(app)
      .post(`/api/v1/submissions/${anomalySubmissionId}/anomaly/acknowledge`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ notes: "Data entry error confirmed" });

      expect(res.status).toBe(200);
      expect(res.body.anomalyStatus).toBe(AnomalyStatus.ACKNOWLEDGED);
      expect(res.body.anomalyReviewedBy).toBe(userId);
      expect(res.body.anomalyReviewedAt).toBeTruthy();
    });

    test("should resolve anomaly", async () => {
    const res = await request(app)
      .post(`/api/v1/submissions/${anomalySubmissionId}/anomaly/resolve`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ notes: "Corrected in system" });

      expect(res.status).toBe(200);
      expect(res.body.anomalyStatus).toBe(AnomalyStatus.RESOLVED);
    });

    test("should mark anomaly as false positive", async () => {
    const res = await request(app)
      .post(`/api/v1/submissions/${anomalySubmissionId}/anomaly/false-positive`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ notes: "Actually valid data" });

      expect(res.status).toBe(200);
      expect(res.body.anomalyStatus).toBe(AnomalyStatus.FALSE_POSITIVE);
    });

    test("should update anomaly status", async () => {
    const res = await request(app)
      .put(`/api/v1/submissions/${anomalySubmissionId}/anomaly/status`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        status: AnomalyStatus.RESOLVED,
        notes: "Updated status",
      });

      expect(res.status).toBe(200);
      expect(res.body.anomalyStatus).toBe(AnomalyStatus.RESOLVED);
    });

    test("should reject anomaly operations on non-anomaly submission", async () => {
      const normalSubmission = await prisma.submission.create({
        data: {
          indicatorId,
          reportedAt: new Date(),
          value: "50",
          createdByUserId: userId,
          isAnomaly: false,
        },
      });

      const res = await request(app)
        .post(`/api/v1/submissions/${normalSubmission.id}/anomaly/acknowledge`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ notes: "Test" });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("NOT_ANOMALY");
    });
  });

  describe("Disabled Anomaly Detection", () => {
    test("should not detect anomalies when disabled", async () => {
      const indicator = await prisma.indicator.create({
        data: {
            projectId,
            logframeNodeId: nodeId,
            name: "Disabled Anomaly Indicator",
            unit: "units",
            dataType: IndicatorDataType.NUMBER,
            anomalyConfig: {
              enabled: false,
            },
            createdByUserId: userId,
          },
      });

      const res = await request(app)
        .post(`/api/v1/indicators/${indicator.id}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: new Date().toISOString(),
          value: 999999,
        });

      expect(res.status).toBe(201);
      expect(res.body.isAnomaly).toBe(false);

      await prisma.submission.deleteMany({ where: { indicatorId: indicator.id } });
      await prisma.indicator.delete({ where: { id: indicator.id } });
    });
  });
});
