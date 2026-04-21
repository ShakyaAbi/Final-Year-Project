import request from "supertest";
import { prisma } from "../src/prisma";
import { Role, IndicatorDataType } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

let app: any;

describe("ML Anomaly Detection", () => {
  let authToken: string;
  let projectId: number;
  let nodeId: number;
  let indicatorId: number;
  let userId: number;
  let fetchSpy: jest.SpyInstance;

  // Helper: poll the submissions for an indicator until all have the expected anomalyMethod
  async function waitForSubmissionsMethod(
    indicatorId: number,
    expectedMethod: string,
    timeoutMs = 5000,
    intervalMs = 200
  ) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const subs = await prisma.submission.findMany({ where: { indicatorId } });
      if (subs.length > 0 && subs.every((s) => s.anomalyMethod === expectedMethod)) {
        return subs;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    // final fetch for clearer assertion errors
    return await prisma.submission.findMany({ where: { indicatorId } });
  }

  beforeAll(async () => {
    jest.resetModules();
    process.env.ML_SERVICE_URL = "http://ml.mock";
    process.env.ML_SERVICE_TIMEOUT_MS = "2000";

    fetchSpy = jest
      .spyOn(global, "fetch")
      .mockImplementation(async (url: any, init: any) => {
        // Mock ML service delay
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (url.endsWith("/score")) {
          const payload = JSON.parse(init?.body || "{}");
          const newValue = Number(payload.newValue ?? 0);
          const isAnomaly = newValue > 100;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              isAnomaly,
              score: isAnomaly ? 0.9 : 0.1,
              threshold: 0.5,
              method: "ISOLATION_FOREST",
              reason: isAnomaly
                ? "Isolation Forest score >= threshold"
                : "Within expected range",
              meta: { windowSize: 50, minPoints: 2, contamination: 0.05 },
            }),
            text: async () => "",
          } as any;
        }

        if (url.endsWith("/score/batch")) {
          const payload = JSON.parse(init?.body || "{}");
          const values = Array.isArray(payload.values) ? payload.values : [];
          const results = values.map((value: number) => ({
            isAnomaly: value > 100,
            score: value > 100 ? 0.9 : 0.1,
            threshold: 0.5,
            method: "ISOLATION_FOREST",
            reason:
              value > 100
                ? "Isolation Forest score >= threshold"
                : "Within expected range",
            meta: { windowSize: 50, minPoints: 2, contamination: 0.05 },
          }));
          return {
            ok: true,
            status: 200,
            json: async () => ({ results }),
            text: async () => "",
          } as any;
        }

        return {
          ok: false,
          status: 404,
          json: async () => ({}),
          text: async () => "not found",
        } as any;
      });

    app = (await import("../src/app")).default;

    const organization = await prisma.organization.create({
      data: {
        name: "ML Anomaly Org",
      },
    });

    const passwordHash = await hashPassword("password123");
    const user = await prisma.user.create({
      data: {
        email: "anomaly-ml@test.com",
        passwordHash,
        role: Role.ADMIN,
        name: "ML Tester",
        organization: { connect: { id: organization.id } },
      },
    });
    userId = user.id;

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "anomaly-ml@test.com", password: "password123" });
    authToken = loginRes.body.token;

    const project = await prisma.project.create({
      data: {
        name: "ML Anomaly Project",
        status: "ACTIVE",
        organization: { connect: { id: organization.id } },
      },
    });
    projectId = project.id;

    const node = await prisma.logframeNode.create({
      data: {
        projectId,
        type: "OUTPUT",
        title: "ML Output",
        sortOrder: 0,
      },
    });
    nodeId = node.id;

    const indicator = await prisma.indicator.create({
      data: {
        projectId,
        logframeNodeId: nodeId,
        name: "ML Indicator",
        unit: "units",
        dataType: IndicatorDataType.NUMBER,
        createdByUserId: user.id,
        anomalyConfig: {
          enabled: true,
          mode: "ML",
          ml: { windowSize: 50, minPoints: 2, contamination: 0.05, seed: 42 },
        },
      },
    });
    indicatorId = indicator.id;

    await prisma.submission.createMany({
      data: [
        {
          indicatorId,
          reportedAt: new Date("2024-01-01"),
          value: "10",
          createdByUserId: user.id,
        },
        {
          indicatorId,
          reportedAt: new Date("2024-01-08"),
          value: "12",
          createdByUserId: user.id,
        },
        {
          indicatorId,
          reportedAt: new Date("2024-01-15"),
          value: "200",
          createdByUserId: user.id,
        },
      ],
    });
  }, 20000);

  afterAll(async () => {
    fetchSpy?.mockRestore();
    await prisma.submission.deleteMany();
    await prisma.indicator.deleteMany();
    await prisma.logframeNode.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { email: "anomaly-ml@test.com" } });
    await prisma.organization.deleteMany({ where: { name: "ML Anomaly Org" } });
    await prisma.$disconnect();
  });

  test("should score anomaly using ML service", async () => {
    const res = await request(app)
      .post(`/api/v1/indicators/${indicatorId}/submissions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ reportedAt: "2024-01-22", value: 200 });

    expect(res.status).toBe(201);
    expect(res.body.isAnomaly).toBe(true);
    expect(res.body.anomalyScore).toBeDefined();
    expect(res.body.anomalyThreshold).toBeDefined();
    expect(res.body.anomalyMethod).toBe("ISOLATION_FOREST");
    expect(res.body.anomalyMeta?.mlValidation?.status).toBe("ML_OK");
  });

  test("should recalculate anomalies when indicator anomaly mode changes to ML", async () => {
    const ruleIndicator = await prisma.indicator.create({
      data: {
        projectId,
        logframeNodeId: nodeId,
        name: "Rule to ML Indicator",
        unit: "units",
        dataType: IndicatorDataType.NUMBER,
        createdByUserId: userId,
        anomalyConfig: {
          enabled: true,
          mode: "RULES",
          ml: { windowSize: 50, minPoints: 2, contamination: 0.05, seed: 42 },
        },
      },
    });

    await prisma.submission.createMany({
      data: [
        {
          indicatorId: ruleIndicator.id,
          reportedAt: new Date("2024-01-01"),
          value: "10",
          createdByUserId: userId,
        },
        {
          indicatorId: ruleIndicator.id,
          reportedAt: new Date("2024-01-08"),
          value: "20",
          createdByUserId: userId,
        },
        {
          indicatorId: ruleIndicator.id,
          reportedAt: new Date("2024-01-15"),
          value: "30",
          createdByUserId: userId,
        },
        {
          indicatorId: ruleIndicator.id,
          reportedAt: new Date("2024-01-22"),
          value: "40",
          createdByUserId: userId,
        },
        {
          indicatorId: ruleIndicator.id,
          reportedAt: new Date("2024-01-24"),
          value: "50",
          createdByUserId: userId,
        },
        {
          indicatorId: ruleIndicator.id,
          reportedAt: new Date("2024-01-29"),
          value: "150",
          createdByUserId: userId,
        },
      ],
    });

    const updateRes = await request(app)
      .patch(`/api/v1/indicators/${ruleIndicator.id}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        anomalyConfig: {
          enabled: true,
          mode: "ML",
          ml: { windowSize: 50, minPoints: 5, contamination: 0.05, seed: 42 },
        },
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.anomalyConfig.mode).toBe("ML");

    // Poll until the ML rescoring has updated submissions (background job may be async)
    const submissions = await waitForSubmissionsMethod(ruleIndicator.id, "ISOLATION_FOREST", 5000, 200);

    expect(submissions.length).toBeGreaterThan(0);
    expect(submissions.some((s) => s.anomalyMethod === "ISOLATION_FOREST")).toBe(true);
  });

  test("should recalculate anomalies for existing submissions", async () => {
    const res = await request(app)
      .post(`/api/v1/indicators/${indicatorId}/anomalies/recalculate`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Wait for async recalculation to complete and check submissions
    const submissions = await waitForSubmissionsMethod(indicatorId, "ISOLATION_FOREST", 5000, 200);
    // Order by reportedAt to preserve original expectations
    submissions.sort((a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime());

    expect(submissions).toHaveLength(4);
    expect(submissions[0].isAnomaly).toBe(false);
    expect(submissions[1].isAnomaly).toBe(false);
    expect(submissions[2].isAnomaly).toBe(true);
    expect(submissions[3].isAnomaly).toBe(true);
    expect(submissions[2].anomalyMethod).toBe("ISOLATION_FOREST");
    expect(submissions[3].anomalyMethod).toBe("ISOLATION_FOREST");
  });
});
