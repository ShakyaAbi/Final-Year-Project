import { Project, NodeType, Indicator, IndicatorType, LogframeNode, ProjectStats, ActivityLog } from '../types';

// Mock Data Generation - Realistic Trends
const generateRealisticData = (
    startValue: number, 
    count: number, 
    trend: 'up' | 'down' | 'stable' | 'seasonal' = 'stable',
    volatility: number = 5
): any[] => {
  const values = [];
  const today = new Date();
  
  // Generate past data
  for (let i = count; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 7)); // Weekly
      
      let base = startValue;
      
      // Apply Trend
      if (trend === 'up') base += ((count - i) * (startValue * 0.015)); // 1.5% growth per tick
      if (trend === 'down') base -= ((count - i) * (startValue * 0.01)); // 1% decline per tick
      
      // Apply Seasonality (Sine wave)
      if (trend === 'seasonal') {
          base += Math.sin(i * 0.5) * (startValue * 0.05);
      }

      // Apply Noise
      const noise = (Math.random() - 0.5) * volatility;
      let value = base + noise;

      // Occasional Anomaly (Low probability)
      const isAnomaly = Math.random() > 0.95; 
      let anomalyReason;
      
      if (isAnomaly) {
          const spike = (Math.random() > 0.5 ? 1 : -1) * (volatility * 4);
          value += spike;
          anomalyReason = spike > 0 ? "Sudden spike > 2 std dev" : "Unexpected drop detected";
      }

      // Ensure non-negative for most metrics
      if (value < 0) value = 0;

      values.push({
          id: `val-${i}`,
          date: date.toISOString().split('T')[0],
          value: parseFloat(value.toFixed(2)),
          isAnomaly,
          anomalyReason
      });
  }
  return values;
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Agri-Tech Initiative 2025',
    description: 'A comprehensive 2-year intervention designed to improve crop yields and sustainable income for 50,000 rural farmers in the Northern District. The project deploys IoT soil sensors, provides real-time weather data via SMS, and facilitates market access through digital cooperatives. Key stakeholders include the Ministry of Agriculture and local farmer associations.',
    startDate: '2024-01-01',
    endDate: '2025-12-31',
    status: 'Active',
    logframe: [
      {
        id: 'goal-1',
        type: NodeType.GOAL,
        title: 'Increase sustainable income for rural farmers',
        description: 'To achieve a 30% increase in average household income for participating farming families by the end of 2025.',
        assumptions: 'Political stability remains constant and export markets remain open.',
        verificationMethod: 'Annual household income surveys and bank transaction records.',
        children: [
          {
            id: 'outcome-1',
            type: NodeType.OUTCOME,
            title: 'Improved access to real-time weather data',
            description: 'Farmers can access hyper-local weather forecasts to optimize planting and harvesting schedules.',
            risks: 'Mobile network coverage outages in remote valleys.',
            children: [
              {
                id: 'output-1',
                type: NodeType.OUTPUT,
                title: 'Weather stations installed and operational',
                children: [
                   { id: 'act-1', type: NodeType.ACTIVITY, title: 'Procure 500 IoT sensors', indicatorCount: 1 },
                   { id: 'act-2', type: NodeType.ACTIVITY, title: 'Train 50 field technicians', indicatorCount: 0 },
                   { id: 'act-3', type: NodeType.ACTIVITY, title: 'Deploy sensors in Cluster A', indicatorCount: 0 }
                ],
                indicatorCount: 2
              },
              {
                id: 'output-2',
                type: NodeType.OUTPUT,
                title: 'SMS Platform developed',
                children: [
                   { id: 'act-4', type: NodeType.ACTIVITY, title: 'Contract software vendor', indicatorCount: 0 },
                   { id: 'act-5', type: NodeType.ACTIVITY, title: 'User acceptance testing', indicatorCount: 0 }
                ],
                indicatorCount: 0
              }
            ],
            indicatorCount: 1
          },
          {
            id: 'outcome-2',
            type: NodeType.OUTCOME,
            title: 'Increased adoption of climate-smart practices',
            description: 'Farmers utilize data to reduce water usage and fertilizer runoff.',
            children: [],
            indicatorCount: 0
          }
        ],
        indicatorCount: 1
      }
    ]
  },
  {
    id: 'proj-2',
    name: 'Urban Water Sanitation',
    description: 'Clean water access for peri-urban areas focusing on infrastructure rehabilitation and community hygiene education.',
    startDate: '2024-03-01',
    endDate: '2026-02-28',
    status: 'Draft',
    logframe: []
  }
];

export const MOCK_INDICATORS: Indicator[] = [
  {
    id: 'ind-1',
    projectId: 'proj-1',
    nodeId: 'output-1',
    name: 'Maternal Mortality Ratio',
    description: 'Number of maternal deaths per 100,000 live births in target communities. Tracking reduction progress.',
    status: 'Active',
    type: IndicatorType.NUMBER,
    target: 50,
    baseline: 240,
    frequency: 'Weekly',
    minExpected: 0,
    maxExpected: 250,
    currentVersion: 1,
    versions: [
      { version: 1, createdAt: '2024-01-10', changes: 'Initial definition', active: true }
    ],
    // Start high, trending down (improvement)
    values: generateRealisticData(220, 24, 'down', 15)
  },
  {
    id: 'ind-2',
    projectId: 'proj-1',
    nodeId: 'goal-1',
    name: 'Antenatal Care Coverage',
    description: 'Percentage of pregnant women receiving at least 4 ANC visits.',
    status: 'Active',
    type: IndicatorType.PERCENTAGE,
    target: 90,
    baseline: 45,
    frequency: 'Weekly',
    minExpected: 0,
    maxExpected: 100,
    currentVersion: 2,
    versions: [
      { version: 2, createdAt: '2024-06-01', changes: 'Adjusted for inflation', active: true },
      { version: 1, createdAt: '2024-01-01', changes: 'Initial', active: false }
    ],
    // Start low, trending up
    values: generateRealisticData(50, 30, 'up', 3)
  },
  {
    id: 'ind-3',
    projectId: 'proj-1',
    nodeId: 'output-1',
    name: 'Skilled Birth Attendance',
    description: 'Percentage of deliveries attended by skilled health personnel.',
    status: 'Under Review',
    type: IndicatorType.PERCENTAGE,
    target: 85,
    baseline: 65,
    frequency: 'Weekly',
    minExpected: 60,
    maxExpected: 100,
    currentVersion: 1,
    versions: [
       { version: 1, createdAt: '2024-02-15', changes: 'Initial', active: true }
    ],
    // Seasonal/Fluctuating
    values: generateRealisticData(70, 20, 'seasonal', 4)
  }
];

// Helper functions for recursive updates
const findAndAddChild = (nodes: LogframeNode[], parentId: string, newChild: LogframeNode): boolean => {
  for (const node of nodes) {
    if (node.id === parentId) {
      if (!node.children) node.children = [];
      node.children.push(newChild);
      return true;
    }
    if (node.children && node.children.length > 0) {
      if (findAndAddChild(node.children, parentId, newChild)) return true;
    }
  }
  return false;
};

const findAndUpdateNode = (nodes: LogframeNode[], nodeId: string, updates: Partial<LogframeNode>): boolean => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      Object.assign(node, updates);
      return true;
    }
    if (node.children && node.children.length > 0) {
      if (findAndUpdateNode(node.children, nodeId, updates)) return true;
    }
  }
  return false;
};

export const getProjects = () => Promise.resolve(MOCK_PROJECTS);
export const getProject = (id: string) => Promise.resolve(MOCK_PROJECTS.find(p => p.id === id));
export const getIndicators = (projectId: string) => Promise.resolve(MOCK_INDICATORS.filter(i => i.projectId === projectId));
export const getIndicator = (id: string) => Promise.resolve(MOCK_INDICATORS.find(i => i.id === id));
export const saveValue = (indicatorId: string, value: number, date: string) => {
  console.log(`Saved value ${value} for ${indicatorId} on ${date}`);
  return Promise.resolve({ success: true });
};

export const createIndicator = (indicator: Indicator) => {
  MOCK_INDICATORS.push(indicator);
  const project = MOCK_PROJECTS.find(p => p.id === indicator.projectId);
  if (project) {
    findAndUpdateNode(project.logframe, indicator.nodeId, { 
      indicatorCount: (MOCK_INDICATORS.filter(i => i.nodeId === indicator.nodeId).length) 
    });
  }
  return Promise.resolve(indicator);
};

// Logframe Builder Services
export const addLogframeNode = (projectId: string, parentId: string | null, nodeData: LogframeNode) => {
  const project = MOCK_PROJECTS.find(p => p.id === projectId);
  if (!project) return Promise.reject("Project not found");

  if (!parentId) {
    project.logframe.push(nodeData);
  } else {
    findAndAddChild(project.logframe, parentId, nodeData);
  }
  return Promise.resolve(project);
};

export const updateLogframeNode = (projectId: string, nodeId: string, nodeData: Partial<LogframeNode>) => {
  const project = MOCK_PROJECTS.find(p => p.id === projectId);
  if (!project) return Promise.reject("Project not found");
  
  findAndUpdateNode(project.logframe, nodeId, nodeData);
  return Promise.resolve(project);
};

// Dashboard Mock Services
export const getProjectStats = (projectId: string): Promise<ProjectStats> => {
  // In a real app, this would be calculated from backend
  return Promise.resolve({
    budgetTotal: 2500000,
    budgetSpent: 1125000,
    daysTotal: 730,
    daysElapsed: 315,
    beneficiariesTarget: 50000,
    beneficiariesReached: 32450,
    activitiesTotal: 45,
    activitiesCompleted: 18
  });
};

export const getProjectActivities = (projectId: string): Promise<ActivityLog[]> => {
  return Promise.resolve([
    { id: 'a1', user: 'Sarah Jenkins', userInitials: 'SJ', action: 'Updated value', item: 'Maternal Mortality Ratio', date: '2 hours ago', type: 'info' },
    { id: 'a2', user: 'System', userInitials: 'SYS', action: 'Anomaly Detected', item: 'Antenatal Care Coverage', date: '5 hours ago', type: 'danger' },
    { id: 'a3', user: 'John Doe', userInitials: 'JD', action: 'Added new output', item: 'SMS Platform developed', date: '1 day ago', type: 'success' },
    { id: 'a4', user: 'Sarah Jenkins', userInitials: 'SJ', action: 'Created indicator', item: 'Access to clean water', date: '2 days ago', type: 'info' },
    { id: 'a5', user: 'Mike Ross', userInitials: 'MR', action: 'Updated Risk Log', item: 'Weather sensor procurement', date: '3 days ago', type: 'warning' },
  ]);
};