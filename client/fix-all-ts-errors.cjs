#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const fixes = [
  // POStatusTimeline.tsx - Remove unused import
  {
    file: 'client/src/components/purchaseOrders/modals/POStatusTimeline.tsx',
    search: "import { CheckCircle2, XCircle, Clock, Download, FileText, AlertCircle } from 'lucide-react'\nimport { POStatusBadge } from '../shared/POStatusBadge'",
    replace: "import { CheckCircle2, XCircle, Clock, Download, FileText, AlertCircle } from 'lucide-react'"
  },
  // QuoteEditModal.tsx - Remove unused Quote type
  {
    file: 'client/src/components/quotes/QuoteEditModal.tsx',
    search: "import type { Quote, QuoteItem, QuoteAdditionalService, TemplateType } from '../../types/quotes'",
    replace: "import type { QuoteItem, QuoteAdditionalService, TemplateType } from '../../types/quotes'"
  },
  // QuoteRemindersSection.tsx - Remove companyName
  {
    file: 'client/src/components/quotes/QuoteRemindersSection.tsx',
    search: 'const { companyName, companyAddress } = quote',
    replace: 'const { companyAddress } = quote'
  },
  // QuoteStatusHistory.tsx - Remove index param
  {
    file: 'client/src/components/quotes/QuoteStatusHistory.tsx',
    search: 'statusHistory.map((entry, index) =>',
    replace: 'statusHistory.map((entry) =>'
  },
  // ReportsTab.tsx - Remove unused setters
  {
    file: 'client/src/components/timeTracking/ReportsTab.tsx',
    search: 'const [startDate, setStartDate] = useState',
    replace: 'const [startDate] = useState'
  },
  {
    file: 'client/src/components/timeTracking/ReportsTab.tsx',
    search: 'const [endDate, setEndDate] = useState',
    replace: 'const [endDate] = useState'
  },
  // EmployeeDirectory.tsx - Remove Filter
  {
    file: 'client/src/pages/EmployeeDirectory.tsx',
    search: "import { Users, Search, Filter } from 'lucide-react'",
    replace: "import { Users, Search } from 'lucide-react'"
  },
  // EmployeeDocuments.tsx - Remove FileText
  {
    file: 'client/src/pages/EmployeeDocuments.tsx',
    search: "import { Download, FileText, Folder, Search } from 'lucide-react'",
    replace: "import { Download, Folder, Search } from 'lucide-react'"
  },
  // EmployeePayroll.tsx - Remove DollarSign
  {
    file: 'client/src/pages/EmployeePayroll.tsx',
    search: "import { Download, TrendingUp, DollarSign } from 'lucide-react'",
    replace: "import { Download, TrendingUp } from 'lucide-react'"
  },
  // EmployeePayslipSignature.tsx - Remove searchParams
  {
    file: 'client/src/pages/EmployeePayslipSignature.tsx',
    search: 'const [searchParams] = useSearchParams()',
    replace: 'useSearchParams()'
  },
  // EmployeeSettings.tsx - Remove data
  {
    file: 'client/src/pages/EmployeeSettings.tsx',
    search: 'const { data } = await updateEmployeeProfile(',
    replace: 'await updateEmployeeProfile('
  },
  // Loans.tsx - Remove FileDown
  {
    file: 'client/src/pages/Loans.tsx',
    search: "import { Plus, Search, Filter, DollarSign, Calendar, FileDown } from 'lucide-react'",
    replace: "import { Plus, Search, Filter, DollarSign, Calendar } from 'lucide-react'"
  },
  // QuoteGenerator.tsx - Remove assignQuote
  {
    file: 'client/src/pages/QuoteGenerator.tsx',
    search: "import { createQuote, updateQuote, deleteQuote, assignQuote } from '../services/quotesApi'",
    replace: "import { createQuote, updateQuote, deleteQuote } from '../services/quotesApi'"
  }
];

console.log('Fixing TypeScript errors...\n');

fixes.forEach(fix => {
  const filePath = path.join(process.cwd(), fix.file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(fix.search)) {
      content = content.replace(fix.search, fix.replace);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ Fixed: ${fix.file}`);
    } else {
      console.log(`⚠ Skipped (not found): ${fix.file}`);
    }
  } catch (error) {
    console.log(`✗ Error fixing ${fix.file}:`, error.message);
  }
});

console.log('\nAll fixes applied!');
