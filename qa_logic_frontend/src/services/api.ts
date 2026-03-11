import axios from 'axios';
import {
  GenerationRequest,
  GenerationResponse,
  HistorySummary,
  HistoryRecord,
  ExportRequest,
  StandardAPIError
} from '../types/api';
import { PRDExtractionResponse } from '../types/prd';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Custom error handling representing strict backend conventions
export class APIServiceError extends Error {
  detail: string;
  code: string;
  errors?: any[];
  
  constructor(data: StandardAPIError) {
    super(data.detail);
    this.name = 'APIServiceError';
    this.detail = data.detail;
    this.code = data.code || 'UNKNOWN_ERROR';
    this.errors = data.errors;
  }
}

function handleAPIError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      const data = error.response.data;
      if (data && typeof data === 'object' && 'detail' in data) {
        // Backend actively returned a standard API error
        throw new APIServiceError(data as StandardAPIError);
      }
    } else if (error.code === 'ERR_NETWORK') {
      // Backend is unreachable or CORS blocked
      throw new APIServiceError({
        detail: "Unable to reach the backend server. Please ensure the backend is running and accessible.",
        code: "BACKEND_UNAVAILABLE"
      });
    }
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error('An unknown error occurred while communicating with the server.');
}

export const apiService = {

  async getStatus(): Promise<{ status: string; mock_mode: boolean; gemini_configured: boolean }> {
    try {
      const response = await apiClient.get<{ status: string; mock_mode: boolean; gemini_configured: boolean }>('/status');
      return response.data;
    } catch {
      // If status endpoint is unreachable, assume unknown — don't block the UI
      return { status: 'unknown', mock_mode: false, gemini_configured: false };
    }
  },

  async extractPRD(file: File): Promise<PRDExtractionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await apiClient.post('/prd/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data;
        if (data && typeof data === 'object' && 'detail' in data) {
           throw new APIServiceError({ detail: String(data.detail), code: 'PRD_EXTRACTION_ERROR' });
        }
      }
      return handleAPIError(error);
    }
  },

  async generateTestCases(request: GenerationRequest): Promise<GenerationResponse> {
    try {
      const response = await apiClient.post<GenerationResponse>('/generate', request);
      return response.data;
    } catch (error) {
      return handleAPIError(error);
    }
  },

  async getHistorySummaries(limit: number = 20, offset: number = 0): Promise<HistorySummary[]> {
    try {
      const response = await apiClient.get<HistorySummary[]>('/history', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      return handleAPIError(error);
    }
  },

  async getHistoryRecord(id: string): Promise<HistoryRecord> {
    try {
      const response = await apiClient.get<HistoryRecord>(`/history/${id}`);
      return response.data;
    } catch (error) {
      return handleAPIError(error);
    }
  },

  async exportTestCases(request: ExportRequest): Promise<void> {
    try {
      const response = await apiClient.post('/export', request, {
        responseType: 'blob' // Explicitly fetch binary sequence smoothly without corruptions
      });
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Determine file name dynamically from headers securely gracefully
      let filename = 'qa-logic-pro-export.xlsx';
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup browser cache 
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response && error.response.data instanceof Blob) {
        // Explicitly map Blob errors back into readable API errors JSON cleanly
        try {
          const text = await error.response.data.text();
          const data = JSON.parse(text);
          if (data && typeof data === 'object' && 'detail' in data) {
            throw new APIServiceError(data as StandardAPIError);
          }
        } catch (parseError) {
          // If parse fails honestly, defer handling automatically below
        }
      }
      return handleAPIError(error);
    }
  }
};
