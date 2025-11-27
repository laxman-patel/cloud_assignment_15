import { useState } from 'react';
import { UploadCloud, FileText, Check } from 'lucide-react';

export function LabResults() {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // Simulate upload
        handleUpload();
    };

    const handleUpload = () => {
        setUploading(true);
        setUploadStatus('idle');

        // Simulate network request
        setTimeout(() => {
            setUploading(false);
            setUploadStatus('success');
        }, 2000);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Lab Results</h2>
                <p className="text-zinc-400 mt-2">Upload and process patient lab reports.</p>
            </div>

            <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${isDragging ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 bg-zinc-900/50'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                        {uploading ? (
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : uploadStatus === 'success' ? (
                            <Check className="text-emerald-500" size={32} />
                        ) : (
                            <UploadCloud size={32} />
                        )}
                    </div>

                    <div>
                        <h3 className="text-lg font-medium text-zinc-200">
                            {uploading ? 'Uploading...' : uploadStatus === 'success' ? 'Upload Complete' : 'Upload Lab Report'}
                        </h3>
                        <p className="text-zinc-500 mt-1">
                            {uploading ? 'Processing file...' : 'Drag and drop your PDF here, or click to browse'}
                        </p>
                    </div>

                    {uploadStatus === 'idle' && !uploading && (
                        <button
                            onClick={handleUpload}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            Select File
                        </button>
                    )}

                    {uploadStatus === 'success' && (
                        <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-lg text-sm font-medium">
                            File successfully sent to Lab Processor
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Reports</h3>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p className="font-medium text-zinc-200">Blood_Work_Report_#{1000 + i}.pdf</p>
                                    <p className="text-xs text-zinc-500">Processed on Oct {24 + i}, 2023</p>
                                </div>
                            </div>
                            <button className="text-sm text-zinc-400 hover:text-white">View Result</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
