export interface AcceptanceCriteriaItem {
  id: string;
  description: string;
}

export interface BusinessRuleItem {
  id: string;
  description: string;
}

export interface SettingsPreferences {
  target_count: number;
  strictness_preset: "Relaxed" | "Balanced" | "Strict";
}

export interface GenerationRequest {
  user_story?: string;
  acceptance_criteria: AcceptanceCriteriaItem[];
  business_rules: BusinessRuleItem[];
  preferences: SettingsPreferences;
}

export interface ClarificationQuestion {
  question: string;
  context: string;
}

export interface AssumptionItem {
  assumption: string;
  rationale: string;
}

export interface RiskSummary {
  total_high: number;
  total_medium: number;
  total_low: number;
  average_score: number;
}

export interface ResponseMetadata {
  truncated: boolean;
  original_count: number;
}

export interface GeneratedTestCase {
  id: string;
  linked_requirement: string;
  title: string;
  preconditions: string;
  steps: string[];
  expected_result: string;
  priority: "High" | "Medium" | "Low";
  category: "Positive" | "Negative" | "Edge Case" | "Boundary" | "Validation";
  severity: number;
  probability: number;
  risk_score?: number;
  risk_level?: "High" | "Medium" | "Low";
  notes: string;
}

export interface GenerationResponse {
  metadata: ResponseMetadata;
  test_cases: GeneratedTestCase[];
  clarification_questions: ClarificationQuestion[];
  assumptions: AssumptionItem[];
  risk_summary?: RiskSummary;
}

export interface HistorySummary {
  id: string;
  created_at: string; // ISO 8601 string mapping to datetime
  test_case_count: number;
  user_story_preview: string;
}

export interface HistoryRecord {
  id: string;
  created_at: string;
  request_payload: GenerationRequest;
  response_payload: GenerationResponse;
}

export interface ExportRequest {
  data?: GenerationResponse;
  history_id?: string;
}

// Normalized Backend Error
export interface APIErrorDetail {
  loc?: (string | number)[];
  msg: string;
  type: string;
}

export interface StandardAPIError {
  detail: string;
  code: string;
  errors?: APIErrorDetail[];
}
