import { ActivityLog, Indicator, IndicatorType, IndicatorValue, LogframeNode, NodeType, Project, ProjectStats } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1';
const tokenKey = 'merlin_token';

const getToken = () => localStorage.getItem(tokenKey);
const setToken = (token: string) => localStorage.setItem(tokenKey, token);

type RequestOptions = {
  method?: string;
  body?: any;
};

const request = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data?.error?.message || res.statusText;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
};

const mapStatus = (status?: string): Project['status'] => {
  switch (status) {
    case 'ACTIVE':
    case 'Active':
      return 'Active';
    case 'DRAFT':
    case 'Draft':
      return 'Draft';
    case 'ARCHIVED':
    case 'Archived':
      return 'Archived';
    case 'COMPLETED':
    case 'Completed':
      return 'Completed';
    default:
      return 'Draft';
  }
};

const mapNodeType = (type?: string): NodeType => {
  switch (type) {
    case 'GOAL':
      return NodeType.GOAL;
    case 'OUTCOME':
      return NodeType.OUTCOME;
    case 'OUTPUT':
      return NodeType.OUTPUT;
    case 'ACTIVITY':
      return NodeType.ACTIVITY;
    default:
      return NodeType.GOAL;
  }
};

const mapLogframeNode = (node: any): LogframeNode => ({
  id: String(node.id),
  type: mapNodeType(node.type),
  title: node.title ?? '',
  description: node.description ?? undefined,
  children: Array.isArray(node.children) ? node.children.map(mapLogframeNode) : [],
  indicatorCount: node.indicatorCount ?? undefined
});

const mapProject = (p: any, logframe: LogframeNode[] = []): Project => ({
  id: String(p.id),
  name: p.name ?? '',
  description: p.description ?? '',
  startDate: p.startDate ? new Date(p.startDate).toISOString() : '',
  endDate: p.endDate ? new Date(p.endDate).toISOString() : '',
  status: mapStatus(p.status),
  sectors: Array.isArray(p.sectors) ? p.sectors.map(String) : [],
  location: p.location ?? undefined,
  donor: p.donor ?? undefined,
  budgetAmount: p.budgetAmount ?? undefined,
  budgetCurrency: p.budgetCurrency ?? undefined,
  logframe
});

const mapIndicatorType = (dataType?: string, unit?: string): IndicatorType => {
  switch (dataType) {
    case 'PERCENT':
      return IndicatorType.PERCENTAGE;
    case 'BOOLEAN':
      return IndicatorType.BOOLEAN;
    case 'NUMBER':
      return unit === 'USD' || unit === 'usd' ? IndicatorType.CURRENCY : IndicatorType.NUMBER;
    case 'TEXT':
      return IndicatorType.TEXT;
    default:
      if (unit === '%' || unit === 'percent') return IndicatorType.PERCENTAGE;
      return IndicatorType.NUMBER;
  }
};

const mapIndicatorValue = (v: any, type: IndicatorType): IndicatorValue => {
  const parsedValue =
    type === IndicatorType.NUMBER || type === IndicatorType.PERCENTAGE || type === IndicatorType.CURRENCY
      ? Number(v.value)
      : v.value;
  const isAnomaly = v.isAnomaly === true;
  return {
    id: String(v.id),
    date: v.reportedAt ? new Date(v.reportedAt).toISOString() : '',
    value: Number.isFinite(parsedValue) ? parsedValue : v.value,
    isAnomaly,
    anomalyReason: isAnomaly ? v.anomalyReason ?? undefined : undefined,
    evidence: v.evidence ?? undefined
  };
};

const mapIndicator = (indicator: any, values: IndicatorValue[] = []): Indicator => {
  const type = mapIndicatorType(indicator.dataType, indicator.unit);
  const isText = type === IndicatorType.TEXT;
  return {
    id: String(indicator.id),
    projectId: String(indicator.projectId),
    nodeId: String(indicator.logframeNodeId),
    name: indicator.name ?? '',
    description: indicator.description ?? undefined,
    status: indicator.status ?? 'Active',
    code: indicator.code ?? undefined,
    type,
    target: indicator.targetValue ?? (isText ? '' : 0),
    baseline: indicator.baselineValue ?? (isText ? '' : 0),
    minExpected: indicator.minValue ?? undefined,
    maxExpected: indicator.maxValue ?? undefined,
    unit: indicator.unit ?? undefined,
    decimals: indicator.decimals ?? undefined,
    frequency: indicator.frequency ?? 'Monthly',
    currentVersion: indicator.currentVersion ?? 1,
    versions: Array.isArray(indicator.versions) ? indicator.versions : [],
    values
  };
};

const getProjectLogframe = async (id: string): Promise<LogframeNode[]> => {
  const tree = await request<any[]>(`/projects/${id}/logframe/tree`);
  return tree.map(mapLogframeNode);
};

export const api = {
  login: async (email: string, password: string) => {
    const result = await request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    setToken(result.token);
    return result;
  },
  me: async () => request('/auth/me'),
  getProjects: async (): Promise<Project[]> => {
    const projects = await request<any[]>('/projects');
    return projects.map((project) => mapProject(project));
  },
  getProject: async (id: string): Promise<Project> => {
    const project = await request<any>(`/projects/${id}`);
    const logframe = await getProjectLogframe(id).catch(() => []);
    return mapProject(project, logframe);
  },
  deleteProject: async (id: string): Promise<Project> => {
    const project = await request<any>(`/projects/${id}`, { method: 'DELETE' });
    return mapProject(project);
  },
  createProject: async (payload: Partial<Project>): Promise<Project> => {
    const created = await request<any>('/projects', {
      method: 'POST',
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
        budgetCurrency: payload.budgetCurrency
      }
    });
    return mapProject(created);
  },
  getIndicators: async (projectId: string): Promise<Indicator[]> => {
    const indicators = await request<any[]>(`/projects/${projectId}/indicators`);
    return indicators.map((indicator) => mapIndicator(indicator));
  },
  getIndicator: async (id: string): Promise<Indicator> => {
    const indicator = await request<any>(`/indicators/${id}`);
    return mapIndicator(indicator);
  },
  getIndicatorSubmissions: async (indicatorId: string): Promise<IndicatorValue[]> => {
    const submissions = await request<any[]>(`/indicators/${indicatorId}/submissions`);
    const indicator = await request<any>(`/indicators/${indicatorId}`);
    const type = mapIndicatorType(indicator.dataType, indicator.unit);
    return submissions.map((submission) => mapIndicatorValue(submission, type));
  },
  createIndicator: async (projectId: string, payload: Partial<Indicator>): Promise<Indicator> => {
    const dataType =
      payload.type === IndicatorType.PERCENTAGE
        ? 'PERCENT'
        : payload.type === IndicatorType.BOOLEAN
        ? 'BOOLEAN'
        : payload.type === IndicatorType.TEXT
        ? 'TEXT'
        : 'NUMBER';
    const isNumeric =
      payload.type === IndicatorType.NUMBER ||
      payload.type === IndicatorType.PERCENTAGE ||
      payload.type === IndicatorType.CURRENCY;
    const unit =
      payload.unit ||
      (payload.type === IndicatorType.BOOLEAN ? 'yes/no' : payload.type === IndicatorType.TEXT ? 'text' : 'unit');
    const baselineValue = isNumeric && payload.baseline !== undefined ? Number(payload.baseline) : null;
    const targetValue = isNumeric && payload.target !== undefined ? Number(payload.target) : null;
    const created = await request<any>(`/projects/${projectId}/indicators`, {
      method: 'POST',
      body: {
        logframeNodeId: Number(payload.nodeId),
        name: payload.name,
        unit,
        baselineValue,
        targetValue,
        dataType,
        minValue: payload.minExpected ?? null,
        maxValue: payload.maxExpected ?? null
      }
    });
    return mapIndicator(created);
  },
  createSubmission: async (indicatorId: string, payload: { reportedAt: string; value: any; evidence?: string }) =>
    request(`/indicators/${indicatorId}/submissions`, {
      method: 'POST',
      body: {
        reportedAt: payload.reportedAt,
        value: payload.value,
        evidence: payload.evidence ?? null
      }
    }),
  addLogframeNode: async (
    projectId: string,
    payload: { type: NodeType; title: string; description?: string; parentId?: string | null }
  ) =>
    request(`/projects/${projectId}/logframe/nodes`, {
      method: 'POST',
      body: {
        type: payload.type.toUpperCase(),
        title: payload.title,
        description: payload.description,
        parentId: payload.parentId ? Number(payload.parentId) : undefined
      }
    }),
  updateLogframeNode: async (
    nodeId: string,
    payload: Partial<{ title: string; description?: string; parentId?: string | null; type?: NodeType }>
  ) =>
    request(`/logframe/nodes/${nodeId}`, {
      method: 'PATCH',
      body: {
        title: payload.title,
        description: payload.description,
        parentId: payload.parentId ? Number(payload.parentId) : payload.parentId,
        type: payload.type ? payload.type.toUpperCase() : undefined
      }
    }),
  getProjectStats: async (projectId: string): Promise<ProjectStats> =>
    request(`/projects/${projectId}/stats`),
  getProjectActivities: async (projectId: string): Promise<ActivityLog[]> =>
    request(`/projects/${projectId}/activities`)
};

export const authStorage = { getToken, setToken };
