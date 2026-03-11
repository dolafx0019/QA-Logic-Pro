import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Play,
  AlertCircle,
  FileSpreadsheet,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { apiService, APIServiceError } from '../services/api';
import { useSettings } from '../hooks/useSettings';
import {
  GenerationRequest,
  GenerationResponse,
  StandardAPIError,
  AcceptanceCriteriaItem,
  BusinessRuleItem
} from '../types/api';
import { PRDExtractionResponse, PRDAcceptanceCriteria, PRDExtractionItem } from '../types/prd';
import { PRDUploadZone } from '../components/prd/PRDUploadZone';
import { PRDReviewScreen } from '../components/prd/PRDReviewScreen';
import { GeneratedResults } from '../components/dashboard/GeneratedResults';

interface FormValues {
  user_story: string;
  acceptance_criteria: AcceptanceCriteriaItem[];
  business_rules: BusinessRuleItem[];
}



export default function Dashboard() {
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<StandardAPIError | null>(null);
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [confirmDiscardPRD, setConfirmDiscardPRD] = useState(false);

  // PRD Extraction State
  const [inputMode, setInputMode] = useState<'manual' | 'upload'>('manual');
  const [prdResult, setPrdResult] = useState<PRDExtractionResponse | null>(null);
  const [uploadingPRD, setUploadingPRD] = useState(false);

  const { register, control, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      user_story: '',
      acceptance_criteria: [{ id: 'AC-1', description: '' }],
      business_rules: []
    },
    mode: 'onTouched'
  });

  const { fields: acFields, append: appendAC, remove: removeAC } = useFieldArray({ control, name: 'acceptance_criteria' });
  const { fields: brFields, append: appendBR, remove: removeBR } = useFieldArray({ control, name: 'business_rules' });

  // Load from history when navigated with state
  useEffect(() => {
    const load = async () => {
      if (location.state?.historyId) {
        setLoading(true);
        setActiveHistoryId(location.state.historyId);
        try {
          const record = await apiService.getHistoryRecord(location.state.historyId);
          reset(record.request_payload);
          setResult(record.response_payload);
          navigate('/', { replace: true });
        } catch (err: any) {
          setError(err instanceof APIServiceError
            ? { detail: err.detail, code: err.code, errors: err.errors }
            : { detail: err.message, code: 'HISTORY_FETCH_ERROR' });
        } finally {
          setLoading(false);
        }
      }
    };
    load();
  }, [location.state, reset, navigate]);

  const checkHasContent = (data: FormValues) =>
    data.user_story.trim().length > 0 ||
    data.acceptance_criteria.some(ac => ac.description.trim().length > 0);

  const onSubmit = async (data: FormValues) => {
    if (!checkHasContent(data)) {
      setError({
        detail: 'User Story or at least one Acceptance Criteria must be populated.',
        code: 'VALIDATION_FAILED',
      });
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveHistoryId(null);

    const payload: GenerationRequest = {
      user_story: data.user_story.trim() || undefined,
      acceptance_criteria: data.acceptance_criteria.filter(ac => ac.description.trim().length > 0),
      business_rules: data.business_rules.filter(br => br.description.trim().length > 0),
      preferences: settings
    };

    try {
      setResult(await apiService.generateTestCases(payload));
    } catch (err: any) {
      setError(err instanceof APIServiceError
        ? { detail: err.detail, code: err.code, errors: err.errors }
        : { detail: err.message || 'An unknown error occurred.', code: 'UNKNOWN' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!result) return;
    setExporting(true);
    try {
      // Backend contract: provide EITHER history_id OR data — never both.
      // If this result was loaded from a saved history record, export by ID.
      // If it's a fresh in-session generation, send the full data payload.
      const exportPayload = activeHistoryId
        ? { history_id: activeHistoryId }
        : { data: result };
      await apiService.exportTestCases(exportPayload);
    } catch (err: any) {
      setError(err instanceof APIServiceError
        ? { detail: `Export failed: ${err.detail}`, code: err.code }
        : { detail: 'Export failed due to a network error.', code: 'EXPORT_ERROR' });
    } finally {
      setExporting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadingPRD(true);
    setError(null);
    setResult(null);
    
    try {
      const resp = await apiService.extractPRD(file);
      setPrdResult(resp);
    } catch (err: any) {
      setError(err instanceof APIServiceError
        ? { detail: err.detail, code: err.code }
        : { detail: err.message || 'File upload failed.', code: 'UPLOAD_ERROR' });
    } finally {
      setUploadingPRD(false);
    }
  };

  const handlePRDAccept = (userStories: string[], acs: PRDAcceptanceCriteria[], rules: PRDExtractionItem[]) => {
    // Hydrate the form matching existing boundaries
    reset({
      user_story: userStories[0] || '',
      acceptance_criteria: acs.length > 0 ? acs.map(ac => ({ id: ac.id, description: ac.description })) : [{ id: 'AC-1', description: '' }],
      business_rules: rules.map(br => ({ id: br.id, description: br.description }))
    });
    
    // Switch completely back to manual entry for standard generation
    // We intentionally DO NOT clear prdResult so it can be reused later in the session
    setInputMode('manual');
    setError(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full pb-10">

      {/* ── Left: Input Form / Upload ── */}
      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-5 overflow-y-auto pr-1">
        <div className="flex bg-qa-surface2 border border-qa-border rounded-lg p-1">
          <button
            type="button"
            className={clsx('flex-1 text-xs py-1.5 rounded-md font-medium transition-colors', inputMode === 'manual' ? 'bg-qa-surface2 text-qa-text-pri shadow-sm' : 'text-qa-text-sec hover:text-qa-text-pri')}
            onClick={() => setInputMode('manual')}
          >
            Manual Entry
          </button>
          <button
            type="button"
            className={clsx('flex-1 text-xs py-1.5 rounded-md font-medium transition-colors', inputMode === 'upload' ? 'bg-qa-surface2 text-qa-text-pri shadow-sm' : 'text-qa-text-sec hover:text-qa-text-pri')}
            onClick={() => setInputMode('upload')}
          >
            Import PRD
          </button>
        </div>

        {inputMode === 'upload' && !prdResult ? (
          <div>
             <h2 className="text-base font-semibold text-qa-text-pri mb-4">Upload Document</h2>
             <PRDUploadZone 
               onFileSelect={handleFileUpload} 
               isLoading={uploadingPRD} 
               error={error && error.code === 'PRD_EXTRACTION_ERROR' || error?.code === 'UPLOAD_ERROR' ? error.detail : null} 
             />
          </div>
        ) : inputMode === 'upload' && prdResult ? (
          // PRD already extracted but user switched back to Import tab — reuse the cached extraction
          // instead of re-hitting the API. Show discard option if they want to start over.
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2 p-3 rounded-lg border border-qa-accent-pri/30 bg-qa-accent-pri/10">
              <div className="text-xs text-qa-accent-pri/90 leading-relaxed">
                <span className="font-semibold block mb-0.5">PRD already extracted</span>
                The current session has a cached extraction for <span className="font-mono">{prdResult.metadata.source_file_name}</span>. You can review it again or discard it to upload a new document.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPrdResult(null); setInputMode('upload'); }}
                className="flex-1 text-xs py-2 px-3 rounded-md border border-qa-danger/40 text-qa-danger hover:bg-qa-danger/10 transition-colors font-medium"
              >
                Discard PRD &amp; upload new
              </button>
            </div>
          </div>
        ) : (
          <div className={clsx("flex flex-col gap-5", inputMode === 'upload' && prdResult && "opacity-50 pointer-events-none")}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-qa-text-pri">Requirements</h2>
            </div>

            {/* PRD provenance indicator — only shown when form was hydrated from an extracted PRD */}
            {prdResult && inputMode === 'manual' && (
              <div className={clsx(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors",
                confirmDiscardPRD
                  ? "border-qa-danger/50 bg-qa-danger/10 text-qa-danger/90"
                  : "border-qa-accent-pri/30 bg-qa-accent-pri/10 text-qa-accent-pri/90"
              )}>
                <FileSpreadsheet className="w-3.5 h-3.5 flex-shrink-0" />
                {confirmDiscardPRD ? (
                  <>
                    <span className="flex-1 font-medium">Discard PRD context?</span>
                    <button
                      type="button"
                      onClick={() => { setPrdResult(null); setConfirmDiscardPRD(false); }}
                      className="text-qa-danger font-semibold hover:underline flex-shrink-0"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDiscardPRD(false)}
                      className="text-qa-text-sec hover:text-qa-text-pri flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1">
                      Using extracted PRD context &mdash;{' '}
                      <span className="font-mono text-[10px] opacity-70">{prdResult.metadata.source_file_name}</span>
                    </span>
                    <button
                      type="button"
                      title="Discard extracted PRD context"
                      onClick={() => setConfirmDiscardPRD(true)}
                      className="ml-auto text-qa-accent-pri/50 hover:text-qa-danger transition-colors flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

          {/* User Story */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-qa-text-sec uppercase tracking-wider">User Story</label>
            <textarea
              {...register('user_story')}
              placeholder="As a [role], I want to [action] so that [benefit]..."
              className="w-full rounded-md border border-qa-border bg-qa-surface1 text-qa-text-pri py-2 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-qa-accent-pri focus:border-qa-accent-pri h-28 resize-y placeholder:text-qa-text-sec/50"
            />
          </div>

          {/* Acceptance Criteria */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-qa-text-sec uppercase tracking-wider">Acceptance Criteria</label>
              <button type="button" onClick={() => appendAC({ id: `AC-${acFields.length + 1}`, description: '' })}
                className="text-qa-accent-pri hover:text-qa-accent-sec flex items-center gap-1 text-xs font-medium">
                <Plus className="w-3 h-3" /> Add AC
              </button>
            </div>
            <div className="space-y-2">
              {acFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <input
                    {...register(`acceptance_criteria.${index}.id` as const, { required: true })}
                    placeholder="ID"
                    className="w-16 rounded border border-qa-border bg-qa-surface1 text-qa-text-pri px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-qa-accent-pri focus:border-qa-accent-pri"
                  />
                  <textarea
                    {...register(`acceptance_criteria.${index}.description` as const, { required: true })}
                    placeholder="Given… When… Then…"
                    className="flex-1 rounded border border-qa-border bg-qa-surface1 text-qa-text-pri px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-qa-accent-pri focus:border-qa-accent-pri h-10 resize-y placeholder:text-qa-text-sec/50"
                  />
                  <button type="button" onClick={() => removeAC(index)}
                    className="text-qa-text-sec hover:text-qa-danger pt-1.5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Business Rules */}
          <div className="space-y-2 pt-3 border-t border-qa-border">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-medium text-qa-text-sec uppercase tracking-wider">Business Rules <span className="normal-case font-normal opacity-70">(optional)</span></label>
              <button type="button" onClick={() => appendBR({ id: `BR-${brFields.length + 1}`, description: '' })}
                className="text-qa-accent-pri hover:text-qa-accent-sec flex items-center gap-1 text-xs font-medium">
                <Plus className="w-3 h-3" /> Add Rule
              </button>
            </div>
            <div className="space-y-2">
              {brFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <input
                    {...register(`business_rules.${index}.id` as const, { required: true })}
                    placeholder="ID"
                    className="w-16 rounded border border-qa-border bg-qa-surface1 text-qa-text-pri px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-qa-accent-pri focus:border-qa-accent-pri"
                  />
                  <textarea
                    {...register(`business_rules.${index}.description` as const, { required: true })}
                    placeholder="Business constraint…"
                    className="flex-1 rounded border border-qa-border bg-qa-surface1 text-qa-text-pri px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-qa-accent-pri focus:border-qa-accent-pri h-10 resize-y placeholder:text-qa-text-sec/50"
                  />
                  <button type="button" onClick={() => removeBR(index)}
                    className="text-qa-text-sec hover:text-qa-danger pt-1.5 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 pt-3 pb-2 bg-qa-bg border-t border-qa-border">
            <button
              type="submit"
              disabled={loading}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium text-white transition-all shadow-sm',
                loading ? 'bg-qa-accent-pri/50 cursor-not-allowed' : 'bg-qa-accent-pri hover:bg-qa-accent-sec active:scale-[0.98]'
              )}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <><Play className="w-4 h-4" /> Generate Scenarios</>
              )}
            </button>
          </div>
        </form>
        </div>
        )}
      </div>

      {/* ── Right: Output Panel / PRD Review ── */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto bg-qa-surface1 rounded-xl border border-qa-border p-5 min-w-0">

        {/* PRD Review Screen (Takes precedence over normal output if in upload mode with a result) */}
        {inputMode === 'upload' && prdResult && (
          <PRDReviewScreen 
            data={prdResult} 
            onAccept={handlePRDAccept} 
            onCancel={() => { setPrdResult(null); setInputMode('manual'); }} 
          />
        )}

        {!(inputMode === 'upload' && prdResult) && (
          <>
            {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 bg-qa-danger/10 border border-qa-danger/30 rounded-lg p-3.5">
            <AlertCircle className="w-4 h-4 text-qa-danger flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {error.code === 'AI_RATE_LIMIT' ? (
                <>
                  <p className="text-sm font-semibold text-qa-danger mb-1">Gemini Quota Exhausted</p>
                  <p className="text-xs text-qa-danger/90 leading-relaxed">
                    The free tier daily quota for the current Gemini API key has been reached. Please try again later, enable <strong>Mock Mode</strong> via the backend <code className="bg-qa-danger/20 px-1 rounded text-qa-danger/80">.env</code> to continue testing the UI, or switch to an API key associated with a billed Google Cloud project.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-semibold text-qa-danger mb-0.5">{error.code}</p>
                  <p className="text-xs text-qa-danger/80">{error.detail}</p>
                  {error.errors && error.errors.length > 0 && (
                    <ul className="list-disc ml-4 mt-1.5 space-y-0.5">
                      {error.errors.map((e, i) => (
                        <li key={i} className="text-[11px] text-qa-danger/60">{e.msg}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
            <button onClick={() => setError(null)} className="text-qa-danger/50 hover:text-qa-danger flex-shrink-0 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-qa-text-sec py-20">
            <FileSpreadsheet className="w-14 h-14 mb-4 opacity-30" />
            <p className="text-sm">Paste requirements and click <strong className="text-qa-text-pri/80">Generate Scenarios</strong> to see results.</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-20">
            <div className="w-full max-w-sm space-y-3">
              <div className="h-3 bg-qa-surface2 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-qa-surface2 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-qa-surface2 rounded animate-pulse w-full" />
              <div className="h-3 bg-qa-surface2 rounded animate-pulse w-2/3" />
            </div>
            <p className="text-xs text-qa-text-sec">Submitting to generation service…</p>
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <GeneratedResults 
            testCases={result.test_cases}
            metadata={result.metadata}
            assumptions={result.assumptions}
            clarifications={result.clarification_questions}
            activeHistoryId={activeHistoryId}
            isExporting={exporting}
            onExport={handleExport}
          />
        )}
          </>
        )}
      </div>
    </div>
  );
}
