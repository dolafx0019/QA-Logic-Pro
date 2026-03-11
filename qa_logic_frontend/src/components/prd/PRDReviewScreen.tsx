import React, { useState } from 'react';
import { PRDExtractionResponse, PRDExtractionItem, PRDAcceptanceCriteria } from '../../types/prd';
import { FileText, AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface PRDReviewScreenProps {
  data: PRDExtractionResponse;
  onAccept: (userStories: string[], acs: PRDAcceptanceCriteria[], rules: PRDExtractionItem[]) => void;
  onCancel: () => void;
}

export function PRDReviewScreen({ data, onAccept, onCancel }: PRDReviewScreenProps) {
  const [editedStories, setEditedStories] = useState(data.user_stories);
  const [editedACs, setEditedACs] = useState(data.acceptance_criteria);
  const [editedRules, setEditedRules] = useState(data.business_rules);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number>(data.user_stories.length > 0 ? 0 : -1);

  const handleStoryChange = (index: number, val: string) => {
    const newStories = [...editedStories];
    newStories[index].description = val;
    setEditedStories(newStories);
  };

  const handleACChange = (index: number, val: string) => {
    const newACs = [...editedACs];
    newACs[index].description = val;
    setEditedACs(newACs);
  };

  const handleRuleChange = (index: number, val: string) => {
    const newRules = [...editedRules];
    newRules[index].description = val;
    setEditedRules(newRules);
  };

  const handleAcceptClick = () => {
    // Explicit rule: load only the selected primary story, and its connected ACs (plus globals)
    let primaryStory = '';
    let filteredACs = editedACs;
    
    if (editedStories.length > 0 && selectedStoryIndex >= 0) {
      const selected = editedStories[selectedStoryIndex];
      primaryStory = `[${selected.id}] ${selected.description}`;
      // strict linked filtering if ACs map, otherwise include all unmapped as global defaults
      filteredACs = editedACs.filter(ac => !ac.linked_story_id || ac.linked_story_id === selected.id);
    }

    onAccept([primaryStory], filteredACs, editedRules);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header & Metadata Info */}
      <div className="p-5 rounded-lg border border-qa-border bg-qa-surface1 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-qa-text-pri flex items-center gap-2">
            <FileText className="w-5 h-5 text-qa-accent-pri" />
            {data.document_title || 'Untitled Document'}
          </h2>
          <div className="flex items-center gap-2 text-xs text-qa-text-sec">
            <span className="px-2 py-1 bg-qa-surface2 rounded font-mono">{data.metadata.source_file_name}</span>
            <span className="px-2 py-1 bg-qa-surface2 rounded uppercase">{data.metadata.source_file_type}</span>
            <span className="px-2 py-1 bg-qa-surface2 rounded">{data.metadata.extracted_text_length.toLocaleString()} chars</span>
          </div>
        </div>
        <p className="text-sm text-qa-text-sec">{data.product_summary}</p>
        
        {/* Metadata Warnings */}
        {(data.metadata.warnings.length > 0 || data.ai_warnings.length > 0 || data.metadata.is_truncated) && (
          <div className="mt-3 flex flex-col gap-2">
            {data.metadata.is_truncated && (
              <div className="flex items-center gap-2 text-xs text-qa-warning bg-qa-warning/10 px-3 py-2 rounded-md">
                <AlertTriangle className="w-4 h-4" />
                Document was large and truncated to fit AI context limits.
              </div>
            )}
            {data.metadata.warnings.map((w, i) => (
              <div key={`mw-${i}`} className="flex items-center gap-2 text-xs text-qa-warning bg-qa-warning/10 px-3 py-2 rounded-md">
                <AlertTriangle className="w-4 h-4" /> {w}
              </div>
            ))}
            {data.ai_warnings.map((w, i) => (
              <div key={`aiw-${i}`} className="flex items-start gap-2 text-xs text-qa-danger bg-qa-danger/10 px-3 py-2 rounded-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {w}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confidence Summary */}
      <div className="flex items-start gap-3 p-4 rounded-md border border-qa-accent-pri/30 bg-qa-accent-pri/10">
        <Info className="w-5 h-5 text-qa-accent-pri flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-medium text-qa-accent-pri/90">Extraction Summary</h4>
          <p className="text-sm text-qa-accent-pri/80 mt-1">{data.confidence_summary}</p>
        </div>
      </div>

      {/* Editable Sections */}
      <div className="flex flex-col gap-6">
        <section>
          <h3 className="text-sm font-medium text-qa-text-sec mb-3 flex items-center justify-between">
            Primary User Story ({editedStories.length} Extracted)
            <span className="text-xs text-qa-accent-pri font-normal">Select the primary story for this generation run</span>
          </h3>
          <div className="space-y-3">
            {editedStories.length === 0 && <p className="text-xs text-qa-text-sec/60 italic">No user stories found.</p>}
            {editedStories.map((story, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div className="pt-2.5">
                  <input 
                    type="radio" 
                    name="primary_story" 
                    checked={selectedStoryIndex === i}
                    onChange={() => setSelectedStoryIndex(i)}
                    className="w-4 h-4 accent-qa-accent-pri cursor-pointer"
                  />
                </div>
                <span className={`text-xs font-mono mt-2.5 whitespace-nowrap w-14 ${selectedStoryIndex === i ? 'text-qa-accent-pri font-semibold' : 'text-qa-text-sec'}`}>
                  {story.id}
                </span>
                <textarea
                  className={`flex-1 bg-qa-surface2 border rounded-md px-3 py-2 text-sm focus:outline-none min-h-[60px] transition-colors ${
                    selectedStoryIndex === i 
                      ? 'border-qa-accent-pri/50 text-qa-text-pri shadow-[0_0_10px_rgba(124,92,255,0.1)]' 
                      : 'border-qa-border text-qa-text-sec'
                  }`}
                  value={story.description}
                  onChange={e => handleStoryChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-qa-text-sec mb-3">Acceptance Criteria ({editedACs.length})</h3>
          <div className="space-y-3">
            {editedACs.length === 0 && <p className="text-xs text-qa-text-sec/60 italic">No criteria found.</p>}
            {editedACs.map((ac, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-xs font-mono text-qa-text-sec mt-2 whitespace-nowrap w-16">{ac.id}</span>
                <textarea
                  className="flex-1 bg-qa-surface2 border border-qa-border rounded-md px-3 py-2 text-sm text-qa-text-pri focus:border-qa-accent-pri focus:outline-none min-h-[60px]"
                  value={ac.description}
                  onChange={e => handleACChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium text-qa-text-sec mb-3">Business Rules ({editedRules.length})</h3>
          <div className="space-y-3">
            {editedRules.length === 0 && <p className="text-xs text-qa-text-sec/60 italic">No rules found.</p>}
            {editedRules.map((rule, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className="text-xs font-mono text-qa-text-sec mt-2 whitespace-nowrap w-16">{rule.id}</span>
                <input
                  type="text"
                  className="flex-1 bg-qa-surface2 border border-qa-border rounded-md px-3 py-2 text-sm text-qa-text-pri focus:border-qa-accent-pri focus:outline-none"
                  value={rule.description}
                  onChange={e => handleRuleChange(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-4 pt-4 border-t border-qa-border">
        {data.assumptions.length > 0 && <span className="text-xs text-qa-text-sec bg-qa-surface2 px-2 py-1 rounded">{data.assumptions.length} Assumptions Detected</span>}
        {data.clarification_questions.length > 0 && <span className="text-xs text-qa-text-sec bg-qa-surface2 px-2 py-1 rounded">{data.clarification_questions.length} Clarifications Raised</span>}
        {data.edge_cases.length > 0 && <span className="text-xs text-qa-text-sec bg-qa-surface2 px-2 py-1 rounded">{data.edge_cases.length} Edge Cases Identified</span>}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 pb-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-sm font-medium text-qa-text-sec hover:text-qa-danger hover:bg-qa-danger/10 transition-colors"
        >
          Discard PRD
        </button>
        <button
          onClick={handleAcceptClick}
          className="px-4 py-2 rounded-md text-sm font-medium bg-qa-accent-pri text-white hover:bg-qa-accent-sec transition-colors flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          Use Extracted Requirements
        </button>
      </div>
    </div>
  );
}
