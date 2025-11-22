import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Project } from '../types';
import { getProjects } from '../services/mockService';
import { Plus, Calendar, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProjects().then(data => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">Manage your organization's interventions</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {[1,2,3].map(i => (
             <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-lg"></div>
           ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link to={`/projects/${project.id}`} key={project.id} className="group block">
              <Card className="h-full hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                 <div className="flex justify-between items-start mb-4">
                   <div className="flex-1">
                     <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
                     <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                       project.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                     }`}>
                       {project.status}
                     </span>
                   </div>
                 </div>
                 
                 <p className="text-slate-600 text-sm mb-6 line-clamp-2">{project.description}</p>
                 
                 <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1.5" />
                      {project.startDate}
                    </div>
                    <div className="flex items-center">
                      <Activity className="w-3 h-3 mr-1.5" />
                      Logframe Active
                    </div>
                 </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
};