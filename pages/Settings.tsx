import React from 'react';
import { Layout } from '../components/Layout';

export const Settings: React.FC = () => {
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your organization preferences</p>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 text-center text-slate-500">
          <p>Global application settings will appear here.</p>
        </div>
      </div>
    </Layout>
  );
};