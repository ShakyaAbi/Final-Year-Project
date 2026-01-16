import { BadRequestError } from '../utils/errors';

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

/**
 * Validates category definitions
 */
export const validateCategories = (categories: any): CategoryDefinition[] => {
  if (!Array.isArray(categories)) {
    throw new BadRequestError('INVALID_CATEGORIES', 'Categories must be an array');
  }

  if (categories.length === 0) {
    throw new BadRequestError('EMPTY_CATEGORIES', 'At least one category is required');
  }

  const seenIds = new Set<string>();

  const validated = categories.map((cat, index) => {
    if (!cat || typeof cat !== 'object') {
      throw new BadRequestError('INVALID_CATEGORY', `Category at index ${index} must be an object`);
    }

    if (!cat.id || typeof cat.id !== 'string') {
      throw new BadRequestError('INVALID_CATEGORY_ID', `Category at index ${index} must have a valid id`);
    }

    if (!cat.label || typeof cat.label !== 'string') {
      throw new BadRequestError('INVALID_CATEGORY_LABEL', `Category at index ${index} must have a valid label`);
    }

    if (seenIds.has(cat.id)) {
      throw new BadRequestError('DUPLICATE_CATEGORY_ID', `Category ID '${cat.id}' is duplicated`);
    }

    seenIds.add(cat.id);

    return {
      id: cat.id,
      label: cat.label,
      color: cat.color || undefined,
      description: cat.description || undefined
    };
  });

  return validated;
};

/**
 * Validates category configuration
 */
export const validateCategoryConfig = (config: any): CategoryConfig => {
  if (!config || typeof config !== 'object') {
    throw new BadRequestError('INVALID_CATEGORY_CONFIG', 'Category config must be an object');
  }

  const validated: CategoryConfig = {};

  if (config.allowMultiple !== undefined) {
    if (typeof config.allowMultiple !== 'boolean') {
      throw new BadRequestError('INVALID_ALLOW_MULTIPLE', 'allowMultiple must be a boolean');
    }
    validated.allowMultiple = config.allowMultiple;
  }

  if (config.maxSelections !== undefined) {
    if (typeof config.maxSelections !== 'number' || config.maxSelections < 1) {
      throw new BadRequestError('INVALID_MAX_SELECTIONS', 'maxSelections must be a positive number');
    }
    validated.maxSelections = config.maxSelections;
  }

  if (config.required !== undefined) {
    if (typeof config.required !== 'boolean') {
      throw new BadRequestError('INVALID_REQUIRED', 'required must be a boolean');
    }
    validated.required = config.required;
  }

  if (config.allowOther !== undefined) {
    if (typeof config.allowOther !== 'boolean') {
      throw new BadRequestError('INVALID_ALLOW_OTHER', 'allowOther must be a boolean');
    }
    validated.allowOther = config.allowOther;
  }

  return validated;
};

/**
 * Validates a categorical submission value
 */
export const validateCategoricalValue = (
  value: string,
  categories: CategoryDefinition[],
  config: CategoryConfig
): string[] => {
  const categoryIds = new Set(categories.map(c => c.id));
  
  // Parse the value (can be single or comma-separated)
  const selectedIds = value.split(',').map(id => id.trim()).filter(id => id.length > 0);

  if (selectedIds.length === 0) {
    if (config.required) {
      throw new BadRequestError('REQUIRED_CATEGORY', 'Category selection is required');
    }
    return [];
  }

  // Check if multiple selections are allowed
  if (!config.allowMultiple && selectedIds.length > 1) {
    throw new BadRequestError('MULTIPLE_NOT_ALLOWED', 'Multiple category selections are not allowed');
  }

  // Check max selections
  if (config.maxSelections && selectedIds.length > config.maxSelections) {
    throw new BadRequestError(
      'MAX_SELECTIONS_EXCEEDED',
      `Maximum ${config.maxSelections} selections allowed`
    );
  }

  // Validate each selected ID
  for (const id of selectedIds) {
    if (id === 'other' && config.allowOther) {
      continue; // Allow "other" option
    }

    if (!categoryIds.has(id)) {
      throw new BadRequestError('INVALID_CATEGORY_VALUE', `Invalid category ID: ${id}`);
    }
  }

  return selectedIds;
};

/**
 * Format categorical value for storage (comma-separated string)
 */
export const formatCategoricalValue = (selectedIds: string[]): string => {
  return selectedIds.join(',');
};

/**
 * Parse categorical value from storage
 */
export const parseCategoricalValue = (value: string): string[] => {
  if (!value) return [];
  return value.split(',').map(id => id.trim()).filter(id => id.length > 0);
};

/**
 * Calculate distribution statistics for categorical data
 */
export interface CategoryStats {
  categoryId: string;
  label: string;
  count: number;
  percentage: number;
}

export const getCategoryDistribution = (
  submissions: Array<{ value: string }>,
  categories: CategoryDefinition[]
): CategoryStats[] => {
  const counts = new Map<string, number>();
  
  // Initialize counts
  categories.forEach(cat => counts.set(cat.id, 0));
  
  // Count occurrences
  let totalSelections = 0;
  submissions.forEach(sub => {
    const selectedIds = parseCategoricalValue(sub.value);
    selectedIds.forEach(id => {
      if (counts.has(id)) {
        counts.set(id, counts.get(id)! + 1);
        totalSelections++;
      }
    });
  });
  
  // Calculate percentages
  const stats: CategoryStats[] = categories.map(cat => ({
    categoryId: cat.id,
    label: cat.label,
    count: counts.get(cat.id) || 0,
    percentage: totalSelections > 0 ? ((counts.get(cat.id) || 0) / totalSelections) * 100 : 0
  }));
  
  return stats.sort((a, b) => b.count - a.count);
};

/**
 * Get the most frequently selected category
 */
export const getMostFrequentCategory = (
  submissions: Array<{ value: string }>,
  categories: CategoryDefinition[]
): { categoryId: string; label: string; count: number } | null => {
  const distribution = getCategoryDistribution(submissions, categories);
  if (distribution.length === 0 || distribution[0].count === 0) return null;
  
  return {
    categoryId: distribution[0].categoryId,
    label: distribution[0].label,
    count: distribution[0].count
  };
};

/**
 * Calculate trend for categorical data (most common category over time)
 */
export const getCategoryTrend = (
  submissions: Array<{ value: string; reportedAt: Date }>,
  categories: CategoryDefinition[],
  timeWindowDays: number = 30
): { current: string | null; previous: string | null; isChanging: boolean } => {
  if (submissions.length === 0) {
    return { current: null, previous: null, isChanging: false };
  }
  
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - timeWindowDays * 24 * 60 * 60 * 1000);
  
  const recentSubmissions = submissions.filter(s => s.reportedAt >= cutoffDate);
  const olderSubmissions = submissions.filter(s => s.reportedAt < cutoffDate);
  
  const currentMost = getMostFrequentCategory(recentSubmissions, categories);
  const previousMost = getMostFrequentCategory(olderSubmissions, categories);
  
  const current = currentMost?.categoryId || null;
  const previous = previousMost?.categoryId || null;
  
  return {
    current,
    previous,
    isChanging: current !== null && previous !== null && current !== previous
  };
};
