import React, { useCallback, useState } from 'react';
import { Upload, Link as LinkIcon, Trash2, Download, Copy, Check } from 'lucide-react';
import { useCsvStore } from '../store/useCsvStore';
import { parseCSV, exportCSV } from '../utils/csvParser';
import { toast } from 'sonner';

export const ImportSection: React.FC = () => {
  const { setProducts, globalReferenceUrl, setGlobalReferenceUrl, isImported, clearData, products } = useCsvStore();
  const [isDragging, setIsDragging] = useState(false);
  const [refCopied, setRefCopied] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file');
      return;
    }
    
    try {
      const parsed = await parseCSV(file);
      if (parsed.length === 0) {
        toast.error('The CSV file appears to be empty');
        return;
      }
      setProducts(parsed);
      toast.success(`Successfully imported ${parsed.length} products`);
    } catch (error) {
      toast.error('Failed to parse CSV file');
      console.error(error);
    }
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleExport = () => {
    try {
      exportCSV(products);
      toast.success('Exported successfully!');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleCopyRef = async () => {
    if (!globalReferenceUrl) return;
    try {
      await navigator.clipboard.writeText(globalReferenceUrl);
      setRefCopied(true);
      toast.success('Reference URL copied!');
      setTimeout(() => setRefCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (isImported) {
    return (
      <div className="bg-white border-b border-gray-200">
        {/* Top row: status + action buttons */}
        <div className="flex justify-between items-center px-4 pt-3 pb-2">
          <h2 className="text-sm font-medium text-green-600 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Active Session
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExport}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors font-medium bg-gray-50 px-2 py-1 rounded-md border border-gray-200 hover:border-blue-300"
            >
              <Download size={12} /> Export CSV
            </button>
            <button
              onClick={clearData}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors font-medium bg-gray-50 px-2 py-1 rounded-md border border-gray-200 hover:border-red-300"
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
        </div>

        {/* Reference link row — always visible in header */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <LinkIcon size={13} className="text-purple-400 flex-shrink-0" />
          {globalReferenceUrl ? (
            <>
              <span className="text-xs text-purple-700 font-medium truncate flex-1" title={globalReferenceUrl}>
                {globalReferenceUrl}
              </span>
              <button
                onClick={handleCopyRef}
                title="Copy Reference URL"
                className={`flex-shrink-0 p-1.5 rounded-md border transition-colors ${
                  refCopied
                    ? 'text-green-600 bg-green-50 border-green-200'
                    : 'text-purple-500 bg-purple-50 border-purple-200 hover:bg-purple-100'
                }`}
              >
                {refCopied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">No reference URL set</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-gray-800">1. Upload Product CSV</label>
        <p className="text-xs text-gray-500 leading-relaxed">Ensure your CSV has <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">Name</code> and <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">View Link</code> headers (or <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">product_name</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700">drive_folder</code>).</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-blue-400'}`}
        onClick={() => document.getElementById('csv-upload')?.click()}
      >
        <Upload className={`mb-3 transition-colors ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} size={28} />
        <span className="text-sm text-gray-700 font-medium mb-1">Click or drag CSV file here</span>
        <span className="text-xs text-gray-400">.csv files only</span>
        <input 
          id="csv-upload" 
          type="file" 
          accept=".csv" 
          className="hidden" 
          onChange={onFileChange}
        />
      </div>

      <div className="h-px bg-gray-200 w-full my-1 rounded-full"></div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <LinkIcon size={16} className="text-gray-500" /> 2. Global Reference URL <span className="text-gray-400 font-normal text-xs">(Optional)</span>
        </label>
        <textarea
          value={globalReferenceUrl}
          onChange={(e) => setGlobalReferenceUrl(e.target.value)}
          placeholder="Paste global reference link here... (Applies to all products if they lack their own)"
          className="w-full text-sm p-3.5 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24 transition-shadow bg-white"
        />
      </div>
    </div>
  );
};
