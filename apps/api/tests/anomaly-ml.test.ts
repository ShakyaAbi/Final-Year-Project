import request from "supertest";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { prisma } from "../src/prisma";
import { Role, IndicatorDataType } from "@prisma/client";

let app: any;

describe("ML Anomaly Detection", () => {
  let server: ReturnType<typeof createServer>;
  let serverUrl: string;
  let authToken: string;
  let projectId: number;
  let nodeId: number;
  let indicatorId: number;

  beforeAll(async () => {
    jest.resetModules();
    server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.method === "POST" && req.url === "/score") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          const payload = JSON.parse(body || "{}");
          const newValue = Number(payload.newValue ?? 0);
          const isAnomaly = newValue > 100;
          const response = {
            isAnomaly,
            score: isAnomaly ? 0.9 : 0.1,
            threshold: 0.5,
            method: "ISOLATION_FOREST",
            reason: isAnomaly
              ? "Isolation Forest score >= threshold"
              : "Within expected range",
            meta: { windowSize: 50, minPoints: 2, contamination: 0.05 },
          };
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response));
        });
        return;
      }

      if (req.method === "POST" && req.url === "/score/batch") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          const payload = JSON.parse(body || "{}");
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
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ results }));
        });
        return;
      }

      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address && typeof address !== "string") {
          serverUrl = `http://127.0.0.1:${address.port}`;
          process.env.ML_SERVICE_URL = serverUrl;
          process.env.ML_SERVICE_TIMEOUT_MS = "2000";
        }
        resolve();
      });
    });

    app = (await import("../src/app")).default;

    const user = await prisma.user.create({
      data: {
        email: "anomaly-ml@test.com",
        passwordHash: "$2b$10$validhash",
        role: Role.ADMIN,
        name: "ML Tester",
      },
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "anomaly-ml@test.com", password: "password123" });
    authToken = loginRes.body.token;

    const project = await prisma.project.create({
      data: {
        name: "ML Anomaly Project",
        status: "ACTIVE",
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
      ],
    });
  });

  afterAll(async () => {
    await prisma.submission.deleteMany();
    await prisma.indicator.deleteMany();
    await prisma.logframeNode.deleteMany();
    await prisma.project.deleteMany();
    await prisma.user.deleteMany({ where: { email: "anomaly-ml@test.com" } });
    await prisma.$disconnect();
    server.close();
  });

  test("should score anomaly using ML service", async () => {
    const res = await request(app)
      .post(`/api/indicators/${indicatorId}/submissions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ reportedAt: "2024-01-15", value: 200 });

    expect(res.status).toBe(201);
    expect(res.body.isAnomaly).toBe(true);
    expect(res.body.anomalyScore).toBeDefined();
    expect(res.body.anomalyThreshold).toBeDefined();
    expect(res.body.anomalyMethod).toBe("ISOLATION_FOREST");
  });
});
