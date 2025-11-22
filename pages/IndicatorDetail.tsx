import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { useParams, Link } from 'react-router-dom';
import { Indicator, IndicatorValue } from '../types';
import { getIndicator, saveValue } from '../services/mockService';
import { Button } from '../components/ui/Button';
import { IndicatorCharts } from '../components/IndicatorCharts';
import { ArrowLeft, AlertTriangle, Save, History } from 'lucide-react';

export const IndicatorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [indicator, setIndicator] = useState<Indicator | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [entryValue, setEntryValue] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      getIndicator(id).then(data => {
        setIndicator(data);
        setLoading(false);
      });
    }
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicator || !entryValue) return;

    setSaving(true);
    const val = parseFloat(entryValue);
    
    await saveValue(indicator.id, val, entryDate);

    // Optimistic update for UI
    const newEntry: IndicatorValue = {
        id: `temp-${Date.now()}`,
        date: entryDate,
        value: val,
        isAnomaly: val > indicator.maxExpected || val < indicator.minExpected,
        anomalyReason: (val > indicator.maxExpected || val < indicator.minExpected) ? 'Out of expected bounds' : undefined
    };

    setIndicator(prev => prev ? ({
        ...prev,
        values: [...prev.values, newEntry]
    }) : undefined);

    setEntryValue('');
    setSaving(false);
  };

  if (loading) return <Layout><div className="p-8 text-center">Loading...</div></Layout>;
  if (!indicator) return <Layout><div className="p-8 text-center text-red-500">Indicator not found</div></Layout>;

  const anomalies = indicator.values.filter(v => v.isAnomaly);

  return (
    <Layout>
       {/* Header */}
       <div className="mb-6">
        <Link to={`/projects/${indicator.projectId}`} className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Project
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {indicator.type}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                    v{indicator.currentVersion}
                </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{indicator.name}</h1>
          </div>
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" />
            Definition History
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-6">
            <IndicatorCharts indicator={indicator} />
            
            {/* Anomaly List */}
            {anomalies.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-6">
                    <div className="flex items-center mb-4 text-red-800">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        <h3 className="font-semibold">Detected Anomalies ({anomalies.length})</h3>
                    </div>
                    <div className="space-y-3">
                        {anomalies.slice(-3).reverse().map(a => (
                            <div key={a.id} className="bg-white p-3 rounded border border-red-100 text-sm flex justify-between items-center">
                                <div>
                                    <span className="font-medium text-slate-900 mr-2">{a.date}</span>
                                    <span className="text-slate-500">Value: {a.value}</span>
                                </div>
                                <span className="text-red-600 font-medium text-xs">{a.anomalyReason}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Sidebar: Data Entry */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-lg shadow-slate-200/50">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Weekly Data Entry</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Date</label>
                        <input 
                            type="date" 
                            value={entryDate}
                            onChange={e => setEntryDate(e.target.value)}
                            className="w-full rounded-md border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
                        <input 
                            type="number" 
                            step="0.01"
                            placeholder="e.g. 45"
                            value={entryValue}
                            onChange={e => setEntryValue(e.target.value)}
                            className="w-full rounded-md border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            Expected range: {indicator.minExpected} - {indicator.maxExpected}
                        </p>
                    </div>
                    
                    <Button type="submit" className="w-full" isLoading={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        Save Entry
                    </Button>
                </form>
            </div>

            <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-900 text-sm mb-3">Indicator Details</h4>
                <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-slate-500">Target</dt>
                        <dd className="font-medium text-slate-900">{indicator.target}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-slate-500">Baseline</dt>
                        <dd className="font-medium text-slate-900">{indicator.baseline}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-slate-500">Frequency</dt>
                        <dd className="font-medium text-slate-900">{indicator.frequency}</dd>
                    </div>
                </dl>
            </div>
        </div>

      </div>
    </Layout>
  );
};