"use client"
import { cn } from "@/lib/utils";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

export const FileUpload = ({
  onChange,
}: {
  onChange?: (files: File[]) => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [phase, setPhase] = useState<'idle' | 'upload' | 'ingest' | 'done'>('idle');
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0);
  const router = useRouter();

  // const handleFileChange = (newFiles: File[]) => {
  //   setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  //   onChange && onChange(newFiles);
  // };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | { target: { files: File[] } }) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Validate file types and sizes
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/csv'
    ];
    
    const maxSize = 50 * 1024 * 1024; // 50MB per file
    const maxFiles = 10; // Maximum 10 files

    if (selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed at once.`);
      return;
    }

    // Validate each file
    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        setError(`Unsupported file type: ${file.name}. Please upload only PDF, DOCX, or CSV files.`);
        return;
      }
      if (file.size > maxSize) {
        setError(`File ${file.name} is too large. Maximum size is 50MB.`);
        return;
      }
    }

    setFiles(selectedFiles);
    setUploading(true);
    setError(null);
    setProgress(0);
    setPhase('upload');
    setCurrentFileIndex(0);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      // Upload all files
      const uploadJson = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 60); // cap upload at 60%
            setProgress(pct);
          }
        };
        xhr.onload = () => {
          try {
            const resp = JSON.parse(xhr.responseText || '{}');
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgress(60);
              resolve(resp);
            } else {
              reject(new Error(resp.error || 'Upload failed'));
            }
          } catch (e: any) {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(formData);
      });

      if (!uploadJson.success) {
        throw new Error(uploadJson.error || 'Upload failed');
      }

      setUploadResults(uploadJson.uploadedFiles);

      // Trigger batch ingestion
      if (uploadJson.uploadedFiles && uploadJson.uploadedFiles.length > 0) {
        try {
          setIndexing(true);
          setPhase('ingest');
          
          const metadataIds = uploadJson.uploadedFiles.map((file: any) => file.metadataId);
          
          // Simulate progress from 60% to 95%
          let simulated = 60;
          const timer = setInterval(() => {
            simulated = Math.min(simulated + 2, 95);
            setProgress(simulated);
          }, 500);

          const ingestRes = await fetch('/api/ingest-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadataIds }),
          });
          
          const ingestJson = await ingestRes.json();
          clearInterval(timer);
          
          if (!ingestRes.ok) {
            throw new Error(ingestJson.error || 'Ingestion failed');
          }

          setProgress(100);
          setPhase('done');
          
          // Show success message with details
          if (ingestJson.errors && ingestJson.errors.length > 0) {
            setError(`Processed ${ingestJson.processedFiles}/${ingestJson.totalFiles} files successfully. Some files had issues: ${ingestJson.errors.join(', ')}`);
          }
          
          // Redirect to chat after short delay
          setTimeout(() => {
            router.push('/query');
          }, 1500);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setIndexing(false);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };



  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: true,
    noClick: true,
    maxFiles: 10,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'application/csv': ['.csv']
    },
    onDrop: (acceptedFiles, fileRejections) => {
      if (acceptedFiles.length > 0) {
        handleFileChange({ target: { files: acceptedFiles } } as any);
      }
    },
    onDropRejected: (rejections) => {
      const errors = rejections.map(rejection => 
        `${rejection.file.name}: ${rejection.errors.map(e => e.message).join(', ')}`
      );
      setError(`File validation failed: ${errors.join('; ')}`);
    },
  });

  

  return (
    <div className="w-full" {...getRootProps()}>
      <div
        onClick={handleClick}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleClick(); } }}
        role="button"
        tabIndex={uploading ? -1 : 0}
        aria-label="Choose documents to upload"
        className={cn("cursor-pointer rounded-lg border border-dashed px-5 py-10 text-center transition-colors sm:px-8", isDragActive ? "border-primary bg-accent/70" : "border-input bg-background hover:border-primary/60 hover:bg-accent/30", uploading && "cursor-wait opacity-70")}
      >
        <input ref={fileInputRef} id="file-upload-handle" type="file" accept=".pdf,.docx,.csv" multiple onChange={handleFileChange} className="sr-only" disabled={uploading} />
        <span className="mx-auto flex size-12 items-center justify-center rounded-md border border-border bg-card text-foreground"><IconUpload className="size-5" /></span>
        <p className="mt-4 font-display text-lg font-semibold">{isDragActive ? "Release to shelve them" : "Drop files here, or choose from your device"}</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF, DOCX, CSV · 50 MB per file · 10 at a time</p>
        <span className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">{uploading ? "Preparing files…" : "Choose files"}</span>
      </div>

      {files.length > 0 && <ul className="mt-4 space-y-2" aria-label="Selected files">{files.map((file, idx) => (
        <li key={`${file.name}-${idx}`} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary"><IconUpload className="size-4" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{file.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</span></span>
          <span className="text-xs text-muted-foreground">{file.type === "application/pdf" ? "PDF" : file.type.includes("csv") ? "CSV" : "DOCX"}</span>
        </li>
      ))}</ul>}

      {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>}
      {(uploading || indexing) && <div className="mt-5" aria-live="polite">
        <div className="mb-2 flex justify-between text-sm"><span>{phase === "upload" ? `Uploading ${files.length} file${files.length === 1 ? "" : "s"}…` : phase === "ingest" ? "Preparing documents for questions…" : "Complete"}</span><span>{progress}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} /></div>
        {uploadResults.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Uploaded: {uploadResults.map((file) => file.originalName).join(", ")}</p>}
      </div>}
    </div>
  );
};
