
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { CurrentUser } from '../types';
import { api } from '../services/api';
import { User, Bell, Lock, Mail, Shield, Calendar } from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then((data) => setUser(data))
      .catch((error) => {
        console.error('Failed to load user profile', error);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
  };

  if (loading) return <Layout><div className="p-8 text-center text-slate-500">Loading settings...</div></Layout>;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 mt-1">View your account details and system settings status.</p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
           {[
             { id: 'profile', label: 'My Profile', icon: User },
             { id: 'notifications', label: 'Notifications', icon: Bell },
             { id: 'security', label: 'Security', icon: Lock },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`
                 w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                 ${activeTab === tab.id 
                   ? 'bg-blue-50 text-blue-700' 
                   : 'text-slate-600 hover:bg-white hover:text-slate-900'}
               `}
             >
               <tab.icon className={`w-4 h-4 mr-3 ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'}`} />
               {tab.label}
             </button>
           ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 max-w-3xl">
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-6 md:p-8 space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Account Information</h2>
                    <p className="text-sm text-slate-500">These details are pulled from your authenticated account.</p>
                  </div>

                  {!user && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                      Unable to load account details. Please log in again.
                    </div>
                  )}

                  {user && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={user.email}
                            disabled
                            className="w-full pl-9 px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-slate-600"
                          />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={user.role}
                            disabled
                            className="w-full pl-9 px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-slate-600"
                          />
                          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
                        <input
                          type="text"
                          value={user.id}
                          disabled
                          className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-slate-600"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Joined</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formatDate(user.createdAt)}
                            disabled
                            className="w-full pl-9 px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-slate-600"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-6 md:p-8 space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
                    <p className="text-sm text-slate-500">
                      Notification settings are not available yet. This section will be enabled once the API supports it.
                    </p>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-6 md:p-8 space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Security Settings</h2>
                    <p className="text-sm text-slate-500">
                      Password updates and account deletion are not available yet. These actions will appear once the API supports them.
                    </p>
                  </div>
                </div>
              )}

           </div>
        </div>
      </div>
    </Layout>
  );
};
