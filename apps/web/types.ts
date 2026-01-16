
export enum NodeType {
  GOAL = 'Goal',
  OUTCOME = 'Outcome',
  OUTPUT = 'Output',
  ACTIVITY = 'Activity'
}

export enum IndicatorType {
  NUMBER = 'Number',
  PERCENTAGE = 'Percentage',
  CURRENCY = 'Currency',
  TEXT = 'Text',
  BOOLEAN = 'Boolean',
  CATEGORICAL = 'Categorical'
}

export interface LogframeNode {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  children?: LogframeNode[];
  indicatorCount?: number;
  // Extended fields for Logframe Builder
  assumptions?: string;
  risks?: string;
  verificationMethod?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Draft' | 'Archived' | 'Completed';
  sectors: string[];
  location?: string;
  donor?: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  logframe: LogframeNode[]; // Root nodes (usually Goals)
}

export interface IndicatorValue {
  id: string;
  date: string;
  value: number | string; // Updated to support non-numeric
  isAnomaly: boolean;
  anomalyReason?: string;
  comment?: string;
  evidence?: string; // Added for verification source/notes
}

export interface AnomalyConfig {
  enabled?: boolean;
  outlier?: {
    method?: 'MAD' | 'IQR';
    threshold?: number;
    windowSize?: number;
    minPoints?: number;
  };
  trend?: {
    method?: 'SLOPE_SHIFT' | 'MEAN_SHIFT';
    threshold?: number;
    windowSize?: number;
  };
}

export interface CategoryDefinition {
  id: string;
  label: string;
  color?: string;
  description?: string;
}

export interface CategoryConfig {
  allowMultiple?: boolean;
  maxSelections?: number;
  required?: boolean;
  allowOther?: boolean;
}

export interface IndicatorVersion {
  version: number;
  createdAt: string;
  changes: string;
  active: boolean;
}

export interface Indicator {
  id: string;
  projectId: string;
  nodeId: string;
  name: string;
  code?: string; // Added
  description?: string;
  status?: 'Active' | 'Inactive' | 'Under Review';
  type: IndicatorType;
  
  // Target & Validation
  target: number | string; // Updated to support non-numeric
  baseline: number | string;
  minExpected?: number;
  maxExpected?: number;
  anomalyConfig?: AnomalyConfig;
  
  // Formatting rules
  unit?: string; // e.g., "kg", "households"
  decimals?: number;
  booleanLabels?: { true: string; false: string }; // For Boolean
  categories?: CategoryDefinition[]; // For Categorical
  categoryConfig?: CategoryConfig; // For Categorical
  
  frequency: 'Weekly' | 'Monthly';
  currentVersion: number;
  versions: IndicatorVersion[];
  values: IndicatorValue[];
}

export interface ActivityLog {
  id: string;
  user: string;
  userInitials: string;
  action: string;
  item: string;
  date: string;
  type: 'info' | 'warning' | 'success' | 'danger';
}

export interface ProjectStats {
  budgetTotal: number;
  budgetSpent: number;
  daysTotal: number;
  daysElapsed: number;
  beneficiariesTarget: number;
  beneficiariesReached: number;
  activitiesTotal: number;
  activitiesCompleted: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
  createdAt?: string;
}
