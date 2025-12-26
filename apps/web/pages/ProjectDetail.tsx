
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Project, Indicator, LogframeNode, NodeType, ProjectStats, ActivityLog } from '../types';
import { api } from '../services/api';
import { getIndicators, addLogframeNode, updateLogframeNode, getProjectStats, getProjectActivities } from '../services/mockService';
import { Button } from '../components/ui/Button';
import { LogframeTree } from '../components/LogframeTree';
import { Modal } from '../components/ui/Modal';
import { LogframeNodeForm } from '../components/LogframeNodeForm';
import { IndicatorCard } from '../components/IndicatorCard';
import { IndicatorWizard } from '../components/IndicatorWizard';
import { 
  ArrowLeft, BarChart2, GitBranch, Layers, Plus, Search, Filter, 
  DollarSign, Clock, Users, CheckCircle, AlertTriangle, Activity, Info, ClipboardCheck
} from 'lucide-react';
import { Card } from '../components/ui/Card';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'logframe' | 'indicators'>('overview');
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  // Modal States
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [nodeModalMode, setNodeModalMode] = useState<'create' | 'edit'>('create');
  const [selectedNode, setSelectedNode] = useState<LogframeNode | null>(null);
  
  // State for adding indicator from tree
  const [selectedNodeForIndicator, setSelectedNodeForIndicator] = useState<LogframeNode | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = () => {
    if (id) {
      setLoading(true);
      Promise.all([
        api.getProject(id),
        getIndicators(id),
        getProjectStats(id),
        getProjectActivities(id)
      ]).then(([projData, indData, statsData, actData]) => {
        setProject(projData ? { ...projData } : undefined);
        setIndicators(indData);
        setStats(statsData);
        setActivities(actData);
      }).catch((error) => {
        console.error('Failed to load project detail', error);
        setProject(undefined);
        setIndicators([]);
        setStats(null);
        setActivities([]);
      }).finally(() => {
        setLoading(false);
      });
    }
  };

  useEffect(() => {
    refreshData();
  }, [id, isWizardOpen]); // Also refresh when wizard closes (assuming success)

  const handleAddRootGoal = () => {
    setSelectedNode(null);
    setNodeModalMode('create');
    setIsNodeModalOpen(true);
  };

  const handleAddChild = (parentNode: LogframeNode) => {
    setSelectedNode(parentNode);
    setNodeModalMode('create');
    setIsNodeModalOpen(true);
  };

  const handleEditNode = (node: LogframeNode) => {
    setSelectedNode(node);
    setNodeModalMode('edit');
    setIsNodeModalOpen(true);
  };

  const handleAddIndicator = (node: LogframeNode) => {
    setSelectedNodeForIndicator(node);
    setIsWizardOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!project || isDeleting) return;
    const confirmed = window.confirm(`Delete project "${project.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await api.deleteProject(project.id);
      navigate('/projects');
    } catch (error) {
      console.error('Failed to delete project', error);
      alert('Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveNode = async (data: Partial<LogframeNode>) => {
    if (!project) return;

    try {
      if (nodeModalMode === 'create') {
        const newNode: LogframeNode = {
          id: `node-${Date.now()}`,
          type: data.type as NodeType,
          title: data.title || 'Untitled',
          description: data.description,
          assumptions: data.assumptions,
          risks: data.risks,
          verificationMethod: data.verificationMethod,
          children: [],
          indicatorCount: 0
        };
        await addLogframeNode(project.id, selectedNode ? selectedNode.id : null, newNode);
      } else {
        if (selectedNode) {
          await updateLogframeNode(project.id, selectedNode.id, data);
        }
      }
      setIsNodeModalOpen(false);
      refreshData();
    } catch (error) {
      console.error("Failed to save node", error);
      alert("Failed to save changes");
    }
  };

  const filteredIndicators = indicators.filter(ind => 
    ind.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    ind.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) return <Layout><div className="p-8 text-center text-slate-500">Loading Project...</div></Layout>;
  if (!project) return <Layout><div className="p-8 text-center text-red-500">Project not found</div></Layout>;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <Link to="/projects" className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
            <p className="text-slate-500 mt-1">{project.startDate} — {project.endDate}</p>
          </div>
          <div className="flex space-x-3">
             <Link to={`/data-entry?projectId=${project.id}`}>
                <Button variant="secondary">
                  <ClipboardCheck className="w-4 h-4 mr-2" /> Data Entry
                </Button>
             </Link>
             <Button variant="outline">Edit Project</Button>
             <Button variant="danger" onClick={handleDeleteProject} isLoading={isDeleting}>
               Delete
             </Button>
             <Button onClick={() => { setSelectedNodeForIndicator(null); setIsWizardOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Indicator
             </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Layers },
            { id: 'logframe', label: 'Logframe', icon: GitBranch },
            { id: 'indicators', label: 'Indicators', icon: BarChart2 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
              `}
            >
              <tab.icon className={`mr-2 w-5 h-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Budget Utilized</span>
                    <div className="p-2 bg-green-50 rounded-full text-green-600"><DollarSign className="w-4 h-4" /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.budgetSpent)}</p>
                  <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: `${(stats.budgetSpent / stats.budgetTotal) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">of {formatCurrency(stats.budgetTotal)} total</p>
               </div>

               <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Time Elapsed</span>
                    <div className="p-2 bg-blue-50 rounded-full text-blue-600"><Clock className="w-4 h-4" /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{Math.round((stats.daysElapsed / stats.daysTotal) * 100)}%</p>
                  <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${(stats.daysElapsed / stats.daysTotal) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{stats.daysElapsed} days of {stats.daysTotal} days</p>
               </div>

               <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Beneficiaries</span>
                    <div className="p-2 bg-purple-50 rounded-full text-purple-600"><Users className="w-4 h-4" /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{stats.beneficiariesReached.toLocaleString()}</p>
                  <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${(stats.beneficiariesReached / stats.beneficiariesTarget) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Target: {stats.beneficiariesTarget.toLocaleString()}</p>
               </div>

               <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Activities</span>
                    <div className="p-2 bg-amber-50 rounded-full text-amber-600"><CheckCircle className="w-4 h-4" /></div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{stats.activitiesCompleted}</p>
                  <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${(stats.activitiesCompleted / stats.activitiesTotal) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{stats.activitiesTotal - stats.activitiesCompleted} remaining</p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Main Column */}
               <div className="lg:col-span-2 space-y-6">
                  <Card title="Executive Summary">
                    <div className="text-slate-600 leading-relaxed space-y-4">
                      <p>{project.description}</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">Sector: Agriculture</span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">Region: Northern District</span>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">Donor: Global Fund</span>
                      </div>
                    </div>
                  </Card>

                  {/* Key Alerts Section - Dummy Content */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                     <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-lg font-semibold text-slate-900">Critical Attention Needed</h3>
                        <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">2 Active</span>
                     </div>
                     <div className="divide-y divide-slate-100">
                        <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer">
                           <div className="p-2 bg-red-50 rounded-full h-fit text-red-600 mt-1"><AlertTriangle className="w-5 h-5" /></div>
                           <div>
                              <h4 className="text-sm font-bold text-slate-900">Anomaly in Maternal Mortality Ratio</h4>
                              <p className="text-sm text-slate-500 mt-1">Value spike detected on Oct 15. Deviation {'>'} 2 std dev from baseline.</p>
                           </div>
                        </div>
                        <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer">
                           <div className="p-2 bg-amber-50 rounded-full h-fit text-amber-600 mt-1"><Clock className="w-5 h-5" /></div>
                           <div>
                              <h4 className="text-sm font-bold text-slate-900">Quarterly Report Overdue</h4>
                              <p className="text-sm text-slate-500 mt-1">Q3 2024 Progress Report was due 5 days ago. Please submit for review.</p>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Sidebar Column */}
               <div className="space-y-6">
                  <Card title="Recent Activity" className="h-full">
                     <div className="relative pl-4 border-l-2 border-slate-100 space-y-6 py-2">
                        {activities.map((activity, idx) => (
                           <div key={activity.id} className="relative">
                              <div className={`
                                 absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white
                                 ${activity.type === 'danger' ? 'bg-red-500' : activity.type === 'success' ? 'bg-green-500' : activity.type === 'warning' ? 'bg-amber-500' : 'bg-blue-400'}
                              `}></div>
                              <div className="flex flex-col">
                                 <span className="text-xs text-slate-400 mb-0.5">{activity.date}</span>
                                 <p className="text-sm text-slate-800 font-medium">
                                    <span className="font-bold text-slate-900">{activity.user}</span> {activity.action}
                                 </p>
                                 <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-1 w-fit">
                                    {activity.item}
                                 </span>
                              </div>
                           </div>
                        ))}
                     </div>
                     <Button variant="ghost" size="sm" className="w-full mt-4 text-xs">View All Activity</Button>
                  </Card>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'logframe' && (
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 min-h-[600px]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">Logframe Matrix</h3>
              {project.logframe.length === 0 && (
                <Button onClick={handleAddRootGoal} size="sm">
                   <Plus className="w-4 h-4 mr-2" /> Add Primary Goal
                </Button>
              )}
            </div>

            {project.logframe.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50">
                <p className="text-slate-500 mb-4">No logframe structure defined yet.</p>
                <Button onClick={handleAddRootGoal}>Create First Goal</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {project.logframe.map(node => (
                  <LogframeTree 
                    key={node.id} 
                    node={node} 
                    indicators={indicators}
                    onAddChild={handleAddChild}
                    onEdit={handleEditNode}
                    onAddIndicator={handleAddIndicator}
                    isRoot={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'indicators' && (
          <div className="space-y-6">
            {/* Search and Filter Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search indicators..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
                />
              </div>
              <div className="flex gap-2">
                <button className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50">
                  All Categories
                </button>
                <button className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-slate-700 hover:bg-slate-50">
                  All Status
                </button>
              </div>
            </div>

            {/* Indicators Grid */}
            {filteredIndicators.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredIndicators.map(ind => (
                  <IndicatorCard key={ind.id} indicator={ind} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                <p className="text-slate-500">No indicators found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logframe Node Modal */}
      <Modal 
        isOpen={isNodeModalOpen} 
        onClose={() => setIsNodeModalOpen(false)}
        title={nodeModalMode === 'create' ? 'Add Logframe Component' : 'Edit Component'}
      >
        <div className="p-6">
          <LogframeNodeForm 
            mode={nodeModalMode}
            initialData={nodeModalMode === 'edit' && selectedNode ? selectedNode : {}}
            parentType={nodeModalMode === 'create' && selectedNode ? selectedNode.type : null}
            onSave={handleSaveNode}
            onCancel={() => setIsNodeModalOpen(false)}
          />
        </div>
      </Modal>

      {/* Indicator Wizard Modal */}
      <Modal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)}
        title="" // Title handled inside wizard
        size="xl"
      >
        <IndicatorWizard 
          project={project}
          initialNodeId={selectedNodeForIndicator?.id}
          onClose={() => setIsWizardOpen(false)}
        />
      </Modal>
    </Layout>
  );
};
