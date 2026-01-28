import request from "supertest";
import app from "../src/app";

describe("Disaggregated Categorical Indicators - District Reporting", () => {
  let authToken: string;
  let projectId: number;
  let logframeNodeId: number;
  let indicatorId: number;

  beforeAll(async () => {
    // Login to get auth token
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@gmail.com", password: "admin1234" });
    authToken = loginRes.body.token;

    // Create a test project
    const projectRes = await request(app)
      .post("/api/v1/projects")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "District Reporting Monitoring Project",
        description: "Track reporting compliance across 75 districts",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
    projectId = projectRes.body.id;

    // Create a logframe node (GOAL - root level)
    const logframeRes = await request(app)
      .post(`/api/v1/projects/${projectId}/logframe/nodes`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Data Reporting System",
        type: "GOAL",
      });

    if (logframeRes.status !== 201) {
      console.log(
        "Error creating logframe:",
        JSON.stringify(logframeRes.body, null, 2),
      );
    }

    logframeNodeId = logframeRes.body.id;
    console.log("Created logframeNodeId:", logframeNodeId);
  });

  it("should create a categorical indicator with disaggregation dimensions (75 districts)", async () => {
    // Generate 75 district names
    const districts = Array.from({ length: 75 }, (_, i) => `District${i + 1}`);

    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/indicators`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        logframeNodeId,
        name: "District Monthly Reporting Status",
        unit: "status",
        dataType: "CATEGORICAL",
        categories: [
          { id: "reported", label: "Reported", color: "#22c55e" },
          { id: "not_reported", label: "Not Reported", color: "#ef4444" },
          { id: "partial", label: "Partially Reported", color: "#f59e0b" },
          { id: "verified", label: "Verified", color: "#3b82f6" },
        ],
        baselineCategory: "not_reported",
        targetCategory: "verified",
        categoryConfig: {
          allowMultiple: false,
          required: true,
          disaggregationDimensions: [
            {
              key: "district",
              label: "District",
              values: districts,
              required: true,
            },
          ],
          reportingFrequency: "MONTHLY",
          expectedReportingEntities: 75,
        },
        anomalyConfig: null,
      });

    if (res.status !== 201) {
      console.log(
        "Error creating indicator:",
        JSON.stringify(res.body, null, 2),
      );
    }

    expect(res.status).toBe(201);
    expect(res.body.categoryConfig.disaggregationDimensions).toHaveLength(1);
    expect(
      res.body.categoryConfig.disaggregationDimensions[0].values,
    ).toHaveLength(75);
    expect(res.body.categoryConfig.expectedReportingEntities).toBe(75);

    indicatorId = res.body.id;
    console.log("Created indicator ID:", indicatorId);
  });

  it("should create disaggregated submissions for multiple districts", async () => {
    const submissions = [
      // January 2024 reporting
      { district: "District1", status: "reported", date: "2024-01-31" },
      { district: "District2", status: "reported", date: "2024-01-31" },
      { district: "District3", status: "partial", date: "2024-01-31" },
      { district: "District4", status: "not_reported", date: "2024-01-31" },
      { district: "District5", status: "verified", date: "2024-01-31" },
      { district: "District6", status: "reported", date: "2024-01-31" },
      { district: "District7", status: "not_reported", date: "2024-01-31" },
      { district: "District8", status: "partial", date: "2024-01-31" },
      { district: "District9", status: "reported", date: "2024-01-31" },
      { district: "District10", status: "verified", date: "2024-01-31" },
    ];

    for (const sub of submissions) {
      const res = await request(app)
        .post(`/api/v1/indicators/${indicatorId}/submissions`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          reportedAt: sub.date,
          value: sub.status,
          disaggregationKey: sub.district,
          evidence: `Report from ${sub.district}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.disaggregationKey).toBe(sub.district);
      expect(res.body.value).toBe(sub.status);
    }
  });

  it("should validate disaggregation key against defined dimensions", async () => {
    const res = await request(app)
      .post(`/api/v1/indicators/${indicatorId}/submissions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        reportedAt: "2024-01-31",
        value: "reported",
        disaggregationKey: "InvalidDistrict", // Not in the list
        evidence: "Test",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_DISAGGREGATION_VALUE");
  });

  it("should require disaggregation key when dimension is required", async () => {
    const res = await request(app)
      .post(`/api/v1/indicators/${indicatorId}/submissions`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        reportedAt: "2024-01-31",
        value: "reported",
        // Missing disaggregationKey
        evidence: "Test",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("MISSING_DISAGGREGATION");
  });

  it("should get disaggregated category statistics", async () => {
    console.log("Indicator ID for stats:", indicatorId);

    const res = await request(app)
      .get(`/api/v1/indicators/${indicatorId}/disaggregated-stats`)
      .set("Authorization", `Bearer ${authToken}`);

    if (res.status !== 200) {
      console.log(
        "Error getting disaggregated stats:",
        JSON.stringify(res.body, null, 2),
      );
    }

    expect(res.status).toBe(200);
    expect(res.body.disaggregatedStats).toBeDefined();
    expect(Array.isArray(res.body.disaggregatedStats)).toBe(true);

    // Check that we have stats for each district
    const districtStats = res.body.disaggregatedStats;
    expect(districtStats.length).toBeGreaterThan(0);

    // Check structure of disaggregated stats
    districtStats.forEach((stat: any) => {
      expect(stat).toHaveProperty("disaggregationKey");
      expect(stat).toHaveProperty("categoryDistribution");
      expect(stat).toHaveProperty("totalSubmissions");
      expect(stat).toHaveProperty("lastReportedAt");
      expect(Array.isArray(stat.categoryDistribution)).toBe(true);
    });

    // Verify category distribution for a specific district
    const district1Stats = districtStats.find(
      (s: any) => s.disaggregationKey === "District1",
    );
    expect(district1Stats).toBeDefined();
    expect(district1Stats.totalSubmissions).toBe(1);

    const reportedCategory = district1Stats.categoryDistribution.find(
      (c: any) => c.categoryId === "reported",
    );
    expect(reportedCategory.count).toBe(1);
  });

  it("should show overall category distribution across all districts", async () => {
    const res = await request(app)
      .get(`/api/v1/indicators/${indicatorId}/category-distribution`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.distribution).toBeDefined();
    expect(Array.isArray(res.body.distribution)).toBe(true);

    // Check that we have distribution for all categories
    const distribution = res.body.distribution;
    expect(distribution).toHaveLength(4); // 4 categories defined

    // Verify counts
    const reportedCount =
      distribution.find((d: any) => d.categoryId === "reported")?.count || 0;
    const notReportedCount =
      distribution.find((d: any) => d.categoryId === "not_reported")?.count ||
      0;
    const partialCount =
      distribution.find((d: any) => d.categoryId === "partial")?.count || 0;
    const verifiedCount =
      distribution.find((d: any) => d.categoryId === "verified")?.count || 0;

    expect(reportedCount).toBe(3); // District1, District2, District6, District9
    expect(notReportedCount).toBe(2); // District4, District7
    expect(partialCount).toBe(2); // District3, District8
    expect(verifiedCount).toBe(2); // District5, District10
  });

  it("should generate disaggregated CSV import template", async () => {
    const res = await request(app)
      .get(`/api/v1/indicators/${indicatorId}/templates`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.importTemplates).toHaveLength(1);

    const template = res.body.importTemplates[0];
    const columns = template.columnMapping.columns;

    // Should have disaggregation column first
    expect(columns[0].csvHeader).toBe("District");
    expect(columns[0].fieldName).toBe("disaggregationKey");
    expect(columns[0].dataType).toBe("text");
    expect(columns[0].required).toBe(true);

    // Then date column
    expect(columns[1].csvHeader).toBe("Date");
    expect(columns[1].fieldName).toBe("reportedAt");

    // Then category column
    const categoryColumn = columns.find((c: any) => c.fieldName === "value");
    expect(categoryColumn).toBeDefined();
    expect(categoryColumn.csvHeader).toBe("Category");
    expect(categoryColumn.dataType).toBe("category");
  });

  it("should calculate reporting compliance rate", async () => {
    const res = await request(app)
      .get(`/api/v1/indicators/${indicatorId}/disaggregated-stats`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);

    const totalDistricts =
      res.body.indicator.categoryConfig.expectedReportingEntities;
    const reportedDistricts = res.body.disaggregatedStats.length;
    const complianceRate = (reportedDistricts / totalDistricts) * 100;

    expect(totalDistricts).toBe(75);
    expect(reportedDistricts).toBe(10); // We created 10 submissions
    expect(complianceRate).toBeCloseTo(13.33, 1);

    console.log(`\nReporting Compliance:`);
    console.log(`Expected: ${totalDistricts} districts`);
    console.log(`Reported: ${reportedDistricts} districts`);
    console.log(`Compliance Rate: ${complianceRate.toFixed(2)}%`);
  });
});
