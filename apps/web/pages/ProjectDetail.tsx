import React, { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Project,
  Indicator,
  LogframeNode,
  NodeType,
  ProjectStats,
  ActivityLog,
} from "../types";
import { api } from "../services/api";
import { Button } from "../components/ui/Button";
import { LogframeTree } from "../components/LogframeTree";
import { Modal } from "../components/ui/Modal";
import { LogframeNodeForm } from "../components/LogframeNodeForm";
import { IndicatorCard } from "../components/IndicatorCard";
import { IndicatorWizard } from "../components/IndicatorWizard";
import {
  ArrowLeft,
  BarChart2,
  GitBranch,
  Layers,
  Plus,
  Search,
  Filter,
  DollarSign,
  Clock,
  Users,
  CheckCircle,
  AlertTriangle,
  Activity,
  Info,
  ClipboardCheck,
} from "lucide-react";
import { Card } from "../components/ui/Card";

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | undefined>(undefined);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<
    "overview" | "logframe" | "indicators"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "Draft",
    startDate: "",
    endDate: "",
    sectors: "",
    location: "",
    donor: "",
    budgetAmount: "",
    budgetCurrency: "",
  });
  const navigate = useNavigate();

  // Modal States
  const [isNodeModalOpen, setIsNodeModalOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [nodeModalMode, setNodeModalMode] = useState<"create" | "edit">(
    "create",
  );
  const [selectedNode, setSelectedNode] = useState<LogframeNode | null>(null);
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(
    null,
  );

  // State for adding indicator from tree
  const [selectedNodeForIndicator, setSelectedNodeForIndicator] =
    useState<LogframeNode | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");

  const refreshData = () => {
    if (id) {
      setLoading(true);
      Promise.all([
        api.getProject(id),
        api.getIndicators(id),
        api.getProjectStats(id),
        api.getProjectActivities(id),
      ])
        .then(([projData, indData, statsData, actData]) => {
          setProject(projData ? { ...projData } : undefined);
          setIndicators(indData);
          setStats(statsData);
          setActivities(actData);
        })
        .catch((error) => {
          console.error("Failed to load project detail", error);
          setProject(undefined);
          setIndicators([]);
          setStats(null);
          setActivities([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    refreshData();
  }, [id, isWizardOpen]); // Also refresh when wizard closes (assuming success)

  const toDateInputValue = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  const openEditModal = () => {
    if (!project) return;
    setEditForm({
      name: project.name ?? "",
      description: project.description ?? "",
      status: project.status ?? "Draft",
      startDate: toDateInputValue(project.startDate),
      endDate: toDateInputValue(project.endDate),
      sectors: (project.sectors || []).join(", "),
      location: project.location ?? "",
      donor: project.donor ?? "",
      budgetAmount:
        project.budgetAmount !== undefined && project.budgetAmount !== null
          ? String(project.budgetAmount)
          : "",
      budgetCurrency: project.budgetCurrency ?? "",
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleAddRootGoal = () => {
    setSelectedNode(null);
    setNodeModalMode("create");
    setIsNodeModalOpen(true);
  };

  const handleAddChild = (parentNode: LogframeNode) => {
    setSelectedNode(parentNode);
    setNodeModalMode("create");
    setIsNodeModalOpen(true);
  };

  const handleEditNode = (node: LogframeNode) => {
    setSelectedNode(node);
    setNodeModalMode("edit");
    setIsNodeModalOpen(true);
  };

  const handleAddIndicator = (node: LogframeNode) => {
    setSelectedNodeForIndicator(node);
    setIsWizardOpen(true);
  };

  const handleDeleteProject = async () => {
    if (!project || isDeleting) return;
    const confirmed = window.confirm(
      `Delete project "${project.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await api.deleteProject(project.id);
      navigate("/projects");
    } catch (error) {
      console.error("Failed to delete project", error);
      alert("Failed to delete project.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveProject = async () => {
    if (!project || isSavingEdit) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const sectors = editForm.sectors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const budgetAmount =
        editForm.budgetAmount.trim() === ""
          ? undefined
          : Number(editForm.budgetAmount);
      if (budgetAmount !== undefined && Number.isNaN(budgetAmount)) {
        setEditError("Budget amount must be a number.");
        return;
      }
      const updated = await api.updateProject(project.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        status: editForm.status as Project["status"],
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        sectors,
        location: editForm.location.trim() || undefined,
        donor: editForm.donor.trim() || undefined,
        budgetAmount,
        budgetCurrency: editForm.budgetCurrency.trim() || undefined,
      });
      setProject(updated);
      setIsEditOpen(false);
    } catch (error) {
      console.error("Failed to update project", error);
      setEditError(
        error instanceof Error ? error.message : "Failed to update project",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveNode = async (data: Partial<LogframeNode>) => {
    if (!project) return;

    try {
      if (nodeModalMode === "create") {
        const newNode: LogframeNode = {
          id: `node-${Date.now()}`,
          type: data.type as NodeType,
          title: data.title || "Untitled",
          description: data.description,
          assumptions: data.assumptions,
          risks: data.risks,
          verificationMethod: data.verificationMethod,
          children: [],
          indicatorCount: 0,
        };
        await api.addLogframeNode(project.id, {
          type: newNode.type,
          title: newNode.title,
          description: newNode.description,
          parentId: selectedNode ? selectedNode.id : null,
        });
      } else {
        if (selectedNode) {
          await api.updateLogframeNode(selectedNode.id, {
            title: data.title,
            description: data.description,
            type: data.type as NodeType,
          });
        }
      }
      setIsNodeModalOpen(false);
      refreshData();
    } catch (error) {
      console.error("Failed to save node", error);
      alert("Failed to save changes");
    }
  };

  const filteredIndicators = indicators.filter(
    (ind) =>
      ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ind.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (value?: string) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  if (loading)
    return (
      <Layout>
        <div className="p-8 text-center text-slate-500">Loading Project...</div>
      </Layout>
    );
  if (!project)
    return (
      <Layout>
        <div className="p-8 text-center text-red-500">Project not found</div>
      </Layout>
    );

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/projects"
          className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Link>
        <div className="bg-white/80 backdrop-blur border border-slate-200/70 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {project.name}
              </h1>
              <p className="text-slate-500 mt-1">
                {formatDate(project.startDate)} — {formatDate(project.endDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/data-entry?projectId=${project.id}`}>
                <Button variant="secondary">
                  <ClipboardCheck className="w-4 h-4 mr-2" /> Data Entry
                </Button>
              </Link>
              <Button variant="outline" onClick={openEditModal}>
                Edit Project
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteProject}
                isLoading={isDeleting}
              >
                Delete
              </Button>
              <Button
                onClick={() => {
                  setSelectedNodeForIndicator(null);
                  setIsWizardOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Indicator
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Project"
        size="md"
      >
        <div className="p-6 space-y-4 overflow-y-auto">
          {editError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {editError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 shadow-sm"
              placeholder="Project name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={4}
              value={editForm.description}
              onChange={(e) =>
                setEditForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 shadow-sm"
              placeholder="Short summary"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={editForm.startDate}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={editForm.endDate}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Archived">Archived</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sectors
              </label>
              <input
                type="text"
                value={editForm.sectors}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, sectors: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                placeholder="Agriculture, Education"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                placeholder="Location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Donor
              </label>
              <input
                type="text"
                value={editForm.donor}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, donor: e.target.value }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                placeholder="Donor"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Budget Amount
              </label>
              <input
                type="text"
                value={editForm.budgetAmount}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    budgetAmount: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Budget Currency
              </label>
              <input
                type="text"
                value={editForm.budgetCurrency}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    budgetCurrency: e.target.value,
                  }))
                }
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 shadow-sm"
                placeholder="USD"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject} isLoading={isSavingEdit}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Tabs */}
      <div className="mb-8">
        <nav className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-slate-200/70 rounded-2xl p-1.5 shadow-sm">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "logframe", label: "Logframe", icon: GitBranch },
            { id: "indicators", label: "Indicators", icon: BarChart2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                group inline-flex items-center px-4 py-2 rounded-xl font-medium text-sm transition-all
                ${
                  activeTab === tab.id
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/70"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                }
              `}
            >
              <tab.icon
                className={`mr-2 w-5 h-5 ${activeTab === tab.id ? "text-blue-500" : "text-slate-400"}`}
              />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Budget Utilized
                  </span>
                  <div className="p-2 bg-green-50 rounded-full text-green-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(stats.budgetSpent)}
                </p>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full"
                    style={{
                      width: `${(stats.budgetSpent / stats.budgetTotal) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  of {formatCurrency(stats.budgetTotal)} total
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Time Elapsed
                  </span>
                  <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {Math.round((stats.daysElapsed / stats.daysTotal) * 100)}%
                </p>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full"
                    style={{
                      width: `${(stats.daysElapsed / stats.daysTotal) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {stats.daysElapsed} days of {stats.daysTotal} days
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Beneficiaries
                  </span>
                  <div className="p-2 bg-purple-50 rounded-full text-purple-600">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.beneficiariesReached.toLocaleString()}
                </p>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full"
                    style={{
                      width: `${(stats.beneficiariesReached / stats.beneficiariesTarget) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Target: {stats.beneficiariesTarget.toLocaleString()}
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Activities
                  </span>
                  <div className="p-2 bg-amber-50 rounded-full text-amber-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.activitiesCompleted}
                </p>
                <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full"
                    style={{
                      width: `${(stats.activitiesCompleted / stats.activitiesTotal) * 100}%`,
                    }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {stats.activitiesTotal - stats.activitiesCompleted} remaining
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Column */}
              <div className="lg:col-span-2 space-y-6">
                <Card title="Executive Summary">
                  <div className="text-slate-600 leading-relaxed space-y-4">
                    <p>{project.description}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                        Sector: Agriculture
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                        Region: Northern District
                      </span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                        Donor: Global Fund
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Key Alerts Section - Dummy Content */}
                <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Critical Attention Needed
                    </h3>
                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">
                      2 Active
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="p-2 bg-red-50 rounded-full h-fit text-red-600 mt-1">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Anomaly in Maternal Mortality Ratio
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          Value spike detected on Oct 15. Deviation {">"} 2 std
                          dev from baseline.
                        </p>
                      </div>
                    </div>
                    <div className="p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="p-2 bg-amber-50 rounded-full h-fit text-amber-600 mt-1">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Quarterly Report Overdue
                        </h4>
                        <p className="text-sm text-slate-500 mt-1">
                          Q3 2024 Progress Report was due 5 days ago. Please
                          submit for review.
                        </p>
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
                        <div
                          className={`
                                 absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white
                                 ${activity.type === "danger" ? "bg-red-500" : activity.type === "success" ? "bg-green-500" : activity.type === "warning" ? "bg-amber-500" : "bg-blue-400"}
                              `}
                        ></div>
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 mb-0.5">
                            {activity.date}
                          </span>
                          <p className="text-sm text-slate-800 font-medium">
                            <span className="font-bold text-slate-900">
                              {activity.user}
                            </span>{" "}
                            {activity.action}
                          </p>
                          <span className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 mt-1 w-fit">
                            {activity.item}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-4 text-xs"
                  >
                    View All Activity
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === "logframe" && (
          <div className="bg-white/80 backdrop-blur rounded-2xl p-6 border border-slate-200/70 min-h-[600px] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                Logframe Matrix
              </h3>
              {project.logframe.length === 0 && (
                <Button onClick={handleAddRootGoal} size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Add Primary Goal
                </Button>
              )}
            </div>

            {project.logframe.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
                <p className="text-slate-500 mb-4">
                  No logframe structure defined yet.
                </p>
                <Button onClick={handleAddRootGoal}>Create First Goal</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {project.logframe.map((node) => (
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

        {activeTab === "indicators" && (
          <div className="space-y-6">
            {/* Search and Filter Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200/70 shadow-sm">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search indicators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900 shadow-sm"
                />
              </div>
              <div className="flex gap-2">
                <button className="inline-flex items-center px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 hover:bg-slate-50 shadow-sm">
                  All Categories
                </button>
                <button className="inline-flex items-center px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-700 hover:bg-slate-50 shadow-sm">
                  All Status
                </button>
              </div>
            </div>

            {/* Indicators Grid */}
            {filteredIndicators.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredIndicators.map((ind) => (
                  <IndicatorCard
                    key={ind.id}
                    indicator={ind}
                    onEdit={(indicator) => {
                      setEditingIndicator(indicator);
                      setIsWizardOpen(true);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-500">
                  No indicators found matching your search.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logframe Node Modal */}
      <Modal
        isOpen={isNodeModalOpen}
        onClose={() => setIsNodeModalOpen(false)}
        title={
          nodeModalMode === "create"
            ? "Add Logframe Component"
            : "Edit Component"
        }
      >
        <div className="p-6">
          <LogframeNodeForm
            mode={nodeModalMode}
            initialData={
              nodeModalMode === "edit" && selectedNode ? selectedNode : {}
            }
            parentType={
              nodeModalMode === "create" && selectedNode
                ? selectedNode.type
                : null
            }
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
          editingIndicator={editingIndicator}
          onClose={() => {
            setIsWizardOpen(false);
            setEditingIndicator(null);
          }}
        />
      </Modal>
    </Layout>
  );
};
