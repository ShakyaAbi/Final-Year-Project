import { LogframeNode, NodeType, Project } from '../types';

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
  }
};

export const authStorage = { getToken, setToken };
