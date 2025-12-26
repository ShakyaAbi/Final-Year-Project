
import React, { useEffect, useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Project } from '../types';
import { api } from '../services/api';
import { Plus, Calendar, Activity, Search, Filter, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { ProjectWizard } from '../components/ProjectWizard';

type SortOption = 'name' | 'startDate' | 'endDate';
type SortOrder = 'asc' | 'desc';

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Wizard State
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  useEffect(() => {
    api.getProjects()
      .then(data => {
        setProjects(data);
        setError(null);
      })
      .catch((err) => setError(err?.message || 'Failed to load projects'))
      .finally(() => setLoading(false));
  }, [isWizardOpen]); // Refresh when wizard closes/saves

  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    // Filter by Status
    if (statusFilter !== 'All') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Filter by Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [projects, statusFilter, searchQuery, sortBy, sortOrder]);

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Manage your organization's interventions</p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
         {/* Search */}
         <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
            />
         </div>
         
         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="text-slate-400 w-4 h-4 hidden sm:block" />
              <select 
                  className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
              >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                  <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            {/* Sort */}
            <div className="flex items-center gap-2">
               <span className="text-xs text-slate-500 font-medium hidden sm:block">Sort by:</span>
               <select 
                  className="px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
               >
                  <option value="startDate">Start Date</option>
                  <option value="endDate">End Date</option>
                  <option value="name">Name</option>
               </select>
               <button 
                 onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                 className="p-2 border border-slate-300 rounded-md hover:bg-slate-50 text-slate-600 transition-colors"
                 title={sortOrder === 'asc' ? "Ascending" : "Descending"}
               >
                 <ArrowUpDown className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {error ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-red-300">
          <p className="text-red-600 text-lg font-medium">Failed to load projects</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3].map(i => (
             <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-lg"></div>
           ))}
        </div>
      ) : filteredAndSortedProjects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
           <p className="text-slate-500 text-lg font-medium">No projects found.</p>
           <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search query.</p>
           <Button 
             variant="outline" 
             className="mt-4"
             onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
           >
             Clear Filters
           </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedProjects.map((project) => (
            <Link to={`/projects/${project.id}`} key={project.id} className="group block h-full">
              <Card className="h-full hover:shadow-md transition-shadow border-l-4 border-l-blue-500 flex flex-col">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex-1">
                     <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{project.name}</h3>
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                       project.status === 'Active' ? 'bg-green-100 text-green-800' : 
                       project.status === 'Draft' ? 'bg-slate-100 text-slate-800' : 
                       'bg-amber-100 text-amber-800'
                     }`}>
                       {project.status}
                     </span>
                   </div>
                 </div>
                 
                 <p className="text-slate-600 text-sm mb-6 line-clamp-3 flex-grow">{project.description}</p>
                 
                 <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500 mt-auto">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1.5" />
                      {project.startDate}
                    </div>
                    <div className="flex items-center">
                      <Activity className="w-3 h-3 mr-1.5" />
                      {project.logframe.length > 0 ? 'Logframe Active' : 'No Logframe'}
                    </div>
                 </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Project Creation Wizard Modal */}
      <Modal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)}
        title="" // Title handled inside wizard
        size="xl"
      >
        <ProjectWizard onClose={() => setIsWizardOpen(false)} />
      </Modal>
    </Layout>
  );
};
