import React, { useState } from 'react';
import { X, CheckCircle, DollarSign, FileText } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';

interface ApproveConfirmModalProps {
  poNumber: string;
  totalAmount: number;
  vendorName?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const ApproveConfirmModal: React.FC<ApproveConfirmModalProps> = ({
  poNumber,
  totalAmount,
  vendorName,
  onConfirm,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onConfirm();
      toast.success('Purchase order approved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve purchase order');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Approve Purchase Order
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
          {/* Warning Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-gray-700 text-center font-medium">
              Are you sure you want to approve this purchase order?
            </p>
          </div>

          {/* PO Details */}
          <div className="space-y-3">
            {/* PO Number */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">
                  PO Number:
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {poNumber}
              </span>
            </div>

            {/* Vendor Name (if provided) */}
            {vendorName && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">
                  Vendor:
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {vendorName}
                </span>
              </div>
            )}

            {/* Total Amount */}
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  Total Amount:
                </span>
              </div>
              <span className="text-lg font-bold text-green-700">
                ${totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Once approved, this purchase order will be
              authorized for processing. The requestor will be notified of the
              approval.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Approving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Approve Purchase Order</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApproveConfirmModal;
