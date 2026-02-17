import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface RejectPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  poNumber: string;
  poId: number;
  onReject: (poId: number, reason: string) => Promise<void>;
}

const RejectPOModal: React.FC<RejectPOModalProps> = ({
  isOpen,
  onClose,
  poNumber,
  poId,
  onReject,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const MIN_REASON_LENGTH = 10;

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRejectionReason(value);
    
    // Clear validation error when user starts typing
    if (validationError && value.trim().length >= MIN_REASON_LENGTH) {
      setValidationError('');
    }
  };

  const validateReason = (): boolean => {
    const trimmedReason = rejectionReason.trim();
    
    if (!trimmedReason) {
      setValidationError('Rejection reason is required');
      return false;
    }
    
    if (trimmedReason.length < MIN_REASON_LENGTH) {
      setValidationError(`Rejection reason must be at least ${MIN_REASON_LENGTH} characters`);
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateReason()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(poId, rejectionReason.trim());
      // Reset state on success
      setRejectionReason('');
      setValidationError('');
      onClose();
    } catch (error) {
      console.error('Error rejecting PO:', error);
      setValidationError('Failed to reject purchase order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRejectionReason('');
      setValidationError('');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const characterCount = rejectionReason.length;
  const isValidLength = rejectionReason.trim().length >= MIN_REASON_LENGTH;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Reject Purchase Order</h2>
              <p className="text-sm text-gray-500 mt-0.5">PO #{poNumber}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700">
                Please provide a clear reason for rejecting this purchase order. 
                This will be communicated to the requestor.
              </p>
            </div>
          </div>

          {/* Rejection Reason Textarea */}
          <div className="mb-4">
            <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={handleReasonChange}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
                validationError
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              } disabled:bg-gray-50 disabled:cursor-not-allowed`}
              rows={5}
              placeholder="Enter the reason for rejecting this purchase order..."
              maxLength={500}
            />
            
            {/* Character Count */}
            <div className="flex items-center justify-between mt-2">
              <span className={`text-xs ${
                isValidLength 
                  ? 'text-green-600' 
                  : characterCount > 0 
                    ? 'text-amber-600' 
                    : 'text-gray-500'
              }`}>
                {characterCount} / {MIN_REASON_LENGTH} minimum characters
              </span>
              <span className="text-xs text-gray-400">
                {500 - characterCount} remaining
              </span>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !rejectionReason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Rejecting...
              </>
            ) : (
              'Reject Purchase Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectPOModal;
