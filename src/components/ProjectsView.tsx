import { apiFetch } from '../api';
import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  Sparkles,
  Move,
  GripVertical,
  FolderInput,
  FolderMinus,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Project, Generation } from '../types';

interface ProjectsViewProps {
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onOpenProjectWorkspace?: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ notify }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal & Drawer states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Drag and drop states
  const [draggedGenId, setDraggedGenId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [isDragOverActiveProjectZone, setIsDragOverActiveProjectZone] = useState(false);
  const [isDragOverUnassignZone, setIsDragOverUnassignZone] = useState(false);

  // History tray drawer state
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'unassigned'>('all');

  const fetchProjectsData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [projRes, genRes] = await Promise.all([
        apiFetch('/api/projects', { headers: {} }),
        apiFetch('/api/user/generations', { headers: {} })
      ]);
      const projData = await projRes.json();
      const genData = await genRes.json();
      if (projData.projects) setProjects(projData.projects);
      if (genData.generations) setGenerations(genData.generations);
    } catch (e) {
      notify('error', 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsData();
  }, [user]);

  // Handle assigning generation to project
  const handleAssignToProject = async (generationId: string, projectId: string | null) => {
    if (!user) return;
    const targetGen = generations.find(g => g.generationId === generationId);
    const targetProj = projects.find(p => p.id === projectId);

    // Optimistic UI update
    setGenerations(prev =>
      prev.map(g => (g.generationId === generationId ? { ...g, projectId: projectId || undefined } : g))
    );

    try {
      const res = await apiFetch(`/api/generations/${generationId}/project`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId })
      });

      if (!res.ok) {
        throw new Error('Failed to update project assignment');
      }

      const promptPreview = targetGen?.prompt ? `"${targetGen.prompt.slice(0, 30)}..."` : 'Artwork';
      if (projectId && targetProj) {
        notify('success', `Added ${promptPreview} to ${targetProj.name}!`, 'Project Updated');
      } else {
        notify('info', `Removed ${promptPreview} from project.`, 'Unassigned');
      }
    } catch (err: any) {
      // Rollback on error
      fetchProjectsData();
      notify('error', err.message || 'Failed to move image to project');
    }
  };

  // Drag event handlers
  const handleDragStart = (e: React.DragEvent, genId: string) => {
    e.dataTransfer.setData('text/plain', genId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedGenId(genId);
  };

  const handleDragEnd = () => {
    setDraggedGenId(null);
    setDragOverProjectId(null);
    setIsDragOverActiveProjectZone(false);
    setIsDragOverUnassignZone(false);
  };

  const handleProjectCardDrop = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    const genId = e.dataTransfer.getData('text/plain') || draggedGenId;
    if (genId) {
      handleAssignToProject(genId, projectId);
    }
    setDragOverProjectId(null);
    setDraggedGenId(null);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newProjectName.trim()) return;

    try {
      const res = await apiFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDesc.trim()
        })
      });
      const data = await res.json();
      if (data.project) {
        setProjects(prev => [data.project, ...prev]);
        setNewProjectName('');
        setNewProjectDesc('');
        setIsCreateOpen(false);
        notify('success', `Created project "${data.project.name}"`);
      }
    } catch (e) {
      notify('error', 'Failed to create project');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!user || !confirm('Delete this project? (Images will remain in history)')) return;
    try {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {}
      });
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        // Unassign items locally
        setGenerations(prev =>
          prev.map(g => (g.projectId === projectId ? { ...g, projectId: undefined } : g))
        );
        if (activeProject?.id === projectId) setActiveProject(null);
        notify('success', 'Project deleted');
      }
    } catch (e) {
      notify('error', 'Failed to delete project');
    }
  };

  // Filtered history items for drag tray
  const filteredHistory = generations.filter(g => {
    const matchesSearch = g.prompt.toLowerCase().includes(historySearch.toLowerCase());
    const matchesFilter =
      historyFilter === 'all'
        ? true
        : activeProject
        ? g.projectId !== activeProject.id
        : !g.projectId;
    return matchesSearch && matchesFilter;
  });

  // Associated generations for active project
  const projectGenerations = activeProject
    ? generations.filter(g => g.projectId === activeProject.id)
    : [];

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C202C] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Creative Projects
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Drag & Drop Enabled
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Organize campaigns, anime arcs, and character sheets. Drag any creation from history into a project.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setShowHistoryDrawer(!showHistoryDrawer)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              showHistoryDrawer
                ? 'bg-purple-950/30 border-purple-500/40 text-purple-200'
                : 'bg-[#121520] border-[#222738] text-gray-400 hover:text-white'
            }`}
          >
            <GripVertical className="w-3.5 h-3.5 text-purple-400" />
            <span>{showHistoryDrawer ? 'Hide History Tray' : 'Show History Tray'}</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Projects Area + Drag Tray */}
      <div className="space-y-6">
        {/* DRAG & DROP HISTORY DOCK TRAY */}
        {showHistoryDrawer && (
          <div className="p-4 rounded-3xl bg-[#0E111A] border border-[#23293D] shadow-2xl space-y-3 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Move className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  History Assets (Drag into any Project)
                </span>
                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full font-mono">
                  {filteredHistory.length} creations
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    placeholder="Search history..."
                    className="pl-8 pr-3 py-1 bg-[#090B10] text-[11px] text-white rounded-lg border border-[#1E2333] focus:outline-none focus:border-purple-500 w-36 sm:w-48"
                  />
                </div>

                <div className="flex items-center rounded-lg bg-[#090B10] p-0.5 border border-[#1E2333] text-[10px]">
                  <button
                    onClick={() => setHistoryFilter('all')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      historyFilter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setHistoryFilter('unassigned')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      historyFilter === 'unassigned' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Unassigned
                  </button>
                </div>
              </div>
            </div>

            {/* Draggable Items Scroll Row */}
            {filteredHistory.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">
                No matching history images to drag. Create new visuals in the Create Studio!
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {filteredHistory.map(gen => {
                  const currentProj = projects.find(p => p.id === gen.projectId);
                  const isDraggingThis = draggedGenId === gen.generationId;

                  return (
                    <div
                      key={gen.generationId}
                      draggable
                      onDragStart={e => handleDragStart(e, gen.generationId)}
                      onDragEnd={handleDragEnd}
                      className={`group relative shrink-0 w-28 h-28 rounded-2xl overflow-hidden bg-black border cursor-grab active:cursor-grabbing transition-all select-none ${
                        isDraggingThis
                          ? 'opacity-40 scale-95 border-purple-500 ring-2 ring-purple-500/50'
                          : 'border-[#222738] hover:border-purple-500/60 hover:scale-105 shadow-md'
                      }`}
                      title="Drag this creation into any project card"
                    >
                      <img src={gen.imageUrl} alt={gen.prompt} className="w-full h-full object-cover pointer-events-none" />

                      {/* Drag overlay indicator */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="p-1 rounded bg-black/60 text-purple-300">
                            <Move className="w-3 h-3" />
                          </span>

                          {/* Quick assign select dropdown for touch/fallback */}
                          <select
                            value={gen.projectId || ''}
                            onChange={e => handleAssignToProject(gen.generationId, e.target.value || null)}
                            onClick={e => e.stopPropagation()}
                            className="text-[9px] bg-black/80 text-white rounded px-1 py-0.5 border border-white/20 focus:outline-none"
                            title="Assign to project"
                          >
                            <option value="">None</option>
                            {projects.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name.slice(0, 10)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="text-[9px] text-gray-300 truncate">
                          {currentProj ? `📁 ${currentProj.name}` : '✨ Unassigned'}
                        </div>
                      </div>

                      {/* Tag pill */}
                      {currentProj && (
                        <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-mono text-purple-300 px-1 py-0.2 rounded border border-purple-500/30 group-hover:hidden">
                          📁
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Tip: Click and drag any thumbnail above directly onto a Project Card below to file it.</span>
            </div>
          </div>
        )}

        {/* ACTIVE PROJECT DETAIL VIEW */}
        {activeProject ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-[#10131C] border border-[#1F2536]">
              <div>
                <button
                  onClick={() => setActiveProject(null)}
                  className="text-xs text-purple-400 hover:underline mb-1 font-semibold block"
                >
                  ← Back to all projects
                </button>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white font-display">{activeProject.name}</h2>
                  <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    {projectGenerations.length} items
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{activeProject.description || 'No description provided.'}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteProject(activeProject.id)}
                  className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  title="Delete project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Droppable Area Inside Active Project */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragOverActiveProjectZone(true);
              }}
              onDragLeave={() => setIsDragOverActiveProjectZone(false)}
              onDrop={e => {
                e.preventDefault();
                const genId = e.dataTransfer.getData('text/plain') || draggedGenId;
                if (genId) {
                  handleAssignToProject(genId, activeProject.id);
                }
                setIsDragOverActiveProjectZone(false);
                setDraggedGenId(null);
              }}
              className={`p-6 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${
                isDragOverActiveProjectZone
                  ? 'border-purple-400 bg-purple-950/40 ring-4 ring-purple-500/30 scale-[1.01]'
                  : 'border-[#222838] bg-[#0A0C12] hover:border-purple-500/40'
              }`}
            >
              <FolderInput className={`w-8 h-8 ${isDragOverActiveProjectZone ? 'text-purple-300 animate-bounce' : 'text-gray-500'}`} />
              <div className="text-center">
                <div className="text-sm font-bold text-white">
                  {isDragOverActiveProjectZone ? `Drop image to add to ${activeProject.name}!` : `Drop images here to add to "${activeProject.name}"`}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Drag creations from the history tray above into this canvas
                </div>
              </div>
            </div>

            {/* Current Project Assets Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-300">Project Assets ({projectGenerations.length})</h3>
                {projectGenerations.length > 0 && (
                  <span className="text-[11px] text-gray-500">
                    Click the remove icon or drag out to unassign
                  </span>
                )}
              </div>

              {projectGenerations.length === 0 ? (
                <div className="py-16 text-center rounded-2xl bg-[#0D0F16] border border-[#181C26] p-6 space-y-2">
                  <ImageIcon className="w-8 h-8 text-gray-600 mx-auto" />
                  <div className="text-xs text-gray-400">No visuals filed under this project yet.</div>
                  <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
                    Drag any image from the History tray above or select "{activeProject.name}" in the Create Studio when rendering.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {projectGenerations.map(gen => (
                    <div
                      key={gen.generationId}
                      className="group relative rounded-2xl overflow-hidden bg-[#10131C] border border-[#1F2536] aspect-square shadow-md"
                    >
                      <img src={gen.imageUrl} alt={gen.prompt} className="w-full h-full object-cover" />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-between">
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleAssignToProject(gen.generationId, null)}
                            className="p-1.5 rounded-lg bg-black/70 hover:bg-rose-600 text-white backdrop-blur transition-colors"
                            title="Remove from this project"
                          >
                            <FolderMinus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-200 line-clamp-2">{gen.prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ALL PROJECTS GRID WITH DROPPABLE TARGET CARDS */
          <div>
            {loading ? (
              <div className="py-20 text-center text-gray-400 space-y-3">
                <Sparkles className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <div className="text-sm">Loading project folders...</div>
              </div>
            ) : projects.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-[#0D0F16] border border-[#181C26] p-8 space-y-4">
                <FolderKanban className="w-12 h-12 text-gray-600 mx-auto" />
                <div>
                  <div className="text-base font-bold text-gray-200">No Projects Created Yet</div>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                    Create your first project like "My Anime Series", "Instagram Campaign", or "Music Video Concepts".
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Project</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-gray-300">
                    Project Workspaces ({projects.length})
                  </h2>
                  <span className="text-[11px] text-purple-400 font-medium">
                    🎯 Drop items directly onto any folder card
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map(proj => {
                    const count = generations.filter(g => g.projectId === proj.id).length;
                    const isDragOver = dragOverProjectId === proj.id;

                    return (
                      <div
                        key={proj.id}
                        onDragOver={e => {
                          e.preventDefault();
                          setDragOverProjectId(proj.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverProjectId === proj.id) {
                            setDragOverProjectId(null);
                          }
                        }}
                        onDrop={e => handleProjectCardDrop(e, proj.id)}
                        onClick={() => setActiveProject(proj)}
                        className={`relative p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between group min-h-[170px] ${
                          isDragOver
                            ? 'bg-gradient-to-b from-purple-950/60 to-[#141828] border-purple-400 ring-4 ring-purple-500/40 scale-[1.03] shadow-2xl'
                            : 'bg-[#10131C] border-[#1F2536] hover:border-purple-500/50 hover:bg-[#141824]'
                        }`}
                      >
                        {/* Drop Highlight Banner */}
                        {isDragOver && (
                          <div className="absolute inset-0 bg-purple-900/30 backdrop-blur-sm rounded-3xl z-10 flex flex-col items-center justify-center p-4 pointer-events-none animate-pulse">
                            <FolderInput className="w-10 h-10 text-purple-300 mb-2" />
                            <div className="text-sm font-black text-white text-center">
                              Drop to add to "{proj.name}"!
                            </div>
                            <div className="text-[10px] text-purple-200 mt-0.5">Release mouse to assign</div>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-11 h-11 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center shadow-md">
                              <FolderKanban className="w-5 h-5" />
                            </div>
                            <span className="text-[11px] font-mono font-bold text-gray-300 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                              {count} assets
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors mb-1">
                            {proj.name}
                          </h3>
                          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                            {proj.description || 'No description'}
                          </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                          <span>{new Date(proj.createdAt).toLocaleDateString()}</span>
                          <span className="text-purple-400 group-hover:text-purple-300 flex items-center gap-1 font-semibold">
                            Open Workspace <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsCreateOpen(false)}
        >
          <div
            className="max-w-md w-full bg-[#10131C] border border-[#262C3E] rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-display">New Creative Project</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-gray-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. My Anime Series, Cyberpunk Campaign, Music Video Visuals"
                  className="w-full bg-[#0B0D14] text-white text-xs rounded-xl p-3 border border-[#1F2536] focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-gray-300 block mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  placeholder="Outline the aesthetic mood, characters, or deliverables for this project..."
                  className="w-full bg-[#0B0D14] text-white text-xs rounded-xl p-3 border border-[#1F2536] focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
