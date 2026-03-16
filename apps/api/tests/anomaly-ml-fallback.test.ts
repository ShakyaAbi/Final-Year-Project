import request from "supertest";
import { prisma } from "../src/prisma";
import { Role, IndicatorDataType } from "@prisma/client";

let app: any;

describe("ML fallback behavior", () => {
  let authToken: string;
  let projectId: number;
  let nodeId: number;
  let adminUserId: number;
  let fetchSpy: jest.SpyInstance;

  beforeAll(async () => {
    jest.resetModules();
    process.env.ML_SERVICE_URL = "http://ml.mock";
    process.env.ML_SERVICE_TIMEOUT_MS = "1500";

    fetchSpy = jest
      .spyOn(global as any, "fetch")
      .mockImplementation(async (url: string) => {
        if (url.endsWith("/health")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ status: "ok" }),
            text: async () => "",
          } as any;
        }
        if (url.endsWith("/score") || url.endsWith("/score/batch")) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ error: "simulated ML outage" }),
            text: async () => "simulated ML outage",
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

    const user = await prisma.user.create({
      data: {
        email: "anomaly-ml-fallback@test.com",
        passwordHash: "$2b$10$validhash",
        role: Role.ADMIN,
        name: "Fallback Tester",
      },
    });
    adminUserId = user.id;

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "anomaly-ml-fallback@test.com", password: "password123" });
    authToken = loginRes.body.token;

    const project = await prisma.project.create({
      data: { name: "ML Fallback Project", status: "ACTIVE" },
    });
    projectId = project.id;

    const node = await prisma.logframeNode.create({
      data: {
        projectId,
        type: "OUTPUT",
        title: "ML Fallback Node",
        sortOrder: 0,
      },
    });
    nodeId = node.id;
  }, 20000);

  afterAll(async () => {
    fetchSpy?.mockRestore();
    await prisma.submission.deleteMany();
    await prisma.indicator.deleteMany();
    await prisma.logframeNode.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { email: "anomaly-ml-fallback@test.com" } });
    await prisma.$disconnect();
  });

  test("uses rules fallback and persists ML_FALLBACK metadata when ML fails", async () => {
    const indicator = await prisma.indicator.create({
      data: {
        projectId,
        logframeNodeId: nodeId,
        name: "ML fallback enabled",
        unit: "units",
        dataType: IndicatorDataType.NUMBER,
        maxValue: 100,
        anomalyConfig: {
          enabled: true,
          mode: "ML",
          ml: { windowSize: 50, minPoints: 2, contamination: 0.05, seed: 42 },
          fallback: { useRulesOnServiceError: true },
        },
      },
    });

    await prisma.submission.createMany({
      data: [
        {
          indicatorId: indicator.id,
          reportedAt: new Date("2025-01-01"),
          value: "10",
          createdByUserId: adminUserId,
        },
        {
          indicatorId: indicator.id,
          reportedAt: new Date("2025-01-08"),
          value: "12",
          createdByUserId: adminUserId,
        },
      ],
    });

    const res = await request(app)
      .post(`/api/v1/indicators/${indicator.id}/submissions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ reportedAt: "2025-01-15", value: 200 });

    expect(res.status).toBe(201);
    expect(res.body.anomalyMethod).toBe("RULES_FALLBACK");
    expect(res.body.anomalyMeta?.mlValidation?.status).toBe("ML_FALLBACK");
    expect(res.body.anomalyMeta?.mlValidation?.fallbackUsed).toBe(true);
  });

  test("returns ML_UNAVAILABLE when fallback is disabled", async () => {
    const indicator = await prisma.indicator.create({
      data: {
        projectId,
        logframeNodeId: nodeId,
        name: "ML fallback disabled",
        unit: "units",
        dataType: IndicatorDataType.NUMBER,
        anomalyConfig: {
          enabled: true,
          mode: "ML",
          ml: { windowSize: 50, minPoints: 2, contamination: 0.05, seed: 42 },
          fallback: {
            useRulesOnServiceError: false,
            useRulesWhenInsufficientData: false,
          },
        },
      },
    });

    await prisma.submission.createMany({
      data: [
        {
          indicatorId: indicator.id,
          reportedAt: new Date("2025-02-01"),
          value: "10",
          createdByUserId: adminUserId,
        },
        {
          indicatorId: indicator.id,
          reportedAt: new Date("2025-02-08"),
          value: "12",
          createdByUserId: adminUserId,
        },
      ],
    });

    const res = await request(app)
      .post(`/api/v1/indicators/${indicator.id}/submissions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ reportedAt: "2025-02-15", value: 15 });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("ML_UNAVAILABLE");
  });

  test("reports ML health via /health/ml", async () => {
    const res = await request(app)
      .get("/api/v1/health/ml")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reachable).toBe(true);
    expect(res.body.checkedAt).toBeTruthy();
  });
});
