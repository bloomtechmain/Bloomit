import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Link as LinkIcon, File, CheckCircle, AlertCircle } from 'lucide-react';
import { API_URL } from '../../../config/api';

interface UploadReceiptModalProps {
  poId: number;
  poNumber: string;
  accessToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type UploadMode = 'file' | 'url';

const UploadReceiptModal: React.FC<UploadReceiptModalProps> = ({
  poId,
  poNumber,
  accessToken,
  onSuccess,
  onCancel,
}) => {
  const [mode, setMode] = useState<UploadMode>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Invalid file type. Please upload a PDF or image file (JPEG, PNG, GIF, WEBP).';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 10MB. Please upload a smaller file.';
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    setValidationError(null);
    setError(null);
    
    const validationError = validateFile(file);
    if (validationError) {
      setValidationError(validationError);
      return;
    }

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFileToBackend = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('receipt', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error occurred during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled'));
      });

      // Open and send request
      xhr.open('POST', `${API_URL}/purchase-orders/${poId}/upload-receipt`);
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
      xhr.send(formData);
    });
  };

  const uploadUrlToBackend = async (url: string): Promise<void> => {
    const response = await fetch(`${API_URL}/purchase-orders/${poId}/upload-receipt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ receipt_document_url: url }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload receipt');
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setValidationError(null);

    try {
      setIsSubmitting(true);

      if (mode === 'file') {
        if (!selectedFile) {
          setValidationError('Please select a file to upload.');
          setIsSubmitting(false);
          return;
        }

        // Upload file to backend
        await uploadFileToBackend(selectedFile);
      } else {
        // URL mode
        if (!receiptUrl.trim()) {
          setValidationError('Please enter a receipt URL.');
          setIsSubmitting(false);
          return;
        }

        // Basic URL validation
        try {
          new URL(receiptUrl);
        } catch {
          setValidationError('Please enter a valid URL.');
          setIsSubmitting(false);
          return;
        }

        // Upload URL to backend
        await uploadUrlToBackend(receiptUrl);
      }

      // Success - call parent success handler
      onSuccess();
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload receipt');
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const canSubmit = mode === 'file' ? selectedFile !== null : receiptUrl.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Upload Receipt
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* PO Number Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Purchase Order:
              </span>
              <span className="text-lg font-bold text-blue-700">
                {poNumber}
              </span>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('file')}
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                mode === 'file'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                <span>Upload File</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode('url')}
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                mode === 'url'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-center gap-2">
                <LinkIcon className="w-4 h-4" />
                <span>Enter URL</span>
              </div>
            </button>
          </div>

          {/* File Upload Mode */}
          {mode === 'file' && (
            <div className="space-y-4">
              {/* File Drop Zone */}
              {!selectedFile && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                  onClick={handleBrowseClick}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                    onChange={handleFileInputChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {isDragging ? 'Drop file here' : 'Drag and drop file here'}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">or</p>
                  <button
                    type="button"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseClick();
                    }}
                    disabled={isSubmitting}
                  >
                    Browse Files
                  </button>
                  <p className="text-xs text-gray-500 mt-4">
                    Supported formats: PDF, JPEG, PNG, GIF, WEBP (Max 10MB)
                  </p>
                </div>
              )}

              {/* File Preview/Info */}
              {selectedFile && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {filePreview ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                          <File className="w-8 h-8 text-red-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024).toFixed(2)} KB
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedFile.type || 'Unknown type'}
                        </p>
                      </div>
                    </div>
                    {!isSubmitting && (
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-gray-400 hover:text-red-600 transition-colors ml-2"
                        title="Remove file"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Upload Progress */}
                  {isSubmitting && uploadProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Uploading...</span>
                        <span className="text-gray-600">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Full Preview (for images) */}
                  {filePreview && !isSubmitting && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={filePreview}
                        alt="Full preview"
                        className="w-full h-auto max-h-96 object-contain bg-gray-50"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* URL Input Mode */}
          {mode === 'url' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="receipt-url"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Receipt Document URL
                </label>
                <input
                  id="receipt-url"
                  type="url"
                  value={receiptUrl}
                  onChange={(e) => {
                    setReceiptUrl(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="https://example.com/receipt.pdf"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the URL of the receipt document (must be publicly accessible)
                </p>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">{validationError}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Uploading a receipt will automatically mark this
              purchase order as <strong>PAID</strong>. Make sure the payment has been
              processed before uploading the receipt.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200 sticky bottom-0">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Upload & Mark as Paid</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadReceiptModal;
