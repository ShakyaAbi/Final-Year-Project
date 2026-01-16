
import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { api } from '../services/api';
import { Project, Indicator, IndicatorType, IndicatorValue, CategoryDefinition } from '../types';
import { Button } from '../components/ui/Button';
import { Search, Filter, Check, FileText, Calendar, AlertCircle, Link as LinkIcon, UploadCloud, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export const DataEntry: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchParams] = useSearchParams();
  
  // Filters
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('projectId') || '');
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI State for Drag & Drop
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Form State (Map of indicatorId -> Entry Data)
  const [entries, setEntries] = useState<Record<string, { 
    value: string, 
    selectedCategories: string[], // For categorical indicators
    date: string, 
    evidence: string, 
    file: File | null,
    status: 'idle' | 'saving' | 'saved',
    error?: string
  }>>({});

  useEffect(() => {
    const pid = searchParams.get('projectId');
    if (pid) setSelectedProject(pid);
  }, [searchParams]);

  useEffect(() => {
    api.getProjects()
      .then((projData) => setProjects(projData))
      .catch((error) => {
        console.error('Failed to load projects', error);
        setProjects([]);
      });
  }, []);

  const loadIndicators = async (projectId?: string) => {
    setLoading(true);
    try {
      let indData: Indicator[] = [];
      if (projectId) {
        indData = await api.getIndicators(projectId);
      } else if (projects.length > 0) {
        const all = await Promise.all(projects.map((project) => api.getIndicators(project.id)));
        indData = all.flat();
      }
      setIndicators(indData);

      const initialEntries: Record<string, any> = {};
      const today = new Date().toISOString().split('T')[0];
      indData.forEach(ind => {
        initialEntries[ind.id] = {
          value: '',
          selectedCategories: [],
          date: today,
          evidence: '',
          file: null,
          status: 'idle',
          error: undefined
        };
      });
      setEntries(initialEntries);
    } catch (error) {
      console.error('Failed to load indicators', error);
      setIndicators([]);
      setEntries({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      loadIndicators(selectedProject || undefined);
    }
  }, [projects, selectedProject]);

  const filteredIndicators = indicators.filter(ind => {
    const matchesProject = selectedProject ? ind.projectId === selectedProject : true;
    const matchesSearch = ind.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (ind.code && ind.code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesProject && matchesSearch;
  });

  const handleEntryChange = (id: string, field: string, value: string) => {
    setEntries(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value, status: 'idle', error: undefined }
    }));
  };

  const handleCategoryToggle = (indicatorId: string, categoryId: string, allowMultiple: boolean) => {
    setEntries(prev => {
      const current = prev[indicatorId].selectedCategories;
      let newSelected: string[];
      
      if (allowMultiple) {
        // Toggle in multi-select mode
        newSelected = current.includes(categoryId)
          ? current.filter(id => id !== categoryId)
          : [...current, categoryId];
      } else {
        // Single select mode - replace
        newSelected = [categoryId];
      }
      
      return {
        ...prev,
        [indicatorId]: {
          ...prev[indicatorId],
          selectedCategories: newSelected,
          value: newSelected.join(','), // Store as comma-separated for submission
          status: 'idle',
          error: undefined
        }
      };
    });
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggingId !== id) setDraggingId(id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingId(null);
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDraggingId(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(id, file);
    }
  };

  const handleFileSelect = (id: string, file: File) => {
    setEntries(prev => ({
      ...prev,
      [id]: { 
        ...prev[id], 
        file: file, 
        evidence: '', // Clear manual text if file is attached to avoid ambiguity
        status: 'idle',
        error: undefined
      }
    }));
  };

  const handleRemoveFile = (id: string) => {
    setEntries(prev => ({
      ...prev,
      [id]: { ...prev[id], file: null }
    }));
  };

  const handleSubmit = async (id: string) => {
    const entry = entries[id];
    const indicator = indicators.find((item) => item.id === id);
    
    // For categorical, check selectedCategories, otherwise check value
    const hasValue = indicator?.type === IndicatorType.CATEGORICAL
      ? entry.selectedCategories.length > 0
      : entry.value !== '';
    
    if (!hasValue) return;

    setEntries(prev => ({ ...prev, [id]: { ...prev[id], status: 'saving', error: undefined } }));

    // Use filename if file exists, otherwise use the text evidence
    const finalEvidence = entry.file ? `[Attached] ${entry.file.name}` : entry.evidence;

    // Call service
    const valuePayload =
      indicator?.type === IndicatorType.NUMBER ||
      indicator?.type === IndicatorType.PERCENTAGE ||
      indicator?.type === IndicatorType.CURRENCY
        ? Number(entry.value)
        : entry.value;
    try {
      await api.createSubmission(id, {
        reportedAt: entry.date,
        value: valuePayload,
        evidence: finalEvidence
      });
    } catch (err: any) {
      setEntries(prev => ({ 
        ...prev, 
        [id]: { ...prev[id], status: 'idle', error: err?.message || 'Failed to submit value.' } 
      }));
      return;
    }

    // Optimistically update the indicators list to show the new "Last Value" immediately
    setIndicators(prevIndicators => prevIndicators.map(ind => {
      if (ind.id === id) {
        // Parse value same way the service does for consistency in UI
        const numVal = parseFloat(entry.value);
        const finalValue = !isNaN(numVal) ? numVal : entry.value;
        
        const newEntry: IndicatorValue = {
          id: `temp-${Date.now()}`,
          date: entry.date,
          value: finalValue,
          isAnomaly: false, // simplified for optimistic update
          evidence: finalEvidence
        };
        return {
          ...ind,
          values: [...ind.values, newEntry]
        };
      }
      return ind;
    }));

    // Simulate success delay for UX
    setTimeout(() => {
        setEntries(prev => ({ 
            ...prev, 
            [id]: { ...prev[id], value: '', selectedCategories: [], evidence: '', file: null, status: 'saved' } 
        }));
        
        // Reset to idle after showing success
        setTimeout(() => {
            setEntries(prev => ({ 
                ...prev, 
                [id]: { ...prev[id], status: 'idle' } 
            }));
        }, 2000);
    }, 600);
  };

  const getProjectName = (projectId: string) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown Project';
  };

  const getInputType = (type: IndicatorType) => {
      return type === IndicatorType.NUMBER || type === IndicatorType.PERCENTAGE || type === IndicatorType.CURRENCY ? 'number' : 'text';
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Data Entry & Verification</h1>
        <p className="text-slate-500 mt-1">Submit monitoring data and attach verification evidence.</p>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
         <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by indicator name or code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
            />
         </div>
         
         <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="text-slate-400 w-4 h-4 hidden md:block" />
            <select 
                className="flex-1 md:w-64 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
            >
                <option value="">All Projects</option>
                {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
         </div>
      </div>

      {loading ? (
          <div className="text-center py-12 text-slate-500">Loading indicators...</div>
      ) : filteredIndicators.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">No indicators found matching your criteria.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 gap-6">
              {filteredIndicators.map(indicator => {
                  const entry = entries[indicator.id] || { value: '', date: '', evidence: '', file: null, status: 'idle' };
                  const lastValue = indicator.values[indicator.values.length - 1]?.value ?? 'N/A';
                  
                  return (
                      <div key={indicator.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                          {/* Header */}
                          <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <div>
                                  <div className="flex items-center gap-2 mb-1">
                                      <Link 
                                        to={`/projects/${indicator.projectId}`}
                                        className="text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 hover:underline"
                                      >
                                          {getProjectName(indicator.projectId)}
                                      </Link>
                                      <span className="text-slate-300">•</span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">{indicator.type}</span>
                                  </div>
                                  <Link to={`/indicators/${indicator.id}`} className="block group-hover:text-blue-600 transition-colors">
                                      <h3 className="font-bold text-slate-900 text-lg">{indicator.name}</h3>
                                  </Link>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-600 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm">
                                  <div className="flex flex-col items-end">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase">Target</span>
                                      <span className="font-bold">{indicator.target}</span>
                                  </div>
                                  <div className="w-px h-6 bg-slate-200"></div>
                                  <div className="flex flex-col items-start">
                                      <span className="text-[10px] text-slate-400 font-bold uppercase">Last Value</span>
                                      <span className="font-bold text-slate-900">{lastValue}</span>
                                  </div>
                              </div>
                          </div>

                          {/* Data Entry Form */}
                          <div className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                  
                                  {/* Date */}
                                  <div className="md:col-span-2">
                                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                                          <Calendar className="w-3 h-3" /> Reporting Date
                                      </label>
                                      <input 
                                          type="date" 
                                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                          value={entry.date}
                                          onChange={(e) => handleEntryChange(indicator.id, 'date', e.target.value)}
                                      />
                                  </div>

                                  {/* Value */}
                                  <div className="md:col-span-2">
                                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                                        {indicator.type === IndicatorType.CATEGORICAL ? 'Category' : `Value (${indicator.unit || 'Count'})`}
                                      </label>
                                      
                                      {indicator.type === IndicatorType.CATEGORICAL ? (
                                        <div className="space-y-1.5">
                                          {indicator.categories && indicator.categories.length > 0 ? (
                                            indicator.categories.map((cat: CategoryDefinition) => {
                                              const isChecked = entry.selectedCategories.includes(cat.id);
                                              const allowMultiple = indicator.categoryConfig?.allowMultiple ?? false;
                                              
                                              return (
                                                <label
                                                  key={cat.id}
                                                  className="flex items-center p-2 border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                                                  style={{
                                                    borderColor: isChecked ? cat.color : undefined,
                                                    backgroundColor: isChecked ? `${cat.color}15` : undefined
                                                  }}
                                                >
                                                  <input
                                                    type={allowMultiple ? 'checkbox' : 'radio'}
                                                    name={`category-${indicator.id}`}
                                                    checked={isChecked}
                                                    onChange={() => handleCategoryToggle(indicator.id, cat.id, allowMultiple)}
                                                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                                                  />
                                                  <div className="ml-2 flex items-center gap-1.5">
                                                    <div
                                                      className="w-3 h-3 rounded"
                                                      style={{ backgroundColor: cat.color }}
                                                    />
                                                    <span className="text-sm font-medium text-slate-900">
                                                      {cat.label}
                                                    </span>
                                                  </div>
                                                </label>
                                              );
                                            })
                                          ) : (
                                            <p className="text-xs text-slate-500 italic p-2">
                                              No categories defined
                                            </p>
                                          )}
                                        </div>
                                      ) : (
                                        <input 
                                            type={getInputType(indicator.type)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                            value={entry.value}
                                            onChange={(e) => handleEntryChange(indicator.id, 'value', e.target.value)}
                                        />
                                      )}
                                      
                                      {entry.error && (
                                        <p className="text-xs text-red-600 mt-1">{entry.error}</p>
                                      )}
                                  </div>

                                  {/* Verification Evidence (Drag & Drop) */}
                                  <div className="md:col-span-6">
                                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                                          <LinkIcon className="w-3 h-3" /> Verification Source
                                      </label>
                                      
                                      {entry.file ? (
                                        <div className="w-full px-3 py-2.5 border border-blue-200 bg-blue-50 rounded-lg flex items-center justify-between animate-in fade-in">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="bg-blue-100 p-1 rounded text-blue-600">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm text-blue-900 truncate font-medium">{entry.file.name}</span>
                                                <span className="text-xs text-blue-500 whitespace-nowrap">({(entry.file.size / 1024).toFixed(0)} KB)</span>
                                            </div>
                                            <button 
                                                onClick={() => handleRemoveFile(indicator.id)}
                                                className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-white transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                      ) : (
                                        <div 
                                            className={`relative group transition-all duration-200 rounded-lg border-2 ${
                                                draggingId === indicator.id 
                                                ? 'border-blue-500 bg-blue-50' 
                                                : 'border-slate-300 border-dashed bg-white hover:border-slate-400'
                                            }`}
                                            onDragOver={(e) => handleDragOver(e, indicator.id)}
                                            onDragLeave={handleDragLeave}
                                            onDrop={(e) => handleDrop(e, indicator.id)}
                                        >
                                            <input 
                                                type="text" 
                                                placeholder={draggingId === indicator.id ? "Drop file now..." : "Paste link or drag file here"}
                                                className={`w-full px-3 py-2.5 bg-transparent text-sm focus:outline-none pl-9 rounded-lg z-10 relative ${draggingId === indicator.id ? 'pointer-events-none' : ''}`}
                                                value={entry.evidence}
                                                onChange={(e) => handleEntryChange(indicator.id, 'evidence', e.target.value)}
                                            />
                                            
                                            <LinkIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${draggingId === indicator.id ? 'text-blue-500' : 'text-slate-400'}`} />
                                            
                                            {!entry.evidence && (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                    <label className="cursor-pointer p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 block transition-colors" title="Upload File">
                                                        <UploadCloud className="w-4 h-4" />
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            onChange={(e) => e.target.files?.[0] && handleFileSelect(indicator.id, e.target.files[0])}
                                                        />
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                      )}
                                  </div>

                                  {/* Action */}
                                  <div className="md:col-span-2">
                                      <Button 
                                          className={`w-full h-[42px] justify-center transition-all duration-300 ${entry.status === 'saved' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                          disabled={!entry.value || entry.status === 'saving' || entry.status === 'saved'}
                                          onClick={() => handleSubmit(indicator.id)}
                                      >
                                          {entry.status === 'saving' ? (
                                              'Saving...'
                                          ) : entry.status === 'saved' ? (
                                              <>
                                                  <Check className="w-4 h-4 mr-1.5" /> Saved
                                              </>
                                          ) : (
                                              'Submit'
                                          )}
                                      </Button>
                                  </div>
                              </div>
                              
                              {/* Info / Hints */}
                              {(indicator.minExpected !== undefined || indicator.maxExpected !== undefined) && (
                                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>Expected Range: {indicator.minExpected ?? 0} - {indicator.maxExpected ?? '∞'}</span>
                                </div>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      )}
    </Layout>
  );
};
