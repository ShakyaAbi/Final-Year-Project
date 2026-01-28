import request from "supertest";
import app from "../src/app";

describe("Template Auto-Creation", () => {
  let authToken: string;
  let projectId: number;
  let logframeNodeId: number;

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
        name: "Template Test Project",
        description: "For testing auto-template creation",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
    projectId = projectRes.body.id;

    // Create a logframe node (output)
    const logframeRes = await request(app)
      .post(`/api/v1/projects/${projectId}/logframe/nodes`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Test Output",
        type: "OUTPUT",
      });

    if (logframeRes.status !== 201) {
      console.log(
        "Error creating logframe:",
        JSON.stringify(logframeRes.body, null, 2),
      );
    }

    logframeNodeId = logframeRes.body.id;
  });

  it("should auto-create import and export templates for NUMBER indicator", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/indicators`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        logframeNodeId,
        name: "Number Indicator",
        unit: "count",
        dataType: "NUMBER",
        baselineValue: 0,
        targetValue: 100,
        anomalyConfig: null,
        categoryConfig: null,
      });

    if (res.status !== 201) {
      console.log(
        "Error creating NUMBER indicator:",
        JSON.stringify(res.body, null, 2),
      );
    }

    expect(res.status).toBe(201);
    const indicatorId = res.body.id;

    // Check that templates were created
    const templatesRes = await request(app)
      .get(`/api/v1/indicators/${indicatorId}/templates`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(templatesRes.status).toBe(200);
    expect(templatesRes.body.importTemplates).toHaveLength(1);
    expect(templatesRes.body.exportTemplates).toHaveLength(1);

    const importTemplate = templatesRes.body.importTemplates[0];
    expect(importTemplate.name).toBe("Default Import Template");
    expect(importTemplate.isDefault).toBe(true);
  });

  it("should auto-create templates for CATEGORICAL indicator", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/indicators`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        logframeNodeId,
        name: "Category Indicator",
        unit: "status",
        dataType: "CATEGORICAL",
        categories: [
          { id: "low", label: "Low", color: "#green" },
          { id: "high", label: "High", color: "#red" },
        ],
        baselineCategory: "low",
        targetCategory: "high",
        anomalyConfig: null,
        categoryConfig: null,
      });

    if (res.status !== 201) {
      console.log(
        "Error creating CATEGORICAL indicator:",
        JSON.stringify(res.body, null, 2),
      );
    }

    expect(res.status).toBe(201);
    const indicatorId = res.body.id;

    const templatesRes = await request(app)
      .get(`/api/v1/indicators/${indicatorId}/templates`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(templatesRes.status).toBe(200);

    const importTemplate = templatesRes.body.importTemplates[0];
    const categoryColumn = importTemplate.columnMapping.columns.find(
      (col: any) => col.fieldName === "value",
    );

    expect(categoryColumn.csvHeader).toBe("Category");
    expect(categoryColumn.dataType).toBe("category");
    expect(categoryColumn.transform.categoryMapping).toBeDefined();
  });

  it("should auto-create templates for BOOLEAN indicator", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/indicators`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        logframeNodeId,
        name: "Boolean Indicator",
        unit: "yes/no",
        dataType: "BOOLEAN",
        baselineValue: 0,
        targetValue: 1,
      });

    expect(res.status).toBe(201);
    const indicatorId = res.body.id;

    const templatesRes = await request(app)
      .get(`/api/v1/indicators/${indicatorId}/templates`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(templatesRes.status).toBe(200);

    const importTemplate = templatesRes.body.importTemplates[0];
    const valueColumn = importTemplate.columnMapping.columns.find(
      (col: any) => col.fieldName === "value",
    );

    expect(valueColumn.dataType).toBe("boolean");
    expect(valueColumn.transform.booleanValues).toBeDefined();
  });

  it("should auto-create templates for TEXT indicator", async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/indicators`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        logframeNodeId,
        name: "Text Indicator",
        unit: "text",
        dataType: "TEXT",
      });

    expect(res.status).toBe(201);
    const indicatorId = res.body.id;

    const templatesRes = await request(app)
      .get(`/api/v1/indicators/${indicatorId}/templates`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(templatesRes.status).toBe(200);

    const importTemplate = templatesRes.body.importTemplates[0];
    const valueColumn = importTemplate.columnMapping.columns.find(
      (col: any) => col.fieldName === "value",
    );

    expect(valueColumn.dataType).toBe("text");
    expect(valueColumn.transform.maxLength).toBe(1000);
  });
});
