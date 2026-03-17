import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { API_URL } from '../config/api'
import { hasPermission, hasAnyPermission } from '../utils/permissions'
import CalendarWidget from '../components/CalendarWidget'
import NotesWidget from '../components/NotesWidget'
import TodosWidget from '../components/TodosWidget'
import SystemClock from '../components/SystemClock'
import InternationalClock from '../components/InternationalClock'
import { ProcessFlowGuidance } from '../components/ProcessFlowGuidance'
import DataAnalytics from './DataAnalytics'
import Settings from './Settings'
import Projects from './Projects'
import ProjectTime from './ProjectTime'
import PTORequests from './PTORequests'
import Subscriptions from './Subscriptions'
import DocumentBank from './DocumentBank'
import QuoteGenerator from './QuoteGenerator'
import PurchaseOrders from './PurchaseOrders'
import Payroll from './Payroll'
import Loans from './Loans'
import { LayoutDashboard, Users, ClipboardList, Store, FolderOpen, Banknote, Landmark, Receipt, Coins, Inbox, Plus, PlusCircle, CreditCard, Building2, ChevronLeft, ChevronRight, ChevronDown, BarChart3, Settings as SettingsIcon, Clock, Calendar, Repeat, FileText, FileSignature, ShoppingCart, DollarSign, TrendingDown } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'

type User = { 
  id: number
  name: string
  email: string
  roleId: number | null
  roleName: string | null
  roleNames?: string[]
  permissions: string[]
}

type Employee = {
  employee_id: number
  employee_number: string
  first_name: string
  last_name: string
  email: string
  phone: string
  dob: string | null
  nic: string | null
  address: string | null
  role: string
  designation: string | null
  tax: string | null
  created_at: string
}

type Project = {
  project_id: number
  project_name: string
  customer_name: string
  description: string | null
  initial_cost_budget: number
  extra_budget_allocation: number
  payment_type: string
  status: string
  contract_id?: number
  contract_name?: string
}

type ProjectItem = {
  project_id: number
  requirements: string
  service_category: string
  unit_cost: number
  requirement_type: string
}

type Vendor = {
  vendor_id: number
  vendor_name: string
  contact_email: string | null
  contact_phone: string | null
  is_active: boolean
  created_at: string
}

type Payable = {
  payable_id: number
  vendor_id: number
  payable_name: string
  description: string | null
  payable_type: string
  amount: number
  frequency: string | null
  start_date: string | null
  end_date: string | null
  project_id: number | null
  is_active: boolean
  created_at: string
  vendor_name?: string
  project_name?: string
  bank_account_id?: number | null
  payment_method?: string | null
  reference_number?: string | null
}

type PettyCashTransaction = {
  id: number
  petty_cash_account_id: number
  transaction_type: string
  amount: number
  description: string | null
  transaction_date: string | null
  project_id: number | null
  created_at: string
  source_bank_account_id: number | null
  payable_id: number | null
  project_name?: string
}

type Receivable = {
  receivable_id: number
  payer_name: string
  receivable_name: string
  description: string | null
  receivable_type: string
  amount: number
  frequency: string | null
  start_date: string | null
  end_date: string | null
  project_id: number | null
  is_active: boolean
  bank_account_id: number | null
  payment_method: string | null
  reference_number: string | null
  created_at: string
  project_name?: string
  bank_name?: string
  account_number?: string
}

type Asset = {
  id: number
  asset_name: string
  value: number
  purchase_date: string
  created_at: string
  depreciation_method?: 'STRAIGHT_LINE' | 'DOUBLE_DECLINING' | null
  salvage_value?: number | null
  useful_life?: number | null
  current_book_value?: number
  accumulated_depreciation?: number
}

type DepreciationScheduleItem = {
  period: string | number
  year?: number
  month?: number
  beginningBookValue: number
  depreciation: number
  accumulatedDepreciation: number
  endingBookValue: number
  isCurrent?: boolean
}

export default function Dashboard({ 
  user, 
  accessToken,
  onLogout
}: { 
  user: User
  accessToken: string
  refreshToken: string
  onLogout?: () => void
  onTokenRefresh?: (newAccessToken: string) => void
}) {
  console.log('Dashboard render start', { user })
  const isAdmin = user.roleNames?.includes('Admin') || user.roleNames?.includes('Super Admin') || user.roleName === 'Admin' || user.roleName === 'Super Admin'
  const { toast } = useToast()
  const confirm = useConfirm()
  const [tab, setTab] = useState<'home' | 'employees' | 'projects' | 'accounting' | 'analytics' | 'documents' | 'quotes' | 'settings'>('home')
  const [navOpen, setNavOpen] = useState(true)
  const [projectSubTab, setProjectSubTab] = useState<'projects' | 'time' | 'quotes'>('projects')
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [nic, setNic] = useState('')
  const [address, setAddress] = useState('')
  const [role, setRole] = useState<'IT' | 'Accounting' | 'Marketing'>('IT')
  const [designation, setDesignation] = useState('')
  const [tax, setTax] = useState('')
  const [saving, setSaving] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  // const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [initialCostBudget, setInitialCostBudget] = useState('')
  const [projectStatus, setProjectStatus] = useState('')
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [projectDeleteModalOpen, setProjectDeleteModalOpen] = useState(false)
  const [projectItemsModalOpen, setProjectItemsModalOpen] = useState(false)
  const [totalBudgetModalOpen, setTotalBudgetModalOpen] = useState(false)
  const [totalBudgetProject, setTotalBudgetProject] = useState<Project | null>(null)
  const [openAccountModalOpen, setOpenAccountModalOpen] = useState(false)
  const [accountingSubTab, setAccountingSubTab] = useState<'accounts' | 'payable' | 'petty_cash' | 'receivable' | 'subscriptions' | 'purchase_orders' | 'payroll' | 'assets' | 'loans'>('accounts')
  const [employeeSubTab, setEmployeeSubTab] = useState<'employees' | 'vendors' | 'pto'>('employees')
  const [bankName, setBankName] = useState('')
  const [branch, setBranch] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [itemsTableModalOpen, setItemsTableModalOpen] = useState(false)
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false)
  const [bankLogoLocalFailed, setBankLogoLocalFailed] = useState<Record<string, boolean>>({})
  const [bankLogoRemoteFailed, setBankLogoRemoteFailed] = useState<Record<string, boolean>>({})
  // const [newCardHolder, setNewCardHolder] = useState('John Doe')
  // const [newCardNumber, setNewCardNumber] = useState('4242 4242 4242 4242')
  const [cardSaveConfirmVisible, setCardSaveConfirmVisible] = useState(false)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorsLoading, setVendorsLoading] = useState(false)
  const [isAddingVendor, setIsAddingVendor] = useState(false)
  const [vendorName, setVendorName] = useState('')
  const [vendorEmail, setVendorEmail] = useState('')
  const [vendorPhone, setVendorPhone] = useState('')
  const [vendorIsActive, setVendorIsActive] = useState(true)
  const [vendorSearch, setVendorSearch] = useState('')
  const [vendorStatusFilter, setVendorStatusFilter] = useState('All')
  const [payables, setPayables] = useState<Payable[]>([])
  const [payablesLoading, setPayablesLoading] = useState(false)
  const [isAddingBill, setIsAddingBill] = useState(false)
  const [isReplenishing, setIsReplenishing] = useState(false)
  const [replenishAmount, setReplenishAmount] = useState('')
  const [replenishSourceAccountId, setReplenishSourceAccountId] = useState('')
  const [replenishReference, setReplenishReference] = useState('')
  const [billVendorId, setBillVendorId] = useState('')
  const [billName, setBillName] = useState('')
  const [billDescription, setBillDescription] = useState('')
  const [billType, setBillType] = useState('ONE_TIME')
  const [billAmount, setBillAmount] = useState('')
  const [billFrequency, setBillFrequency] = useState('')
  const [billStartDate, setBillStartDate] = useState('')
  const [billEndDate, setBillEndDate] = useState('')
  const [billProjectId, setBillProjectId] = useState('')
  const [billIsActive, setBillIsActive] = useState(true)
  const [billBankAccountId, setBillBankAccountId] = useState('')
  const [billPaymentMethod, setBillPaymentMethod] = useState('')
  const [billReferenceNumber, setBillReferenceNumber] = useState('')
  const [isNewPayableName, setIsNewPayableName] = useState(false)
  const uniquePayableNames = useMemo(() => Array.from(new Set(payables.map(p => p.payable_name))).filter(Boolean).sort(), [payables])
  const [pettyCashBalance, setPettyCashBalance] = useState<number | null>(null)
  const [isAddingReceivable, setIsAddingReceivable] = useState(false)
  const [receivablePayerName, setReceivablePayerName] = useState('')
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [receivablesLoading, setReceivablesLoading] = useState(false)

  const [receivableName, setReceivableName] = useState('')
  const [receivableDescription, setReceivableDescription] = useState('')
  const [receivableType, setReceivableType] = useState('')
  const [receivableAmount, setReceivableAmount] = useState('')
  const [receivableFrequency, setReceivableFrequency] = useState('')
  const [receivableStartDate, setReceivableStartDate] = useState('')
  const [receivableEndDate, setReceivableEndDate] = useState('')
  const [receivableProjectId, setReceivableProjectId] = useState('')

  const [payableSearch, setPayableSearch] = useState('')
  const [payableTypeFilter, setPayableTypeFilter] = useState('All')
  const [payableStatusFilter, setPayableStatusFilter] = useState('All')

  const [receivableSearch, setReceivableSearch] = useState('')
  const [receivableTypeFilter, setReceivableTypeFilter] = useState('All')
  const [receivableStatusFilter, setReceivableStatusFilter] = useState('All')

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const searchLower = employeeSearch.toLowerCase()
      const matchesSearch = 
        (emp.first_name?.toLowerCase() || '').includes(searchLower) ||
        (emp.last_name?.toLowerCase() || '').includes(searchLower) ||
        (emp.email?.toLowerCase() || '').includes(searchLower) ||
        (emp.employee_number?.toLowerCase() || '').includes(searchLower) ||
        (emp.nic?.toLowerCase() || '').includes(searchLower)
      
      const matchesRole = employeeRoleFilter === 'All' || emp.role === employeeRoleFilter
      return matchesSearch && matchesRole
    })
  }, [employees, employeeSearch, employeeRoleFilter])

  const filteredVendors = useMemo(() => {
    return (vendors || []).filter(vendor => {
      const searchLower = vendorSearch.toLowerCase()
      const matchesSearch = 
        (vendor.vendor_name?.toLowerCase() || '').includes(searchLower) ||
        (vendor.contact_email?.toLowerCase() || '').includes(searchLower) ||
        (vendor.contact_phone?.toLowerCase() || '').includes(searchLower)
      
      const matchesStatus = vendorStatusFilter === 'All' 
        ? true 
        : vendorStatusFilter === 'Active' 
          ? vendor.is_active 
          : !vendor.is_active
      
      return matchesSearch && matchesStatus
    })
  }, [vendors, vendorSearch, vendorStatusFilter])

  const filteredPayables = useMemo(() => {
    return payables.filter(p => {
      const searchLower = payableSearch.toLowerCase()
      const matchesSearch = 
        (p.payable_name?.toLowerCase() || '').includes(searchLower) ||
        (p.description?.toLowerCase() || '').includes(searchLower)
      
      const matchesType = payableTypeFilter === 'All' || p.payable_type === payableTypeFilter
      const matchesStatus = payableStatusFilter === 'All' 
        ? true 
        : payableStatusFilter === 'Active' 
          ? p.is_active 
          : !p.is_active
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [payables, payableSearch, payableTypeFilter, payableStatusFilter])

  const filteredReceivables = useMemo(() => {
    return receivables.filter(r => {
      const searchLower = receivableSearch.toLowerCase()
      const matchesSearch = 
        (r.payer_name?.toLowerCase() || '').includes(searchLower) ||
        (r.receivable_name?.toLowerCase() || '').includes(searchLower) ||
        (r.description?.toLowerCase() || '').includes(searchLower)
      
      const matchesType = receivableTypeFilter === 'All' || r.receivable_type === receivableTypeFilter
      const matchesStatus = receivableStatusFilter === 'All' 
        ? true 
        : receivableStatusFilter === 'Active' 
          ? r.is_active 
          : !r.is_active
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [receivables, receivableSearch, receivableTypeFilter, receivableStatusFilter])

  const [receivableIsActive, setReceivableIsActive] = useState(true)
  const [receivableBankAccountId, setReceivableBankAccountId] = useState('')
  const [receivablePaymentMethod, setReceivablePaymentMethod] = useState('')
  const [receivableReferenceNumber, setReceivableReferenceNumber] = useState('')
  const [pettyCashTransactions, setPettyCashTransactions] = useState<PettyCashTransaction[]>([])
  const [pettyCashTransactionsLoading, setPettyCashTransactionsLoading] = useState(false)
  const bankInputRef = useRef<HTMLInputElement | null>(null)
  const bankOptions: { name: string; slug: string; logoLocal: string; logoRemote: string }[] = [
    { name: 'Bank of Ceylon (BOC)', slug: 'boc', logoLocal: '/banks/boc.png.png', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Bank_of_Ceylon_logo.svg/256px-Bank_of_Ceylon_logo.svg.png' },
    { name: 'People’s Bank', slug: 'peoples', logoLocal: '/banks/peoples.png.jpg', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/79/Peoples_Bank_Sri_Lanka_logo.png/240px-Peoples_Bank_Sri_Lanka_logo.png' },
    { name: 'Commercial Bank of Ceylon', slug: 'commercial', logoLocal: '/banks/commercial.png.png', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/3/31/Commercial_Bank_of_Ceylon_logo.svg/240px-Commercial_Bank_of_Ceylon_logo.svg.png' },
    { name: 'Sampath Bank', slug: 'sampath', logoLocal: '/banks/sampath.png.png', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Sampath_Bank_logo.svg/256px-Sampath_Bank_logo.svg.png' },
    { name: 'Hatton National Bank (HNB)', slug: 'hnb', logoLocal: '/banks/hnb.png.webp', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9a/Hatton_National_Bank_logo.svg/256px-Hatton_National_Bank_logo.svg.png' },
    { name: 'Seylan Bank', slug: 'seylan', logoLocal: '/banks/seylan.png.png', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/16/Seylan_Bank_logo.svg/256px-Seylan_Bank_logo.svg.png' },
    { name: 'DFCC Bank', slug: 'dfcc', logoLocal: '/banks/dfcc.png.png', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/90/DFCC_Bank_logo.svg/256px-DFCC_Bank_logo.svg.png' },
    { name: 'National Savings Bank (NSB)', slug: 'nsb', logoLocal: '/banks/National_Savings_Bank_logo.png', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/National_Savings_Bank_logo.png/240px-National_Savings_Bank_logo.png' },
    { name: 'Nations Trust Bank (NTB)', slug: 'ntb', logoLocal: '/banks/ntb.png', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e5/Nations_Trust_Bank_logo.svg/256px-Nations_Trust_Bank_logo.svg.png' },
    { name: 'NDB Bank', slug: 'ndb', logoLocal: '/banks/ndb.png', logoRemote: 'https://upload.wikimedia.org/wikipedia/en/thumb/7/7b/NDB_Bank_logo.svg/256px-NDB_Bank_logo.svg.png' },
  ]
  
  
  const [currentProjectForItems, setCurrentProjectForItems] = useState<Project | null>(null)
  const [itemRequirements, setItemRequirements] = useState('')
  const [itemServiceCategory, setItemServiceCategory] = useState('')
  const [itemUnitCost, setItemUnitCost] = useState('')
  const [itemRequirementType, setItemRequirementType] = useState('')
  const [editingItem, setEditingItem] = useState<ProjectItem | null>(null)
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([])
  type Account = {
    id: number
    bank_id: number
    account_number: string
    account_name: string | null
    opening_balance: number | string
    current_balance: number | string
    created_at: string
    bank_name: string
    branch: string | null
  }
  type Card = {
    id: number
    bank_account_id: number
    card_number_last4: string
    card_holder_name: string
    expiry_date: string
    is_active: boolean
    created_at: string
  }
  const [cards, setCards] = useState<Card[]>([])
  const [selectedAccountForCards, setSelectedAccountForCards] = useState<Account | null>(null)

  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState<any>(null)
  const [addAssetModalOpen, setAddAssetModalOpen] = useState(false)
  const [assetName, setAssetName] = useState('')
  const [assetValue, setAssetValue] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [isDepreciable, setIsDepreciable] = useState(false)
  const [depreciationMethod, setDepreciationMethod] = useState<'STRAIGHT_LINE' | 'DOUBLE_DECLINING'>('STRAIGHT_LINE')
  const [salvageValue, setSalvageValue] = useState('')
  const [usefulLife, setUsefulLife] = useState('')
  const [depreciationScheduleModalOpen, setDepreciationScheduleModalOpen] = useState(false)
  const [selectedAssetForSchedule, setSelectedAssetForSchedule] = useState<Asset | null>(null)
  const [depreciationSchedule, setDepreciationSchedule] = useState<DepreciationScheduleItem[]>([])
  const [scheduleView, setScheduleView] = useState<'yearly' | 'monthly'>('yearly')
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [internationalTimezone, setInternationalTimezone] = useState('America/New_York')

  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [cardBankAccountId, setCardBankAccountId] = useState('')
  const [cardSelectedAccountLabel, setCardSelectedAccountLabel] = useState('')
  const [cardNumberLast4, setCardNumberLast4] = useState('')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardExpiryDate, setCardExpiryDate] = useState('')
  const [cardStatus, setCardStatus] = useState<'Active' | 'Inactive' | 'Blocked'>('Active')
  const [cardAccountDropdownOpen, setCardAccountDropdownOpen] = useState(false)
  const cardAccountInputRef = useRef<HTMLInputElement | null>(null)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API_URL}/employees`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (!r.ok) {
        console.error('Failed to fetch employees')
        return
      }
      const data = await r.json()
      setEmployees(data.employees || [])
    } catch (err) {
      console.error('Error fetching employees:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'employees') {
      fetchEmployees()
    }
  }, [tab, fetchEmployees])

  const fetchProjects = useCallback(async () => {
    // setProjectsLoading(true)
    try {
      const r = await fetch(`${API_URL}/projects`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (!r.ok) {
        console.error('Failed to fetch projects')
        return
      }
      const data = await r.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Error fetching projects:', err)
    } finally {
      // setProjectsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'projects' || tab === 'home') {
      fetchProjects()
    }
  }, [tab, fetchProjects])

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true)
    try {
      const r = await fetch(`${API_URL}/accounts`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (!r.ok) {
        console.error('Failed to fetch accounts')
        return
      }
      const data = await r.json()
      setAccounts(data.accounts || [])
    } catch (err) {
      console.error('Error fetching accounts:', err)
    } finally {
      setAccountsLoading(false)
    }
  }, [])

  const handleDeleteAccount = async (accountId: number, accountNumber: string) => {
    const confirmed = await confirm(`Are you sure you want to delete account ${accountNumber}? This will hide it from view but preserve all historical data.`, { destructive: true })
    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to delete account')
      }

      toast.success('Account deleted successfully')
      fetchAccounts()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error(`Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const fetchCards = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/accounts/debit-cards`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (!r.ok) {
        console.error('Failed to fetch cards')
        return
      }
      const data = await r.json()
      setCards(data.cards || [])
    } catch (err) {
      console.error('Error fetching cards:', err)
    }
  }, [])

  const fetchAssets = useCallback(async () => {
    setAssetsLoading(true)
    try {
      const r = await fetch(`${API_URL}/assets`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (!r.ok) {
        console.error('Failed to fetch assets')
        return
      }
      const data = await r.json()
      setAssets(data.assets || [])
    } catch (err) {
      console.error('Error fetching assets:', err)
    } finally {
      setAssetsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'accounting' && accountingSubTab === 'assets') {
      fetchAssets()
    }
  }, [tab, accountingSubTab, fetchAssets])

  const fetchInternationalTimezone = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/settings/international_timezone`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        if (data.setting && data.setting.setting_value) {
          setInternationalTimezone(data.setting.setting_value)
        }
      } else if (r.status === 404) {
        // Setting doesn't exist in database yet, use default
        console.log('International timezone setting not found, using default: America/New_York')
      }
    } catch (err) {
      console.error('Error fetching timezone setting:', err)
    }
  }, [accessToken])

  useEffect(() => {
    if (tab === 'home') {
      fetchInternationalTimezone()
    }
  }, [tab, fetchInternationalTimezone])

  const fetchPettyCashBalance = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/petty-cash/balance`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        setPettyCashBalance(data.current_balance !== undefined ? Number(data.current_balance) : 0)
      }
    } catch (err) {
      console.error('Error fetching petty cash balance:', err)
    }
  }, [])

  const fetchPettyCashTransactions = useCallback(async () => {
    setPettyCashTransactionsLoading(true)
    try {
      const r = await fetch(`${API_URL}/petty-cash/transactions`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        setPettyCashTransactions(data || [])
      }
    } catch (err) {
      console.error('Error fetching petty cash transactions:', err)
    } finally {
      setPettyCashTransactionsLoading(false)
    }
  }, [])

  const fetchReceivables = useCallback(async () => {
    setReceivablesLoading(true)
    try {
      const r = await fetch(`${API_URL}/receivables`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        setReceivables(data.receivables || [])
      }
    } catch (e) {
      console.error('Failed to fetch receivables', e)
    } finally {
      setReceivablesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'accounting' && accountingSubTab === 'accounts') {
      fetchAccounts()
      fetchCards()
    }
    if (tab === 'accounting' && accountingSubTab === 'petty_cash') {
      fetchPettyCashBalance()
      fetchPettyCashTransactions()
    }
    if (tab === 'accounting' && accountingSubTab === 'receivable') {
      fetchReceivables()
      fetchProjects()
      fetchAccounts()
    }
  }, [tab, accountingSubTab, fetchAccounts, fetchCards, fetchPettyCashBalance, fetchPettyCashTransactions, fetchReceivables, fetchProjects])
  useEffect(() => {
    if (cardModalOpen) {
      fetchAccounts()
    }
  }, [cardModalOpen, fetchAccounts])
  const resetCardForm = () => {
    setCardBankAccountId('')
    setCardSelectedAccountLabel('')
    setCardNumberLast4('')
    setCardHolderName('')
    setCardExpiryDate('')
    setCardStatus('Active')
  }
  const submitCard = async () => {
    if (!cardBankAccountId || !cardNumberLast4 || !cardHolderName || !cardExpiryDate || !cardStatus) {
      return
    }
    if (!/^\d{4}$/.test(cardNumberLast4.trim())) {
      return
    }
    try {
      const r = await fetch(`${API_URL}/accounts/debit-cards`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          bank_account_id: Number(cardBankAccountId),
          card_number_last4: cardNumberLast4.trim(),
          card_holder_name: cardHolderName.trim(),
          expiry_date: cardExpiryDate,
          is_active: cardStatus === 'Active',
        }),
      })
      if (!r.ok) {
        await r.json().catch(() => ({}))
        setCardSaveConfirmVisible(true)
        setTimeout(() => setCardSaveConfirmVisible(false), 950)
        return
      }
      fetchCards()
      setCardModalOpen(false)
      resetCardForm()
      setCardSaveConfirmVisible(true)
      setTimeout(() => setCardSaveConfirmVisible(false), 950)
    } catch {
      setCardSaveConfirmVisible(true)
      setTimeout(() => setCardSaveConfirmVisible(false), 950)
    }
  }

  const fetchVendors = useCallback(async () => {
    setVendorsLoading(true)
    try {
      const r = await fetch(`${API_URL}/vendors`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        const normalizedVendors = (data.vendors || []).map((v: any) => ({
          ...v,
          is_active: v.is_active === true || v.is_active === 1 || v.is_active === '1' || v.is_active === 'true'
        }))
        setVendors(normalizedVendors)
      } else {
        const errData = await r.json().catch(() => ({}))
        console.error('fetchVendors failed:', r.status, errData)
      }
    } catch (e) {
      console.error('Failed to fetch vendors', e)
    } finally {
      setVendorsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'employees' && employeeSubTab === 'vendors') {
      fetchVendors()
    }
  }, [tab, employeeSubTab, fetchVendors])

  const handleSaveVendor = async () => {
    if (!vendorName) { toast.error('Vendor Name is required'); return }
    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/vendors`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          vendor_name: vendorName,
          contact_email: vendorEmail || null,
          contact_phone: vendorPhone || null,
          is_active: vendorIsActive
        })
      })
      if (r.ok) {
        setVendorName('')
        setVendorEmail('')
        setVendorPhone('')
        setVendorIsActive(true)
        setIsAddingVendor(false)
        fetchVendors()
      } else {
        toast.error('Failed to create vendor')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error creating vendor')
    } finally {
      setSaving(false)
    }
  }

  const fetchPayables = useCallback(async () => {
    setPayablesLoading(true)
    try {
      const r = await fetch(`${API_URL}/payables`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (r.ok) {
        const data = await r.json()
        setPayables(data.payables || [])
      }
    } catch (e) {
      console.error('Failed to fetch payables', e)
    } finally {
      setPayablesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'accounting' && (accountingSubTab === 'payable' || accountingSubTab === 'petty_cash' || accountingSubTab === 'receivable')) {
      if (accountingSubTab !== 'receivable') fetchPayables()
      // We also need vendors and projects for the form
      fetchVendors()
      fetchProjects()
      fetchAccounts()
    }
  }, [tab, accountingSubTab, fetchPayables, fetchVendors, fetchProjects, fetchAccounts])

  // Reset UI state when tabs change to prevent state leaks (e.g. keeping "Add Bill" open when switching tabs)
  useEffect(() => {
    setIsAddingBill(false)
    setIsReplenishing(false)
    setIsNewPayableName(false)
  }, [tab, accountingSubTab])

  const handleSaveBill = async () => {
    // Validation
    if (billType === 'PETTY_CASH') {
      if (!billAmount) {
        toast.error('Missing required fields: Amount')
        return
      }
      // Handle Petty Cash Bill separately
      setSaving(true)
      try {
        const r = await fetch(`${API_URL}/petty-cash/bill`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            amount: Number(billAmount),
            description: billDescription,
            project_id: billProjectId ? Number(billProjectId) : null,
            transaction_date: billStartDate || null
          })
        })
        if (r.ok) {
          setBillAmount('')
          setBillDescription('')
          setBillProjectId('')
          setBillStartDate('')
          setIsAddingBill(false)
          setIsNewPayableName(false)
          fetchPettyCashBalance()
          fetchPettyCashTransactions()
        } else {
          toast.error('Failed to add petty cash bill')
        }
      } catch (e) {
        console.error(e)
        toast.error('Error adding petty cash bill')
      } finally {
        setSaving(false)
      }
      return
    } else {
      if (!billVendorId || !billName || !billType || !billAmount) {
        toast.error('Missing required fields')
        return
      }
    }

    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/payables`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          vendor_id: billVendorId ? Number(billVendorId) : null,
          payable_name: billName || (billType === 'PETTY_CASH' ? 'Petty Cash Expense' : ''),
          description: billDescription,
          payable_type: billType,
          amount: Number(billAmount),
          frequency: billFrequency || null,
          start_date: billStartDate || null,
          end_date: billEndDate || null,
          contract_id: billProjectId ? Number(billProjectId) : null,
          is_active: billIsActive,
          bank_account_id: billBankAccountId ? Number(billBankAccountId) : null,
          payment_method: billPaymentMethod || null,
          reference_number: billReferenceNumber || null
        })
      })
      if (r.ok) {
        setBillVendorId('')
        setBillName('')
        setBillDescription('')
        setBillType('ONE_TIME')
        setBillAmount('')
        setBillFrequency('')
        setBillStartDate('')
        setBillEndDate('')
        setBillProjectId('')
        setBillIsActive(true)
        setBillBankAccountId('')
        setBillPaymentMethod('')
        setBillReferenceNumber('')
        setIsAddingBill(false)
        setIsNewPayableName(false)
        fetchPayables()
        if (billType === 'PETTY_CASH') {
          fetchPettyCashBalance()
        }
      } else {
        const errData = await r.json().catch(() => ({})) as { error?: string }
        console.error('Payables 500 error:', errData)
        toast.error(errData.error || 'Failed to create bill')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error creating bill')
    } finally {
      setSaving(false)
    }
  }

  const openEmployeeDetails = (employee: Employee) => {
    setSelectedEmployee(employee)
    setDetailsOpen(true)
  }

  const fetchProjectItems = useCallback(async () => {
    if (!currentProjectForItems) return
    try {
      const r = await fetch(`http://localhost:3000/projects/${currentProjectForItems.project_id}/items`)
      if (r.ok) {
        const data = await r.json()
        setProjectItems(data.items || [])
      }
    } catch (e) {
      console.error(e)
    }
  }, [currentProjectForItems])

  useEffect(() => {
    fetchProjectItems()
  }, [fetchProjectItems])

  const clearItemForm = () => {
    setItemRequirements('')
    setItemServiceCategory('')
    setItemUnitCost('')
    setItemRequirementType('')
    setEditingItem(null)
  }

  const saveProjectItem = async () => {
    if (!currentProjectForItems) return
    if (!itemRequirements || !itemServiceCategory || itemUnitCost === '' || !itemRequirementType) {
      toast.error('Missing required fields for item')
      return
    }
    const body = {
      requirements: itemRequirements,
      service_category: itemServiceCategory,
      unit_cost: Number(itemUnitCost),
      requirement_type: itemRequirementType,
    }
    try {
      if (editingItem) {
        const r = await fetch(`http://localhost:3000/projects/${currentProjectForItems.project_id}/items/${encodeURIComponent(editingItem.requirements)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_category: itemServiceCategory,
            unit_cost: Number(itemUnitCost),
            requirement_type: itemRequirementType,
          }),
        })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          toast.error(d.error || 'Failed to update item')
          return
        }
        toast.success('Item updated')
      } else {
        const r = await fetch(`http://localhost:3000/projects/${currentProjectForItems.project_id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!r.ok) {
          const d = await r.json().catch(() => ({}))
          toast.error(d.error || 'Failed to create item')
          return
        }
        toast.success('Item created')
      }
      clearItemForm()
      await fetchProjects()
      await fetchProjectItems()
    } catch (err) {
      console.error(err)
      toast.error('Server error')
    }
  }



  const handleSaveReceivable = async () => {
    if (!receivablePayerName || !receivableName || !receivableAmount) {
      toast.error('Missing required fields')
      return
    }

    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/receivables`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          payer_name: receivablePayerName,
          receivable_name: receivableName,
          description: receivableDescription,
          receivable_type: receivableType,
          amount: Number(receivableAmount),
          frequency: receivableFrequency,
          start_date: receivableStartDate || null,
          end_date: receivableEndDate || null,
          contract_id: receivableProjectId ? Number(receivableProjectId) : null,
          is_active: receivableIsActive,
          bank_account_id: receivableBankAccountId ? Number(receivableBankAccountId) : null,
          payment_method: receivablePaymentMethod,
          reference_number: receivableReferenceNumber
        })
      })

      if (r.ok) {
        setReceivablePayerName('')
        setReceivableName('')
        setReceivableDescription('')
        setReceivableType('')
        setReceivableAmount('')
        setReceivableFrequency('')
        setReceivableStartDate('')
        setReceivableEndDate('')
        setReceivableProjectId('')
        setReceivableIsActive(true)
        setReceivableBankAccountId('')
        setReceivablePaymentMethod('')
        setReceivableReferenceNumber('')
        setIsAddingReceivable(false)
        fetchReceivables()
      } else {
        toast.error('Failed to create receivable')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error creating receivable')
    } finally {
      setSaving(false)
    }
  }


  const resetOpenAccountForm = () => {
    setBankName('')
    setBranch('')
    setAccountNumber('')
    setAccountName('')
    setOpeningBalance('')
  }

  const saveOpenAccount = async () => {
    if (!bankName || !branch || !accountNumber || !accountName || openingBalance === '') {
      toast.error('Missing required fields')
      return
    }
    const openingBalanceNum = Number(openingBalance)
    if (Number.isNaN(openingBalanceNum)) {
      toast.error('Opening balance must be a number')
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/accounts/open-account`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          bank_name: bankName,
          branch,
          account_number: accountNumber,
          account_name: accountName || null,
          opening_balance: openingBalanceNum,
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        toast.error(d.error || 'Failed to open account')
        return
      }
      toast.success('Account created')
      setOpenAccountModalOpen(false)
      resetOpenAccountForm()
      fetchAccounts()
    } finally {
      setSaving(false)
    }
  }

  
  const resetForm = () => {
    setEmployeeNumber('')
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setDob('')
    setNic('')
    setAddress('')
    setRole('IT')
    setDesignation('')
    setTax('')
    setEditingEmployee(null)
  }

  const resetProjectForm = () => {
    setProjectName('')
    setCustomerName('')
    setProjectDescription('')
    setInitialCostBudget('')
    setProjectStatus('')
  }

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee)
    setEmployeeNumber(employee.employee_number)
    setFirstName(employee.first_name)
    setLastName(employee.last_name)
    setEmail(employee.email)
    setPhone(employee.phone)
    setDob(employee.dob ? employee.dob.split('T')[0] : '')
    setNic(employee.nic || '')
    setAddress(employee.address || '')
    setRole(employee.role as 'IT' | 'Accounting' | 'Marketing')
    setDesignation(employee.designation || '')
    setTax(employee.tax || '')
    setEditOpen(true)
  }

  const openDeleteModal = (employee: Employee) => {
    setDeletingEmployee(employee)
    setDeleteOpen(true)
  }

  const addEmployee = async () => {
    if (!employeeNumber || !firstName || !lastName || !email || !phone || !role) {
      toast.error('Missing required fields')
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          employee_number: employeeNumber,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          dob: dob || null,
          nic: nic || null,
          address: address || null,
          role,
          designation: designation || null,
          tax: tax || null,
        }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        toast.error(data.error || 'Failed to add employee')
        return
      }
      toast.success('Employee added')
      setAddOpen(false)
      resetForm()
      await fetchEmployees()
    } finally {
      setSaving(false)
    }
  }

  const updateEmployee = async () => {
    if (!editingEmployee || !employeeNumber || !firstName || !lastName || !email || !phone || !role) {
      toast.error('Missing required fields')
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`http://localhost:3000/employees/${editingEmployee.employee_id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          employee_number: employeeNumber,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          dob: dob || null,
          nic: nic || null,
          address: address || null,
          role,
          designation: designation || null,
          tax: tax || null,
        }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        toast.error(data.error || 'Failed to update employee')
        return
      }
      toast.success('Employee updated')
      setEditOpen(false)
      resetForm()
      await fetchEmployees()
    } finally {
      setSaving(false)
    }
  }

  const deleteEmployee = async () => {
    if (!deletingEmployee) return
    setSaving(true)
    try {
      const r = await fetch(`http://localhost:3000/employees/${deletingEmployee.employee_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        toast.error(data.error || 'Failed to delete employee')
        return
      }
      toast.success('Employee deleted')
      setDeleteOpen(false)
      setDeletingEmployee(null)
      await fetchEmployees()
    } finally {
      setSaving(false)
    }
  }

  const addProject = async () => {
    if (!projectName || !customerName || initialCostBudget === '' || !projectStatus) {
      toast.error('Missing required fields')
      return
    }
    const initialBudgetNum = Number(initialCostBudget)
    if (Number.isNaN(initialBudgetNum)) {
      toast.error('Budget fields must be numbers')
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          project_name: projectName,
          customer_name: customerName,
          description: projectDescription || null,
          initial_cost_budget: initialBudgetNum,
          extra_budget_allocation: 0,
          payment_type: 'Pending',
          status: projectStatus,
        }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        toast.error(data.error || 'Failed to add project')
        return
      }
      toast.success('Project added')
      setProjectModalOpen(false)
      resetProjectForm()
      await fetchProjects()
    } finally {
      setSaving(false)
    }
  }

  const deleteProjectConfirm = async () => {
    if (!deletingProject) return
    setSaving(true)
    try {
      const r = await fetch(`http://localhost:3000/projects/${deletingProject.project_id}`, {
        method: 'DELETE',
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        toast.error(data.error || 'Failed to delete project')
        return
      }
      toast.success('Project deleted')
      setProjectDeleteModalOpen(false)
      setDeletingProject(null)
      await fetchProjects()
    } finally {
      setSaving(false)
    }
  }

  const handleReplenish = async () => {
    if (!replenishAmount || isNaN(Number(replenishAmount)) || Number(replenishAmount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    setSaving(true)
    try {
      const r = await fetch(`${API_URL}/petty-cash/replenish`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          amount: Number(replenishAmount),
          source_account_id: replenishSourceAccountId ? Number(replenishSourceAccountId) : null,
          reference: replenishReference
        }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        toast.error(data.error || 'Failed to replenish petty cash')
        return
      }
      toast.success('Petty cash replenished successfully')
      setIsReplenishing(false)
      setReplenishAmount('')
      setReplenishSourceAccountId('')
      setReplenishReference('')
      fetchPettyCashBalance()
    } catch (err) {
      console.error('Error replenishing:', err)
      toast.error('Error replenishing petty cash')
    } finally {
      setSaving(false)
    }
  }

  const saveAsset = async () => {
    if (!assetName || !assetValue || !purchaseDate) return
    
    // Validation for depreciable assets
    if (isDepreciable && (!salvageValue || !usefulLife)) {
      toast.error('Please provide salvage value and useful life for depreciable assets')
      return
    }
    
    try {
      const body: any = { 
        asset_name: assetName, 
        value: assetValue, 
        purchase_date: purchaseDate 
      }
      
      if (isDepreciable) {
        body.depreciation_method = depreciationMethod
        body.salvage_value = salvageValue
        body.useful_life = usefulLife
      }
      
      const r = await fetch(`${API_URL}/assets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      })
      if (r.ok) {
        setAddAssetModalOpen(false)
        setAssetName('')
        setAssetValue('')
        setPurchaseDate('')
        setIsDepreciable(false)
        setDepreciationMethod('STRAIGHT_LINE')
        setSalvageValue('')
        setUsefulLife('')
        fetchAssets()
      } else {
        toast.error('Failed to save asset')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error saving asset')
    }
  }

  return (
    <div style={{ height: '100vh', width: '100%', display: 'grid', gridTemplateRows: '56px 1fr', background: 'transparent', color: 'var(--text-main)', overflow: 'hidden' }}>
      <header className="glass-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', overflow: 'hidden', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12, fontFamily: "'Zalando Sans Expanded', sans-serif", fontSize: '24px' }}>
          <img src="/BLOOM_AUDIT_LOGO_XS.png" alt="BloomTech Logo" style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
          Bloom Audit
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>{user.name} ({user.roleName || 'No Role'})</span>
          <button onClick={onLogout} className="btn-primary" style={{ padding: '8px 12px' }}>Logout</button>
        </div>
      </header>
      <main style={{ height: 'calc(100vh - 56px)', padding: 0, display: 'flex', overflow: 'hidden' }}>
        <aside className="glass-sidebar" style={{ width: navOpen ? 240 : 64, transition: 'width 0.2s ease', height: '100%', display: 'flex', flexDirection: 'column', gap: 4, padding: 12 }}>
          {/* Home - always visible */}
          <button onClick={() => setTab('home')} title="Home" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: tab === 'home' ? 'var(--accent)' : 'transparent', color: '#fff', cursor: 'pointer' }}>
            <LayoutDashboard size={20} />
            {navOpen && <span>Home</span>}
          </button>
          
          {/* Employees Section - only show if user has any employee/vendor permissions */}
          {hasAnyPermission(user, [
            { resource: 'employees', action: 'read' },
            { resource: 'vendors', action: 'read' }
          ]) && (
            <div onClick={() => setTab('employees')} style={{ cursor: 'pointer', borderRadius: 8, background: tab === 'employees' ? 'var(--accent)' : 'transparent', border: '1px solid var(--primary)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'space-between' : 'center', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Users size={20} />
                  {navOpen && <span>Employees</span>}
                </div>
                {navOpen && <ChevronDown size={14} />}
              </div>
            </div>
          )}
          {tab === 'employees' && hasAnyPermission(user, [
            { resource: 'employees', action: 'read' },
            { resource: 'vendors', action: 'read' }
          ]) && (
            <>
              {hasPermission(user, 'employees', 'read') && (
                <button onClick={() => setEmployeeSubTab('employees')} title="Employees" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: employeeSubTab === 'employees' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                  <ClipboardList size={18} />
                  {navOpen && <span>Employee List</span>}
                </button>
              )}
              {hasPermission(user, 'vendors', 'read') && (
                <button onClick={() => { setEmployeeSubTab('vendors'); setIsAddingVendor(false) }} title="Vendors" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: employeeSubTab === 'vendors' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                  <Store size={18} />
                  {navOpen && <span>Vendors</span>}
                </button>
              )}
              <button onClick={() => setEmployeeSubTab('pto')} title="Time Off" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: employeeSubTab === 'pto' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <Calendar size={18} />
                {navOpen && <span>Time Off</span>}
              </button>
            </>
          )}

          {/* Projects Section - only show if user can view projects */}
          {hasPermission(user, 'projects', 'read') && (
            <div onClick={() => setTab('projects')} style={{ cursor: 'pointer', borderRadius: 8, background: tab === 'projects' ? 'var(--accent)' : 'transparent', border: '1px solid var(--primary)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'space-between' : 'center', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FolderOpen size={20} />
                  {navOpen && <span>Projects</span>}
                </div>
                {navOpen && <ChevronDown size={14} />}
              </div>
            </div>
          )}
          {tab === 'projects' && hasPermission(user, 'projects', 'read') && (
            <>
              <button onClick={() => setProjectSubTab('projects')} title="Projects & Contracts" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: projectSubTab === 'projects' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <ClipboardList size={18} />
                {navOpen && <span>Projects & Contracts</span>}
              </button>
              <button onClick={() => setProjectSubTab('time')} title="Project Time" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: projectSubTab === 'time' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <Clock size={18} />
                {navOpen && <span>Project Time</span>}
              </button>
              {hasAnyPermission(user, [{ resource: 'quotes', action: 'manage' }, { resource: 'quotes', action: 'read' }]) && (
                <button onClick={() => setProjectSubTab('quotes')} title="Quote Generator" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: projectSubTab === 'quotes' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                  <FileSignature size={18} />
                  {navOpen && <span>Quote Generator</span>}
                </button>
              )}
            </>
          )}
          
          {/* Accounting Section - only show if user has any accounting permissions */}
          {hasAnyPermission(user, [
            { resource: 'accounts', action: 'read' },
            { resource: 'payables', action: 'read' },
            { resource: 'receivables', action: 'read' },
            { resource: 'petty_cash', action: 'read' },
            { resource: 'assets', action: 'read' },
            { resource: 'subscriptions', action: 'read' },
            { resource: 'purchase_orders', action: 'read' },
            { resource: 'payroll', action: 'view_all' },
            { resource: 'loans', action: 'read' }
          ]) && (
            <div onClick={() => setTab('accounting')} style={{ cursor: 'pointer', borderRadius: 8, background: tab === 'accounting' ? 'var(--accent)' : 'transparent', border: '1px solid var(--primary)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'space-between' : 'center', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                   <Banknote size={20} />
                   {navOpen && <span>Accounting</span>}
                </div>
                {navOpen && <ChevronDown size={14} />}
              </div>
            </div>
          )}
          {tab === 'accounting' && (
            <>
              <button onClick={() => { setAccountingSubTab('accounts'); setIsAddingBill(false); setIsReplenishing(false); setIsAddingReceivable(false) }} title="Accounts" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: accountingSubTab === 'accounts' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <Landmark size={18} />
                {navOpen && <span>Accounts</span>}
              </button>
              <button onClick={() => { setAccountingSubTab('payable'); setIsAddingBill(false) }} title="Payable" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: accountingSubTab === 'payable' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <Receipt size={18} />
                {navOpen && <span>Payable</span>}
              </button>
              <button onClick={() => { setAccountingSubTab('petty_cash'); setBillType('PETTY_CASH'); setIsAddingBill(false); setIsReplenishing(false) }} title="Petty Cash" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: accountingSubTab === 'petty_cash' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <Coins size={18} />
                {navOpen && <span>Petty Cash</span>}
              </button>
              <button onClick={() => { setAccountingSubTab('receivable'); setIsAddingReceivable(false) }} title="Receivable" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: accountingSubTab === 'receivable' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <Inbox size={18} />
                {navOpen && <span>Receivable</span>}
              </button>
              <button onClick={() => setAccountingSubTab('subscriptions')} title="Subscriptions" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: accountingSubTab === 'subscriptions' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <Repeat size={18} />
                {navOpen && <span>Subscriptions</span>}
              </button>
              <button onClick={() => setCardModalOpen(true)} title="Card Management" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <CreditCard size={18} />
                {navOpen && <span>Card Management</span>}
              </button>
              <button onClick={() => setAccountingSubTab('purchase_orders')} title="Purchase Orders" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: accountingSubTab === 'purchase_orders' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <ShoppingCart size={18} />
                {navOpen && <span>Purchase Orders</span>}
              </button>
              <button onClick={() => setAccountingSubTab('payroll')} title="Payroll" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: accountingSubTab === 'payroll' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <DollarSign size={18} />
                {navOpen && <span>Payroll</span>}
              </button>
              <button onClick={() => setAccountingSubTab('assets')} title="Assets" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: accountingSubTab === 'assets' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <Building2 size={18} />
                {navOpen && <span>Assets</span>}
              </button>
              <button onClick={() => setAccountingSubTab('loans')} title="Loans" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--primary)', background: accountingSubTab === 'loans' ? 'rgba(255,255,255,0.2)' : 'transparent', color: '#fff', cursor: 'pointer', marginLeft: navOpen ? 24 : 0 }}>
                <TrendingDown size={18} />
                {navOpen && <span>Loans</span>}
              </button>
            </>
          )}
          
          <button onClick={() => setTab('documents')} title="Document Bank" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: tab === 'documents' ? 'var(--accent)' : 'transparent', color: '#fff', cursor: 'pointer' }}>
            <FileText size={20} />
            {navOpen && <span>Document Bank</span>}
          </button>
          
          <button onClick={() => setTab('analytics')} title="Data Analytics" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: tab === 'analytics' ? 'var(--accent)' : 'transparent', color: '#fff', cursor: 'pointer' }}>
            <BarChart3 size={20} />
            {navOpen && <span>Data Analytics</span>}
          </button>
          
          {/* Settings - only show if user has settings:manage permission */}
          {hasPermission(user, 'settings', 'manage') && (
            <button onClick={() => setTab('settings')} title="Settings" style={{ display: 'flex', alignItems: 'center', justifyContent: navOpen ? 'flex-start' : 'center', gap: navOpen ? 12 : 0, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: tab === 'settings' ? 'var(--accent)' : 'transparent', color: '#fff', cursor: 'pointer' }}>
              <SettingsIcon size={20} />
              {navOpen && <span>Settings</span>}
            </button>
          )}
          
          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
            <button 
              onClick={() => setNavOpen(o => !o)} 
              title={navOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: navOpen ? 'flex-start' : 'center', 
                gap: navOpen ? 12 : 0, 
                padding: '10px 12px', 
                borderRadius: 8, 
                border: 'none', 
                background: 'transparent', 
                color: '#fff', 
                cursor: 'pointer',
                width: '100%',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {navOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
              {navOpen && <span>Collapse Sidebar</span>}
            </button>
          </div>
        </aside>
        <section style={{ flex: 1, overflowY: 'auto', background: 'transparent', borderRadius: 0, border: 'none', padding: 24 }}>
          {tab === 'home' && (
            <div style={{ display: 'grid', gap: 24 }}>
              <h1 style={{ marginTop: 0, fontSize: 28 }}>Welcome to Bloom Audit</h1>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'start' }}>
                {/* Left column - Notes and To-Do widgets */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <NotesWidget userId={user.id} accessToken={accessToken} />
                  <TodosWidget userId={user.id} accessToken={accessToken} />
                </div>

                {/* Right column - Clocks and Calendar */}
                <div style={{ minWidth: 320, maxWidth: 400, position: 'sticky', top: 24, display: 'grid', gap: 16 }}>
                  <SystemClock />
                  <InternationalClock timezone={internationalTimezone} />
                  <CalendarWidget />
                </div>
              </div>
            </div>
        )}
          {tab === 'employees' && employeeSubTab === 'employees' && (
            <div style={{ width: '100%', display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h1 style={{ marginTop: 0, fontSize: 28 }}>Employee Management</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button 
                    onClick={() => setAddOpen(true)} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      padding: '10px 20px', 
                      borderRadius: 8, 
                      border: 'none', 
                      background: 'var(--primary)', 
                      color: '#fff', 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
                    }}
                  >
                    <Plus size={16} />
                    <span>Add Employee</span>
                  </button>
                  {employees.length > 0 && (
                    <ProcessFlowGuidance
                      steps={[
                        { icon: <Plus size={16} />, label: 'Add Employee', onClick: () => setAddOpen(true) },
                        { icon: <Users size={16} />, label: 'View List' },
                        { icon: <ClipboardList size={16} />, label: 'Manage Details' }
                      ]}
                      description="Manage your workforce here. Add new employees, update their information, and track their roles and designations within the company."
                    />
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
                <input 
                  type="text" 
                  placeholder="Search by name, email, NIC..." 
                  value={employeeSearch}
                  onChange={e => setEmployeeSearch(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', minWidth: 250 }}
                />
                <select 
                  value={employeeRoleFilter} 
                  onChange={e => setEmployeeRoleFilter(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
                >
                  <option value="All">All Roles</option>
                  <option value="IT">IT</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              {loading ? (
                <div style={{ padding: 24, textAlign: 'center' }}>Loading employees...</div>
              ) : employees.length === 0 ? (
                <ProcessFlowGuidance
                  mode="inline"
                  steps={[
                    { icon: <Plus size={16} />, label: 'Add Employee', onClick: () => setAddOpen(true) },
                    { icon: <Users size={16} />, label: 'View List' },
                    { icon: <ClipboardList size={16} />, label: 'Manage Details' }
                  ]}
                  description="Manage your workforce here. Add new employees, update their information, and track their roles and designations within the company."
                />
              ) : filteredEmployees.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>No matching employees found.</div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'hidden', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Emp #</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>First Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Last Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Email</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Phone</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>NIC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((emp, idx) => (
                        <tr
                          key={emp.employee_id}
                          style={{ borderBottom: idx < filteredEmployees.length - 1 ? '1px solid #e0e0e0' : 'none', cursor: 'pointer' }}
                          onClick={() => openEmployeeDetails(emp)}
                        >
                          <td style={{ padding: '12px 16px' }}>{emp.employee_id}</td>
                          <td style={{ padding: '12px 16px' }}>{emp.employee_number}</td>
                          <td style={{ padding: '12px 16px' }}>{emp.first_name}</td>
                          <td style={{ padding: '12px 16px' }}>{emp.last_name}</td>
                          <td style={{ padding: '12px 16px' }}>{emp.email}</td>
                          <td style={{ padding: '12px 16px' }}>{emp.phone}</td>
                          <td style={{ padding: '12px 16px' }}>{emp.nic || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                   </table>
                </div>
              )}
            </div>
          )}
          {tab === 'employees' && employeeSubTab === 'vendors' && (
            <div style={{ width: '100%', display: 'grid', gap: 16 }}>
              {isAddingVendor ? (
                <div className="glass-panel" style={{ padding: 24, maxWidth: 600 }}>
                  <h2 style={{ marginTop: 0 }}>Add New Vendor</h2>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Vendor Name *</label>
                      <input type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Contact Email</label>
                      <input type="email" value={vendorEmail} onChange={e => setVendorEmail(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Contact Phone</label>
                      <input type="tel" value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" id="v_active" checked={vendorIsActive} onChange={e => setVendorIsActive(e.target.checked)} />
                      <label htmlFor="v_active">Active Vendor</label>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      <button onClick={handleSaveVendor} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Vendor'}</button>
                      <button onClick={() => setIsAddingVendor(false)} disabled={saving} className="btn-secondary" style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.5)' }}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h1 style={{ marginTop: 0, fontSize: 28 }}>Vendors</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <button 
                        onClick={() => setIsAddingVendor(true)} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 8, 
                          padding: '10px 20px', 
                          borderRadius: 8, 
                          border: 'none', 
                          background: 'var(--primary)', 
                          color: '#fff', 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          cursor: 'pointer', 
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
                        }}
                      >
                        <Plus size={16} />
                        <span>Add Vendor</span>
                      </button>
                      {vendors.length > 0 && (
                        <ProcessFlowGuidance
                          steps={[
                            { icon: <Plus size={16} />, label: 'Add Vendor', onClick: () => setIsAddingVendor(true) },
                            { icon: <Store size={16} />, label: 'View Vendors' },
                            { icon: <Receipt size={16} />, label: 'Track History' }
                          ]}
                          description="Manage your vendor relationships. Register new vendors, update their contact details, and track their status."
                        />
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    <input 
                      type="text" 
                      placeholder="Search by vendor name, email, phone..." 
                      value={vendorSearch}
                      onChange={e => setVendorSearch(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', minWidth: 250 }}
                    />
                    <select 
                      value={vendorStatusFilter} 
                      onChange={e => setVendorStatusFilter(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
                    >
                      <option value="All">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {vendorsLoading ? (
                    <div style={{ padding: 24, textAlign: 'center' }}>Loading vendors...</div>
                  ) : vendors.length === 0 ? (
                    <ProcessFlowGuidance
                      mode="inline"
                      steps={[
                        { icon: <Plus size={16} />, label: 'Add Vendor', onClick: () => setIsAddingVendor(true) },
                        { icon: <Store size={16} />, label: 'View Vendors' },
                        { icon: <Receipt size={16} />, label: 'Track History' }
                      ]}
                      description="Manage your vendor relationships. Register new vendors, update their contact details, and track their status."
                    />
                  ) : filteredVendors.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', background: '#f5f5f5', borderRadius: 12, border: '1px dashed #ddd' }}>
                      <div style={{ fontSize: 32, marginBottom: 16 }}>🔍</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>No matching vendors found</div>
                      <p style={{ color: '#666', margin: '8px 0 0' }}>Try adjusting your search or filters.</p>
                    </div>
                  ) : (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                      <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'hidden', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Vendor ID</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Vendor Name</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Contact Email</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Contact Phone</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Created At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVendors.map((v, idx) => (
                            <tr key={v.vendor_id} style={{ borderBottom: idx < filteredVendors.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                              <td style={{ padding: '12px 16px' }}>{v.vendor_id}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 500 }}>{v.vendor_name}</td>
                              <td style={{ padding: '12px 16px' }}>{v.contact_email || '-'}</td>
                              <td style={{ padding: '12px 16px' }}>{v.contact_phone || '-'}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ padding: '4px 8px', borderRadius: 4, background: v.is_active ? '#e8f5e9' : '#ffebee', color: v.is_active ? '#2e7d32' : '#c62828', fontSize: 12, fontWeight: 600 }}>
                                  {v.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>{new Date(v.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {tab === 'projects' && projectSubTab === 'projects' && <Projects />}
          {tab === 'projects' && projectSubTab === 'time' && <ProjectTime userId={user.id} isManager={user.roleName === 'Admin' || user.roleName === 'Manager' || false} />}
          {tab === 'projects' && projectSubTab === 'quotes' && <QuoteGenerator />}
          {tab === 'accounting' && accountingSubTab === 'payable' && (
            <div style={{ width: '100%', display: 'grid', gap: 16 }}>
              {isAddingBill ? (
                <div className="glass-panel" style={{ padding: 24, maxWidth: 1200, boxSizing: 'border-box', overflow: 'hidden' }}>
                  <h3 style={{ marginTop: 0, marginBottom: 16 }}>Add New Bill</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Vendor</label>
                      <select value={billVendorId} onChange={e => setBillVendorId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}>
                        <option value="">Select Vendor</option>
                        {vendors.map(v => (
                          <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Payable Name</label>
                      {isNewPayableName ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input 
                            type="text" 
                            value={billName} 
                            onChange={e => setBillName(e.target.value)} 
                            placeholder="e.g. Internet Bill" 
                            style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                            autoFocus
                          />
                          <button 
                            onClick={() => { setIsNewPayableName(false); setBillName('') }}
                          style={{ padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', background: '#f5f5f5', cursor: 'pointer', boxSizing: 'border-box' }}
                            title="Select existing"
                          >
                            List
                          </button>
                        </div>
                      ) : (
                        <select 
                          value={billName} 
                          onChange={e => {
                            if (e.target.value === '__NEW__') {
                              setIsNewPayableName(true)
                              setBillName('')
                            } else {
                              setBillName(e.target.value)
                            }
                          }} 
                          style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}
                        >
                          <option value="">Select Payable Name</option>
                          {uniquePayableNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                          <option value="__NEW__" style={{ fontWeight: 'bold' }}>+ Add New Name</option>
                        </select>
                      )}
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Description</label>
                      <textarea value={billDescription} onChange={e => setBillDescription(e.target.value)} placeholder="Optional description" style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', minHeight: 60, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Type</label>
                      <select value={billType} onChange={e => setBillType(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}>
                        <option value="ONE_TIME">One Time</option>
                        <option value="RECURRING">Recurring</option>
                        <option value="PETTY_CASH">Petty Cash</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Amount</label>
                      <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    {billType === 'RECURRING' && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Frequency</label>
                        <select value={billFrequency} onChange={e => setBillFrequency(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}>
                          <option value="">Select Frequency</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Start Date</label>
                      <input type="date" value={billStartDate} onChange={e => setBillStartDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>End Date</label>
                      <input type="date" value={billEndDate} onChange={e => setBillEndDate(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Project (Optional)</label>
                      <select value={billProjectId} onChange={e => setBillProjectId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}>
                        <option value="">Select Project</option>
                        {projects.map(p => (
                          <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Bank Account</label>
                      <select value={billBankAccountId} onChange={e => setBillBankAccountId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}>
                        <option value="">Select Bank Account</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.bank_name} - {a.account_number}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Payment Method</label>
                      <select value={billPaymentMethod} onChange={e => setBillPaymentMethod(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }}>
                        <option value="">Select Method</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Reference Number</label>
                      <input type="text" value={billReferenceNumber} onChange={e => setBillReferenceNumber(e.target.value)} placeholder="Ref #" style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
                        <input type="checkbox" checked={billIsActive} onChange={e => setBillIsActive(e.target.checked)} />
                        <span style={{ fontWeight: 500 }}>Is Active</span>
                      </label>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                    <button onClick={handleSaveBill} disabled={saving} className="btn-primary">
                      {saving ? 'Saving...' : 'Save Bill'}
                    </button>
                    <button onClick={() => setIsAddingBill(false)} disabled={saving} className="btn-secondary" style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.5)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h1 style={{ marginTop: 0, fontSize: 28, marginBottom: 0 }}>Payables</h1>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button onClick={() => setIsAddingBill(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                        <span>+</span> Add Bill
                      </button>
                      {payables.length > 0 && (
                        <ProcessFlowGuidance
                          steps={[
                            { icon: <Store size={16} />, label: 'Vendor Invoice' },
                            { icon: <Receipt size={16} />, label: 'Bill Entry' },
                            { icon: <CreditCard size={16} />, label: 'Payment' }
                          ]}
                          description="Record bills received from vendors here. Set up recurring payments for subscriptions or utilities, and track their status."
                        />
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                    <input 
                      type="text" 
                      placeholder="Search payables..." 
                      value={payableSearch} 
                      onChange={e => setPayableSearch(e.target.value)} 
                      style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', flex: 1 }} 
                    />
                    <select 
                      value={payableTypeFilter} 
                      onChange={e => setPayableTypeFilter(e.target.value)} 
                      style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
                    >
                      <option value="All">All Types</option>
                      <option value="ONE_TIME">One Time</option>
                      <option value="RECURRING">Recurring</option>
                      <option value="PETTY_CASH">Petty Cash</option>
                    </select>
                    <select 
                      value={payableStatusFilter} 
                      onChange={e => setPayableStatusFilter(e.target.value)} 
                      style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
                    >
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {payablesLoading ? (
                    <div style={{ padding: 24, textAlign: 'center' }}>Loading payables...</div>
                  ) : filteredPayables.length === 0 ? (
                    payables.length === 0 ? (
                      <ProcessFlowGuidance
                        mode="inline"
                        steps={[
                          { icon: <Store size={16} />, label: 'Vendor Invoice' },
                          { icon: <Receipt size={16} />, label: 'Bill Entry' },
                          { icon: <CreditCard size={16} />, label: 'Payment' }
                        ]}
                        description="Record bills received from vendors here. Set up recurring payments for subscriptions or utilities, and track their status."
                      />
                    ) : (
                      <div style={{ padding: 24, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                        No bills found matching your filters.
                      </div>
                    )
                  ) : (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                      <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'hidden', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>ID</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Vendor ID</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Payable Name</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Amount</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Frequency</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Start Date</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>End Date</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Project ID</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Is Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayables.map((p, idx) => (
                            <tr key={p.payable_id} style={{ borderBottom: idx < filteredPayables.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                              <td style={{ padding: '12px 16px' }}>{p.payable_id}</td>
                              <td style={{ padding: '12px 16px' }}>{p.vendor_id}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.payable_name}</td>
                              <td style={{ padding: '12px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.description || ''}>{p.description || '-'}</td>
                              <td style={{ padding: '12px 16px' }}>{p.payable_type}</td>
                              <td style={{ padding: '12px 16px' }}>{p.amount}</td>
                              <td style={{ padding: '12px 16px' }}>{p.frequency || '-'}</td>
                              <td style={{ padding: '12px 16px' }}>{p.start_date ? new Date(p.start_date).toLocaleDateString() : '-'}</td>
                              <td style={{ padding: '12px 16px' }}>{p.end_date ? new Date(p.end_date).toLocaleDateString() : '-'}</td>
                              <td style={{ padding: '12px 16px' }}>{p.project_id || '-'}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ padding: '4px 8px', borderRadius: 4, background: p.is_active ? '#e8f5e9' : '#ffebee', color: p.is_active ? '#2e7d32' : '#c62828', fontSize: 12, fontWeight: 600 }}>
                                  {p.is_active ? 'True' : 'False'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {tab === 'accounting' && accountingSubTab === 'petty_cash' && (
            <div style={{ width: '100%', display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h1 style={{ marginTop: 0, fontSize: 28, marginBottom: 0 }}>Petty Cash</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button 
                    onClick={() => setIsReplenishing(true)} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      padding: '10px 20px', 
                      borderRadius: 8, 
                      border: 'none', 
                      background: 'var(--primary)', 
                      color: '#fff', 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
                    }}
                  >
                    <Plus size={16} />
                    <span>Replenish Funds</span>
                  </button>
                  <button 
                    onClick={() => { setBillType('PETTY_CASH'); setIsAddingBill(true) }} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      padding: '10px 20px', 
                      borderRadius: 8, 
                      border: 'none', 
                      background: 'var(--primary)', 
                      color: '#fff', 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
                    }}
                  >
                    <Plus size={16} />
                    <span>Add Bill</span>
                  </button>
                  {(pettyCashTransactions.length > 0 || (pettyCashBalance ?? 0) > 0) && (
                    <ProcessFlowGuidance
                      steps={[
                        { icon: <Landmark size={16} />, label: 'Replenish Funds', onClick: () => { setIsAddingBill(false); setIsReplenishing(true) } },
                        { icon: <Receipt size={16} />, label: 'Create Bill', onClick: () => { setIsReplenishing(false); setBillType('PETTY_CASH'); setIsAddingBill(true) } },
                        { icon: <ClipboardList size={16} />, label: 'Track History' }
                      ]}
                      description="To reload your petty cash account, you can replenish using an available bank account. You can also create bills for expenses. Once created, bills will appear here."
                    />
                  )}
                </div>
              </div>
              
              <div className="glass-card" style={{ padding: '16px 24px', display: 'inline-flex', flexDirection: 'column', gap: 4, minWidth: 200, width: 'fit-content' }}>
                <div style={{ fontSize: 14, color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Balance</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-1px' }}>
                  <span style={{ fontSize: 18, marginRight: 4, fontWeight: 600, color: '#999', verticalAlign: 'middle' }}>LKR</span>
                  {(pettyCashBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              {isAddingBill ? (
                <div className="glass-panel form-container">
                  <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Add Petty Cash Bill</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Amount *</label>
                      <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Transaction Date</label>
                      <input type="date" value={billStartDate} onChange={e => setBillStartDate(e.target.value)} />
                    </div>
                    <div className="form-group form-group-full">
                      <label className="form-label">Description</label>
                      <input type="text" value={billDescription} onChange={e => setBillDescription(e.target.value)} placeholder="Description" />
                    </div>
                    <div className="form-group form-group-full">
                      <label className="form-label">Project (Optional)</label>
                      <select value={billProjectId} onChange={e => setBillProjectId(e.target.value)}>
                        <option value="">Select Project</option>
                        {projects.map(p => (
                          <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button onClick={handleSaveBill} disabled={saving} className="btn-primary">
                      {saving ? 'Saving...' : 'Save Bill'}
                    </button>
                    <button onClick={() => setIsAddingBill(false)} disabled={saving} className="btn-secondary" style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.5)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : isReplenishing ? (
                <div className="glass-panel" style={{ padding: 24 }}>
                  <h3 style={{ marginTop: 0, marginBottom: 16 }}>Replenish Petty Cash</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Amount</label>
                      <input type="number" value={replenishAmount} onChange={e => setReplenishAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Source Bank Account</label>
                      <select value={replenishSourceAccountId} onChange={e => setReplenishSourceAccountId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }}>
                        <option value="">Select Bank Account</option>
                        {accounts.map(a => (
                          <option key={a.id} value={a.id}>{a.bank_name} - {a.account_number}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Reference / Notes</label>
                      <input type="text" value={replenishReference} onChange={e => setReplenishReference(e.target.value)} placeholder="e.g. Withdrawal from Bank" style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #ccc' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                    <button onClick={handleReplenish} disabled={saving} className="btn-primary">
                      {saving ? 'Saving...' : 'Save Replenishment'}
                    </button>
                    <button onClick={() => setIsReplenishing(false)} className="btn-secondary" style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.5)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>

                  {pettyCashTransactionsLoading ? (
                    <div style={{ padding: 24, textAlign: 'center' }}>Loading transactions...</div>
                  ) : pettyCashTransactions.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', background: '#f5f5f5', borderRadius: 12, border: '1px dashed #ddd' }}>
                      <div style={{ fontSize: 32, marginBottom: 16 }}>💰</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>No transactions yet</div>
                      <p style={{ color: '#666', margin: '8px 0 0' }}>Use the buttons above to replenish funds or add a bill.</p>
                    </div>
                  ) : (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'hidden', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>ID</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Amount</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Date</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Project</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pettyCashTransactions.map((t, idx) => (
                            <tr key={t.id} style={{ borderBottom: idx < pettyCashTransactions.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                              <td style={{ padding: '12px 16px' }}>{t.id}</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ 
                                  padding: '4px 8px', 
                                  borderRadius: 4, 
                                  background: t.transaction_type === 'REPLENISHMENT' ? '#e3f2fd' : '#ffebee', 
                                  color: t.transaction_type === 'REPLENISHMENT' ? '#1565c0' : '#c62828',
                                  fontSize: 12, 
                                  fontWeight: 600 
                                }}>
                                  {t.transaction_type}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description || ''}>{t.description || '-'}</td>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: t.transaction_type === 'REPLENISHMENT' ? '#2e7d32' : '#c62828' }}>
                                {t.transaction_type === 'REPLENISHMENT' ? '+' : '-'}{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ padding: '12px 16px' }}>{t.transaction_date ? new Date(t.transaction_date).toLocaleDateString() : '-'}</td>
                              <td style={{ padding: '12px 16px' }}>{t.project_name || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {tab === 'accounting' && accountingSubTab === 'accounts' && (
            <div style={{ width: '100%', display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h1 style={{ marginTop: 0, fontSize: 28, marginBottom: 0 }}>Accounts</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button 
                    onClick={() => setOpenAccountModalOpen(true)} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8, 
                      padding: '10px 20px', 
                      borderRadius: 8, 
                      border: 'none', 
                      background: 'var(--primary)', 
                      color: '#fff', 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
                    }}
                  >
                    <Plus size={16} />
                    <span>Open Account</span>
                  </button>
                  {accounts.length > 0 && (
                    <ProcessFlowGuidance
                      steps={[
                        { icon: <PlusCircle size={16} />, label: 'Open Account', onClick: () => setOpenAccountModalOpen(true) },
                        { icon: <Landmark size={16} />, label: 'View Accounts' },
                        { icon: <CreditCard size={16} />, label: 'View Cards' }
                      ]}
                      description="Use the Open Account tab to add new bank accounts. Once created, they appear here. Click on any bank account card to view associated debit/credit cards."
                    />
                  )}
                </div>
              </div>
              {accountsLoading ? (
                <div style={{ padding: 24, textAlign: 'center' }}>Loading accounts...</div>
              ) : accounts.length === 0 ? (
                <ProcessFlowGuidance
                  mode="inline"
                  steps={[
                    { icon: <PlusCircle size={16} />, label: 'Open Account', onClick: () => setOpenAccountModalOpen(true) },
                    { icon: <Landmark size={16} />, label: 'View Accounts' },
                    { icon: <CreditCard size={16} />, label: 'View Cards' }
                  ]}
                  description="Use the Open Account tab to add new bank accounts. Once created, they appear here. Click on any bank account card to view associated debit/credit cards."
                />
              ) : (
                <>
                  <style>
                    {`
                      .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                      }
                    `}
                  </style>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24, paddingBottom: 40 }}>
                    {accounts.map(acc => {
                      const opt = bankOptions.find(o => o.name === acc.bank_name) || null
                      const initials = String(acc.bank_name || '')
                        .replace(/\(|\)/g, '')
                        .split(' ')
                        .map(w => w[0])
                        .filter(Boolean)
                        .slice(0, 3)
                        .join('')
                        .toUpperCase()
                      const logoEl = !opt || bankLogoRemoteFailed[opt.slug] ? (
                        <span style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.4)' }}>
                          {initials}
                        </span>
                      ) : (
                        <img
                          src={bankLogoLocalFailed[opt.slug] ? opt.logoRemote : opt.logoLocal}
                          alt={acc.bank_name}
                          style={{ width: 56, height: 56, objectFit: 'contain', background: '#fff', borderRadius: '50%', padding: 4, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}
                          referrerPolicy="no-referrer"
                          onError={() => {
                            if (!opt) return
                            if (!bankLogoLocalFailed[opt.slug]) {
                              setBankLogoLocalFailed(prev => ({ ...prev, [opt.slug]: true }))
                            } else {
                              setBankLogoRemoteFailed(prev => ({ ...prev, [opt.slug]: true }))
                            }
                          }}
                        />
                      )

                      return (
                        <div 
                          key={`${acc.id}-${acc.account_number}`}
                          onClick={() => setSelectedAccountForCards(acc)}
                          style={{ 
                            position: 'relative',
                            borderRadius: 24, 
                            overflow: 'hidden', 
                            background: '#fff', 
                            border: '1px solid rgba(0,0,0,0.08)', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-6px)'
                            e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,97,255,0.15)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.04)'
                          }}
                        >
                            <div style={{ background: 'linear-gradient(135deg, #0061ff 0%, #60efff 100%)', padding: '24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                              {logoEl}
                              <div style={{ display: 'grid', gap: 4 }}>
                                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.1)', lineHeight: 1.2 }}>{acc.bank_name}</div>
                                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{acc.branch || 'Main Branch'}</div>
                              </div>
                            </div>
                            
                            <div style={{ padding: '24px', display: 'grid', gap: 20, flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #e0e0e0', paddingBottom: 16 }}>
                                <span style={{ fontSize: 12, color: '#888', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account Number</span>
                                <span style={{ fontSize: 16, color: '#333', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, letterSpacing: '-0.5px' }}>{acc.account_number}</span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ fontSize: 13, color: '#666', fontWeight: 500 }}>Available Balance</div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-1px', display: 'flex', alignItems: 'baseline' }}>
                                  <span style={{ fontSize: 16, marginRight: 6, fontWeight: 600, color: '#888' }}>LKR</span>
                                  {Number(acc.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              </div>
                            </div>

                            <div style={{ padding: '16px 24px', background: '#f8faff', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4CAF50' }}></div>
                                  <span style={{ fontSize: 13, color: '#4CAF50', fontWeight: 600 }}>Active</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  {isAdmin && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteAccount(acc.id, acc.account_number)
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        border: '1px solid #ef4444',
                                        background: '#ef4444',
                                        color: '#fff',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                                      onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
                                    >
                                      Delete
                                    </button>
                                  )}
                                  <span style={{ fontSize: 13, color: '#0061ff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    View Cards <span style={{ fontSize: 16 }}>→</span>
                                  </span>
                                </div>
                            </div>
                        </div>
                      )
                    })}
                  </div>
              </>
            )}
            </div>
          )}

          
          {tab === 'accounting' && accountingSubTab === 'receivable' && (
            <div style={{ width: '100%', display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h1 style={{ marginTop: 0, fontSize: 28, marginBottom: 0 }}>Receivable</h1>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => setIsAddingReceivable(true)} style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add Receivable Bill</button>
                  {receivables.length > 0 && (
                    <ProcessFlowGuidance
                      steps={[
                        { icon: <Receipt size={16} />, label: 'Create Invoice' },
                        { icon: <Users size={16} />, label: 'Client Management' },
                        { icon: <Coins size={16} />, label: 'Receive Payment' }
                      ]}
                      description="Create invoices for clients, manage pending payments, and record received funds. Keep track of all your incoming revenue streams here."
                    />
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <input 
                  type="text" 
                  placeholder="Search receivables..." 
                  value={receivableSearch} 
                  onChange={e => setReceivableSearch(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', flex: 1 }} 
                />
                <select 
                  value={receivableTypeFilter} 
                  onChange={e => setReceivableTypeFilter(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
                >
                  <option value="All">All Types</option>
                  <option value="ONE_TIME">One Time</option>
                  <option value="RECURRING">Recurring</option>
                </select>
                <select 
                  value={receivableStatusFilter} 
                  onChange={e => setReceivableStatusFilter(e.target.value)} 
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {receivablesLoading ? (
                <div style={{ padding: 24, textAlign: 'center' }}>Loading receivables...</div>
              ) : filteredReceivables.length === 0 ? (
                receivables.length === 0 ? (
                  <ProcessFlowGuidance
                    mode="inline"
                    steps={[
                      { icon: <Receipt size={16} />, label: 'Create Invoice' },
                      { icon: <Users size={16} />, label: 'Client Management' },
                      { icon: <Coins size={16} />, label: 'Receive Payment' }
                    ]}
                    description="Create invoices for clients, manage pending payments, and record received funds. Keep track of all your incoming revenue streams here."
                  />
                ) : (
                  <div style={{ padding: 24, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>
                    No receivables found matching your filters.
                  </div>
                )
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'hidden', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Payer</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Amount</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Freq</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Start</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>End</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Project</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceivables.map((r, idx) => (
                        <tr key={r.receivable_id} style={{ borderBottom: idx < filteredReceivables.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                          <td style={{ padding: '12px 16px' }}>{r.receivable_id}</td>
                          <td style={{ padding: '12px 16px' }}>{r.payer_name}</td>
                          <td style={{ padding: '12px 16px' }}>{r.receivable_name}</td>
                          <td style={{ padding: '12px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.description || ''}>{r.description || '-'}</td>
                          <td style={{ padding: '12px 16px' }}>{r.receivable_type}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600 }}>{Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td style={{ padding: '12px 16px' }}>{r.frequency || '-'}</td>
                          <td style={{ padding: '12px 16px' }}>{r.start_date ? new Date(r.start_date).toLocaleDateString() : '-'}</td>
                          <td style={{ padding: '12px 16px' }}>{r.end_date ? new Date(r.end_date).toLocaleDateString() : '-'}</td>
                          <td style={{ padding: '12px 16px' }}>{r.project_name || '-'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '4px 8px', borderRadius: 4, background: r.is_active ? '#e8f5e9' : '#ffebee', color: r.is_active ? '#2e7d32' : '#c62828', fontSize: 12, fontWeight: 600 }}>
                              {r.is_active ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {isAddingReceivable && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setIsAddingReceivable(false)}>
                  <div className="glass-panel" style={{ width: 'min(1200px, 98vw)', padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
                    <h2 style={{ marginTop: 0 }}>Add Receivable Bill</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Payer Name</span>
                        <input value={receivablePayerName} onChange={e => setReceivablePayerName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Receivable Name</span>
                        <input value={receivableName} onChange={e => setReceivableName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Type</span>
                        <select value={receivableType} onChange={e => setReceivableType(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}>
                            <option value="">Select Type</option>
                            <option value="ONE_TIME">One Time</option>
                            <option value="RECURRING">Recurring</option>
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Amount</span>
                        <input type="number" value={receivableAmount} onChange={e => setReceivableAmount(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                      </label>
                      
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Frequency</span>
                        <select value={receivableFrequency} onChange={e => setReceivableFrequency(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}>
                            <option value="">Select Frequency</option>
                            <option value="WEEKLY">Weekly</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="YEARLY">Yearly</option>
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Start Date</span>
                        <input type="date" value={receivableStartDate} onChange={e => setReceivableStartDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>End Date</span>
                        <input type="date" value={receivableEndDate} onChange={e => setReceivableEndDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Project</span>
                        <select value={receivableProjectId} onChange={e => setReceivableProjectId(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}>
                            <option value="">Select Project</option>
                            {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                        </select>
                      </label>

                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Bank Account</span>
                        <select value={receivableBankAccountId} onChange={e => setReceivableBankAccountId(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}>
                            <option value="">Select Account</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} - {a.account_number}</option>)}
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Payment Method</span>
                        <input value={receivablePaymentMethod} onChange={e => setReceivablePaymentMethod(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontWeight: 500 }}>Reference Number</span>
                        <input value={receivableReferenceNumber} onChange={e => setReceivableReferenceNumber(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingTop: 24 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input type="checkbox" checked={receivableIsActive} onChange={e => setReceivableIsActive(e.target.checked)} style={{ width: 18, height: 18 }} />
                            <span style={{ fontWeight: 500 }}>Is Active</span>
                        </label>
                      </div>

                      <label style={{ display: 'grid', gap: 6, gridColumn: 'span 4' }}>
                        <span style={{ fontWeight: 500 }}>Description</span>
                        <textarea value={receivableDescription} onChange={e => setReceivableDescription(e.target.value)} rows={2} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                        <button onClick={() => setIsAddingReceivable(false)} className="btn-secondary" style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.5)' }}>Cancel</button>
                        <button onClick={handleSaveReceivable} className="btn-primary">Save Receivable</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'employees' && employeeSubTab === 'pto' && <PTORequests userId={user.id} isManager={user.roleName === 'Admin' || user.roleName === 'Manager' || false} accessToken={accessToken} />}
          {tab === 'accounting' && accountingSubTab === 'subscriptions' && <Subscriptions />}
          {tab === 'analytics' && <DataAnalytics />}
          {tab === 'documents' && <DocumentBank user={{ roleNames: user.roleNames || [user.roleName].filter(Boolean) as string[] }} accessToken={accessToken} />}
          {tab === 'accounting' && accountingSubTab === 'purchase_orders' && <PurchaseOrders 
            user={user} 
            accessToken={accessToken}
            vendors={vendors} 
            projects={projects
              .filter(p => p.contract_id && p.contract_name)
              .map(p => ({ contract_id: p.contract_id!, contract_name: p.contract_name! }))
            } 
          />}
          {tab === 'accounting' && accountingSubTab === 'payroll' && <Payroll />}
          {tab === 'settings' && (
            hasPermission(user, 'settings', 'manage') ? (
              <Settings accessToken={accessToken} />
            ) : (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff3cd', border: '2px solid #ffc107', borderRadius: 16, padding: 40 }}>
                  <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
                  <h2 style={{ margin: '0 0 16px', fontSize: 24, color: '#856404' }}>Access Denied</h2>
                  <p style={{ margin: 0, fontSize: 16, color: '#856404', lineHeight: 1.6 }}>
                    You don't have permission to access Settings. This area requires <strong>settings:manage</strong> permission.
                    <br /><br />
                    Please contact your administrator if you need access to role management, user permissions, or system settings.
                  </p>
                </div>
              </div>
            )
          )}
          {tab === 'accounting' && accountingSubTab === 'loans' && <Loans />}
          {tab === 'accounting' && accountingSubTab === 'assets' && (
            <div style={{ width: '100%', display: 'grid', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ marginTop: 0, fontSize: 28 }}>Asset Management</h1>
                <button onClick={() => setAddAssetModalOpen(true)} style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add Asset</button>
              </div>
              <p style={{ margin: 0 }}>Manage assets here.</p>
              {assetsLoading ? (
                <div style={{ padding: 24, textAlign: 'center' }}>Loading assets...</div>
              ) : assets.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>No assets found.</div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table className="glass-panel" style={{ width: '100%', borderCollapse: 'collapse', overflow: 'hidden', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Asset Name</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Original Value</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Current Book Value</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Depreciation</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Purchase Date</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset, idx) => (
                        <tr key={asset.id} style={{ borderBottom: idx < assets.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                          <td style={{ padding: '12px 16px' }}>{asset.id}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 500 }}>{asset.asset_name}</td>
                          <td style={{ padding: '12px 16px' }}>LKR {Number(asset.value).toLocaleString()}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: asset.depreciation_method ? '#0284c7' : 'inherit' }}>
                            LKR {Number(asset.current_book_value || asset.value).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {asset.depreciation_method ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ padding: '4px 8px', borderRadius: 4, background: asset.depreciation_method === 'STRAIGHT_LINE' ? '#e3f2fd' : '#fff3e0', color: asset.depreciation_method === 'STRAIGHT_LINE' ? '#1565c0' : '#e65100', fontSize: 11, fontWeight: 600, display: 'inline-block' }}>
                                  {asset.depreciation_method === 'STRAIGHT_LINE' ? 'Straight-Line' : 'DDB'}
                                </span>
                                <span style={{ fontSize: 12, color: '#666' }}>
                                  Acc: LKR {Number(asset.accumulated_depreciation || 0).toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#999', fontSize: 13 }}>Not Depreciable</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px' }}>{new Date(asset.purchase_date).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {asset.depreciation_method && (
                              <button 
                                onClick={async () => {
                                  setSelectedAssetForSchedule(asset)
                                  setScheduleLoading(true)
                                  setDepreciationScheduleModalOpen(true)
                                  try {
                                    const r = await fetch(`${API_URL}/assets/${asset.id}/depreciation-schedule?view=${scheduleView}`)
                                    if (r.ok) {
                                      const data = await r.json()
                                      setDepreciationSchedule(data.schedule || [])
                                    }
                                  } catch (err) {
                                    console.error('Error fetching depreciation schedule:', err)
                                  } finally {
                                    setScheduleLoading(false)
                                  }
                                }}
                                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #2196F3', background: '#2196F3', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                              >
                                View Schedule
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      {addOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => { setAddOpen(false); resetForm() }}>
          <div className="glass-panel" style={{ width: 'min(1000px, 96vw)', padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Add Employee</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Employee Number *</span>
                  <input value={employeeNumber} onChange={e => setEmployeeNumber(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>First Name *</span>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Last Name *</span>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Email *</span>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Phone *</span>
                  <input value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Date of Birth</span>
                  <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>NIC</span>
                  <input value={nic} onChange={e => setNic(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Role *</span>
                  <select value={role} onChange={e => setRole(e.target.value as 'IT' | 'Accounting' | 'Marketing')} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required>
                    <option value="IT">IT</option>
                    <option value="Accounting">Accounting</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Designation</span>
                  <input value={designation} onChange={e => setDesignation(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Tax</span>
                  <input value={tax} onChange={e => setTax(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                </label>
              </div>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Address</span>
                <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', resize: 'vertical' }} />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => { setAddOpen(false); resetForm() }} className="btn-secondary" style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.5)' }}>Cancel</button>
                <button disabled={saving} onClick={addEmployee} className="btn-primary">{saving ? 'Adding...' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {itemsTableModalOpen && currentProjectForItems && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1100, overflowY: 'auto', padding: '20px' }} onClick={() => setItemsTableModalOpen(false)}>
          <div className="glass-panel" style={{ width: 'min(900px, 92vw)', maxHeight: '90vh', padding: 24, borderRadius: 16, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Project Items List</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontWeight: 600 }}>Requirements</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontWeight: 600 }}>Category</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontWeight: 600 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontWeight: 600 }}>Cost</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #eee', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectItems.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8 }}>{item.requirements}</td>
                    <td style={{ padding: 8 }}>{item.service_category}</td>
                    <td style={{ padding: 8 }}>{item.requirement_type}</td>
                    <td style={{ padding: 8 }}>{item.unit_cost}</td>
                    <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                      <button onClick={() => {
                        setEditingItem(item)
                        setItemRequirements(item.requirements)
                        setItemServiceCategory(item.service_category)
                        setItemUnitCost(String(item.unit_cost))
                        setItemRequirementType(item.requirement_type)
                        setItemsTableModalOpen(false)
                      }} className="btn-primary" style={{ padding: '4px 8px', fontSize: 12 }}>Edit</button>
                      <button onClick={async () => {
                        const confirmed = await confirm('Delete item?', { destructive: true })
                        if (!confirmed) return
                        try {
                          const r = await fetch(`http://localhost:3000/projects/${item.project_id}/items/${encodeURIComponent(item.requirements)}`, { method: 'DELETE' })
                          if (r.ok) {
                            fetchProjects()
                            fetchProjectItems()
                          }
                        } catch (e) { console.error(e) }
                      }} className="btn-secondary" style={{ padding: '4px 8px', fontSize: 12, background: '#ef4444', color: 'white', border: 'none' }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {projectItems.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, textAlign: 'center', color: '#888' }}>No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setItemsTableModalOpen(false)} className="btn-secondary" style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.5)' }}>Close</button>
            </div>
          </div>
        </div>
      )}
      {selectedAccountForCards && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1200, padding: 20 }} 
          onClick={() => setSelectedAccountForCards(null)}
        >
          <div 
            style={{ width: 'min(600px, 92vw)', maxHeight: '85vh', background: '#fff', borderRadius: 24, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeIn 0.2s ease-out' }} 
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #0061ff 0%, #60efff 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 700 }}>{selectedAccountForCards.bank_name}</h2>
                  <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>{selectedAccountForCards.branch}</p>
               </div>
               <button 
                onClick={() => setSelectedAccountForCards(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', width: 32, height: 32, borderRadius: '50%', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
               >
                 ✕
               </button>
            </div>
            
            <div style={{ padding: 32, overflowY: 'auto', display: 'grid', gap: 24 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px dashed #eee' }}>
                  <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>ACCOUNT NUMBER</span>
                  <span style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 700, color: '#333' }}>{selectedAccountForCards.account_number}</span>
               </div>
               
               <h3 style={{ margin: '8px 0 0', fontSize: 16, color: '#333', fontWeight: 700 }}>Associated Debit Cards</h3>
               
               {cards.filter(c => c.bank_account_id === selectedAccountForCards.id).length > 0 ? (
                 <div style={{ display: 'grid', gap: 16 }}>
                    {cards.filter(c => c.bank_account_id === selectedAccountForCards.id).map(card => (
                       <div key={card.id} style={{ borderRadius: 16, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
                          <div style={{ background: 'var(--primary)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" style={{ height: 16, filter: 'brightness(0) invert(1)' }} />
                                <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Debit Card</span>
                             </div>
                             <div style={{ padding: '4px 8px', borderRadius: 4, background: card.is_active ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)', color: card.is_active ? '#81c784' : '#e57373', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                               {card.is_active ? 'Active' : 'Inactive'}
                             </div>
                          </div>
                          <div style={{ padding: 20, background: '#fcfcfc', display: 'grid', gap: 16 }}>
                             <div style={{ display: 'grid', gap: 6 }}>
                                <span style={{ fontSize: 11, color: '#999', fontWeight: 700, textTransform: 'uppercase' }}>Card Number</span>
                                <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#333', fontWeight: 600, letterSpacing: '1px' }}>
                                   **** **** **** {card.card_number_last4}
                                </div>
                             </div>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div style={{ display: 'grid', gap: 6 }}>
                                   <span style={{ fontSize: 11, color: '#999', fontWeight: 700, textTransform: 'uppercase' }}>Card Holder</span>
                                   <div style={{ fontSize: 14, color: '#333', fontWeight: 500 }}>{card.card_holder_name}</div>
                                </div>
                                <div style={{ display: 'grid', gap: 6 }}>
                                   <span style={{ fontSize: 11, color: '#999', fontWeight: 700, textTransform: 'uppercase' }}>Expires</span>
                                   <div style={{ fontSize: 14, color: '#333', fontWeight: 500 }}>{card.expiry_date}</div>
                                </div>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
               ) : (
                 <div style={{ padding: 40, textAlign: 'center', background: '#f9f9f9', borderRadius: 12, border: '1px dashed #ddd' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>💳</div>
                    <div style={{ color: '#666', fontWeight: 500 }}>No cards found for this account.</div>
                    <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>Add a card via Card Management.</div>
                 </div>
               )}
            </div>
            
            <div style={{ padding: '20px 32px', borderTop: '1px solid #eee', background: '#fff', textAlign: 'right' }}>
               <button 
                  onClick={() => setSelectedAccountForCards(null)}
                  style={{ padding: '10px 24px', borderRadius: 8, background: '#f0f0f0', color: '#333', border: 'none', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#e0e0e0'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f0f0f0'}
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
      {projectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => { setProjectModalOpen(false); resetProjectForm() }}>
          <div style={{ width: 'min(1000px, 96vw)', padding: 24, borderRadius: 16, background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "var(--accent)", marginTop: 0 }}>Add Project</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ color: "#fff", display: 'grid', gap: 6 }}>
                  <span>Project Name *</span>
                  <input value={projectName} onChange={e => setProjectName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)' }} required />
                </label>
                <label style={{ color: "#fff", display: 'grid', gap: 6 }}>
                  <span>Customer Name *</span>
                  <input value={customerName} onChange={e => setCustomerName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)' }} required />
                </label>
              </div>
              <label style={{ color: "#fff", display: 'grid', gap: 6 }}>
                <span>Description</span>
                <textarea value={projectDescription} onChange={e => setProjectDescription(e.target.value)} rows={3} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', resize: 'vertical' }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ color: "#fff", display: 'grid', gap: 6 }}>
                  <span>Initial Cost Budget *</span>
                  <input type="number" value={initialCostBudget} onChange={e => setInitialCostBudget(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)' }} required />
                </label>
                <label style={{ color: "#fff", display: 'grid', gap: 6 }}>
                  <span>Status *</span>
                  <select value={projectStatus} onChange={e => setProjectStatus(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)' }} required>
                    <option value="" disabled>Select Status</option>
                    <option value="ongoing">ongoing</option>
                    <option value="pending">pending</option>
                    <option value="end">end</option>
                  </select>
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => { setProjectModalOpen(false); resetProjectForm() }} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: '#b1b1b1', color: '#111' }}>Cancel</button>
                <button disabled={saving} onClick={addProject} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>{saving ? 'Adding...' : 'Add'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }} onClick={() => { setEditOpen(false); resetForm() }}>
          <div className="glass-panel" style={{ width: 'min(600px, 92vw)', maxHeight: '90vh', padding: 24, borderRadius: 16, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Edit Employee</h2>
             <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Employee Number *</span>
                <input value={employeeNumber} onChange={e => setEmployeeNumber(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>First Name *</span>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Last Name *</span>
                <input value={lastName} onChange={e => setLastName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Email *</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Phone *</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Date of Birth</span>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>NIC</span>
                <input value={nic} onChange={e => setNic(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Address</span>
                <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', resize: 'vertical' }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Role *</span>
                <select value={role} onChange={e => setRole(e.target.value as 'IT' | 'Accounting' | 'Marketing')} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required>
                  <option value="IT">IT</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Designation</span>
                <input value={designation} onChange={e => setDesignation(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Tax</span>
                <input value={tax} onChange={e => setTax(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => { setEditOpen(false); resetForm() }} className="btn-secondary" style={{ color: 'var(--text-main)', background: 'rgba(255,255,255,0.5)' }}>Cancel</button>
                <button disabled={saving} onClick={updateEmployee} className="btn-primary">{saving ? 'Updating...' : 'Update'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {deleteOpen && deletingEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={() => { setDeleteOpen(false); setDeletingEmployee(null) }}>
          <div className="glass-panel" style={{ width: 'min(400px, 92vw)', padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "var(--accent)", marginTop: 0 }}>Delete Employee</h2>
            <p style={{ margin: '16px 0' }}>
              Are you sure you want to delete employee <strong>{deletingEmployee.first_name} {deletingEmployee.last_name}</strong> (ID: {deletingEmployee.employee_id})?
            </p>
            <p style={{ margin: '16px 0', fontSize: '14px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setDeleteOpen(false); setDeletingEmployee(null) }} className="btn-secondary">Cancel</button>
              <button disabled={saving} onClick={deleteEmployee} className="btn-primary" style={{ background: '#f44336', borderColor: '#f44336' }}>{saving ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {detailsOpen && selectedEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }} onClick={() => { setDetailsOpen(false); setSelectedEmployee(null) }}>
          <div className="glass-panel" style={{ width: 'min(700px, 92vw)', maxHeight: '90vh', padding: 24, borderRadius: 16, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Employee Details</h2>
            <div style={{ display: 'grid', gap: 8 }}>
              <div><strong>ID:</strong> {selectedEmployee.employee_id}</div>
              <div><strong>Employee #:</strong> {selectedEmployee.employee_number}</div>
              <div><strong>Name:</strong> {selectedEmployee.first_name} {selectedEmployee.last_name}</div>
              <div><strong>Email:</strong> {selectedEmployee.email}</div>
              <div><strong>Phone:</strong> {selectedEmployee.phone}</div>
              <div><strong>DOB:</strong> {selectedEmployee.dob ? new Date(selectedEmployee.dob).toLocaleDateString() : '-'}</div>
              <div><strong>NIC:</strong> {selectedEmployee.nic || '-'}</div>
              <div style={{ maxWidth: '100%' }}><strong>Address:</strong> {selectedEmployee.address || '-'}</div>
              <div><strong>Role:</strong> {selectedEmployee.role}</div>
              <div><strong>Designation:</strong> {selectedEmployee.designation || '-'}</div>
              <div><strong>Tax:</strong> {selectedEmployee.tax || '-'}</div>
              <div><strong>Created At:</strong> {new Date(selectedEmployee.created_at).toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setDetailsOpen(false); setSelectedEmployee(null) }} className="btn-secondary">Close</button>
              <button onClick={() => { setDetailsOpen(false); setSelectedEmployee(null); openEditModal(selectedEmployee) }} className="btn-primary">Edit</button>
              <button onClick={() => { setDetailsOpen(false); setSelectedEmployee(null); openDeleteModal(selectedEmployee) }} className="btn-primary" style={{ background: '#f44336', borderColor: '#f44336' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {projectDeleteModalOpen && deletingProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={() => { setProjectDeleteModalOpen(false); setDeletingProject(null) }}>
          <div className="glass-panel" style={{ width: 'min(400px, 92vw)', padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "var(--accent)", marginTop: 0 }}>Delete Project</h2>
            <p style={{ margin: '16px 0' }}>
              Are you sure you want to delete project <strong>{deletingProject.project_name}</strong> (ID: {deletingProject.project_id})?
            </p>
            <p style={{ margin: '16px 0', fontSize: '14px' }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setProjectDeleteModalOpen(false); setDeletingProject(null) }} className="btn-secondary">Cancel</button>
              <button disabled={saving} onClick={deleteProjectConfirm} className="btn-primary" style={{ background: '#f44336', borderColor: '#f44336' }}>{saving ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {totalBudgetModalOpen && totalBudgetProject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000 }} onClick={() => { setTotalBudgetModalOpen(false); setTotalBudgetProject(null) }}>
          <div className="glass-panel" style={{ width: 'min(500px, 92vw)', padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Total Budget Breakdown</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, background: 'rgba(255,255,255,0.5)', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #ccc' }}>Total Budget</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #ccc' }}>Receivable Amount</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #ccc' }}>Rest</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalBudget = Number(totalBudgetProject.initial_cost_budget) + Number(totalBudgetProject.extra_budget_allocation)
                  const receivableAmount = receivables
                    .filter(r => r.project_id === totalBudgetProject.project_id)
                    .reduce((sum, r) => sum + Number(r.amount), 0)
                  const rest = totalBudget - receivableAmount

                  return (
                    <tr>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>{totalBudget.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>{receivableAmount.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: rest < 0 ? '#ff6b6b' : 'inherit' }}>{rest.toLocaleString()}</td>
                    </tr>
                  )
                })()}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setTotalBudgetModalOpen(false); setTotalBudgetProject(null) }} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {projectItemsModalOpen && currentProjectForItems && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px' }} onClick={() => { setProjectItemsModalOpen(false); setCurrentProjectForItems(null); clearItemForm() }}>
          <div className="glass-panel" style={{ width: 'min(900px, 92vw)', maxHeight: '90vh', padding: 24, borderRadius: 16, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Project Items</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'grid', rowGap: 8 }}>
                  <div><strong>Name:</strong> <span onClick={() => setItemsTableModalOpen(true)} style={{ color: '#2196F3', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>{currentProjectForItems.project_name}</span></div>
                  <div><strong>Customer:</strong> {currentProjectForItems.customer_name}</div>
                  <div><strong>Description:</strong> {currentProjectForItems.description ?? '-'}</div>
                  <div><strong>Initial Budget:</strong> {currentProjectForItems.initial_cost_budget}</div>
                  <div><strong>Extra Budget:</strong> {currentProjectForItems.extra_budget_allocation}</div>
                  <div><strong>Payment Type:</strong> {currentProjectForItems.payment_type}</div>
                  <div><strong>Status:</strong> {currentProjectForItems.status}</div>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 500 }}>Requirements *</span>
                    <input value={itemRequirements} onChange={e => setItemRequirements(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 500 }}>Service Category *</span>
                    <select value={itemServiceCategory} onChange={e => setItemServiceCategory(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required>
                      <option value="">Select</option>
                      <option value="Software">Software</option>
                      <option value="Hardware">Hardware</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 500 }}>Unit Cost *</span>
                    <input type="number" value={itemUnitCost} onChange={e => setItemUnitCost(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontWeight: 500 }}>Requirement Type *</span>
                    <select value={itemRequirementType} onChange={e => setItemRequirementType(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required>
                      <option value="">Select</option>
                      <option value="Initial Requirement">Initial Requirement</option>
                      <option value="Additional Requirement">Additional Requirement</option>
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setProjectItemsModalOpen(false); setCurrentProjectForItems(null); clearItemForm() }} className="btn-secondary">Cancel</button>
                    <button onClick={() => saveProjectItem()} className="btn-primary">{editingItem ? 'Update Item' : 'Save Item'}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {openAccountModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => { setOpenAccountModalOpen(false); resetOpenAccountForm() }}>
          <div className="glass-panel" style={{ width: 'min(1000px, 96vw)', padding: 24, borderRadius: 16 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Open Account</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6, position: 'relative' }}>
                  <span style={{ fontWeight: 500 }}>Bank Name *</span>
                  <input
                    value={bankName}
                    readOnly
                    onClick={() => setBankDropdownOpen(o => !o)}
                    placeholder="Select bank"
                    onBlur={() => setBankDropdownOpen(false)}
                    onKeyDown={e => { if (e.key === 'Escape') setBankDropdownOpen(false) }}
                    ref={bankInputRef}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
                    required
                  />
                  {bankDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', color: '#111', border: '1px solid #ccc', borderRadius: 8, marginTop: 6, maxHeight: 240, overflowY: 'auto', zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                      {bankOptions.map(opt => (
                        <button
                          key={opt.slug}
                          onMouseDown={() => { setBankName(opt.name); setBankDropdownOpen(false); bankInputRef.current?.blur() }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #eee', cursor: 'pointer', textAlign: 'left' }}
                          title={opt.name}
                        >
                          {bankLogoRemoteFailed[opt.slug] ? (
                            <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                              {opt.name.replace(/\(|\)/g, '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 3).join('').toUpperCase()}
                            </span>
                          ) : (
                            <img
                              src={bankLogoLocalFailed[opt.slug] ? opt.logoRemote : opt.logoLocal}
                              alt={opt.name}
                              style={{ width: 36, height: 36, objectFit: 'contain' }}
                              referrerPolicy="no-referrer"
                              onError={() => {
                                if (!bankLogoLocalFailed[opt.slug]) {
                                  setBankLogoLocalFailed(prev => ({ ...prev, [opt.slug]: true }))
                                } else {
                                  setBankLogoRemoteFailed(prev => ({ ...prev, [opt.slug]: true }))
                                }
                              }}
                            />
                          )}
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{opt.name}</span>
                        </button>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 8px' }}>
                        <button onClick={() => setBankDropdownOpen(false)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '13px' }}>Close</button>
                      </div>
                    </div>
                  )}
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Branch *</span>
                  <input value={branch} onChange={e => setBranch(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Account Number *</span>
                  <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Account Name *</span>
                  <input value={accountName} onChange={e => setAccountName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
                </label>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontWeight: 500 }}>Opening Balance *</span>
                  <input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => { setOpenAccountModalOpen(false); resetOpenAccountForm() }} className="btn-secondary">Cancel</button>
                <button disabled={saving} onClick={saveOpenAccount} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {cardModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => { setCardModalOpen(false); resetCardForm() }}>
          <div style={{ width: 'min(1000px, 96vw)', padding: 24, borderRadius: 16, background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ color: "var(--accent)", marginTop: 0 }}>Card Management</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ color: "#fff", display: 'grid', gap: 6, position: 'relative' }}>
                  <span>Bank Account *</span>
                  <input
                    value={cardSelectedAccountLabel}
                    readOnly
                    onClick={() => setCardAccountDropdownOpen(o => !o)}
                    placeholder="Select bank account"
                    onBlur={() => setCardAccountDropdownOpen(false)}
                    onKeyDown={e => { if (e.key === 'Escape') setCardAccountDropdownOpen(false) }}
                    ref={cardAccountInputRef}
                    style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: '#fff', cursor: 'pointer' }}
                    required
                  />
                  {cardAccountDropdownOpen && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', color: '#111', border: '1px solid var(--primary)', borderRadius: 8, marginTop: 6, maxHeight: 240, overflowY: 'auto', zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                      {accounts.map(acc => (
                        <button
                          key={acc.id}
                          onMouseDown={() => { setCardBankAccountId(String(acc.id)); setCardSelectedAccountLabel(`${acc.bank_name} — ${acc.account_number}`); setCardAccountDropdownOpen(false); cardAccountInputRef.current?.blur() }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #eee', cursor: 'pointer', textAlign: 'left' }}
                          title={`${acc.bank_name} ${acc.branch ?? ''}`.trim()}
                        >
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{acc.bank_name}</span>
                          <span style={{ fontSize: 13, color: '#555', marginLeft: 'auto' }}>Acc #: {acc.account_number}</span>
                        </button>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 8px' }}>
                        <button onClick={() => setCardAccountDropdownOpen(false)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--primary)', background: '#f5f5f5', color: '#111', cursor: 'pointer' }}>Close</button>
                      </div>
                    </div>
                  )}
                </label>
                <label style={{ color: "#fff", display: 'grid', gap: 6 }}>
                  <span>Card Number (last 4) *</span>
                  <input value={cardNumberLast4} onChange={e => setCardNumberLast4(e.target.value)} placeholder="e.g., 1111" maxLength={4} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)' }} required />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ color: "#fff", display: 'grid', gap: 6 }}>
                  <span>Card Holder Name *</span>
                  <input value={cardHolderName} onChange={e => setCardHolderName(e.target.value)} placeholder="e.g., Jane Doe" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)' }} required />
                </label>
                <label style={{ color: "#fff", display: 'grid', gap: 6 }}>
                  <span>Expiry Date *</span>
                  <input type="month" value={cardExpiryDate} onChange={e => setCardExpiryDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)' }} required />
                </label>
              </div>
              <label style={{ color: "#fff", display: 'grid', gap: 6 }}>
                <span>Status *</span>
                <select value={cardStatus} onChange={e => setCardStatus(e.target.value as 'Active' | 'Inactive' | 'Blocked')} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)' }} required>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => { setCardModalOpen(false); resetCardForm() }} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: '#b1b1b1', color: '#111' }}>Cancel</button>
                <button disabled={saving} onClick={submitCard} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--primary)', background: 'var(--accent)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer' }}>Save Card</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {cardSaveConfirmVisible && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 2000 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', fontSize: 16, fontWeight: 600 }}>
            <span style={{ fontSize: 22 }}>👩‍💼</span>
            <span>Saved</span>
          </div>
        </div>
      )}

      {addAssetModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px' }} onClick={() => { setAddAssetModalOpen(false); setAssetName(''); setAssetValue(''); setPurchaseDate(''); setIsDepreciable(false); setSalvageValue(''); setUsefulLife('') }}>
          <div className="glass-panel" style={{ width: 'min(600px, 96vw)', padding: 24, borderRadius: 16, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Add New Asset</h2>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Asset Name *</span>
                <input value={assetName} onChange={e => setAssetName(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Original Value (Cost) *</span>
                <input type="number" value={assetValue} onChange={e => setAssetValue(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontWeight: 500 }}>Purchase Date *</span>
                <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} required />
              </label>
              
              <div style={{ borderTop: '2px dashed #e0e0e0', paddingTop: 16, marginTop: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 16 }}>
                  <input 
                    type="checkbox" 
                    checked={isDepreciable} 
                    onChange={e => setIsDepreciable(e.target.checked)} 
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>This is a depreciable asset</span>
                </label>
                
                {isDepreciable && (
                  <div style={{ display: 'grid', gap: 12, paddingLeft: 26, background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontWeight: 500 }}>Depreciation Method *</span>
                      <select 
                        value={depreciationMethod} 
                        onChange={e => setDepreciationMethod(e.target.value as 'STRAIGHT_LINE' | 'DOUBLE_DECLINING')} 
                        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }}
                      >
                        <option value="STRAIGHT_LINE">Straight-Line Depreciation</option>
                        <option value="DOUBLE_DECLINING">Double-Declining Balance (DDB)</option>
                      </select>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        {depreciationMethod === 'STRAIGHT_LINE' 
                          ? '📊 Best for: Office furniture, buildings - loses value steadily'
                          : '📉 Best for: Technology, computers - becomes obsolete quickly'
                        }
                      </div>
                    </label>
                    
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontWeight: 500 }}>Salvage Value *</span>
                      <input 
                        type="number" 
                        value={salvageValue} 
                        onChange={e => setSalvageValue(e.target.value)} 
                        placeholder="Estimated value at end of life"
                        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} 
                        required 
                      />
                      <div style={{ fontSize: 12, color: '#666' }}>The estimated value when the asset reaches end of its useful life</div>
                    </label>
                    
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontWeight: 500 }}>Useful Life (Years) *</span>
                      <input 
                        type="number" 
                        value={usefulLife} 
                        onChange={e => setUsefulLife(e.target.value)} 
                        placeholder="e.g., 5"
                        min="1"
                        style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #ccc' }} 
                        required 
                      />
                      <div style={{ fontSize: 12, color: '#666' }}>Expected number of years the asset will be in service</div>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24, gap: 12 }}>
              <button onClick={() => { setAddAssetModalOpen(false); setAssetName(''); setAssetValue(''); setPurchaseDate(''); setIsDepreciable(false); setSalvageValue(''); setUsefulLife('') }} className="btn-secondary">Cancel</button>
              <button onClick={saveAsset} className="btn-primary">Save Asset</button>
            </div>
          </div>
        </div>
      )}

      {depreciationScheduleModalOpen && selectedAssetForSchedule && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }} onClick={() => { setDepreciationScheduleModalOpen(false); setSelectedAssetForSchedule(null); setDepreciationSchedule([]) }}>
          <div className="glass-panel" style={{ width: 'min(900px, 96vw)', maxHeight: '90vh', padding: 24, borderRadius: 16, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Depreciation Schedule - {selectedAssetForSchedule.asset_name}</h2>
            
            <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Method</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {selectedAssetForSchedule.depreciation_method === 'STRAIGHT_LINE' ? 'Straight-Line' : 'Double-Declining Balance'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Original Value</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>LKR {Number(selectedAssetForSchedule.value).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Salvage Value</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>LKR {Number(selectedAssetForSchedule.salvage_value).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>Useful Life</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{selectedAssetForSchedule.useful_life} years</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button 
                onClick={async () => {
                  setScheduleView('yearly')
                  setScheduleLoading(true)
                  try {
                    const r = await fetch(`${API_URL}/assets/${selectedAssetForSchedule.id}/depreciation-schedule?view=yearly`)
                    if (r.ok) {
                      const data = await r.json()
                      setDepreciationSchedule(data.schedule || [])
                    }
                  } catch (err) {
                    console.error(err)
                  } finally {
                    setScheduleLoading(false)
                  }
                }}
                style={{ padding: '8px 16px', borderRadius: 8, border: scheduleView === 'yearly' ? '2px solid var(--primary)' : '1px solid #ccc', background: scheduleView === 'yearly' ? 'var(--primary)' : '#fff', color: scheduleView === 'yearly' ? '#fff' : '#333', cursor: 'pointer', fontWeight: 600 }}
              >
                Yearly View
              </button>
              <button 
                onClick={async () => {
                  setScheduleView('monthly')
                  setScheduleLoading(true)
                  try {
                    const r = await fetch(`${API_URL}/assets/${selectedAssetForSchedule.id}/depreciation-schedule?view=monthly`)
                    if (r.ok) {
                      const data = await r.json()
                      setDepreciationSchedule(data.schedule || [])
                    }
                  } catch (err) {
                    console.error(err)
                  } finally {
                    setScheduleLoading(false)
                  }
                }}
                style={{ padding: '8px 16px', borderRadius: 8, border: scheduleView === 'monthly' ? '2px solid var(--primary)' : '1px solid #ccc', background: scheduleView === 'monthly' ? 'var(--primary)' : '#fff', color: scheduleView === 'monthly' ? '#fff' : '#333', cursor: 'pointer', fontWeight: 600 }}
              >
                Monthly View
              </button>
            </div>

            {scheduleLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}>Loading schedule...</div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--primary)', color: '#fff' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600 }}>Period</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Beginning Book Value</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Depreciation</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Accumulated Depreciation</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>Ending Book Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depreciationSchedule.map((item, idx) => (
                      <tr 
                        key={idx} 
                        style={{ 
                          borderBottom: idx < depreciationSchedule.length - 1 ? '1px solid #e0e0e0' : 'none',
                          background: item.isCurrent ? '#fff3cd' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                          {item.period}
                          {item.isCurrent && <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#ffc107', color: '#000', fontWeight: 700 }}>CURRENT</span>}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          LKR {Number(item.beginningBookValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#c62828', fontWeight: 600 }}>
                          LKR {Number(item.depreciation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                          LKR {Number(item.accumulatedDepreciation).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>
                          LKR {Number(item.endingBookValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
              <button onClick={() => { setDepreciationScheduleModalOpen(false); setSelectedAssetForSchedule(null); setDepreciationSchedule([]) }} className="btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}
