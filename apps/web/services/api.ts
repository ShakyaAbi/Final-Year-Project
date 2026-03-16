import {
  ActivityLog,
  Indicator,
  IndicatorType,
  IndicatorValue,
  LogframeNode,
  NodeType,
  Project,
  ProjectStats,
  CurrentUser,
} from "../types";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1";
const tokenKey = "merlin_token";

const getToken = () => localStorage.getItem(tokenKey);
const setToken = (token: string) => localStorage.setItem(tokenKey, token);

type RequestOptions = {
  method?: string;
  body?: any;
};

const request = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const isFormData = options.body instanceof FormData;
  if (isFormData) {
    // Let the browser set the boundary for multipart/form-data
    delete headers["Content-Type"];
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  });

  if (!res.ok) {
    if (res.status === 401 || (res.status === 404 && path === "/auth/me")) {
      localStorage.removeItem(tokenKey);
      window.location.href = "/";
    }
    const data = await res.json().catch(() => ({}));
    const message = data?.error?.message || res.statusText;
    throw new Error(message);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
};

const mapStatus = (status?: string): Project["status"] => {
  switch (status) {
    case "ACTIVE":
    case "Active":
      return "Active";
    case "DRAFT":
    case "Draft":
      return "Draft";
    case "ARCHIVED":
    case "Archived":
      return "Archived";
    case "COMPLETED":
    case "Completed":
      return "Completed";
    default:
      return "Draft";
  }
};

const mapNodeType = (type?: string): NodeType => {
  switch (type) {
    case "GOAL":
      return NodeType.GOAL;
    case "OUTCOME":
      return NodeType.OUTCOME;
    case "OUTPUT":
      return NodeType.OUTPUT;
    case "ACTIVITY":
      return NodeType.ACTIVITY;
    default:
      return NodeType.GOAL;
  }
};

const mapLogframeNode = (node: any): LogframeNode => ({
  id: String(node.id),
  type: mapNodeType(node.type),
  title: node.title ?? "",
  description: node.description ?? undefined,
  children: Array.isArray(node.children)
    ? node.children.map(mapLogframeNode)
    : [],
  indicatorCount: node.indicatorCount ?? undefined,
});

const mapProject = (p: any, logframe: LogframeNode[] = []): Project => ({
  id: String(p.id),
  name: p.name ?? "",
  description: p.description ?? "",
  startDate: p.startDate ? new Date(p.startDate).toISOString() : "",
  endDate: p.endDate ? new Date(p.endDate).toISOString() : "",
  status: mapStatus(p.status),
  sectors: Array.isArray(p.sectors) ? p.sectors.map(String) : [],
  location: p.location ?? undefined,
  donor: p.donor ?? undefined,
  budgetAmount: p.budgetAmount ?? undefined,
  budgetCurrency: p.budgetCurrency ?? undefined,
  logframe,
});

const mapIndicatorType = (dataType?: string, unit?: string): IndicatorType => {
  switch (dataType) {
    case "PERCENT":
      return IndicatorType.PERCENTAGE;
    case "BOOLEAN":
      return IndicatorType.BOOLEAN;
    case "CATEGORICAL":
      return IndicatorType.CATEGORICAL;
    case "NUMBER":
      return unit === "USD" || unit === "usd"
        ? IndicatorType.CURRENCY
        : IndicatorType.NUMBER;
    case "TEXT":
      return IndicatorType.TEXT;
    default:
      if (unit === "%" || unit === "percent") return IndicatorType.PERCENTAGE;
      return IndicatorType.NUMBER;
  }
};

const mapIndicatorValue = (v: any, type: IndicatorType): IndicatorValue => {
  const isNumericType =
    type === IndicatorType.NUMBER ||
    type === IndicatorType.PERCENTAGE ||
    type === IndicatorType.CURRENCY;
  const parsedValue = isNumericType ? Number(v.value) : v.value;
  const isAnomaly = v.isAnomaly === true;
  const rawCategoryValue =
    v.categoryValue ??
    (type === IndicatorType.CATEGORICAL &&
    typeof v.value === "string" &&
    !Number.isFinite(Number(v.value))
      ? v.value
      : undefined);
  return {
    id: String(v.id),
    indicatorId: v.indicatorId ? String(v.indicatorId) : undefined,
    date: v.reportedAt ? new Date(v.reportedAt).toISOString() : "",
    value: Number.isFinite(parsedValue) ? parsedValue : v.value,
    categoryValue: rawCategoryValue ?? undefined,
    isAnomaly,
    anomalyReason: isAnomaly ? (v.anomalyReason ?? undefined) : undefined,
    anomalyScore: v.anomalyScore ?? undefined,
    anomalyThreshold: v.anomalyThreshold ?? undefined,
    anomalyMethod: v.anomalyMethod ?? undefined,
    anomalyMeta: v.anomalyMeta ?? undefined,
    evidence: v.evidence ?? undefined,
    createdByUserId: v.createdByUserId ? String(v.createdByUserId) : undefined,
    createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : undefined,
    deletedAt: v.deletedAt ? new Date(v.deletedAt).toISOString() : undefined,
    deletedByUserId: v.deletedByUserId ? String(v.deletedByUserId) : undefined,
    updatedAt: v.updatedAt ? new Date(v.updatedAt).toISOString() : undefined,
    updatedByUserId: v.updatedByUserId ? String(v.updatedByUserId) : undefined,
    disaggregationKey: v.disaggregationKey ?? undefined,
  };
};

const mapIndicator = (
  indicator: any,
  values: IndicatorValue[] = [],
): Indicator => {
  const type = mapIndicatorType(indicator.dataType, indicator.unit);
  const isText = type === IndicatorType.TEXT;
  const isCategorical = type === IndicatorType.CATEGORICAL;
  const reportingFrequency =
    indicator.validationConfig?.reportingFrequency ||
    indicator.frequency ||
    "WEEKLY";
  return {
    id: String(indicator.id),
    projectId: String(indicator.projectId),
    nodeId: String(indicator.logframeNodeId),
    name: indicator.name ?? "",
    description: indicator.description ?? undefined,
    status: indicator.status ?? "Active",
    code: indicator.code ?? undefined,
    type,
    target: isCategorical
      ? (indicator.targetCategory ?? "")
      : indicator.targetValue ?? (isText ? "" : 0),
    baseline: isCategorical
      ? (indicator.baselineCategory ?? "")
      : indicator.baselineValue ?? (isText ? "" : 0),
    baselineCategory: indicator.baselineCategory ?? undefined,
    targetCategory: indicator.targetCategory ?? undefined,
    minExpected: indicator.minValue ?? undefined,
    maxExpected: indicator.maxValue ?? undefined,
    anomalyConfig: indicator.anomalyConfig ?? undefined,
    unit: indicator.unit ?? undefined,
    decimals: indicator.decimals ?? undefined,
    categories: indicator.categories ?? undefined,
    categoryConfig: indicator.categoryConfig ?? undefined,
    frequency:
      reportingFrequency === "DAILY"
        ? "Daily"
        : reportingFrequency === "WEEKLY"
          ? "Weekly"
          : "Monthly",
    currentVersion: indicator.currentVersion ?? 1,
    versions: Array.isArray(indicator.versions) ? indicator.versions : [],
    values,
  };
};

const mapCurrentUser = (user: any): CurrentUser => ({
  id: String(user.id),
  email: user.email ?? "",
  role: user.role ?? "",
  createdAt: user.createdAt
    ? new Date(user.createdAt).toISOString()
    : undefined,
});

const toReportingFrequency = (value?: Indicator["frequency"]) =>
  value === "Daily" ? "DAILY" : "WEEKLY";

const normalizeDisaggregationDimensionKey = (value: any, fallbackLabel?: any) => {
  const raw = String(value ?? "").trim() || String(fallbackLabel ?? "").trim();
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const normalizeCategoryConfigForApi = (categoryConfig?: any | null) => {
  if (!categoryConfig) return categoryConfig ?? null;
  const dims = Array.isArray(categoryConfig.disaggregationDimensions)
    ? categoryConfig.disaggregationDimensions
        .map((dim: any) => {
          const label = String(dim?.label ?? "").trim();
          const key = normalizeDisaggregationDimensionKey(dim?.key, label);
          const values = Array.isArray(dim?.values)
            ? dim.values
                .map((v: any) => String(v).trim())
                .filter((v: string) => v.length > 0)
            : [];

          return {
            ...dim,
            key,
            label,
            values,
            required: typeof dim?.required === "boolean" ? dim.required : false,
          };
        })
        .filter(
          (dim: any) =>
            dim.key.length > 0 || dim.label.length > 0 || dim.values.length > 0,
        )
    : undefined;

  return {
    ...categoryConfig,
    disaggregationDimensions: dims,
  };
};

const getProjectLogframe = async (id: string): Promise<LogframeNode[]> => {
  const tree = await request<any[]>(`/projects/${id}/logframe/tree`);
  return tree.map(mapLogframeNode);
};

export const api = {
  login: async (email: string, password: string) => {
    const result = await request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(result.token);
    return result;
  },
  me: async (): Promise<CurrentUser> => {
    const user = await request("/auth/me");
    return mapCurrentUser(user);
  },
  getProjects: async (): Promise<Project[]> => {
    const projects = await request<any[]>("/projects");
    return projects.map((project) => mapProject(project));
  },
  getProject: async (id: string): Promise<Project> => {
    const project = await request<any>(`/projects/${id}`);
    const logframe = await getProjectLogframe(id).catch(() => []);
    return mapProject(project, logframe);
  },
  deleteProject: async (id: string): Promise<Project> => {
    const project = await request<any>(`/projects/${id}`, { method: "DELETE" });
    return mapProject(project);
  },
  createProject: async (payload: Partial<Project>): Promise<Project> => {
    const created = await request<any>("/projects", {
      method: "POST",
      body: {
        name: payload.name,
        description: payload.description,
        status: payload.status ? payload.status.toUpperCase() : undefined,
        startDate: payload.startDate,
        endDate: payload.endDate,
        sectors: payload.sectors,
        location: payload.location,
        donor: payload.donor,
        budgetAmount: payload.budgetAmount,
        budgetCurrency: payload.budgetCurrency,
      },
    });
    return mapProject(created);
  },
  updateProject: async (
    id: string,
    payload: Partial<Project>,
  ): Promise<Project> => {
    const updated = await request<any>(`/projects/${id}`, {
      method: "PATCH",
      body: {
        name: payload.name,
        description: payload.description,
        status: payload.status ? payload.status.toUpperCase() : undefined,
        startDate: payload.startDate,
        endDate: payload.endDate,
        sectors: payload.sectors,
        location: payload.location,
        donor: payload.donor,
        budgetAmount: payload.budgetAmount,
        budgetCurrency: payload.budgetCurrency,
      },
    });
    return mapProject(updated);
  },
  getIndicators: async (projectId: string): Promise<Indicator[]> => {
    const indicators = await request<any[]>(
      `/projects/${projectId}/indicators`,
    );
    return indicators.map((indicator) => mapIndicator(indicator));
  },
  getIndicator: async (id: string): Promise<Indicator> => {
    const indicator = await request<any>(`/indicators/${id}`);
    return mapIndicator(indicator);
  },
  getIndicatorSubmissions: async (
    indicatorId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<IndicatorValue[]> => {
    const params = new URLSearchParams();
    if (options?.includeDeleted) params.set("includeDeleted", "true");
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const submissions = await request<any[]>(
      `/indicators/${indicatorId}/submissions${suffix}`,
    );
    const indicator = await request<any>(`/indicators/${indicatorId}`);
    const type = mapIndicatorType(indicator.dataType, indicator.unit);
    return submissions.map((submission) => mapIndicatorValue(submission, type));
  },
  createIndicator: async (
    projectId: string,
    payload: Partial<Indicator>,
  ): Promise<Indicator> => {
    const dataType =
      payload.type === IndicatorType.PERCENTAGE
        ? "PERCENT"
        : payload.type === IndicatorType.BOOLEAN
          ? "BOOLEAN"
          : payload.type === IndicatorType.TEXT
            ? "TEXT"
            : payload.type === IndicatorType.CATEGORICAL
              ? "CATEGORICAL"
              : "NUMBER";
    const isNumeric =
      payload.type === IndicatorType.NUMBER ||
      payload.type === IndicatorType.PERCENTAGE ||
      payload.type === IndicatorType.CURRENCY;
    const isCategorical = payload.type === IndicatorType.CATEGORICAL;
    const unit =
      payload.unit ||
      (payload.type === IndicatorType.BOOLEAN
        ? "yes/no"
        : payload.type === IndicatorType.TEXT
          ? "text"
          : payload.type === IndicatorType.CATEGORICAL
            ? "category"
            : "unit");

    // For numeric indicators: use baselineValue/targetValue
    // For categorical indicators: use baselineCategory/targetCategory
    const baselineValue =
      isNumeric && payload.baseline !== undefined
        ? Number(payload.baseline)
        : null;
    const targetValue =
      isNumeric && payload.target !== undefined ? Number(payload.target) : null;
    const baselineCategory =
      isCategorical && payload.baseline !== undefined
        ? String(payload.baseline)
        : null;
    const targetCategory =
      isCategorical && payload.target !== undefined
        ? String(payload.target)
        : null;

    const created = await request<any>(`/projects/${projectId}/indicators`, {
      method: "POST",
      body: {
        logframeNodeId: Number(payload.nodeId),
        name: payload.name,
        unit,
        baselineValue,
        targetValue,
        baselineCategory,
        targetCategory,
        dataType,
        minValue: payload.minExpected ?? null,
        maxValue: payload.maxExpected ?? null,
        anomalyConfig: payload.anomalyConfig ?? null,
        reportingFrequency: toReportingFrequency(payload.frequency),
        categories: payload.categories ?? null,
        categoryConfig: normalizeCategoryConfigForApi(payload.categoryConfig),
        // Reminder fields
        reminderEnabled: payload.reminderEnabled ?? false,
        reminderDaysBeforeDue: payload.reminderDaysBeforeDue ?? null,
        reminderDaysAfterDue: payload.reminderDaysAfterDue ?? null,
        reminderRecipients: payload.reminderRecipients ?? null,
      },
    });
    return mapIndicator(created);
  },
  updateIndicator: async (
    indicatorId: string,
    payload: Partial<Indicator>,
  ): Promise<Indicator> => {
    const dataType =
      payload.type === IndicatorType.PERCENTAGE
        ? "PERCENT"
        : payload.type === IndicatorType.BOOLEAN
          ? "BOOLEAN"
          : payload.type === IndicatorType.TEXT
            ? "TEXT"
            : payload.type === IndicatorType.CATEGORICAL
              ? "CATEGORICAL"
              : "NUMBER";
    const isNumeric =
      payload.type === IndicatorType.NUMBER ||
      payload.type === IndicatorType.PERCENTAGE ||
      payload.type === IndicatorType.CURRENCY;
    const isCategorical = payload.type === IndicatorType.CATEGORICAL;
    const unit =
      payload.unit ||
      (payload.type === IndicatorType.BOOLEAN
        ? "yes/no"
        : payload.type === IndicatorType.TEXT
          ? "text"
          : payload.type === IndicatorType.CATEGORICAL
            ? "category"
            : "unit");

    const baselineValue =
      isNumeric && payload.baseline !== undefined
        ? Number(payload.baseline)
        : null;
    const targetValue =
      isNumeric && payload.target !== undefined ? Number(payload.target) : null;
    const baselineCategory =
      isCategorical && payload.baseline !== undefined
        ? String(payload.baseline)
        : null;
    const targetCategory =
      isCategorical && payload.target !== undefined
        ? String(payload.target)
        : null;

    const updated = await request<any>(`/indicators/${indicatorId}`, {
      method: "PATCH",
      body: {
        logframeNodeId: payload.nodeId ? Number(payload.nodeId) : undefined,
        name: payload.name,
        unit,
        baselineValue,
        targetValue,
        baselineCategory,
        targetCategory,
        dataType,
        minValue: payload.minExpected ?? null,
        maxValue: payload.maxExpected ?? null,
        anomalyConfig: payload.anomalyConfig ?? null,
        reportingFrequency: toReportingFrequency(payload.frequency),
        categories: payload.categories ?? null,
        categoryConfig: normalizeCategoryConfigForApi(payload.categoryConfig),
        // Reminder fields
        reminderEnabled: payload.reminderEnabled ?? false,
        reminderDaysBeforeDue: payload.reminderDaysBeforeDue ?? null,
        reminderDaysAfterDue: payload.reminderDaysAfterDue ?? null,
        reminderRecipients: payload.reminderRecipients ?? null,
      },
    });
    return mapIndicator(updated);
  },
  getReportingGaps: async (
    indicatorId: string,
    frequency: "DAILY" | "WEEKLY" | "MONTHLY",
  ): Promise<any> =>
    request(`/indicators/${indicatorId}/gaps?frequency=${frequency}`),
  createSubmission: async (
    indicatorId: string,
    payload: {
      reportedAt: string;
      value: any;
      evidence?: string | null;
      categoryValue?: string | null;
      disaggregationKey?: string | null;
    },
    file?: File | null,
  ): Promise<IndicatorValue> => {
    if (file) {
      const formData = new FormData();
      formData.append("reportedAt", payload.reportedAt);
      formData.append("value", String(payload.value));
      if (payload.categoryValue)
        formData.append("categoryValue", payload.categoryValue);
      if (payload.disaggregationKey)
        formData.append("disaggregationKey", payload.disaggregationKey);
      formData.append("file", file);
      return request<IndicatorValue>(
        `/indicators/${indicatorId}/submissions`,
        {
          method: "POST",
          body: formData,
        },
      );
    }

    return request<IndicatorValue>(`/indicators/${indicatorId}/submissions`, {
      method: "POST",
      body: {
        reportedAt: payload.reportedAt,
        value: payload.value,
        evidence: payload.evidence ?? null,
        categoryValue: payload.categoryValue ?? null,
        disaggregationKey: payload.disaggregationKey ?? null,
      },
    });
  },
  updateSubmission: async (
    submissionId: string,
    payload: {
      reportedAt: string;
      value: any;
      evidence?: string;
      categoryValue?: string;
      disaggregationKey?: string;
    },
  ) =>
    request(`/submissions/${submissionId}`, {
      method: "PATCH",
      body: {
        reportedAt: payload.reportedAt,
        value: payload.value,
        evidence: payload.evidence ?? null,
        categoryValue: payload.categoryValue ?? null,
        disaggregationKey: payload.disaggregationKey ?? null,
      },
    }),
  deleteSubmission: async (submissionId: string): Promise<void> =>
    request(`/submissions/${submissionId}`, { method: "DELETE" }),
  restoreSubmission: async (submissionId: string) =>
    request(`/submissions/${submissionId}/restore`, { method: "POST" }),
  addLogframeNode: async (
    projectId: string,
    payload: {
      type: NodeType;
      title: string;
      description?: string;
      parentId?: string | null;
    },
  ) =>
    request(`/projects/${projectId}/logframe/nodes`, {
      method: "POST",
      body: {
        type: payload.type.toUpperCase(),
        title: payload.title,
        description: payload.description,
        parentId: payload.parentId ? Number(payload.parentId) : undefined,
      },
    }),
  updateLogframeNode: async (
    nodeId: string,
    payload: Partial<{
      title: string;
      description?: string;
      parentId?: string | null;
      type?: NodeType;
    }>,
  ) =>
    request(`/logframe/nodes/${nodeId}`, {
      method: "PATCH",
      body: {
        title: payload.title,
        description: payload.description,
        parentId: payload.parentId
          ? Number(payload.parentId)
          : payload.parentId,
        type: payload.type ? payload.type.toUpperCase() : undefined,
      },
    }),
  getProjectStats: async (projectId: string): Promise<ProjectStats> =>
    request(`/projects/${projectId}/stats`),
  getProjectActivities: async (projectId: string): Promise<ActivityLog[]> =>
    request(`/projects/${projectId}/activities`),
  getCategoryDistribution: async (indicatorId: string): Promise<any> =>
    request(`/indicators/${indicatorId}/category-distribution`),
  deleteIndicator: async (id: string): Promise<void> =>
    request(`/indicators/${id}`, { method: "DELETE" }),

  // Import/Export API methods
  uploadImportCSV: async (
    indicatorId: string,
    file: File,
    templateId?: number,
  ): Promise<any> => {
    const formData = new FormData();
    formData.append("file", file);
    if (templateId) formData.append("templateId", String(templateId));

    const token = getToken();
    const response = await fetch(`${API_BASE}/indicators/${indicatorId}/import`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message =
        error?.error?.message ||
        error?.error ||
        error?.message ||
        "Upload failed";
      throw new Error(message);
    }

    return response.json();
  },

  executeImport: async (jobId: number, selectedRowNumbers?: number[]): Promise<void> =>
    request(`/import-jobs/${jobId}/process`, {
      method: "POST",
      body: selectedRowNumbers ? { selectedRowNumbers } : undefined,
    }),

  getImportJobStatus: async (jobId: number): Promise<any> =>
    request(`/import-jobs/${jobId}`),

  cancelImport: async (jobId: number): Promise<void> =>
    request(`/import-jobs/${jobId}/cancel`, { method: "POST" }),

  exportIndicatorCSV: async (
    indicatorId: string,
    filters?: Record<string, any>,
  ): Promise<Blob> => {
    const token = getToken();
    const templateId =
      filters && filters.templateId !== undefined
        ? Number(filters.templateId)
        : undefined;
    const normalizedFilters = { ...(filters || {}) };
    delete (normalizedFilters as any).templateId;

    const response = await fetch(`${API_BASE}/indicators/${indicatorId}/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        templateId,
        filters: normalizedFilters,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Export failed");
    }

    return response.blob();
  },

  // Import Templates
  getImportTemplates: async (indicatorId: string): Promise<any[]> =>
    request(`/indicators/${indicatorId}/import-templates`),

  createImportTemplate: async (
    indicatorId: string,
    template: any,
  ): Promise<any> =>
    request(`/indicators/${indicatorId}/import-templates`, {
      method: "POST",
      body: template,
    }),

  updateImportTemplate: async (
    templateId: number,
    template: any,
  ): Promise<any> =>
    request(`/import-templates/${templateId}`, {
      method: "PUT",
      body: template,
    }),

  deleteImportTemplate: async (templateId: number): Promise<void> =>
    request(`/import-templates/${templateId}`, { method: "DELETE" }),

  cloneImportTemplate: async (templateId: number): Promise<any> =>
    request(`/import-templates/${templateId}/clone`, { method: "POST" }),

  downloadImportTemplateSample: async (indicatorId: string): Promise<Blob> => {
    const token = getToken();
    const response = await fetch(
      `${API_BASE}/indicators/${indicatorId}/import-template-sample`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const message =
        error?.error?.message ||
        error?.error ||
        error?.message ||
        "Failed to download template";
      throw new Error(message);
    }

    return response.blob();
  },

  // Export Templates
  getExportTemplates: async (indicatorId: string): Promise<any[]> =>
    request(`/indicators/${indicatorId}/export-templates`),

  createExportTemplate: async (
    indicatorId: string,
    template: any,
  ): Promise<any> =>
    request(`/indicators/${indicatorId}/export-templates`, {
      method: "POST",
      body: template,
    }),

  updateExportTemplate: async (
    templateId: number,
    template: any,
  ): Promise<any> =>
    request(`/export-templates/${templateId}`, {
      method: "PUT",
      body: template,
    }),

  deleteExportTemplate: async (templateId: number): Promise<void> =>
    request(`/export-templates/${templateId}`, { method: "DELETE" }),

  cloneExportTemplate: async (templateId: number): Promise<any> =>
    request(`/export-templates/${templateId}/clone`, { method: "POST" }),

  // Generic HTTP methods for dynamic endpoints
  get: async <T = any>(path: string): Promise<T> => request<T>(path),

  post: async <T = any>(path: string, body?: any): Promise<T> =>
    request<T>(path, { method: "POST", body }),

  put: async <T = any>(path: string, body?: any): Promise<T> =>
    request<T>(path, { method: "PUT", body }),

  delete: async <T = any>(path: string): Promise<T> =>
    request<T>(path, { method: "DELETE" }),
};

export const authStorage = { getToken, setToken };
