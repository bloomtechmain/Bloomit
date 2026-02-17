#!/bin/bash

# Fix unused imports in TypeScript files

echo "Fixing TypeScript compilation errors..."

# InstallPrompt.tsx - Remove Monitor
sed -i "s/import { useEffect, useState } from 'react'/import { useEffect, useState } from 'react'/" client/src/components/InstallPrompt.tsx
sed -i "s/import { Download, X, Smartphone, Monitor } from 'lucide-react'/import { Download, X, Smartphone } from 'lucide-react'/" client/src/components/InstallPrompt.tsx

# PayslipForm.tsx - Remove PayslipFormData type and unused params
sed -i "s/import type { EmployeePayrollData, PayslipFormData } from/import type { EmployeePayrollData } from/" client/src/components/PayslipForm.tsx
sed -i "s/}: PayslipFormProps) {/}: PayslipFormProps) {/" client/src/components/PayslipForm.tsx

# QuickActions.tsx - Remove Upload
sed -i "s/import { Calendar, Clock, DollarSign, FileText, Upload } from 'lucide-react'/import { Calendar, Clock, DollarSign, FileText } from 'lucide-react'/" client/src/components/employee/QuickActions.tsx

# POStatusTimeline.tsx - Remove POStatusBadge
sed -i "/^import POStatusBadge from/d" client/src/components/purchaseOrders/modals/POStatusTimeline.tsx

# QuoteEditModal.tsx - Remove Quote type
sed -i "s/import type { Quote, QuoteItem, QuoteAdditionalService } from/import type { QuoteItem, QuoteAdditionalService } from/" client/src/components/quotes/QuoteEditModal.tsx

# QuoteRemindersSection.tsx - Remove companyName destructuring
sed -i "s/const { companyName, companyAddress } = quote/const { companyAddress } = quote/" client/src/components/quotes/QuoteRemindersSection.tsx

# QuoteStatusHistory.tsx - Remove index param
sed -i "s/statusHistory.map((entry, index) =>/statusHistory.map((entry) =>/" client/src/components/quotes/QuoteStatusHistory.tsx

# QuoteViewModal.tsx - Remove unused types
sed -i "s/import type { Quote, QuoteItem, QuoteAdditionalService } from/import type { Quote } from/" client/src/components/quotes/QuoteViewModal.tsx

# ReportsTab.tsx - Remove setStartDate and setEndDate
sed -i "s/const \[startDate, setStartDate\] = useState/const \[startDate\] = useState/" client/src/components/timeTracking/ReportsTab.tsx
sed -i "s/const \[endDate, setEndDate\] = useState/const \[endDate\] = useState/" client/src/components/timeTracking/ReportsTab.tsx

# EmployeeDirectory.tsx - Remove Filter
sed -i "s/import { Users, Search, Filter } from 'lucide-react'/import { Users, Search } from 'lucide-react'/" client/src/pages/EmployeeDirectory.tsx

# EmployeeDocuments.tsx - Remove FileText
sed -i "s/import { Download, FileText, Folder, Search } from 'lucide-react'/import { Download, Folder, Search } from 'lucide-react'/" client/src/pages/EmployeeDocuments.tsx

# EmployeePayroll.tsx - Remove DollarSign
sed -i "s/import { Download, TrendingUp, DollarSign } from 'lucide-react'/import { Download, TrendingUp } from 'lucide-react'/" client/src/pages/EmployeePayroll.tsx

# EmployeePayslipSignature.tsx - Remove searchParams
sed -i "s/const \[searchParams\] = useSearchParams()/useSearchParams()/" client/src/pages/EmployeePayslipSignature.tsx

# EmployeeSettings.tsx - Remove unused data variable
sed -i "s/const { data } = await updateEmployeeProfile(/const { } = await updateEmployeeProfile(/" client/src/pages/EmployeeSettings.tsx

# Loans.tsx - Remove FileDown
sed -i "s/import { Plus, Search, Filter, DollarSign, Calendar, FileDown } from 'lucide-react'/import { Plus, Search, Filter, DollarSign, Calendar } from 'lucide-react'/" client/src/pages/Loans.tsx

# PurchaseOrders.tsx - Remove unused functions
sed -i "/const handleItemChange =/,/^  }/d" client/src/pages/PurchaseOrders.tsx
sed -i "/const addItem =/,/^  }/d" client/src/pages/PurchaseOrders.tsx
sed -i "/const removeItem =/,/^  }/d" client/src/pages/PurchaseOrders.tsx
sed -i "/const handleSubmit =/,/^  }/d" client/src/pages/PurchaseOrders.tsx
sed -i "/const handleReject =/,/^  }/d" client/src/pages/PurchaseOrders.tsx
sed -i "/const handleUploadReceipt =/,/^  }/d" client/src/pages/PurchaseOrders.tsx

# QuoteGenerator.tsx - Remove unused functions
sed -i "s/import { createQuote, updateQuote, deleteQuote, assignQuote } from/import { createQuote, updateQuote, deleteQuote } from/" client/src/pages/QuoteGenerator.tsx
sed -i "/const handleViewQuote =/,/^  }/d" client/src/pages/QuoteGenerator.tsx
sed -i "/const handleEditQuote =/,/^  }/d" client/src/pages/QuoteGenerator.tsx

echo "TypeScript errors fixed!"
echo "Running build to verify..."
cd client && npm run build
