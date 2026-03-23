import { request } from "./apiClient";
import { Project, LogframeNode, NodeType, ProjectStats, ActivityLog } from "../types";

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
  assumptions: node.assumptions ?? undefined,
  risks: node.risks ?? undefined,
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
  budgetSpent: p.budgetSpent ?? undefined,
  budgetCurrency: p.budgetCurrency ?? undefined,
  _count: p._count,
  logframe,
});

const getProjectLogframe = async (id: string): Promise<LogframeNode[]> => {
  const tree = await request<any[]>(`/projects/${id}/logframe/tree`);
  return tree.map(mapLogframeNode);
};

export const projectApi = {
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
        budgetSpent: payload.budgetSpent,
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
        budgetSpent: payload.budgetSpent,
        budgetCurrency: payload.budgetCurrency,
      },
    });
    return mapProject(updated);
  },
  getProjectStats: async (projectId: string): Promise<ProjectStats> =>
    request(`/projects/${projectId}/stats`),
  getProjectActivities: async (projectId: string): Promise<ActivityLog[]> =>
    request(`/projects/${projectId}/activities`),
  getProjectAlerts: async (projectId: string): Promise<any[]> =>
    request(`/projects/${projectId}/alerts`),
  addLogframeNode: async (
    projectId: string,
    payload: {
      type: NodeType;
      title: string;
      description?: string;
      assumptions?: string;
      risks?: string;
      parentId?: string | null;
    },
  ) =>
    request(`/projects/${projectId}/logframe/nodes`, {
      method: "POST",
      body: {
        type: payload.type.toUpperCase(),
        title: payload.title,
        description: payload.description,
        assumptions: payload.assumptions,
        risks: payload.risks,
        parentId: payload.parentId ? Number(payload.parentId) : undefined,
      },
    }),
  updateLogframeNode: async (
    nodeId: string,
    payload: Partial<{
      title: string;
      description?: string;
      assumptions?: string;
      risks?: string;
      parentId?: string | null;
      type?: NodeType;
    }>,
  ) =>
    request(`/logframe/nodes/${nodeId}`, {
      method: "PATCH",
      body: {
        title: payload.title,
        description: payload.description,
        assumptions: payload.assumptions,
        risks: payload.risks,
        parentId: payload.parentId
          ? Number(payload.parentId)
          : payload.parentId,
        type: payload.type ? payload.type.toUpperCase() : undefined,
      },
    }),
};
