import {
  Project,
  LogframeNode,
  Indicator,
  IndicatorType,
  ProjectStats,
  ActivityLog,
  UserProfile,
  NodeType,
  IndicatorValue,
} from "../types";

/**
 * MOCK API SERVICE
 *
 * Simulates a backend using local data.
 * Fixes "Failed to fetch" by running entirely in the browser.
 */

// --- INITIAL MOCK DATA ---

const MOCK_PROJECTS: Project[] = [
  {
    id: "p-1",
    name: "Sustainable Agriculture Initiative",
    description:
      "Improving crop yields and market access for smallholder farmers in the Northern District through training and infrastructure.",
    startDate: "2024-01-01",
    endDate: "2025-12-31",
    status: "Active",
    sectors: [],
    logframe: [
      {
        id: "g-1",
        type: NodeType.GOAL,
        title: "Increased Household Income",
        description:
          "To increase the average household income of participating farmers by 30%.",
        indicatorCount: 2,
        children: [
          {
            id: "oc-1",
            type: NodeType.OUTCOME,
            title: "Improved Crop Yields",
            description: "Farmers adopt modern sustainable farming techniques.",
            indicatorCount: 1,
            children: [
              {
                id: "op-1",
                type: NodeType.OUTPUT,
                title: "Farmers Trained",
                description:
                  "Number of farmers who completed the 3-day workshop.",
                indicatorCount: 1,
                children: [
                  {
                    id: "a-1",
                    type: NodeType.ACTIVITY,
                    title: "Conduct Workshops",
                    description:
                      "Hold weekly training sessions in community centers.",
                    indicatorCount: 0,
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "p-2",
    name: "Clean Water Access Program",
    description:
      "Drilling boreholes and establishing water committees in 50 rural communities.",
    startDate: "2024-03-01",
    endDate: "2026-02-28",
    status: "Active",
    sectors: [],
    logframe: [],
  },
  {
    id: "p-3",
    name: "Youth Digital Skills Pilot",
    description:
      "A pilot program to teach coding and digital literacy to unemployed youth.",
    startDate: "2023-06-01",
    endDate: "2023-12-31",
    status: "Archived",
    sectors: [],
    logframe: [],
  },
];

const MOCK_INDICATORS: Indicator[] = [
  {
    id: "i-1",
    projectId: "p-1",
    nodeId: "g-1",
    name: "Average Household Income",
    code: "INC-001",
    description: "Monthly average income from agricultural sources.",
    type: IndicatorType.CURRENCY,
    target: 450,
    baseline: 320,
    frequency: "Monthly",
    currentVersion: 1,
    versions: [],
    unit: "USD",
    decimals: 0,
    minExpected: 200,
    maxExpected: 600,
    values: [
      { id: "v-1", date: "2024-01-15", value: 325, isAnomaly: false },
      { id: "v-2", date: "2024-02-15", value: 340, isAnomaly: false },
      { id: "v-3", date: "2024-03-15", value: 355, isAnomaly: false },
      { id: "v-4", date: "2024-04-15", value: 360, isAnomaly: false },
    ],
  },
  {
    id: "i-2",
    projectId: "p-1",
    nodeId: "op-1",
    name: "# of Farmers Trained",
    type: IndicatorType.NUMBER,
    target: 500,
    baseline: 0,
    frequency: "Weekly",
    currentVersion: 1,
    versions: [],
    unit: "farmers",
    decimals: 0,
    minExpected: 0,
    maxExpected: 50,
    values: [
      { id: "v-5", date: "2024-01-10", value: 25, isAnomaly: false },
      { id: "v-6", date: "2024-01-17", value: 42, isAnomaly: false },
      { id: "v-7", date: "2024-01-24", value: 45, isAnomaly: false },
      { id: "v-8", date: "2024-01-31", value: 30, isAnomaly: false },
      {
        id: "v-9",
        date: "2024-02-07",
        value: 65,
        isAnomaly: true,
        anomalyReason: "Value exceeds max expected (50)",
      },
    ],
  },
];

let MOCK_ACTIVITIES: ActivityLog[] = [
  {
    id: "l-1",
    user: "Jane Doe",
    userInitials: "JD",
    action: "updated",
    item: "Project Timeline",
    date: "2 hours ago",
    type: "info",
  },
  {
    id: "l-2",
    user: "System",
    userInitials: "SYS",
    action: "detected",
    item: "Anomaly in Income Data",
    date: "5 hours ago",
    type: "warning",
  },
  {
    id: "l-3",
    user: "Mike Smith",
    userInitials: "MS",
    action: "completed",
    item: "Q1 Report",
    date: "1 day ago",
    type: "success",
  },
];

export const MOCK_USER: UserProfile = {
  id: "u-1",
  name: "John Doe",
  email: "john.doe@merlin-lite.org",
  role: "Program Manager",
  organization: "Global Relief Initiative",
  timezone: "UTC-5 (Eastern Time)",
  notificationPreferences: {
    emailAlerts: true,
    browserPush: false,
    weeklyDigest: true,
    anomalyAlerts: true,
  },
};

// --- SIMULATION HELPERS ---

// Store data in memory (reset on refresh)
let _projects = [...MOCK_PROJECTS];
let _indicators = [...MOCK_INDICATORS];
let _activities = [...MOCK_ACTIVITIES];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- PROJECT SERVICES ---

export const getProjects = async (): Promise<Project[]> => {
  await delay(300);
  return [..._projects];
};

export const getProject = async (id: string): Promise<Project | undefined> => {
  await delay(200);
  return _projects.find((p) => p.id === id);
};

export const createProject = async (
  projectData: Partial<Project>
): Promise<Project> => {
  await delay(500);
  const newProject: Project = {
    id: `p-${Date.now()}`,
    name: projectData.name || "Untitled",
    description: projectData.description || "",
    startDate: projectData.startDate || "",
    endDate: projectData.endDate || "",
    status: projectData.status || "Draft",
    sectors: projectData.sectors || [],
    location: projectData.location,
    donor: projectData.donor,
    budgetAmount: projectData.budgetAmount,
    budgetCurrency: projectData.budgetCurrency,
    logframe: projectData.logframe || [],
  };
  _projects.unshift(newProject);
  return newProject;
};

// --- LOGFRAME SERVICES ---

const findAndAddNode = (
  nodes: LogframeNode[],
  parentId: string,
  newNode: LogframeNode
): boolean => {
  for (const node of nodes) {
    if (node.id === parentId) {
      if (!node.children) node.children = [];
      node.children.push(newNode);
      return true;
    }
    if (node.children && findAndAddNode(node.children, parentId, newNode)) {
      return true;
    }
  }
  return false;
};

const findAndUpdateNode = (
  nodes: LogframeNode[],
  nodeId: string,
  data: Partial<LogframeNode>
): boolean => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      Object.assign(node, data);
      return true;
    }
    if (node.children && findAndUpdateNode(node.children, nodeId, data)) {
      return true;
    }
  }
  return false;
};

export const addLogframeNode = async (
  projectId: string,
  parentId: string | null,
  nodeData: LogframeNode
) => {
  await delay(200);
  const project = _projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found");

  if (!parentId) {
    // Add as root (Goal)
    project.logframe.push(nodeData);
  } else {
    // Add as child
    findAndAddNode(project.logframe, parentId, nodeData);
  }
  return getProject(projectId);
};

export const updateLogframeNode = async (
  projectId: string,
  nodeId: string,
  nodeData: Partial<LogframeNode>
) => {
  await delay(200);
  const project = _projects.find((p) => p.id === projectId);
  if (!project) throw new Error("Project not found");
  findAndUpdateNode(project.logframe, nodeId, nodeData);
  return getProject(projectId);
};

// --- INDICATOR SERVICES ---

export const getIndicators = async (
  projectId?: string
): Promise<Indicator[]> => {
  await delay(300);
  if (projectId) {
    return _indicators.filter((i) => i.projectId === projectId);
  }
  return [..._indicators];
};

export const getIndicator = async (
  id: string
): Promise<Indicator | undefined> => {
  await delay(200);
  return _indicators.find((i) => i.id === id);
};

export const createIndicator = async (
  indicator: Partial<Indicator>
): Promise<Indicator> => {
  await delay(400);
  const newInd = { ...indicator } as Indicator;
  _indicators.push(newInd);

  // Update node count
  const project = _projects.find((p) => p.id === newInd.projectId);
  if (project) {
    const incrementCount = (nodes: LogframeNode[]) => {
      for (const node of nodes) {
        if (node.id === newInd.nodeId) {
          node.indicatorCount = (node.indicatorCount || 0) + 1;
          return true;
        }
        if (node.children) incrementCount(node.children);
      }
    };
    incrementCount(project.logframe);
  }

  return newInd;
};

export const saveValue = async (
  indicatorId: string,
  value: number | string,
  date: string,
  evidence?: string
) => {
  await delay(400);
  const ind = _indicators.find((i) => i.id === indicatorId);
  if (ind) {
    const numVal = Number(value);
    let isAnomaly = false;
    let reason = undefined;

    // Simple Anomaly Logic
    if (
      !isNaN(numVal) &&
      ind.minExpected !== undefined &&
      ind.maxExpected !== undefined
    ) {
      if (numVal < ind.minExpected) {
        isAnomaly = true;
        reason = `Value below expected minimum (${ind.minExpected})`;
      } else if (numVal > ind.maxExpected) {
        isAnomaly = true;
        reason = `Value exceeds expected maximum (${ind.maxExpected})`;
      }
    }

    const newVal: IndicatorValue = {
      id: `v-${Date.now()}`,
      date,
      value,
      isAnomaly,
      anomalyReason: reason,
      evidence,
    };
    ind.values.push(newVal);

    // Add log
    _activities.unshift({
      id: `act-${Date.now()}`,
      user: MOCK_USER.name,
      userInitials: "ME",
      action: "submitted data for",
      item: ind.name,
      date: "Just now",
      type: isAnomaly ? "warning" : "success",
    });
  }
  return { success: true };
};

// --- STATS & LOGS ---

export const getProjectStats = async (
  projectId: string
): Promise<ProjectStats> => {
  await delay(200);
  return {
    budgetTotal: 2500000,
    budgetSpent: 1125000,
    daysTotal: 730,
    daysElapsed: 315,
    beneficiariesTarget: 50000,
    beneficiariesReached: 32450,
    activitiesTotal: 45,
    activitiesCompleted: 18,
  };
};

export const getProjectActivities = async (
  projectId: string
): Promise<ActivityLog[]> => {
  await delay(200);
  return [..._activities];
};

export const getNotifications = async (): Promise<ActivityLog[]> => {
  await delay(100);
  return _activities.slice(0, 5);
};

// --- USER PROFILE ---

export const getUserProfile = () => Promise.resolve({ ...MOCK_USER });

export const updateUserProfile = (data: Partial<UserProfile>) => {
  Object.assign(MOCK_USER, data);
  return Promise.resolve({ ...MOCK_USER });
};
