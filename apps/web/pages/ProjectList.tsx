
import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Project } from '../types';
import { api } from '../services/api';
import { Plus, Calendar, Activity, Search, Filter, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { ProjectWizard } from '../components/ProjectWizard';
import { Card } from '../components/ui/Card';

type SortOption = 'name' | 'startDate' | 'endDate';
type SortOrder = 'asc' | 'desc';

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: string } | null>(null);
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

  useEffect(() => {
    api.me()
      .then((user) => setCurrentUser({ role: user.role }))
      .catch(() => setCurrentUser(null));
  }, []);

  const isManagerOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

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
    <>

        <div className="relative z-10 px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Projects
              </h1>
              <p className="max-w-2xl mt-1 text-slate-500">
                Manage your organization's projects and monitoring activities
              </p>
            </div>
            <div>
              {isManagerOrAdmin && (
                <Button 
                  onClick={() => setIsWizardOpen(true)}
                  className="shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
             {/* Search */}
             <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-5 py-3 rounded-2xl border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white/50 text-slate-900 shadow-sm transition-all placeholder:text-slate-400"
                />
             </div>
             
             <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="text-slate-400 w-4 h-4 hidden sm:block" />
                  <select 
                      className="px-4 py-3 bg-white/50 border-0 ring-1 ring-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 cursor-pointer shadow-sm transition-all"
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

                <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                   <select 
                      className="px-4 py-3 bg-white/50 border-0 ring-1 ring-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 cursor-pointer shadow-sm transition-all"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                   >
                      <option value="startDate">Start Date</option>
                      <option value="endDate">End Date</option>
                      <option value="name">Name</option>
                   </select>
                   <button 
                     onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                     className="p-3 border-0 ring-1 ring-slate-200 rounded-2xl hover:bg-white text-slate-600 transition-all shadow-sm active:scale-95"
                     title={sortOrder === 'asc' ? "Ascending" : "Descending"}
                   >
                     <ArrowUpDown className="w-5 h-5" />
                   </button>
                </div>
             </div>
          </div>

          {error ? (
            <div className="text-center py-20 bg-white/50 backdrop-blur rounded-3xl border-2 border-dashed border-red-200">
              <p className="text-red-600 text-xl font-bold">Connection Issue</p>
              <p className="text-red-500 text-sm mt-2 max-w-sm mx-auto">{error}</p>
              <Button variant="outline" className="mt-8 px-8" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="h-64 bg-slate-200/50 animate-pulse rounded-3xl backdrop-blur-sm shadow-inner"></div>
               ))}
            </div>
          ) : filteredAndSortedProjects.length === 0 ? (
            <div className="text-center py-24 bg-white/50 backdrop-blur rounded-3xl border-2 border-dashed border-slate-300 shadow-sm">
               <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-slate-400 w-8 h-8" />
               </div>
               <p className="text-slate-600 text-xl font-extrabold tracking-tight">No matching projects</p>
               <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto italic">Try refining your search terms or status filters.</p>
               <Button 
                 variant="outline" 
                 className="mt-8 px-6 rounded-xl"
                 onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
               >
                 View All Projects
               </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
                {filteredAndSortedProjects.map((project) => (
                  <div key={project.id}>
                    <Link to={`/projects/${project.id}`} className="group block h-full">
                      <Card className="h-full border-slate-200/60 bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 flex flex-col p-6 overflow-hidden relative">
                        {/* Status Ribbon Indicator */}
                        <div className={`absolute top-0 right-0 w-16 h-16 pointer-events-none transition-opacity group-hover:opacity-100 opacity-60`}>
                          <div className={`absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rotate-45 w-24 py-1 flex justify-center text-[10px] font-bold uppercase tracking-widest ${
                            project.status === 'Active' ? 'bg-emerald-500 text-white' : 
                            project.status === 'Draft' ? 'bg-slate-400 text-white' : 
                            'bg-amber-500 text-white'
                          }`}>
                            {project.status}
                          </div>
                        </div>

                        <div className="flex justify-between items-start mb-5">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-extrabold text-xl text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                              {project.name}
                            </h3>
                            <div className="flex items-center gap-3 mt-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                project.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                project.status === 'Draft' ? 'bg-slate-50 text-slate-500 border border-slate-100' : 
                                'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>
                                {project.status}
                              </span>
                              {project.location && (
                                <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center">
                                  <span className="w-1 h-1 rounded-full bg-slate-300 mr-2" />
                                  {project.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-slate-500 text-sm mb-8 line-clamp-3 flex-grow leading-relaxed">
                          {project.description || "No description provided for this project."}
                        </p>
                        
                        <div className="pt-5 border-t border-slate-100/80 flex items-center justify-between mt-auto">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Timeline</span>
                            <div className="flex items-center text-xs font-bold text-slate-600">
                              <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-500/70" />
                              {project.startDate ? project.startDate.split('T')[0] : 'NO DATE'}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1 items-end">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Monitoring</span>
                            <div className="flex items-center text-xs font-black text-slate-600 bg-blue-50/50 px-2 py-1 rounded-lg">
                              <Activity className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                              <span className="text-blue-700">{project._count?.indicators ?? 0}</span>
                              <span className="ml-1 text-[10px] text-blue-600/70">INDICATORS</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </div>
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
        </div>
    </>
  );
};
