#!/bin/bash
# Fix remaining TypeScript errors in Quote files

echo "Fixing remaining TypeScript errors..."

# Fix QuoteList.tsx - comment out unused variables/functions
sed -i 's/const \[sortField, setSortField\]/\/\/ const [sortField, setSortField]/' src/components/quotes/QuoteList.tsx
sed -i 's/const \[sortDirection, setSortDirection\]/\/\/ const [sortDirection, setSortDirection]/' src/components/quotes/QuoteList.tsx
sed -i '/^import.*API_URL/s/^/\/\/ /' src/components/quotes/QuoteList.tsx
sed -i 's/onViewQuote,/\/\/ onViewQuote,/' src/components/quotes/QuoteList.tsx
sed -i 's/onEditQuote,/\/\/ onEditQuote,/' src/components/quotes/QuoteList.tsx

# Fix QuoteRemindersSection.tsx - remove unused destructured variables
sed -i 's/quoteNumber,/\/\/ quoteNumber,/' src/components/quotes/QuoteRemindersSection.tsx
sed -i 's/companyName,/\/\/ companyName,/' src/components/quotes/QuoteRemindersSection.tsx

# Fix QuoteStatusHistory.tsx - prefix unused parameter with _
sed -i 's/(entry, index)/(entry, _index)/' src/components/quotes/QuoteStatusHistory.tsx

# Fix QuoteGenerator.tsx - comment out unused imports
sed -i 's/getAllQuotes,/\/\/ getAllQuotes,/' src/pages/QuoteGenerator.tsx
sed -i 's/getQuoteById,/\/\/ getQuoteById,/' src/pages/QuoteGenerator.tsx
sed -i 's/updateQuote,/\/\/ updateQuote,/' src/pages/QuoteGenerator.tsx
sed -i 's/updateQuoteStatus,/\/\/ updateQuoteStatus,/' src/pages/QuoteGenerator.tsx
sed -i 's/assignQuote,/\/\/ assignQuote,/' src/pages/QuoteGenerator.tsx
sed -i '/^import.*API_URL.*from.*config/s/^/\/\/ /' src/pages/QuoteGenerator.tsx

# Fix PODashboardWidgets.tsx - prefix unused parameter
sed -i 's/purchaseOrders, vendors,/purchaseOrders, _vendors,/' src/components/purchaseOrders/widgets/PODashboardWidgets.tsx

echo "All TypeScript errors fixed!"
