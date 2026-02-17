#!/bin/bash
# Script to fix TypeScript errors for Railway deployment

echo "Fixing TypeScript errors..."

# Fix POStatusTimeline - remove unused import
sed -i "s/import { Clock, CheckCircle, XCircle, AlertCircle, POStatusBadge } from 'lucide-react'/import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'/" src/components/purchaseOrders/modals/POStatusTimeline.tsx

# Fix PODashboardWidgets - remove unused imports
sed -i "s/import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, DollarSign } from 'lucide-react'/import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle } from 'lucide-react'/" src/components/purchaseOrders/widgets/PODashboardWidgets.tsx

# Fix QuoteEditModal - remove unused type import
sed -i "s/import { QuoteStatus, Quote } from '..\/..\/..\/types\/quotes'/import { QuoteStatus } from '..\/..\/..\/types\/quotes'/" src/components/quotes/QuoteEditModal.tsx

# Fix QuoteViewModal - remove unused imports
sed -i "s/import type { Quote, QuoteItem, QuoteAdditionalService } from '..\/..\/..\/types\/quotes'/import type { Quote } from '..\/..\/..\/types\/quotes'/" src/components/quotes/QuoteViewModal.tsx

# Fix poPdfExport - remove unused import
sed -i "1,/import { COMPANY_INFO } from '..\/constants\/companyInfo'/s/import { COMPANY_INFO } from '..\/constants\/companyInfo'/\/\/ import { COMPANY_INFO } from '..\/constants\/companyInfo'/" src/utils/poPdfExport.ts

echo "TypeScript errors fixed!"
