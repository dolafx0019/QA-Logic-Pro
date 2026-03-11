export interface PRDExtractionItem {
  id: string;
  description: string;
}

export interface PRDAcceptanceCriteria {
  id: string;
  description: string;
  linked_story_id?: string;
}

export interface PRDExtractionMetadata {
  source_file_name: string;
  source_file_type: string;
  extracted_text_length: number;
  chunk_count: number;
  warnings: string[];
  is_truncated: boolean;
  parsing_notes: string;
}

export interface PRDExtractionResponse {
  metadata: PRDExtractionMetadata;
  document_title: string;
  product_summary: string;
  actors: string[];
  user_stories: PRDExtractionItem[];
  acceptance_criteria: PRDAcceptanceCriteria[];
  business_rules: PRDExtractionItem[];
  constraints: PRDExtractionItem[];
  edge_cases: PRDExtractionItem[];
  assumptions: PRDExtractionItem[];
  clarification_questions: PRDExtractionItem[];
  out_of_scope: PRDExtractionItem[];
  confidence_summary: string;
  ai_warnings: string[];
}
