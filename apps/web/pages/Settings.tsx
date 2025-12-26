
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { UserProfile } from '../types';
import { getUserProfile, updateUserProfile } from '../services/mockService';
import { Button } from '../components/ui/Button';
import { 
  User, Bell, Lock, Mail, Globe, Briefcase, Camera, 
  CheckCircle, AlertTriangle 
} from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  
  // Security Form
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  useEffect(() => {
    getUserProfile().then(data => {
      setProfile(data);
      setFormData(data);
      setLoading(false);
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile(formData);
      setSuccessMsg('Profile updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleNotification = (key: keyof UserProfile['notificationPreferences']) => {
    if (!formData.notificationPreferences) return;
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences!,
        [key]: !prev.notificationPreferences![key]
      }
    }));
  };

  if (loading) return <Layout><div className="p-8 text-center text-slate-500">Loading settings...</div></Layout>;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500 mt-1">Manage your profile, preferences, and security settings.</p>
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
                <form onSubmit={handleSaveProfile} className="p-6 md:p-8 space-y-8">
                   <div className="flex items-start justify-between">
                     <div>
                       <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                       <p className="text-sm text-slate-500">Update your photo and personal details.</p>
                     </div>
                     <div className="flex items-center gap-4">
                        <div className="relative group cursor-pointer">
                           <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-white shadow-sm">
                             {formData.avatar ? <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-8 h-8" />}
                           </div>
                           <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Camera className="w-5 h-5 text-white" />
                           </div>
                        </div>
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <input 
                           type="text" 
                           value={formData.name || ''}
                           onChange={e => setFormData({...formData, name: e.target.value})}
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                        />
                      </div>
                      
                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <div className="relative">
                          <input 
                             type="email" 
                             value={formData.email || ''}
                             onChange={e => setFormData({...formData, email: e.target.value})}
                             className="w-full pl-9 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                          />
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                        <div className="relative">
                          <input 
                             type="text" 
                             value={formData.role || ''}
                             onChange={e => setFormData({...formData, role: e.target.value})}
                             className="w-full pl-9 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                          />
                          <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                        <input 
                           type="text" 
                           value={formData.organization || ''}
                           disabled
                           className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-md text-slate-500"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                        <div className="relative">
                          <select 
                            value={formData.timezone}
                            onChange={e => setFormData({...formData, timezone: e.target.value})}
                            className="w-full pl-9 px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 appearance-none"
                          >
                             <option>UTC-8 (Pacific Time)</option>
                             <option>UTC-5 (Eastern Time)</option>
                             <option>UTC+0 (London)</option>
                             <option>UTC+1 (Paris)</option>
                             <option>UTC+3 (Nairobi)</option>
                             <option>UTC+5:30 (Mumbai)</option>
                          </select>
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                   </div>

                   <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                      {successMsg && (
                        <div className="text-green-600 text-sm font-medium flex items-center animate-in fade-in">
                           <CheckCircle className="w-4 h-4 mr-2" /> {successMsg}
                        </div>
                      )}
                      <div className="ml-auto">
                        <Button type="submit" isLoading={saving}>Save Changes</Button>
                      </div>
                   </div>
                </form>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="p-6 md:p-8 space-y-8">
                   <div>
                       <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
                       <p className="text-sm text-slate-500">Choose how and when you want to be notified.</p>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                         <div>
                            <h3 className="text-sm font-semibold text-slate-900">Email Alerts</h3>
                            <p className="text-xs text-slate-500 mt-1">Receive critical updates via email.</p>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={formData.notificationPreferences?.emailAlerts}
                              onChange={() => toggleNotification('emailAlerts')}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                         </label>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                         <div>
                            <h3 className="text-sm font-semibold text-slate-900">Anomaly Detections</h3>
                            <p className="text-xs text-slate-500 mt-1">Instant alerts when data deviates significantly.</p>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={formData.notificationPreferences?.anomalyAlerts}
                              onChange={() => toggleNotification('anomalyAlerts')}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                         </label>
                      </div>

                      <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                         <div>
                            <h3 className="text-sm font-semibold text-slate-900">Weekly Digest</h3>
                            <p className="text-xs text-slate-500 mt-1">A summary of project progress every Monday.</p>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={formData.notificationPreferences?.weeklyDigest}
                              onChange={() => toggleNotification('weeklyDigest')}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                         </label>
                      </div>
                   </div>

                   <div className="flex justify-end pt-6 border-t border-slate-100">
                      <Button onClick={handleSaveProfile} isLoading={saving}>Save Preferences</Button>
                   </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-6 md:p-8 space-y-8">
                   <div>
                       <h2 className="text-lg font-bold text-slate-900">Security Settings</h2>
                       <p className="text-sm text-slate-500">Update your password and security keys.</p>
                   </div>

                   <form className="max-w-md space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                        <input 
                           type="password" 
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                        <input 
                           type="password" 
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                        <input 
                           type="password" 
                           className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                        />
                      </div>
                      
                      <div className="pt-2">
                         <Button type="button" onClick={() => setSuccessMsg("Password updated!")} isLoading={saving}>Update Password</Button>
                      </div>
                      {successMsg && (
                        <p className="text-green-600 text-sm font-medium mt-2">{successMsg}</p>
                      )}
                   </form>

                   <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-4">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                         <h3 className="text-sm font-bold text-red-900">Danger Zone</h3>
                         <p className="text-xs text-red-700 mt-1 mb-3">Deleting your account is permanent. All your data will be wiped immediately.</p>
                         <Button variant="danger" size="sm">Delete Account</Button>
                      </div>
                   </div>
                </div>
              )}

           </div>
        </div>
      </div>
    </Layout>
  );
};
