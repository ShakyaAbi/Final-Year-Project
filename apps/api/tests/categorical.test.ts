import request from "supertest";
import app from "../src/app";

describe("Categorical Indicators", () => {
  let authToken: string;
  let projectId: number;
  let categoricalIndicatorId: number;

  beforeAll(async () => {
    // Login as admin
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@gmail.com", password: "admin1234" });

    authToken = loginRes.body.token;

    // Create a test project
    const projectRes = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Categorical Test Project",
        description: "Testing categorical indicators",
        status: "ACTIVE",
      });

    projectId = projectRes.body.id;
  });

  describe("Creating Categorical Indicators", () => {
    it("should create a categorical indicator with valid categories", async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/indicators`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          logframeNodeId: 1,
          name: "Project Status",
          unit: "status",
          dataType: "CATEGORICAL",
          categories: [
            { id: "planning", label: "Planning", color: "#blue" },
            { id: "implementation", label: "Implementation", color: "#yellow" },
            { id: "completed", label: "Completed", color: "#green" },
          ],
          categoryConfig: {
            allowMultiple: false,
            required: true,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.dataType).toBe("CATEGORICAL");
      expect(res.body.categories).toHaveLength(3);
      expect(res.body.categoryConfig.allowMultiple).toBe(false);
      categoricalIndicatorId = res.body.id;
    });

    it("should reject categorical indicator without categories", async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/indicators`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          logframeNodeId: 1,
          name: "Invalid Categorical",
          unit: "status",
          dataType: "CATEGORICAL",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MISSING_CATEGORIES");
    });

    it("should reject duplicate category IDs", async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/indicators`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          logframeNodeId: 1,
          name: "Invalid Categories",
          unit: "status",
          dataType: "CATEGORICAL",
          categories: [
            { id: "status1", label: "Status 1" },
            { id: "status1", label: "Status 1 Duplicate" },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("DUPLICATE_CATEGORY_ID");
    });
  });

  describe("Submitting Categorical Values", () => {
    it("should accept valid category value", async () => {
      const res = await request(app)
        .post(`/api/v1/indicators/${categoricalIndicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: new Date().toISOString(),
          value: "planning",
        });

      expect(res.status).toBe(201);
      expect(res.body.value).toBe("planning");
    });

    it("should reject invalid category ID", async () => {
      const res = await request(app)
        .post(`/api/v1/indicators/${categoricalIndicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: new Date().toISOString(),
          value: "invalid_status",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_CATEGORY_VALUE");
    });

    it("should reject multiple selections when not allowed", async () => {
      const res = await request(app)
        .post(`/api/v1/indicators/${categoricalIndicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: new Date().toISOString(),
          value: "planning,implementation",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("MULTIPLE_NOT_ALLOWED");
    });
  });

  describe("Categorical Statistics", () => {
    let multiSelectIndicatorId: number;

    beforeAll(async () => {
      // Create indicator that allows multiple selections
      const indicatorRes = await request(app)
        .post(`/api/v1/projects/${projectId}/indicators`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          logframeNodeId: 1,
          name: "Project Challenges",
          unit: "challenges",
          dataType: "CATEGORICAL",
          categories: [
            { id: "funding", label: "Funding Issues" },
            { id: "staffing", label: "Staffing Issues" },
            { id: "logistics", label: "Logistics Issues" },
            { id: "weather", label: "Weather Issues" },
          ],
          categoryConfig: {
            allowMultiple: true,
            maxSelections: 3,
          },
        });

      multiSelectIndicatorId = indicatorRes.body.id;

      // Submit some data
      await request(app)
        .post(`/api/v1/indicators/${multiSelectIndicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ reportedAt: "2026-01-01", value: "funding,staffing" });

      await request(app)
        .post(`/api/v1/indicators/${multiSelectIndicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ reportedAt: "2026-01-02", value: "funding" });

      await request(app)
        .post(`/api/v1/indicators/${multiSelectIndicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ reportedAt: "2026-01-03", value: "logistics,weather" });
    });

    it("should return category distribution", async () => {
      const res = await request(app)
        .get(
          `/api/v1/indicators/${multiSelectIndicatorId}/category-distribution`
        )
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.distribution).toBeDefined();
      expect(Array.isArray(res.body.distribution)).toBe(true);

      const fundingStats = res.body.distribution.find(
        (d: any) => d.categoryId === "funding"
      );
      expect(fundingStats.count).toBe(2); // Selected in 2 submissions
      expect(fundingStats.percentage).toBeGreaterThan(0);
    });

    it("should identify most frequent category", async () => {
      const res = await request(app)
        .get(
          `/api/v1/indicators/${multiSelectIndicatorId}/category-distribution`
        )
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.mostFrequent).toBeDefined();
      expect(res.body.mostFrequent.categoryId).toBe("funding");
      expect(res.body.mostFrequent.count).toBe(2);
    });

    it("should include stats in indicator stats endpoint", async () => {
      const res = await request(app)
        .get(`/api/v1/indicators/${multiSelectIndicatorId}/stats`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats.categoryDistribution).toBeDefined();
      expect(res.body.stats.mostFrequent).toBeDefined();
      expect(res.body.stats.submissionCount).toBe(3);
    });

    it("should reject category-distribution for non-categorical indicators", async () => {
      // Create a numeric indicator
      const numericRes = await request(app)
        .post(`/api/v1/projects/${projectId}/indicators`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          logframeNodeId: 1,
          name: "Numeric Indicator",
          unit: "count",
          dataType: "NUMBER",
        });

      const res = await request(app)
        .get(`/api/v1/indicators/${numericRes.body.id}/category-distribution`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("NOT_CATEGORICAL");
    });
  });

  describe("Updating Categorical Indicators", () => {
    it("should allow updating category config", async () => {
      const res = await request(app)
        .patch(`/api/v1/indicators/${categoricalIndicatorId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryConfig: {
            allowMultiple: true,
            maxSelections: 2,
            required: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.categoryConfig.allowMultiple).toBe(true);
      expect(res.body.categoryConfig.maxSelections).toBe(2);
    });

    it("should allow adding new categories", async () => {
      const res = await request(app)
        .patch(`/api/v1/indicators/${categoricalIndicatorId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categories: [
            { id: "planning", label: "Planning", color: "#blue" },
            { id: "implementation", label: "Implementation", color: "#yellow" },
            { id: "completed", label: "Completed", color: "#green" },
            { id: "on-hold", label: "On Hold", color: "#red" },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.categories).toHaveLength(4);
    });
  });
});
