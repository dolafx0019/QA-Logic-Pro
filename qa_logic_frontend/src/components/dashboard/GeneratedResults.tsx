import React, { useState, useMemo } from 'react';
import { GeneratedTestCase, ResponseMetadata, AssumptionItem, ClarificationQuestion } from '../../types/api';
import { ChevronDown, ChevronRight, Search, ArrowDownAZ, ArrowUpZA, X, Download, Filter } from 'lucide-react';
import clsx from 'clsx';

// Keep the utility functions here or import them
const riskColour = (level?: string) => {
  if (level === 'High') return 'bg-qa-danger/10 text-qa-danger border border-qa-danger/30';
  if (level === 'Medium') return 'bg-qa-warning/10 text-qa-warning border border-qa-warning/30';
  if (level === 'Low') return 'bg-qa-accent-sec/10 text-qa-accent-sec border border-qa-accent-sec/30';
  return 'bg-qa-surface2 text-qa-text-sec border border-qa-border';
};

const categoryColour = (category: string) => {
  if (category === 'Positive') return 'bg-qa-success/10 text-qa-success border border-qa-success/20';
  if (category === 'Negative') return 'bg-qa-danger/10 text-qa-danger border border-qa-danger/20';
  if (category === 'Edge Case') return 'bg-qa-warning/10 text-qa-warning border border-qa-warning/20';
  if (category === 'Boundary') return 'bg-qa-accent-pri/10 text-qa-accent-pri border border-qa-accent-pri/20';
  return 'bg-qa-accent-sec/10 text-qa-accent-sec border border-qa-accent-sec/20';
};

const priorityOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
const riskLevelOrder: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
const categoryOrder: Record<string, number> = { 'Positive': 1, 'Negative': 2, 'Edge Case': 3, 'Boundary': 4, 'Validation': 5 };

interface GeneratedResultsProps {
  testCases: GeneratedTestCase[];
  metadata: ResponseMetadata;
  assumptions: AssumptionItem[];
  clarifications: ClarificationQuestion[];
  activeHistoryId: string | null;
  isExporting: boolean;
  onExport: () => void;
}

export function GeneratedResults({
  testCases,
  metadata,
  assumptions,
  clarifications,
  activeHistoryId,
  isExporting,
  onExport
}: GeneratedResultsProps) {
  // State for filtering & sorting
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [filterRisk, setFilterRisk] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'id' | 'category' | 'priority' | 'risk_score' | 'risk_level'>('id');
  const [sortAsc, setSortAsc] = useState(true);

  // Expand state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const processedCases = useMemo(() => {
    let result = [...testCases];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(tc =>
        tc.title.toLowerCase().includes(q) ||
        tc.id.toLowerCase().includes(q) ||
        tc.expected_result.toLowerCase().includes(q) ||
        tc.category.toLowerCase().includes(q) ||
        (tc.linked_requirement && tc.linked_requirement.toLowerCase().includes(q)) ||
        (tc.notes && tc.notes.toLowerCase().includes(q))
      );
    }

    // Filter by Category
    if (filterCategory !== 'All') {
      result = result.filter(tc => tc.category === filterCategory);
    }

    // Filter by Priority
    if (filterPriority !== 'All') {
      result = result.filter(tc => tc.priority === filterPriority);
    }

    // Filter by Risk
    if (filterRisk !== 'All') {
      result = result.filter(tc => tc.risk_level === filterRisk);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'id') {
        cmp = a.id.localeCompare(b.id);
      } else if (sortBy === 'priority') {
        cmp = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
      } else if (sortBy === 'risk_level') {
        cmp = (riskLevelOrder[a.risk_level || 'Low'] || 0) - (riskLevelOrder[b.risk_level || 'Low'] || 0);
      } else if (sortBy === 'risk_score') {
        cmp = (a.risk_score || 0) - (b.risk_score || 0);
      } else if (sortBy === 'category') {
        cmp = (categoryOrder[a.category] || 0) - (categoryOrder[b.category] || 0);
      }

      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [testCases, search, filterCategory, filterPriority, filterRisk, sortBy, sortAsc]);

  const hasActiveFilters = search !== '' || filterCategory !== 'All' || filterPriority !== 'All' || filterRisk !== 'All';
  const resetFilters = () => {
    setSearch('');
    setFilterCategory('All');
    setFilterPriority('All');
    setFilterRisk('All');
  };

  // Derivative metrics for UI chips (reflects currently filtered result set)
  const visibleCases = processedCases.length;
  const highRisk = processedCases.filter(t => t.risk_level === 'High').length;
  const medRisk = processedCases.filter(t => t.risk_level === 'Medium').length;
  const lowRisk = processedCases.filter(t => t.risk_level === 'Low').length;

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header & Export */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-qa-text-pri">Test Dashboard</h2>
          <p className="text-xs text-qa-text-sec mt-1 flex items-center gap-2">
            Showing {visibleCases} of {testCases.length} test cases
            {metadata.truncated && <span className="text-qa-warning/80">(truncated from {metadata.original_count})</span>}
            {activeHistoryId && <span className="bg-qa-accent-pri/10 text-qa-accent-pri px-1.5 py-0.5 rounded text-[10px] font-mono border border-qa-accent-pri/20">History Match</span>}
          </p>
        </div>
        <button
          onClick={onExport}
          disabled={isExporting}
          title="Export the complete, unmodified dataset to Excel"
          className={clsx(
            'flex items-center gap-2 py-2 px-4 rounded-md text-xs font-semibold shadow-sm transition-all',
            isExporting
              ? 'bg-qa-surface2 text-qa-text-sec cursor-not-allowed border border-qa-border'
              : 'bg-qa-accent-pri hover:bg-qa-accent-sec text-qa-text-pri border border-qa-accent-pri active:scale-95'
          )}
        >
          {isExporting ? 'Exporting…' : <><Download className="w-3.5 h-3.5" /> Export All Results</>}
        </button>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-qa-surface2 border border-qa-border p-3 rounded-lg shadow-sm flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-qa-text-sec mb-1">Matching Cases</span>
          <span className="text-xl font-medium text-qa-text-pri">{visibleCases}</span>
        </div>
        <div className="bg-qa-danger/10 border border-qa-danger/20 p-3 rounded-lg shadow-sm flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-qa-danger/80 mb-1">High Risk</span>
          <span className="text-xl font-medium text-qa-danger">{highRisk}</span>
        </div>
        <div className="bg-qa-warning/10 border border-qa-warning/20 p-3 rounded-lg shadow-sm flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-qa-warning/80 mb-1">Medium Risk</span>
          <span className="text-xl font-medium text-qa-warning">{medRisk}</span>
        </div>
        <div className="bg-qa-accent-sec/10 border border-qa-accent-sec/20 p-3 rounded-lg shadow-sm flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-wider text-qa-accent-sec/80 mb-1">Low Risk</span>
          <span className="text-xl font-medium text-qa-accent-sec">{lowRisk}</span>
        </div>
      </div>

      {/* Assumptions & Clarifications */}
      {(assumptions.length > 0 || clarifications.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
          {assumptions.length > 0 && (
            <div className="bg-qa-surface2 rounded-lg border border-qa-border p-4 text-sm">
              <p className="text-[11px] uppercase font-bold text-qa-text-sec tracking-wider mb-2.5">Context & Assumptions</p>
              <ul className="space-y-2">
                {assumptions.map((a, i) => (
                  <li key={i} className="text-qa-text-sec text-xs leading-relaxed">
                    <strong className="text-qa-text-pri font-medium block mb-0.5">{a.assumption}</strong>
                    {a.rationale}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {clarifications.length > 0 && (
            <div className="bg-qa-warning/10 rounded-lg border border-qa-warning/20 p-4 text-sm">
              <p className="text-[11px] uppercase font-bold text-qa-warning tracking-wider mb-2.5">Open Clarifications</p>
              <ul className="space-y-2">
                {clarifications.map((q, i) => (
                  <li key={i} className="text-qa-warning/80 text-xs leading-relaxed">
                    <strong className="text-qa-warning font-medium block mb-0.5">{q.question}</strong>
                    {q.context && q.context !== 'MOCK_MODE' && <span>Context: {q.context}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-qa-surface2 border border-qa-border rounded-lg p-3 flex flex-col md:flex-row gap-4 justify-between shadow-sm sticky top-0 z-10">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-qa-text-sec" />
          <input
            type="text"
            placeholder="Search test cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-qa-surface1 border border-qa-border rounded-md pl-9 pr-3 py-1.5 text-xs text-qa-text-pri placeholder:text-qa-text-sec focus:outline-none focus:border-qa-accent-pri focus:ring-1 focus:ring-qa-accent-pri transition-shadow"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-qa-text-sec hover:text-qa-text-pri flex items-center gap-1 text-[11px] font-medium px-2 py-1 transition-colors">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          <div className="flex items-center bg-qa-surface1 border border-qa-border rounded-md overflow-hidden">
             <div className="px-2.5 py-1.5 border-r border-qa-border bg-qa-surface2">
               <Filter className="w-3.5 h-3.5 text-qa-text-sec" />
             </div>
             <select
               value={filterCategory}
               onChange={(e) => setFilterCategory(e.target.value)}
               className="bg-transparent text-xs text-qa-text-sec px-2 py-1.5 outline-none cursor-pointer hover:bg-qa-surface2 transition-colors"
             >
               <option value="All">All Categories</option>
               <option value="Positive">Positive</option>
               <option value="Negative">Negative</option>
               <option value="Edge Case">Edge Case</option>
               <option value="Boundary">Boundary</option>
               <option value="Validation">Validation</option>
             </select>
          </div>

          <div className="flex items-center bg-qa-surface1 border border-qa-border rounded-md overflow-hidden">
             <select
               value={filterRisk}
               onChange={(e) => setFilterRisk(e.target.value)}
               className="bg-transparent text-xs text-qa-text-sec px-2 py-1.5 outline-none cursor-pointer hover:bg-qa-surface2 transition-colors"
             >
               <option value="All">All Risks</option>
               <option value="High">High Risk</option>
               <option value="Medium">Medium Risk</option>
               <option value="Low">Low Risk</option>
             </select>
          </div>

          <div className="flex items-center bg-qa-surface1 border border-qa-border rounded-md overflow-hidden">
             <select
               value={filterPriority}
               onChange={(e) => setFilterPriority(e.target.value)}
               className="bg-transparent text-xs text-qa-text-sec px-2 py-1.5 outline-none cursor-pointer hover:bg-qa-surface2 transition-colors"
             >
               <option value="All">All Priorities</option>
               <option value="High">High Prio</option>
               <option value="Medium">Medium Prio</option>
               <option value="Low">Low Prio</option>
             </select>
          </div>

          {/* Sorter */}
          <div className="flex items-center bg-qa-surface1 border border-qa-border rounded-md overflow-hidden ml-1">
             <select
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value as any)}
               className="bg-transparent text-xs text-qa-text-sec px-2 py-1.5 outline-none cursor-pointer hover:bg-qa-surface2 transition-colors border-r border-qa-border"
             >
               <option value="id">Sort by ID</option>
               <option value="risk_level">Sort by Risk</option>
               <option value="priority">Sort by Priority</option>
               <option value="category">Sort by Category</option>
             </select>
             <button
               onClick={() => setSortAsc(!sortAsc)}
               className="px-2 py-1.5 hover:bg-qa-surface2 text-qa-text-sec hover:text-qa-text-pri transition-colors"
               title={sortAsc ? "Sort Ascending" : "Sort Descending"}
             >
               {sortAsc ? <ArrowUpZA className="w-3.5 h-3.5" /> : <ArrowDownAZ className="w-3.5 h-3.5" />}
             </button>
          </div>

        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto border border-qa-border rounded-lg bg-qa-bg">
        <table className="min-w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-qa-surface2 border-b border-qa-border sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="w-8 px-3 py-2.5 text-center text-qa-text-sec font-medium border-r border-qa-border">#</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-qa-text-sec uppercase tracking-widest">ID</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-qa-text-sec uppercase tracking-widest">Category</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-qa-text-sec uppercase tracking-widest">Risk</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-qa-text-sec uppercase tracking-widest">Priority</th>
              <th className="px-4 py-2.5 text-[10px] font-bold text-qa-text-sec uppercase tracking-widest w-full">Title</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-qa-border">
            {processedCases.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-qa-text-sec text-xs">
                  No combinations found matching your current filters.
                </td>
              </tr>
            ) : (
              processedCases.map((tc) => {
                const isOpen = expandedRows.has(tc.id);
                return (
                  <React.Fragment key={tc.id}>
                    <tr
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isOpen ? 'bg-qa-surface2' : 'hover:bg-qa-surface1'
                      )}
                      onClick={() => toggleRow(tc.id)}
                    >
                      <td className="px-3 py-3 text-center border-r border-qa-border">
                        {isOpen ? <ChevronDown className="w-4 h-4 text-qa-text-sec mx-auto" /> : <ChevronRight className="w-4 h-4 text-qa-text-sec/50 mx-auto" />}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-qa-text-sec/80">{tc.id}</td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider', categoryColour(tc.category))}>
                          {tc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tabular-nums', riskColour(tc.risk_level))}>
                          {tc.risk_score} · {tc.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'text-[10px] font-bold uppercase tracking-wider',
                          tc.priority === 'High' ? 'text-qa-danger' :
                          tc.priority === 'Medium' ? 'text-qa-warning' : 'text-qa-accent-sec'
                        )}>{tc.priority}</span>
                      </td>
                      <td className="px-4 py-3 text-qa-text-pri/90 truncate text-xs font-medium max-w-sm xl:max-w-md" title={tc.title}>
                        {tc.title}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-qa-bg">
                        <td colSpan={6} className="p-0 border-b border-qa-border">
                          <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                            {/* Left Col: Steps */}
                            <div className="space-y-5 min-w-0 w-full overflow-hidden">
                              {tc.preconditions && (
                                <div className="bg-qa-surface2 p-3 rounded-md border border-qa-border min-w-0 w-full overflow-hidden">
                                  <p className="text-[10px] uppercase font-bold text-qa-text-sec mb-1.5 tracking-wider">Preconditions</p>
                                  <p className="text-qa-text-pri/80 text-xs leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{tc.preconditions}</p>
                                </div>
                              )}
                              
                              <div className="bg-qa-surface1 p-4 rounded-md border border-qa-border shadow-inner min-w-0 w-full overflow-hidden">
                                <p className="text-[10px] uppercase font-bold text-qa-text-sec mb-3 tracking-wider flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-qa-accent-pri"></span> Test Steps
                                </p>
                                <ol className="list-decimal list-inside space-y-2">
                                  {tc.steps.map((s, i) => (
                                    <li key={i} className="text-qa-text-pri/80 text-xs leading-relaxed pl-1 pb-1 border-b border-qa-border last:border-0 last:pb-0 break-words [overflow-wrap:anywhere]">{s}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                            
                            {/* Right Col: Expected & Meta */}
                            <div className="space-y-5 min-w-0 w-full overflow-hidden">
                              <div className="bg-qa-success/10 p-4 rounded-md border border-qa-success/20 min-w-0 w-full overflow-hidden">
                                <p className="text-[10px] uppercase font-bold text-qa-success mb-2 tracking-wider">Expected Result</p>
                                <p className="text-qa-success/90 text-xs leading-relaxed font-medium break-words [overflow-wrap:anywhere] whitespace-pre-wrap">{tc.expected_result}</p>
                              </div>

                              {tc.notes && (
                                <div className="bg-qa-warning/10 p-3 rounded-md border border-qa-warning/20 min-w-0 w-full overflow-hidden">
                                  <p className="text-[10px] uppercase font-bold text-qa-warning mb-1.5 tracking-wider">Notes</p>
                                  <p className="text-qa-warning/90 text-xs leading-relaxed italic break-words [overflow-wrap:anywhere]">{tc.notes}</p>
                                </div>
                              )}

                              <div className="space-y-3">
                                {/* Severity / Probability row */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="bg-qa-surface2 p-3 rounded-md border border-qa-border">
                                    <p className="text-[9px] text-qa-text-sec uppercase font-bold tracking-widest mb-1">Severity</p>
                                    <p className="text-qa-text-pri text-base font-semibold tabular-nums">{tc.severity} <span className="text-qa-text-sec/60 text-xs">/ 5</span></p>
                                  </div>
                                  <div className="bg-qa-surface2 p-3 rounded-md border border-qa-border">
                                    <p className="text-[9px] text-qa-text-sec uppercase font-bold tracking-widest mb-1">Probability</p>
                                    <p className="text-qa-text-pri text-base font-semibold tabular-nums">{tc.probability} <span className="text-qa-text-sec/60 text-xs">/ 5</span></p>
                                  </div>
                                </div>

                                {/* Traceability — full-width, chip-based */}
                                <div className="bg-qa-surface2 p-3 rounded-md border border-qa-border min-w-0 w-full overflow-hidden">
                                  <p className="text-[9px] text-qa-text-sec uppercase font-bold tracking-widest mb-2">Traceability</p>
                                  {tc.linked_requirement === '__unlinked__' || !tc.linked_requirement ? (
                                    <p className="text-qa-text-sec text-xs italic">Unlinked requirement</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {tc.linked_requirement
                                        .split(/[\s,|;]+/)
                                        .map(ref => ref.trim())
                                        .filter(ref => ref.length > 0)
                                        .map((ref, i) => (
                                          <span
                                            key={i}
                                            className="inline-flex items-center px-2 py-0.5 rounded border border-qa-accent-pri/30 bg-qa-accent-pri/10 text-qa-accent-pri font-mono text-[10px] font-semibold"
                                          >
                                            {ref}
                                          </span>
                                        ))
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
