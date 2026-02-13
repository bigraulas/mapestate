import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileImage, File as FileIcon, Loader2 } from 'lucide-react';
import { uploadsService } from '@/services';

interface FileUploadProps {
  multiple?: boolean;
  accept?: string;
  value?: string[];
  onUpload: (urls: string[]) => void;
  label?: string;
}

export default function FileUpload({
  multiple = false,
  accept = 'image/jpeg,image/png,image/webp,application/pdf',
  value = [],
  onUpload,
  label,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;

      setUploading(true);
      try {
        const urls: string[] = [];
        for (const file of fileArr) {
          const res = await uploadsService.upload(file);
          urls.push(res.data.url);
        }
        if (multiple) {
          onUpload([...value, ...urls]);
        } else {
          onUpload(urls.slice(0, 1));
        }
      } catch {
        // Upload failed silently
      } finally {
        setUploading(false);
      }
    },
    [multiple, value, onUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const removeUrl = (url: string) => {
    onUpload(value.filter((v) => v !== url));
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|webp)$/i.test(url);

  return (
    <div>
      {label && <label className="label">{label}</label>}

      {/* Previews */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((url) => (
            <div
              key={url}
              className="relative group w-20 h-20 rounded-lg border border-slate-200 overflow-hidden bg-slate-50"
            >
              {isImage(url) ? (
                <img src={url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileIcon className="w-6 h-6 text-slate-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeUrl(url)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {(multiple || value.length === 0) && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Se incarca...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              {accept.includes('image') ? (
                <FileImage className="w-6 h-6 text-slate-300" />
              ) : (
                <Upload className="w-6 h-6 text-slate-300" />
              )}
              <p className="text-xs text-slate-500">
                Trage fisiere aici sau <span className="text-primary-600 font-medium">click pentru upload</span>
              </p>
              <p className="text-[10px] text-slate-400">JPG, PNG, WebP, PDF - max 10MB</p>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
    </div>
  );
}
