import React, { useState } from 'react';
import { UploadCloud, FileType, AlertTriangle } from 'lucide-react';

interface PRDUploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export function PRDUploadZone({ onFileSelect, isLoading, error }: PRDUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-colors ${
          dragActive ? 'border-qa-accent-pri bg-qa-accent-pri/10' : 'border-qa-border hover:border-qa-text-sec/50 bg-qa-surface1'
        }`}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept=".pdf,.docx,.txt"
          disabled={isLoading}
        />
        
        <div className="flex flex-col items-center gap-3 pointer-events-none">
          {isLoading ? (
            <>
              <div className="w-10 h-10 border-2 border-qa-accent-pri border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-qa-accent-pri">Parsing and extracting PRD...</p>
              <p className="text-xs text-qa-text-sec">This may take a minute for complex documents.</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-qa-surface2 flex items-center justify-center">
                <UploadCloud className="w-6 h-6 text-qa-text-sec" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-qa-text-pri/80">Click to upload or drag and drop</p>
                <p className="text-xs text-qa-text-sec mt-1">PDF, DOCX, or TXT (Max 5MB)</p>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-qa-warning/80 bg-qa-warning/10 px-3 py-1.5 rounded-md">
                <FileType className="w-3 h-3" />
                Text-based documents only. Scanned images are not supported.
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-qa-danger/10 border border-qa-danger/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-qa-danger flex-shrink-0 mt-0.5" />
          <div className="text-sm text-qa-danger/80">{error}</div>
        </div>
      )}
    </div>
  );
}
