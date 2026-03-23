import React from "react";
import { Search, Filter } from "lucide-react";
import { Project } from "../../types";
import { Button } from "../ui/Button";

interface DataEntryToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedProject: string;
  setSelectedProject: (projectId: string) => void;
  projects: Project[];
  showDeleted: boolean;
  setShowDeleted: (show: boolean) => void;
  selectedCount: number;
  onBatchDelete: () => void;
  onBatchRestore: () => void;
}

export const DataEntryToolbar: React.FC<DataEntryToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  selectedProject,
  setSelectedProject,
  projects,
  showDeleted,
  setShowDeleted,
  selectedCount,
  onBatchDelete,
  onBatchRestore,
}) => {
  return (
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
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-300 rounded-md px-3 py-2">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
          />
          Show Deleted
        </label>
        <Button
          variant="outline"
          size="sm"
          onClick={onBatchDelete}
          disabled={selectedCount === 0}
        >
          Delete Selected
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onBatchRestore}
          disabled={selectedCount === 0}
        >
          Restore Selected
        </Button>
      </div>
    </div>
  );
};
