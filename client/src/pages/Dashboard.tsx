import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { API_URL } from '../config/api'
import { hasPermission, hasAnyPermission } from '../utils/permissions'
import HomeProductivityWidget from '../components/HomeProductivityWidget'
import SystemClock from '../components/SystemClock'
import InternationalClock from '../components/InternationalClock'
import { ProcessFlowGuidance } from '../components/ProcessFlowGuidance'
import DataAnalytics from './DataAnalytics'
import Settings from './Settings'
import Projects from './Projects'
import ProjectTime, { type ProjectTimeTabType } from './ProjectTime'
import PTORequests from './PTORequests'
import Subscriptions from './Subscriptions'
import DocumentBank from './DocumentBank'
import QuoteGenerator from './QuoteGenerator'
import PurchaseOrders from './PurchaseOrders'
import Payroll from './Payroll'
import Loans from './Loans'
import { LayoutDashboard, Users, ClipboardList, Store, FolderOpen, Banknote, Landmark, Receipt, Coins, Inbox, Plus, PlusCircle, CreditCard, Building2, ChevronLeft, ChevronRight, ChevronDown, BarChart3, Settings as SettingsIcon, Clock, Calendar, Repeat, FileText, FileSignature, ShoppingCart, DollarSign, TrendingDown, TrendingUp, LogOut, UserCheck, Briefcase, Award, User, Mail, Phone, MapPin, Hash, CheckCircle, Pencil, Trash2, X, Scale, Menu } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useWindowSize } from '../hooks/useWindowSize'

const ASSET_INPUT: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid #e2e8f0',
  background: '#f8fafc',
  fontSize: 13.5,
  color: '#1e293b',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'all 0.2s',
}
function assetFocusIn(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#2563eb'
  e.target.style.background = '#fff'
  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'
}
function assetFocusOut(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
  e.target.style.borderColor = '#e2e8f0'
  e.target.style.background = '#f8fafc'
  e.target.style.boxShadow = 'none'
}

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
  const { isMobile } = useWindowSize()
  const [navOpen, setNavOpen] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [projectSubTab, setProjectSubTab] = useState<'projects' | 'time' | 'quotes'>('projects')
  const [addOpen, setAddOpen] = useState(false)
  const [addBtnPop, setAddBtnPop] = useState(false)
  const [addVendorBtnPop, setAddVendorBtnPop] = useState(false)
  const [ptoActiveTab, setPtoActiveTab] = useState<'my-requests' | 'approvals'>('my-requests')
  const [ptoDrawerOpen, setPtoDrawerOpen] = useState(false)
  const [projectTimeTab, setProjectTimeTab] = useState<ProjectTimeTabType>('summary')
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
  const [employeeDesignationFilter, setEmployeeDesignationFilter] = useState('All')
  const [employeeSortBy, setEmployeeSortBy] = useState('name_asc')
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
  const [customBankMode, setCustomBankMode] = useState(false)
  const [customBankLogoUrl, setCustomBankLogoUrl] = useState('')
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
  const [editingPayable, setEditingPayable] = useState<Payable | null>(null)
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

  const employeeDesignations = useMemo(() =>
    [...new Set(employees.map(e => e.designation).filter(Boolean))].sort() as string[]
  , [employees])

  const filteredEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      const searchLower = employeeSearch.toLowerCase()
      const matchesSearch =
        (emp.first_name?.toLowerCase() || '').includes(searchLower) ||
        (emp.last_name?.toLowerCase() || '').includes(searchLower) ||
        (emp.email?.toLowerCase() || '').includes(searchLower) ||
        (emp.employee_number?.toLowerCase() || '').includes(searchLower) ||
        (emp.nic?.toLowerCase() || '').includes(searchLower) ||
        (emp.phone?.toLowerCase() || '').includes(searchLower) ||
        (emp.designation?.toLowerCase() || '').includes(searchLower)
      const matchesRole = employeeRoleFilter === 'All' || emp.role === employeeRoleFilter
      const matchesDesignation = employeeDesignationFilter === 'All' || emp.designation === employeeDesignationFilter
      return matchesSearch && matchesRole && matchesDesignation
    })
    return [...result].sort((a, b) => {
      switch (employeeSortBy) {
        case 'name_asc':  return `${a.first_name}${a.last_name}`.localeCompare(`${b.first_name}${b.last_name}`)
        case 'name_desc': return `${b.first_name}${b.last_name}`.localeCompare(`${a.first_name}${a.last_name}`)
        case 'newest':    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'emp_num':   return (a.employee_number || '').localeCompare(b.employee_number || '')
        default: return 0
      }
    })
  }, [employees, employeeSearch, employeeRoleFilter, employeeDesignationFilter, employeeSortBy])

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

  const [pettyCashTransactions, setPettyCashTransactions] = useState<PettyCashTransaction[]>([])
  const [pettyCashTransactionsLoading, setPettyCashTransactionsLoading] = useState(false)
  const [pettyCashSearch, setPettyCashSearch] = useState('')
  const [pettyCashTypeFilter, setPettyCashTypeFilter] = useState('All')

  const filteredPettyCash = useMemo(() => {
    return pettyCashTransactions.filter(t => {
      const matchesSearch = pettyCashSearch === '' ||
        (t.description?.toLowerCase() || '').includes(pettyCashSearch.toLowerCase()) ||
        (t.project_name?.toLowerCase() || '').includes(pettyCashSearch.toLowerCase())
      const matchesType = pettyCashTypeFilter === 'All' || t.transaction_type === pettyCashTypeFilter
      return matchesSearch && matchesType
    })
  }, [pettyCashTransactions, pettyCashSearch, pettyCashTypeFilter])

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
  const bankInputRef = useRef<HTMLInputElement | null>(null)
  const projectCreateRef = useRef<(() => void) | null>(null)
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
        console.error('Failed to fetch cards', r.status)
        return
      }
      const data = await r.json()
      setCards(data.cards || [])
    } catch (err) {
      console.error('Error fetching cards:', err)
    }
  }, [accessToken])

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
  useEffect(() => {
    if (selectedAccountForCards) {
      fetchCards()
    }
  }, [selectedAccountForCards, fetchCards])
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
        const errData = await r.json().catch(() => ({}))
        toast.error(errData.error || 'Failed to save card')
        return
      }
      await fetchCards()
      setCardModalOpen(false)
      resetCardForm()
      toast.success('Card saved successfully')
    } catch {
      toast.error('Failed to save card')
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

    const payload = {
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
    }

    setSaving(true)
    try {
      const isEdit = !!editingPayable
      const r = await fetch(
        isEdit ? `${API_URL}/payables/${editingPayable!.payable_id}` : `${API_URL}/payables`,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body: JSON.stringify(payload)
        }
      )
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
        setEditingPayable(null)
        fetchPayables()
        if (billType === 'PETTY_CASH') fetchPettyCashBalance()
        toast.success(isEdit ? 'Bill updated' : 'Bill created')
      } else {
        const errData = await r.json().catch(() => ({})) as { error?: string }
        toast.error(errData.error || (editingPayable ? 'Failed to update bill' : 'Failed to create bill'))
      }
    } catch (e) {
      console.error(e)
      toast.error(editingPayable ? 'Error updating bill' : 'Error creating bill')
    } finally {
      setSaving(false)
    }
  }

  const handleEditPayable = (p: Payable) => {
    setEditingPayable(p)
    setBillVendorId(String(p.vendor_id || ''))
    setBillName(p.payable_name)
    setBillDescription(p.description || '')
    setBillType(p.payable_type)
    setBillAmount(String(p.amount))
    setBillFrequency(p.frequency || '')
    setBillStartDate(p.start_date ? p.start_date.slice(0, 10) : '')
    setBillEndDate(p.end_date ? p.end_date.slice(0, 10) : '')
    setBillProjectId(String(p.project_id || ''))
    setBillIsActive(p.is_active)
    setBillBankAccountId(String(p.bank_account_id || ''))
    setBillPaymentMethod(p.payment_method || '')
    setBillReferenceNumber(p.reference_number || '')
    setIsNewPayableName(false)
    setIsAddingBill(true)
  }

  const handleDeletePayable = async (p: Payable) => {
    const confirmed = await confirm(`Delete bill "${p.payable_name}"? This cannot be undone.`, { destructive: true })
    if (!confirmed) return
    try {
      const r = await fetch(`${API_URL}/payables/${p.payable_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      if (r.ok) {
        toast.success('Bill deleted')
        fetchPayables()
      } else {
        toast.error('Failed to delete bill')
      }
    } catch {
      toast.error('Error deleting bill')
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
    setCustomBankMode(false)
    setCustomBankLogoUrl('')
    setBankDropdownOpen(false)
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
      fetchPettyCashTransactions()
      fetchAccounts()
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
    <div className="erp-root" style={{ height: '100vh', width: '100%', padding: '10px', boxSizing: 'border-box', display: 'grid', gridTemplateRows: '56px 1fr', background: 'transparent', color: 'var(--text-main)', overflow: 'hidden', borderRadius: '18px', gap: '10px' }}>
      <header className="glass-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 16, zIndex: 101, flexShrink: 0, borderRadius: '14px' }}>

        {/* ── Hamburger (mobile only) ── */}
        {isMobile && (
          <button
            onClick={() => setMobileNavOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)', color: '#f0f6ff', cursor: 'pointer', flexShrink: 0 }}
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        {/* ── Brand ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <img
            src="/BLOOM_AUDIT_LOGO_XS.png"
            alt="Bloom Audit"
            style={{ height: 34, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
          />
          <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
          <div>
            <div style={{
              fontFamily: "'Zalando Sans Expanded', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              color: '#f0f6ff',
              lineHeight: 1.15,
              letterSpacing: '-0.2px',
            }}>
              Bloom Audit
            </div>
            <div style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.3)',
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}>
              Enterprise ERP
            </div>
          </div>
        </div>

        {/* ── Right: user chip + logout ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

          {/* User pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 40,
            padding: '5px 14px 5px 5px',
          }}>
            {/* Initials avatar */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              letterSpacing: '0.5px',
              boxShadow: '0 2px 8px rgba(37,99,235,0.45)',
            }}>
              {user.name.split(' ').map((n: string) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
            </div>
            {!isMobile && <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f6ff', marginBottom: 2 }}>
                {user.name}
              </div>
              <div style={{ fontSize: 10, color: '#4a6fa5', fontWeight: 500 }}>
                {(user.roleNames && user.roleNames.length > 0 ? user.roleNames.join(', ') : user.roleName) || 'No Role'}
              </div>
            </div>}
          </div>

          {/* Logout button */}
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid rgba(239,68,68,0.22)',
              background: 'rgba(239,68,68,0.06)',
              color: '#fca5a5',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.18s, border-color 0.18s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.16)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.42)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.22)'
            }}
          >
            <LogOut size={14} />
            {!isMobile && 'Logout'}
          </button>
        </div>
      </header>
      <main style={{ height: '100%', padding: 0, display: 'flex', overflow: 'hidden', borderRadius: 0, gap: '10px', position: 'relative' }}>
        {/* Mobile backdrop */}
        {isMobile && (
          <div
            className={`mob-sidebar-backdrop${mobileNavOpen ? ' mob-open' : ''}`}
            onClick={() => setMobileNavOpen(false)}
          />
        )}
        <aside className={`glass-sidebar${isMobile && mobileNavOpen ? ' mob-open' : ''}`} style={{ width: isMobile ? 240 : (navOpen ? 240 : 64), transition: isMobile ? undefined : 'width 0.25s ease', height: '100%', display: isMobile ? undefined : 'flex', flexDirection: 'column', padding: '8px', gap: 1, flexShrink: 0, overflowX: 'hidden', borderRadius: isMobile ? undefined : '14px' }}>

          {/* ── Decorative background icons ── */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
            <BarChart3   size={160} style={{ position: 'absolute', bottom: '4%',  right: '-30px', opacity: 0.07,  color: '#3b82f6', transform: 'rotate(-8deg)' }} />
            <TrendingUp  size={130} style={{ position: 'absolute', top: '16%',   right: '-20px', opacity: 0.065, color: '#60a5fa', transform: 'rotate(6deg)'  }} />
            <Landmark    size={120} style={{ position: 'absolute', top: '38%',   left: '-14px',  opacity: 0.065, color: '#93c5fd', transform: 'rotate(-4deg)' }} />
            <Banknote    size={110} style={{ position: 'absolute', bottom: '26%',left: '-12px',  opacity: 0.06,  color: '#3b82f6', transform: 'rotate(8deg)'  }} />
            <Coins       size={90}  style={{ position: 'absolute', top: '60%',   right: '-8px',  opacity: 0.055, color: '#7dd3fc'                              }} />
            <Building2   size={100} style={{ position: 'absolute', top: '4%',    left: '-10px',  opacity: 0.055, color: '#93c5fd', transform: 'rotate(-6deg)' }} />
          </div>

          {/* ── HOME ── */}
          <button
            onClick={() => { setTab('home'); setMobileNavOpen(false) }}
            title="Home"
            className={`nav-item${tab === 'home' ? ' nav-item-active' : ''}`}
            style={{ justifyContent: navOpen ? 'flex-start' : 'center' }}
          >
            <LayoutDashboard size={19} style={{ flexShrink: 0 }} />
            {navOpen && <span>Home</span>}
          </button>

          {/* ── WORKFORCE ── */}
          {hasAnyPermission(user, [
            { resource: 'employees', action: 'read' },
            { resource: 'vendors', action: 'read' },
          ]) && (<>
            {navOpen && <div className="nav-section-label">Workforce</div>}
            <div
              onClick={() => { setTab('employees'); setMobileNavOpen(false) }}
              className={`nav-section-item${tab === 'employees' ? ' nav-section-item-active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', gap: 10, width: '100%', color: tab === 'employees' ? '#f0f6ff' : '#7aa3d4', fontSize: '0.875rem', fontWeight: 500, justifyContent: navOpen ? 'flex-start' : 'center' }}>
                <Users size={19} style={{ flexShrink: 0 }} />
                {navOpen && <><span style={{ flex: 1 }}>Employees</span><ChevronDown size={14} style={{ transform: tab === 'employees' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} /></>}
              </div>
            </div>
            {tab === 'employees' && (<>
              {hasPermission(user, 'employees', 'read') && (
                <button onClick={() => setEmployeeSubTab('employees')} title="Employee List" className={`nav-sub-item${employeeSubTab === 'employees' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                  <ClipboardList size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Employee List</span>}
                </button>
              )}
              {hasPermission(user, 'vendors', 'read') && (
                <button onClick={() => { setEmployeeSubTab('vendors'); setIsAddingVendor(false) }} title="Vendors" className={`nav-sub-item${employeeSubTab === 'vendors' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                  <Store size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Vendors</span>}
                </button>
              )}
              <button onClick={() => setEmployeeSubTab('pto')} title="Time Off" className={`nav-sub-item${employeeSubTab === 'pto' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <Calendar size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Time Off</span>}
              </button>
            </>)}
          </>)}

          {/* ── PROJECTS ── */}
          {hasPermission(user, 'projects', 'read') && (<>
            {navOpen && <div className="nav-section-label">Projects</div>}
            <div
              onClick={() => { setTab('projects'); setMobileNavOpen(false) }}
              className={`nav-section-item${tab === 'projects' ? ' nav-section-item-active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', gap: 10, width: '100%', color: tab === 'projects' ? '#f0f6ff' : '#7aa3d4', fontSize: '0.875rem', fontWeight: 500, justifyContent: navOpen ? 'flex-start' : 'center' }}>
                <FolderOpen size={19} style={{ flexShrink: 0 }} />
                {navOpen && <><span style={{ flex: 1 }}>Projects</span><ChevronDown size={14} style={{ transform: tab === 'projects' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} /></>}
              </div>
            </div>
            {tab === 'projects' && (<>
              <button onClick={() => setProjectSubTab('projects')} title="Projects & Contracts" className={`nav-sub-item${projectSubTab === 'projects' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <ClipboardList size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Projects &amp; Contracts</span>}
              </button>
              <button onClick={() => setProjectSubTab('time')} title="Project Time" className={`nav-sub-item${projectSubTab === 'time' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <Clock size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Project Time</span>}
              </button>
              {hasAnyPermission(user, [{ resource: 'quotes', action: 'manage' }, { resource: 'quotes', action: 'read' }]) && (
                <button onClick={() => setProjectSubTab('quotes')} title="Quote Generator" className={`nav-sub-item${projectSubTab === 'quotes' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                  <FileSignature size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Quote Generator</span>}
                </button>
              )}
            </>)}
          </>)}

          {/* ── FINANCE / ACCOUNTING ── */}
          {hasAnyPermission(user, [
            { resource: 'accounts', action: 'read' },
            { resource: 'payables', action: 'read' },
            { resource: 'receivables', action: 'read' },
            { resource: 'petty_cash', action: 'read' },
            { resource: 'assets', action: 'read' },
            { resource: 'subscriptions', action: 'read' },
            { resource: 'purchase_orders', action: 'read' },
            { resource: 'payroll', action: 'view_all' },
            { resource: 'loans', action: 'read' },
          ]) && (<>
            {navOpen && <div className="nav-section-label">Finance</div>}
            <div
              onClick={() => { setTab('accounting'); setMobileNavOpen(false) }}
              className={`nav-section-item${tab === 'accounting' ? ' nav-section-item-active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center', padding: '9px 14px', gap: 10, width: '100%', color: tab === 'accounting' ? '#f0f6ff' : '#7aa3d4', fontSize: '0.875rem', fontWeight: 500, justifyContent: navOpen ? 'flex-start' : 'center' }}>
                <Banknote size={19} style={{ flexShrink: 0 }} />
                {navOpen && <><span style={{ flex: 1 }}>Accounting</span><ChevronDown size={14} style={{ transform: tab === 'accounting' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} /></>}
              </div>
            </div>
            {tab === 'accounting' && (<>
              <button onClick={() => { setAccountingSubTab('accounts'); setIsAddingBill(false); setIsReplenishing(false); setIsAddingReceivable(false) }} title="Accounts" className={`nav-sub-item${accountingSubTab === 'accounts' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <Landmark size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Accounts</span>}
              </button>
              <button onClick={() => { setAccountingSubTab('payable'); setIsAddingBill(false) }} title="Payable" className={`nav-sub-item${accountingSubTab === 'payable' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <Receipt size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Payable</span>}
              </button>
              <button onClick={() => { setAccountingSubTab('petty_cash'); setBillType('PETTY_CASH'); setIsAddingBill(false); setIsReplenishing(false) }} title="Petty Cash" className={`nav-sub-item${accountingSubTab === 'petty_cash' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <Coins size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Petty Cash</span>}
              </button>
              <button onClick={() => { setAccountingSubTab('receivable'); setIsAddingReceivable(false) }} title="Receivable" className={`nav-sub-item${accountingSubTab === 'receivable' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <Inbox size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Receivable</span>}
              </button>
              <button onClick={() => setAccountingSubTab('subscriptions')} title="Subscriptions" className={`nav-sub-item${accountingSubTab === 'subscriptions' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <Repeat size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Subscriptions</span>}
              </button>
              <button onClick={() => setCardModalOpen(true)} title="Card Management" className="nav-sub-item" style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <CreditCard size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Card Management</span>}
              </button>
              <button onClick={() => setAccountingSubTab('purchase_orders')} title="Purchase Orders" className={`nav-sub-item${accountingSubTab === 'purchase_orders' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <ShoppingCart size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Purchase Orders</span>}
              </button>
              <button onClick={() => setAccountingSubTab('payroll')} title="Payroll" className={`nav-sub-item${accountingSubTab === 'payroll' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <DollarSign size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Payroll</span>}
              </button>
              <button onClick={() => setAccountingSubTab('assets')} title="Assets" className={`nav-sub-item${accountingSubTab === 'assets' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <Building2 size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Assets</span>}
              </button>
              <button onClick={() => setAccountingSubTab('loans')} title="Loans" className={`nav-sub-item${accountingSubTab === 'loans' ? ' nav-sub-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center', paddingLeft: navOpen ? undefined : 14 }}>
                <TrendingDown size={16} style={{ flexShrink: 0 }} />{navOpen && <span>Loans</span>}
              </button>
            </>)}
          </>)}

          {/* ── TOOLS ── */}
          {navOpen && <div className="nav-section-label">Tools</div>}
          <button onClick={() => { setTab('documents'); setMobileNavOpen(false) }} title="Document Bank" className={`nav-item${tab === 'documents' ? ' nav-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center' }}>
            <FileText size={19} style={{ flexShrink: 0 }} />{navOpen && <span>Document Bank</span>}
          </button>
          <button onClick={() => { setTab('analytics'); setMobileNavOpen(false) }} title="Data Analytics" className={`nav-item${tab === 'analytics' ? ' nav-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center' }}>
            <BarChart3 size={19} style={{ flexShrink: 0 }} />{navOpen && <span>Data Analytics</span>}
          </button>
          {hasPermission(user, 'settings', 'manage') && (
            <button onClick={() => { setTab('settings'); setMobileNavOpen(false) }} title="Settings" className={`nav-item${tab === 'settings' ? ' nav-item-active' : ''}`} style={{ justifyContent: navOpen ? 'flex-start' : 'center' }}>
              <SettingsIcon size={19} style={{ flexShrink: 0 }} />{navOpen && <span>Settings</span>}
            </button>
          )}

          {/* ── COLLAPSE TOGGLE (desktop only) ── */}
          {!isMobile && (
            <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setNavOpen(o => !o)}
                title={navOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                className="nav-item"
                style={{ justifyContent: navOpen ? 'flex-start' : 'center' }}
              >
                {navOpen ? <ChevronLeft size={18} style={{ flexShrink: 0 }} /> : <ChevronRight size={18} style={{ flexShrink: 0 }} />}
                {navOpen && <span>Collapse</span>}
              </button>
            </div>
          )}
        </aside>
        <section className="content-section" style={{ flex: 1, overflowY: tab === 'home' ? 'hidden' : 'auto', display: tab === 'home' ? 'flex' : 'block', flexDirection: 'column', background: tab === 'home' ? 'linear-gradient(160deg, #f0f4ff 0%, #f5f3ff 35%, #eff6ff 65%, #f0fdf8 100%)' : 'linear-gradient(180deg, #041525 0%, #0d1f3c 18%, #ffffff 100%)', borderRadius: '14px', border: 'none', padding: isMobile ? 10 : 24, position: 'relative' }}>
          {tab === 'home' && (() => {
            const hr = new Date().getHours()
            const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'
            const displayName = user.name || user.email.split('@')[0]
            const avatarLetter = (user.name || user.email).slice(0, 1).toUpperCase()
            const roleList = user.roleNames && user.roleNames.length > 0 ? user.roleNames : user.roleName ? [user.roleName] : []
            const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
            return (
              <div className="home-light" style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 0 }}>

                {/* ── Hero Banner ── */}
                <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', borderRadius: 16, padding: isMobile ? '14px 16px' : '18px 26px', position: 'relative', overflow: 'hidden', zIndex: 1, flexShrink: 0 }}>
                  {/* Dot texture */}
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.5px)', backgroundSize: '22px 22px', pointerEvents: 'none' }} />
                  {/* Ambient glow — top right */}
                  <div style={{ position: 'absolute', top: -100, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 70%)', pointerEvents: 'none' }} />
                  {/* Ambient glow — bottom left */}
                  <div style={{ position: 'absolute', bottom: -80, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    {/* Left: avatar + greeting */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', border: '2px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.25)' }}>
                        {avatarLetter}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.50)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 5 }}>{greeting}</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>{displayName}</div>
                        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.50)' }}>Your command center — tasks, notes, and real-time overview</div>
                      </div>
                    </div>

                    {/* Right: date + roles */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={13} style={{ color: 'rgba(255,255,255,0.40)' }} />
                        {dateLabel}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {roleList.map((r, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 99, background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', color: '#fff', fontSize: 11.5, fontWeight: 700 }}>
                            <LayoutDashboard size={10} style={{ opacity: 0.7 }} />{r}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.38)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <User size={11} style={{ opacity: 0.6 }} />{user.email}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Widgets ── */}
                <div style={{ position: 'relative', zIndex: 1, borderRadius: 16, overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ background: 'linear-gradient(160deg,#f5f3ff 0%,#eff6ff 50%,#f0fdf4 100%)', padding: isMobile ? '14px 14px 20px' : '20px 22px 24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: isMobile ? 16 : 20, alignItems: 'start', flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <HomeProductivityWidget userId={user.id} accessToken={accessToken} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: isMobile ? '100%' : 300 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live Clocks</div>
                      <SystemClock />
                      <InternationalClock timezone={internationalTimezone} />
                    </div>
                  </div>
                </div>

              </div>
            )
          })()}
          {tab === 'employees' && employeeSubTab === 'employees' && (
            <div style={{ width: '100%', display: 'grid', gap: 16, position: 'relative', overflow: 'hidden' }}>

              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <Users       size={220} style={{ position: 'absolute', top: '-30px',  right: '-40px',  opacity: 0.06, color: '#3b82f6', transform: 'rotate(-8deg)'  }} />
                <UserCheck   size={160} style={{ position: 'absolute', top: '40px',   right: '120px',  opacity: 0.04, color: '#60a5fa', transform: 'rotate(5deg)'   }} />
                <Briefcase   size={180} style={{ position: 'absolute', top: '-20px',  right: '300px',  opacity: 0.04, color: '#93c5fd', transform: 'rotate(-5deg)'  }} />
                <Award       size={140} style={{ position: 'absolute', top: '10px',   left: '40%',     opacity: 0.035,color: '#7dd3fc', transform: 'rotate(8deg)'   }} />
                <ClipboardList size={130} style={{ position: 'absolute', top: '-10px', left: '20%',    opacity: 0.035,color: '#60a5fa', transform: 'rotate(-6deg)'  }} />
                <Building2   size={150} style={{ position: 'absolute', top: '20px',   left: '-20px',   opacity: 0.04, color: '#3b82f6', transform: 'rotate(4deg)'   }} />
              </div>

              <div className="page-header" style={{ position: 'relative', zIndex: 1 }}>
                <div>
                  <div className="page-badge">Workforce</div>
                  <div className="page-title-row">
                    <Users size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Employee Management</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Manage personnel records, roles, designations, and team structure</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    className={`add-emp-btn${addBtnPop ? ' popping' : ''}`}
                    style={{ marginTop: 6 }}
                    onClick={() => { setAddBtnPop(true); setAddOpen(true) }}
                    onAnimationEnd={() => setAddBtnPop(false)}
                  >
                    <span className="btn-icon"><Plus size={13} /></span>
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
              
              {/* ── Filter bar ── */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '5px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflowX: 'auto' }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
                  <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input type="text" placeholder="Search name, email, NIC…" value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)}
                    style={{ width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6, borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12.5, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ width: 1, height: 20, background: '#e2e8f0', flexShrink: 0 }} />
                {/* Role */}
                <select value={employeeRoleFilter} onChange={e => setEmployeeRoleFilter(e.target.value)}
                  style={{ padding: '5px 6px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12, color: '#334155', background: '#f8fafc', cursor: 'pointer', flexShrink: 0, fontWeight: employeeRoleFilter !== 'All' ? 600 : 400, maxWidth: 110 }}>
                  <option value="All">All Roles</option>
                  <option value="IT">IT</option>
                  <option value="Accounting">Accounting</option>
                  <option value="Marketing">Marketing</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="Management">Management</option>
                </select>
                {/* Designation */}
                <select value={employeeDesignationFilter} onChange={e => setEmployeeDesignationFilter(e.target.value)}
                  style={{ padding: '5px 6px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12, color: '#334155', background: '#f8fafc', cursor: 'pointer', flexShrink: 0, fontWeight: employeeDesignationFilter !== 'All' ? 600 : 400, maxWidth: 130 }}>
                  <option value="All">All Designations</option>
                  {employeeDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div style={{ width: 1, height: 20, background: '#e2e8f0', flexShrink: 0 }} />
                {/* Sort */}
                <select value={employeeSortBy} onChange={e => setEmployeeSortBy(e.target.value)}
                  style={{ padding: '5px 6px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12, color: '#334155', background: '#f8fafc', cursor: 'pointer', flexShrink: 0, maxWidth: 110 }}>
                  <option value="name_asc">Name A→Z</option>
                  <option value="name_desc">Name Z→A</option>
                  <option value="emp_num">Employee #</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
                {/* Count + Clear */}
                <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 20, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {filteredEmployees.length}/{employees.length}
                </div>
                {(employeeSearch || employeeRoleFilter !== 'All' || employeeDesignationFilter !== 'All' || employeeSortBy !== 'name_asc') && (
                  <button onClick={() => { setEmployeeSearch(''); setEmployeeRoleFilter('All'); setEmployeeDesignationFilter('All'); setEmployeeSortBy('name_asc') }}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #fca5a5', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    ✕ Clear
                  </button>
                )}
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
                  {filteredEmployees.map(emp => {
                    const initials = `${emp.first_name?.[0] ?? ''}${emp.last_name?.[0] ?? ''}`.toUpperCase()
                    const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
                    const colorIdx = (emp.first_name.charCodeAt(0) + (emp.last_name.charCodeAt(0) ?? 0)) % avatarColors.length
                    const accentColor = avatarColors[colorIdx]
                    const roleLabel = [emp.role, emp.designation].filter(Boolean).join('  ·  ')
                    return (
                      <div
                        key={emp.employee_id}
                        onClick={() => openEmployeeDetails(emp)}
                        style={{
                          background: 'linear-gradient(160deg, #ffffff 60%, #f4f7ff 100%)',
                          border: '1px solid #e8edf5',
                          borderRadius: 16,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          transition: 'box-shadow 0.2s, transform 0.2s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(6,48,98,0.14)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                      >
                        {/* Colored top accent bar */}
                        <div style={{ height: 4, background: accentColor, flexShrink: 0 }} />

                        {/* Main body */}
                        <div style={{ padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>

                          {/* Emp # badge — top right */}
                          <div style={{ position: 'absolute', top: 14, right: 12 }}>
                            <span style={{ background: 'rgba(0,0,0,0.05)', borderRadius: 20, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: '#64748b', letterSpacing: 0.4 }}>
                              #{emp.employee_number}
                            </span>
                          </div>

                          {/* Avatar + name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: '50%',
                              background: accentColor,
                              boxShadow: `0 0 0 3px ${accentColor}28`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0, letterSpacing: 0.5
                            }}>
                              {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                                {emp.first_name} {emp.last_name}
                              </div>
                              {roleLabel && (
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {roleLabel}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Role pill */}
                          {emp.role && (
                            <div>
                              <span style={{ background: `${accentColor}18`, color: accentColor, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                                {emp.role}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Contact footer */}
                        <div style={{ background: '#f8fafc', borderTop: '1px solid #eef2f7', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#475569', overflow: 'hidden' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.2" style={{ flexShrink: 0 }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#475569' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.2" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.3a16 16 0 0 0 5.79 5.79l.96-.96a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              <span>{emp.phone || '—'}</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {tab === 'employees' && employeeSubTab === 'vendors' && (
            <div style={{ width: '100%', display: 'grid', gap: 16 }}>
              {/* Page header */}
              <div className="page-header">
                <div>
                  <div className="page-badge">Vendors</div>
                  <div className="page-title-row">
                    <Store size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Vendor Management</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Maintain supplier relationships, contracts, and payment records</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    className={`add-emp-btn${addVendorBtnPop ? ' popping' : ''}`}
                    style={{ marginTop: 6 }}
                    onClick={() => { setAddVendorBtnPop(true); setIsAddingVendor(true) }}
                    onAnimationEnd={() => setAddVendorBtnPop(false)}
                  >
                    <span className="btn-icon"><Plus size={13} /></span>
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

              {/* Filter bar */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '5px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', overflowX: 'auto' }}>
                <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
                  <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input type="text" placeholder="Search name, email, phone…" value={vendorSearch} onChange={e => setVendorSearch(e.target.value)}
                    style={{ width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6, borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12.5, color: '#1e293b', background: '#f8fafc', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ width: 1, height: 20, background: '#e2e8f0', flexShrink: 0 }} />
                <select value={vendorStatusFilter} onChange={e => setVendorStatusFilter(e.target.value)}
                  style={{ padding: '5px 6px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12, color: '#334155', background: '#f8fafc', cursor: 'pointer', flexShrink: 0, maxWidth: 120, fontWeight: vendorStatusFilter !== 'All' ? 600 : 400 }}>
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <div style={{ width: 1, height: 20, background: '#e2e8f0', flexShrink: 0 }} />
                <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)', borderRadius: 20, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {filteredVendors.length}/{vendors.length}
                </div>
                {(vendorSearch || vendorStatusFilter !== 'All') && (
                  <button onClick={() => { setVendorSearch(''); setVendorStatusFilter('All') }}
                    style={{ padding: '5px 10px', borderRadius: 7, border: '1.5px solid #fca5a5', background: 'rgba(239,68,68,0.06)', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    ✕ Clear
                  </button>
                )}
              </div>

              {/* Vendor list */}
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
                <div style={{ padding: 24, textAlign: 'center', background: '#f5f5f5', borderRadius: 8 }}>No matching vendors found.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
                  {filteredVendors.map(v => {
                    const words = v.vendor_name.trim().split(/\s+/)
                    const initials = words.slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                    const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
                    const accentColor = avatarColors[v.vendor_name.charCodeAt(0) % avatarColors.length]
                    return (
                      <div
                        key={v.vendor_id}
                        style={{
                          background: 'linear-gradient(160deg, #ffffff 60%, #f4f7ff 100%)',
                          border: '1px solid #e8edf5',
                          borderRadius: 16,
                          overflow: 'hidden',
                          cursor: 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          transition: 'box-shadow 0.2s, transform 0.2s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(6,48,98,0.14)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
                      >
                        {/* Colored top accent bar */}
                        <div style={{ height: 4, background: accentColor, flexShrink: 0 }} />

                        {/* Main body */}
                        <div style={{ padding: '16px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                          {/* Status badge — top right */}
                          <div style={{ position: 'absolute', top: 14, right: 12 }}>
                            <span style={{ background: v.is_active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)', borderRadius: 20, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, color: v.is_active ? '#059669' : '#dc2626', letterSpacing: 0.4 }}>
                              {v.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          {/* Avatar + name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 48, height: 48, borderRadius: '50%',
                              background: accentColor,
                              boxShadow: `0 0 0 3px ${accentColor}28`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0, letterSpacing: 0.5
                            }}>
                              {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                                {v.vendor_name}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>
                                Since {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>

                          {/* Vendor pill */}
                          <div>
                            <span style={{ background: `${accentColor}18`, color: accentColor, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                              Vendor
                            </span>
                          </div>
                        </div>

                        {/* Contact footer */}
                        <div style={{ background: '#f8fafc', borderTop: '1px solid #eef2f7', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#475569', overflow: 'hidden' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.2" style={{ flexShrink: 0 }}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.contact_email || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#475569' }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.2" style={{ flexShrink: 0 }}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.3a16 16 0 0 0 5.79 5.79l.96-.96a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                              <span>{v.contact_phone || '—'}</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add Vendor Drawer */}
              {isAddingVendor && (
                <>
                  <div onClick={() => { setIsAddingVendor(false); setVendorName(''); setVendorEmail(''); setVendorPhone(''); setVendorIsActive(true) }}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
                  <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)', background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', animation: 'slideInFromRight 0.25s ease' }}>
                    {/* Live header */}
                    {(() => {
                      const words = vendorName.trim().split(/\s+/).filter(Boolean)
                      const liveInitials = words.slice(0, 2).map(w => w[0]).join('').toUpperCase()
                      const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
                      const accentColor = liveInitials ? avatarColors[vendorName.charCodeAt(0) % avatarColors.length] : 'rgba(255,255,255,0.15)'
                      const liveName = vendorName.trim() || 'New Vendor'
                      return (
                        <div style={{ background: 'linear-gradient(135deg, #063062 0%, #0d1f3c 60%, #1a3a6b 100%)', padding: '28px 24px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                          <div style={{ position: 'absolute', top: 20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                          <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                          <div style={{ position: 'absolute', bottom: 10, right: 20, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                            <defs><pattern id="vdotgrid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white"/></pattern></defs>
                            <rect width="100%" height="100%" fill="url(#vdotgrid)"/>
                          </svg>
                          <button onClick={() => { setIsAddingVendor(false); setVendorName(''); setVendorEmail(''); setVendorPhone(''); setVendorIsActive(true) }} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, zIndex: 1 }}>×</button>
                          <div style={{ width: 64, height: 64, borderRadius: '50%', background: accentColor, border: '3px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, position: 'relative', zIndex: 1 }}>
                            {liveInitials ? (
                              <span style={{ color: '#fff', fontWeight: 800, fontSize: 24, letterSpacing: 1 }}>{liveInitials}</span>
                            ) : (
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
                            )}
                          </div>
                          <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 0.2, lineHeight: 1.2, position: 'relative', zIndex: 1 }}>{liveName}</div>
                          <div style={{ marginTop: 5, position: 'relative', zIndex: 1 }}>
                            <span style={{ background: vendorIsActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, color: vendorIsActive ? '#6ee7b7' : '#fca5a5' }}>
                              {vendorIsActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Scrollable body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 12px' }}>

                      {/* Section: Vendor Info */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(6,48,98,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Store size={13} color="#063062" />
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Vendor Info</span>
                        </div>
                        <label style={{ display: 'grid', gap: 5 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Building2 size={11} color="#94a3b8" /> Vendor Name <span style={{ color: '#ef4444' }}>*</span></span>
                          <input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="e.g. Acme Supplies Ltd." style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                            onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                        </label>
                      </div>

                      <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

                      {/* Section: Contact */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(6,48,98,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Mail size={13} color="#063062" />
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Contact</span>
                        </div>
                        <div style={{ display: 'grid', gap: 12 }}>
                          <label style={{ display: 'grid', gap: 5 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Mail size={11} color="#94a3b8" /> Email</span>
                            <input type="email" value={vendorEmail} onChange={e => setVendorEmail(e.target.value)} placeholder="contact@vendor.com" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                              onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                          </label>
                          <label style={{ display: 'grid', gap: 5 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Phone size={11} color="#94a3b8" /> Phone</span>
                            <input type="tel" value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} placeholder="+1 555 000 0000" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                              onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                              onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                          </label>
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

                      {/* Section: Status */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(6,48,98,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <UserCheck size={13} color="#063062" />
                          </div>
                          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Status</span>
                        </div>
                        <div onClick={() => setVendorIsActive(a => !a)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${vendorIsActive ? '#10b981' : '#e2e8f0'}`, background: vendorIsActive ? 'rgba(16,185,129,0.05)' : '#f8fafc', cursor: 'pointer', transition: 'all 0.18s' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>Active Vendor</div>
                            <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>Appears in payables and purchase orders</div>
                          </div>
                          <div style={{ width: 40, height: 22, borderRadius: 11, background: vendorIsActive ? '#10b981' : '#cbd5e1', position: 'relative', flexShrink: 0, transition: 'background 0.18s' }}>
                            <div style={{ position: 'absolute', top: 3, left: vendorIsActive ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: '#fff' }}>
                      <button onClick={() => { setIsAddingVendor(false); setVendorName(''); setVendorEmail(''); setVendorPhone(''); setVendorIsActive(true) }} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                      <button disabled={saving} onClick={handleSaveVendor} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1a4a8a, #063062)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(6,48,98,0.3)' }}>
                        {saving ? 'Saving...' : <><Plus size={15} /> Add Vendor</>}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {tab === 'projects' && projectSubTab === 'projects' && (
            <div>
              <div className="page-header">
                <div>
                  <div className="page-badge">Projects</div>
                  <div className="page-title-row">
                    <FolderOpen size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Projects &amp; Contracts</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Track timelines, budgets, milestones, and client contracts</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    className="add-emp-btn"
                    style={{ marginTop: 6 }}
                    onClick={() => projectCreateRef.current?.()}
                  >
                    <span className="add-emp-btn-icon"><Plus size={15} strokeWidth={2.5} /></span>
                    <span>Create Project</span>
                  </button>
                </div>
              </div>
              <Projects onRegisterCreate={(h) => { projectCreateRef.current = h }} />
            </div>
          )}
          {tab === 'projects' && projectSubTab === 'time' && (
            <div>
              <div className="page-header">
                <div>
                  <div className="page-badge">Time Tracking</div>
                  <div className="page-title-row">
                    <Clock size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Project Time</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Log and review billable time entries across all active projects</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {([
                    { key: 'summary' as const,  label: 'Summary' },
                    { key: 'timer' as const,    label: 'Live Timer' },
                    { key: 'manual' as const,   label: 'Manual Entry' },
                    { key: 'entries' as const,  label: 'My Entries' },
                    ...((user.roleNames?.some(r => r === 'Admin' || r === 'Manager') || user.roleName === 'Admin' || user.roleName === 'Manager') ? [{ key: 'approval' as const, label: 'Approval' }] : []),
                  ] as { key: ProjectTimeTabType; label: string }[]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setProjectTimeTab(key)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                        background: projectTimeTab === key ? 'linear-gradient(135deg, #1a4a8a 0%, #063062 100%)' : '#f1f5f9',
                        border: projectTimeTab === key ? 'none' : '1.5px solid #e2e8f0',
                        color: projectTimeTab === key ? '#fff' : '#475569',
                        boxShadow: projectTimeTab === key ? '0 3px 10px rgba(6,48,98,0.3)' : 'none',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <ProjectTime
                userId={user.id}
                isManager={user.roleNames?.some(r => r === 'Admin' || r === 'Manager' || r === 'Super Admin') || user.roleName === 'Admin' || user.roleName === 'Manager' || false}
                activeTab={projectTimeTab}
                setActiveTab={setProjectTimeTab}
              />
            </div>
          )}
          {tab === 'projects' && projectSubTab === 'quotes' && (
            <div>
              <div className="page-header">
                <div>
                  <div className="page-badge">Proposals</div>
                  <div className="page-title-row">
                    <FileSignature size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Quote Generator</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Create, configure, and send professional project proposals to clients</p>
                </div>
              </div>
              <QuoteGenerator />
            </div>
          )}
          {tab === 'accounting' && accountingSubTab === 'payable' && (
            <div style={{ width: '100%', display: 'grid', gap: 16, position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <Receipt      size={220} style={{ position: 'absolute', top: '-30px',  right: '-40px',  opacity: 0.06, color: '#3b82f6', transform: 'rotate(-8deg)'  }} />
                <CreditCard   size={160} style={{ position: 'absolute', top: '40px',   right: '120px',  opacity: 0.04, color: '#60a5fa', transform: 'rotate(5deg)'   }} />
                <Banknote     size={180} style={{ position: 'absolute', top: '-20px',  right: '300px',  opacity: 0.04, color: '#93c5fd', transform: 'rotate(-5deg)'  }} />
                <TrendingDown size={140} style={{ position: 'absolute', top: '10px',   left: '40%',     opacity: 0.035,color: '#7dd3fc', transform: 'rotate(8deg)'   }} />
                <Store        size={130} style={{ position: 'absolute', top: '-10px',  left: '20%',     opacity: 0.035,color: '#60a5fa', transform: 'rotate(-6deg)'  }} />
                <Landmark     size={150} style={{ position: 'absolute', top: '20px',   left: '-20px',   opacity: 0.04, color: '#3b82f6', transform: 'rotate(4deg)'   }} />
              </div>
              {/* Content sits above decorative layer */}
              <div style={{ position: 'relative', zIndex: 1, display: 'contents' }}>
                  <div className="page-header">
                    <div>
                      <div className="page-badge">Payable</div>
                      <div className="page-title-row">
                        <Receipt size={22} className="page-title-icon" />
                        <div className="page-title-oval">
                          <h1 className="page-title">Accounts Payable</h1>
                        </div>
                      </div>
                      <p className="page-subtitle">Track outstanding bills, vendor invoices, and scheduled payments</p>
                    </div>
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

                  <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                    <input
                      type="text"
                      placeholder="Search payables..."
                      value={payableSearch}
                      onChange={e => setPayableSearch(e.target.value)}
                      style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', flex: 1, outline: 'none', fontSize: 13.5, fontFamily: 'inherit' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                    />
                    <select
                      value={payableTypeFilter}
                      onChange={e => setPayableTypeFilter(e.target.value)}
                      style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      <option value="All">All Types</option>
                      <option value="ONE_TIME">One Time</option>
                      <option value="RECURRING">Recurring</option>
                      <option value="PETTY_CASH">Petty Cash</option>
                    </select>
                    <select
                      value={payableStatusFilter}
                      onChange={e => setPayableStatusFilter(e.target.value)}
                      style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      <option value="All">All Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Summary stat cards */}
                  {!payablesLoading && payables.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: 12, marginBottom: 4 }}>
                      {[
                        { label: 'Total Bills', value: filteredPayables.length, icon: <Receipt size={18} color="#063062" />, bg: 'rgba(6,48,98,0.06)', color: '#063062' },
                        { label: 'Active Bills', value: filteredPayables.filter(p => p.is_active).length, icon: <CheckCircle size={18} color="#16a34a" />, bg: 'rgba(22,163,74,0.07)', color: '#16a34a' },
                        { label: 'Total Amount', value: `$${filteredPayables.reduce((s, p) => s + Number(p.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <DollarSign size={18} color="#0ea5e9" />, bg: 'rgba(14,165,233,0.07)', color: '#0369a1' },
                      ].map(card => (
                        <div key={card.label} style={{ background: card.bg, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${card.bg}` }}>
                          <div style={{ width: 36, height: 36, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0 }}>{card.icon}</div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: card.color, lineHeight: 1.2 }}>{card.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {payablesLoading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTop: '3px solid #063062', animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                      Loading payables…
                    </div>
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
                      <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0', color: '#94a3b8', fontSize: 14 }}>
                        No bills found matching your filters.
                      </div>
                    )
                  ) : (
                    <div style={{ width: '100%', overflowX: 'auto', borderRadius: 12, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', background: '#fff' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                            <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vendor</th>
                            <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Payable Name</th>
                            <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Type</th>
                            <th style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Amount</th>
                            <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Date Range</th>
                            <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Payment</th>
                            <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</th>
                            <th style={{ padding: '11px 16px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPayables.map((p, idx) => {
                            const vendorName = vendors.find(v => v.vendor_id === p.vendor_id)?.vendor_name || (p.vendor_id ? `#${p.vendor_id}` : '—')
                            const startFmt = p.start_date ? new Date(p.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : null
                            const endFmt = p.end_date ? new Date(p.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : null
                            const typeConfig = p.payable_type === 'RECURRING'
                              ? { label: 'Recurring', bg: 'rgba(99,102,241,0.1)', color: '#6366f1' }
                              : p.payable_type === 'PETTY_CASH'
                              ? { label: 'Petty Cash', bg: 'rgba(234,88,12,0.1)', color: '#ea580c' }
                              : { label: 'One Time', bg: 'rgba(6,48,98,0.08)', color: '#063062' }
                            return (
                              <tr key={p.payable_id} style={{ borderBottom: idx < filteredPayables.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.12s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' }}>{vendorName}</td>
                                <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                                  <div style={{ color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.payable_name}>{p.payable_name}</div>
                                  {p.description && <div style={{ color: '#94a3b8', fontSize: 11.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.description}>{p.description}</div>}
                                  {p.frequency && <div style={{ color: '#6366f1', fontSize: 11, marginTop: 1 }}>{p.frequency.charAt(0) + p.frequency.slice(1).toLowerCase()}</div>}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: typeConfig.bg, color: typeConfig.color, whiteSpace: 'nowrap' }}>
                                    {typeConfig.label}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                  ${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                                  {startFmt ? (endFmt ? `${startFmt} → ${endFmt}` : startFmt) : '—'}
                                </td>
                                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12.5 }}>
                                  {p.payment_method ? (
                                    <div>
                                      <div style={{ fontWeight: 600, color: '#475569' }}>{p.payment_method === 'BANK_TRANSFER' ? 'Bank Transfer' : p.payment_method === 'CHEQUE' ? 'Cheque' : p.payment_method}</div>
                                      {p.reference_number && <div style={{ fontSize: 11.5, color: '#94a3b8' }}>Ref: {p.reference_number}</div>}
                                    </div>
                                  ) : '—'}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                                    background: p.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: p.is_active ? '#16a34a' : '#dc2626',
                                    border: `1px solid ${p.is_active ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                                    {p.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                                    <button
                                      onClick={() => handleEditPayable(p)}
                                      title="Edit bill"
                                      style={{ width: 32, height: 32, padding: 0, borderRadius: 7, border: '1.5px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0, boxSizing: 'border-box' }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dbeafe'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#93c5fd' }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#eff6ff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#bfdbfe' }}
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePayable(p)}
                                      title="Delete bill"
                                      style={{ width: 32, height: 32, padding: 0, borderRadius: 7, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0, boxSizing: 'border-box' }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fee2e2'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#fca5a5' }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#fecaca' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>{/* end display:contents content wrapper */}
            </div>
          )}
          {tab === 'accounting' && accountingSubTab === 'petty_cash' && (
            <div style={{ width: '100%', display: 'grid', gap: 16, position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <Coins       size={220} style={{ position: 'absolute', top: '-30px',  right: '-40px',  opacity: 0.06, color: '#3b82f6', transform: 'rotate(-8deg)'  }} />
                <DollarSign  size={160} style={{ position: 'absolute', top: '40px',   right: '120px',  opacity: 0.04, color: '#60a5fa', transform: 'rotate(5deg)'   }} />
                <Banknote    size={180} style={{ position: 'absolute', top: '-20px',  right: '300px',  opacity: 0.04, color: '#93c5fd', transform: 'rotate(-5deg)'  }} />
                <TrendingUp  size={140} style={{ position: 'absolute', top: '10px',   left: '40%',     opacity: 0.035,color: '#7dd3fc', transform: 'rotate(8deg)'   }} />
                <Coins       size={130} style={{ position: 'absolute', top: '-10px',  left: '20%',     opacity: 0.035,color: '#60a5fa', transform: 'rotate(-6deg)'  }} />
                <DollarSign  size={150} style={{ position: 'absolute', top: '20px',   left: '-20px',   opacity: 0.04, color: '#3b82f6', transform: 'rotate(4deg)'   }} />
              </div>
              {/* Content sits above decorative layer */}
              <div style={{ position: 'relative', zIndex: 1, display: 'contents' }}>
              {/* Header */}
              <div className="page-header">
                <div>
                  <div className="page-badge">Petty Cash</div>
                  <div className="page-title-row">
                    <Coins size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Petty Cash</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Monitor cash disbursements, fund balances, and replenishment requests</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => setIsReplenishing(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px rgba(16,185,129,0.25)' }}>
                    <TrendingUp size={15} /><span>Replenish Funds</span>
                  </button>
                  <button onClick={() => { setBillType('PETTY_CASH'); setIsAddingBill(true) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <Plus size={15} /><span>Add Expense</span>
                  </button>
                </div>
              </div>

              {/* Summary stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: 12 }}>
                {[
                  {
                    label: 'Current Balance',
                    value: `$${(pettyCashBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    icon: <Coins size={18} color="#d97706" />,
                    bg: 'rgba(251,191,36,0.08)',
                    border: 'rgba(251,191,36,0.25)',
                    color: '#b45309',
                  },
                  {
                    label: 'Total Replenishments',
                    value: `$${pettyCashTransactions.filter(t => t.transaction_type === 'REPLENISHMENT').reduce((s, t) => s + Number(t.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    icon: <TrendingUp size={18} color="#10b981" />,
                    bg: 'rgba(16,185,129,0.07)',
                    border: 'rgba(16,185,129,0.2)',
                    color: '#065f46',
                  },
                  {
                    label: 'Total Expenses',
                    value: `$${pettyCashTransactions.filter(t => t.transaction_type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    icon: <TrendingDown size={18} color="#ef4444" />,
                    bg: 'rgba(239,68,68,0.06)',
                    border: 'rgba(239,68,68,0.18)',
                    color: '#991b1b',
                  },
                ].map(card => (
                  <div key={card.label} style={{ background: card.bg, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, border: `1.5px solid ${card.border}` }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', flexShrink: 0 }}>{card.icon}</div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{card.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: card.color, lineHeight: 1.2 }}>{card.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search + filter bar */}
              {pettyCashTransactions.length > 0 && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={pettyCashSearch}
                    onChange={e => setPettyCashSearch(e.target.value)}
                    style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', flex: 1, outline: 'none', fontSize: 13.5, fontFamily: 'inherit' }}
                    onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                  />
                  <select value={pettyCashTypeFilter} onChange={e => setPettyCashTypeFilter(e.target.value)} style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>
                    <option value="All">All Types</option>
                    <option value="REPLENISHMENT">Replenishment</option>
                    <option value="EXPENSE">Expense</option>
                  </select>
                </div>
              )}

              {/* Transaction list */}
              {pettyCashTransactionsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTop: '3px solid #063062', animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  Loading transactions…
                </div>
              ) : pettyCashTransactions.length === 0 ? (
                <ProcessFlowGuidance
                  mode="inline"
                  steps={[
                    { icon: <Landmark size={16} />, label: 'Replenish Funds', onClick: () => setIsReplenishing(true) },
                    { icon: <Receipt size={16} />, label: 'Add Expense', onClick: () => { setBillType('PETTY_CASH'); setIsAddingBill(true) } },
                    { icon: <ClipboardList size={16} />, label: 'Track History' }
                  ]}
                  description="Start by replenishing your petty cash fund from a bank account, then log expenses against it."
                />
              ) : filteredPettyCash.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0', color: '#94a3b8', fontSize: 14 }}>
                  No transactions match your filters.
                </div>
              ) : (
                <div style={{ width: '100%', overflowX: 'auto', borderRadius: 12, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Type</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Description</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Amount</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Date</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Project</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPettyCash.map((t, idx) => {
                        const isIn = t.transaction_type === 'REPLENISHMENT'
                        return (
                          <tr key={t.id} style={{ borderBottom: idx < filteredPettyCash.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                background: isIn ? 'rgba(16,185,129,0.1)' : 'rgba(234,88,12,0.1)',
                                color: isIn ? '#059669' : '#ea580c',
                                border: `1px solid ${isIn ? 'rgba(16,185,129,0.25)' : 'rgba(234,88,12,0.25)'}`,
                                whiteSpace: 'nowrap' as const,
                              }}>
                                {isIn ? 'Replenishment' : 'Expense'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#1e293b', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description || ''}>{t.description || '—'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: isIn ? '#059669' : '#dc2626' }}>
                              {isIn ? '+' : '-'}${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12.5, whiteSpace: 'nowrap' }}>
                              {t.transaction_date ? new Date(t.transaction_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12.5 }}>{t.project_name || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              </div>{/* end display:contents content wrapper */}
            </div>
          )}

          {/* Replenish Funds Drawer */}
          {isReplenishing && (() => {
            const drawerInputStyle = { padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, transition: 'all 0.2s' }
            const dOnFocus = e => { e.target.style.borderColor = '#10b981'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.1)' }
            const dOnBlur = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }
            return (
              <>
                <div onClick={() => { setIsReplenishing(false); setReplenishAmount(''); setReplenishSourceAccountId(''); setReplenishReference('') }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(440px, 100vw)', background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', animation: 'slideInFromRight 0.25s ease' }}>
                  {/* Header */}
                  <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #047857 60%, #059669 100%)', padding: '28px 24px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                    <button onClick={() => { setIsReplenishing(false); setReplenishAmount(''); setReplenishSourceAccountId(''); setReplenishReference('') }} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, padding: 0, boxSizing: 'border-box' }}>×</button>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                      <TrendingUp size={26} color="#fff" />
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Petty Cash</div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 0.2 }}>Replenish Funds</div>
                    <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Transfer funds from a bank account into petty cash</div>
                  </div>
                  {/* Body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
                    <div style={{ display: 'grid', gap: 18 }}>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><DollarSign size={11} color="#94a3b8" /> Amount <span style={{ color: '#ef4444' }}>*</span></span>
                        <input type="number" value={replenishAmount} onChange={e => setReplenishAmount(e.target.value)} placeholder="0.00" style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Landmark size={11} color="#94a3b8" /> Source Bank Account</span>
                        <select value={replenishSourceAccountId} onChange={e => setReplenishSourceAccountId(e.target.value)} style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur}>
                          <option value="">Select Bank Account</option>
                          {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_number}</option>)}
                        </select>
                      </label>
                      <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Hash size={11} color="#94a3b8" /> Reference / Notes</span>
                        <input type="text" value={replenishReference} onChange={e => setReplenishReference(e.target.value)} placeholder="e.g. Cash withdrawal for petty fund" style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                      </label>
                      {replenishAmount && Number(replenishAmount) > 0 && (
                        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1.5px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <CheckCircle size={16} color="#059669" />
                          <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
                            Adding <strong>${Number(replenishAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> to petty cash
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Footer */}
                  <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#fff', flexShrink: 0 }}>
                    <button onClick={() => { setIsReplenishing(false); setReplenishAmount(''); setReplenishSourceAccountId(''); setReplenishReference('') }} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                    <button disabled={saving} onClick={handleReplenish} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #059669, #065f46)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(5,150,105,0.3)', boxSizing: 'border-box' }}>
                      {saving ? 'Saving...' : <><TrendingUp size={15} /> Replenish</>}
                    </button>
                  </div>
                </div>
              </>
            )
          })()}
          {tab === 'accounting' && accountingSubTab === 'accounts' && (
            <div style={{ width: '100%', display: 'grid', gap: 16 }}>
              <div className="page-header">
                <div>
                  <div className="page-badge">Accounts</div>
                  <div className="page-title-row">
                    <Landmark size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Chart of Accounts</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Manage financial accounts, balances, and transaction history</p>
                </div>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: 24, paddingBottom: 40 }}>
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
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                          {initials}
                        </span>
                      ) : (
                        <img
                          src={bankLogoLocalFailed[opt.slug] ? opt.logoRemote : opt.logoLocal}
                          alt={acc.bank_name}
                          style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: '50%' }}
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
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                            cursor: 'pointer',
                            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 230,
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-8px) scale(1.015)'
                            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0) scale(1)'
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
                          }}
                        >
                          {/* Noise texture overlay */}
                          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.03\'/%3E%3C/svg%3E")', pointerEvents: 'none', opacity: 0.4 }} />

                          {/* ── Top row: logo + chip ── */}
                          <div style={{ padding: '22px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                            <div style={{ width: 46, height: 46, borderRadius: 14, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                              {logoEl}
                            </div>
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em', paddingTop: 4 }}>
                              Bank Account
                            </span>
                          </div>

                          {/* ── Centre: balance ── */}
                          <div style={{ padding: '18px 22px 16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
                            <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.13em', marginBottom: 6 }}>Available Balance</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 14 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>LKR</span>
                              <span style={{ fontSize: 30, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 }}>
                                {Number(acc.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', letterSpacing: '-0.01em' }}>{acc.bank_name}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, fontWeight: 500 }}>{acc.branch || 'Main Branch'}</div>
                          </div>

                          {/* ── Bottom row: account no + actions ── */}
                          <div style={{ padding: '14px 22px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                            <div>
                              <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 3 }}>Account No.</div>
                              <div style={{ fontSize: 13, color: '#334155', fontFamily: '"JetBrains Mono","Fira Code",monospace', fontWeight: 600, letterSpacing: '0.04em' }}>{acc.account_number}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                                <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>Active</span>
                              </div>
                              {isAdmin && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleDeleteAccount(acc.id, acc.account_number) }}
                                  title="Delete account"
                                  style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', flexShrink: 0, fontSize: 13 }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                                >
                                  ✕
                                </button>
                              )}
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b', fontWeight: 700, letterSpacing: '0.02em' }}>
                                View Cards <span style={{ fontSize: 13 }}>→</span>
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
            <div style={{ width: '100%', display: 'grid', gap: 16, position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <Banknote    size={220} style={{ position: 'absolute', top: '-30px',  right: '-40px',  opacity: 0.06, color: '#3b82f6', transform: 'rotate(-8deg)'  }} />
                <TrendingUp  size={160} style={{ position: 'absolute', top: '40px',   right: '120px',  opacity: 0.04, color: '#60a5fa', transform: 'rotate(5deg)'   }} />
                <DollarSign  size={180} style={{ position: 'absolute', top: '-20px',  right: '300px',  opacity: 0.04, color: '#93c5fd', transform: 'rotate(-5deg)'  }} />
                <Receipt     size={140} style={{ position: 'absolute', top: '10px',   left: '40%',     opacity: 0.035,color: '#7dd3fc', transform: 'rotate(8deg)'   }} />
                <Inbox       size={130} style={{ position: 'absolute', top: '-10px',  left: '20%',     opacity: 0.035,color: '#60a5fa', transform: 'rotate(-6deg)'  }} />
                <Banknote    size={150} style={{ position: 'absolute', top: '20px',   left: '-20px',   opacity: 0.04, color: '#3b82f6', transform: 'rotate(4deg)'   }} />
              </div>
              {/* Content sits above decorative layer */}
              <div style={{ position: 'relative', zIndex: 1, display: 'contents' }}>
              <div className="page-header">
                <div>
                  <div className="page-badge">Receivable</div>
                  <div className="page-title-row">
                    <Banknote size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Accounts Receivable</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Track incoming payments, outstanding invoices, and client balances</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button onClick={() => setIsAddingReceivable(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <span>+</span> Add Receivable
                  </button>
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

              {/* Summary stat cards */}
              {!receivablesLoading && receivables.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(160px, 100%), 1fr))', gap: 12, marginBottom: 4 }}>
                  {[
                    { label: 'Total Receivables', value: filteredReceivables.length, icon: <Inbox size={18} color="#063062" />, bg: 'rgba(6,48,98,0.06)', color: '#063062' },
                    { label: 'Active', value: filteredReceivables.filter(r => r.is_active).length, icon: <CheckCircle size={18} color="#16a34a" />, bg: 'rgba(22,163,74,0.07)', color: '#16a34a' },
                    { label: 'Total Amount', value: `$${filteredReceivables.reduce((s, r) => s + Number(r.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <DollarSign size={18} color="#0ea5e9" />, bg: 'rgba(14,165,233,0.07)', color: '#0369a1' },
                  ].map(card => (
                    <div key={card.label} style={{ background: card.bg, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${card.bg}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', flexShrink: 0 }}>{card.icon}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: card.color, lineHeight: 1.2 }}>{card.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
                <input
                  type="text"
                  placeholder="Search receivables..."
                  value={receivableSearch}
                  onChange={e => setReceivableSearch(e.target.value)}
                  style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', flex: 1, outline: 'none', fontSize: 13.5, fontFamily: 'inherit' }}
                  onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                  onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none' }}
                />
                <select value={receivableTypeFilter} onChange={e => setReceivableTypeFilter(e.target.value)} style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="All">All Types</option>
                  <option value="ONE_TIME">One Time</option>
                  <option value="RECURRING">Recurring</option>
                </select>
                <select value={receivableStatusFilter} onChange={e => setReceivableStatusFilter(e.target.value)} style={{ padding: '9px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer' }}>
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {receivablesLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #e2e8f0', borderTop: '3px solid #063062', animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  Loading receivables…
                </div>
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
                  <div style={{ padding: 32, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1.5px dashed #e2e8f0', color: '#94a3b8', fontSize: 14 }}>
                    No receivables found matching your filters.
                  </div>
                )
              ) : (
                <div style={{ width: '100%', overflowX: 'auto', borderRadius: 12, border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', background: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Payer</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Receivable Name</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Type</th>
                        <th style={{ padding: '11px 16px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Amount</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Date Range</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Payment</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Project</th>
                        <th style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceivables.map((r, idx) => {
                        const startFmt = r.start_date ? new Date(r.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : null
                        const endFmt = r.end_date ? new Date(r.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }) : null
                        const typeConfig = r.receivable_type === 'RECURRING'
                          ? { label: 'Recurring', bg: 'rgba(99,102,241,0.1)', color: '#6366f1', border: 'rgba(99,102,241,0.25)' }
                          : { label: 'One Time', bg: 'rgba(6,48,98,0.08)', color: '#063062', border: 'rgba(6,48,98,0.18)' }
                        return (
                          <tr key={r.receivable_id} style={{ borderBottom: idx < filteredReceivables.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <span style={{ fontSize: 12, fontWeight: 800, color: '#2563eb' }}>{(r.payer_name || '?').charAt(0).toUpperCase()}</span>
                                </div>
                                {r.payer_name}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                              <div style={{ color: '#1e293b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={r.receivable_name}>{r.receivable_name}</div>
                              {r.description && <div style={{ color: '#94a3b8', fontSize: 11.5, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={r.description}>{r.description}</div>}
                              {r.frequency && <div style={{ color: '#6366f1', fontSize: 11, marginTop: 1 }}>{r.frequency.charAt(0) + r.frequency.slice(1).toLowerCase()}</div>}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: typeConfig.bg, color: typeConfig.color, border: `1px solid ${typeConfig.border}`, whiteSpace: 'nowrap' as const }}>
                                {typeConfig.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' as const }}>
                              +${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12.5, whiteSpace: 'nowrap' as const }}>
                              {startFmt ? (endFmt ? `${startFmt} → ${endFmt}` : startFmt) : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12.5 }}>
                              {r.payment_method ? (
                                <div>
                                  <div style={{ fontWeight: 600, color: '#475569' }}>{r.payment_method}</div>
                                  {r.reference_number && <div style={{ fontSize: 11.5, color: '#94a3b8' }}>Ref: {r.reference_number}</div>}
                                </div>
                              ) : '—'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12.5 }}>{r.project_name || '—'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: r.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: r.is_active ? '#16a34a' : '#dc2626', border: `1px solid ${r.is_active ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
                                {r.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {isAddingReceivable && (() => {
                const drawerInputStyle = { padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, transition: 'all 0.2s' }
                const dOnFocus = e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }
                const dOnBlur = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }
                const closeDrawer = () => { setIsAddingReceivable(false); setReceivablePayerName(''); setReceivableName(''); setReceivableDescription(''); setReceivableType(''); setReceivableAmount(''); setReceivableFrequency(''); setReceivableStartDate(''); setReceivableEndDate(''); setReceivableProjectId(''); setReceivableIsActive(true); setReceivableBankAccountId(''); setReceivablePaymentMethod(''); setReceivableReferenceNumber('') }
                return (
                  <>
                    <div onClick={closeDrawer} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
                    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)', background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', animation: 'slideInFromRight 0.25s ease' }}>
                      {/* Header */}
                      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)', padding: '28px 24px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                        <button onClick={closeDrawer} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, padding: 0, boxSizing: 'border-box' as const }}>×</button>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                          <Inbox size={26} color="#fff" />
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Receivable</div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 0.2 }}>Add Receivable Bill</div>
                        <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Record incoming payments and invoices from clients</div>
                      </div>
                      {/* Body */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
                        <div style={{ display: 'grid', gap: 18 }}>
                          <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><User size={11} color="#94a3b8" /> Payer Name <span style={{ color: '#ef4444' }}>*</span></span>
                            <input value={receivablePayerName} onChange={e => setReceivablePayerName(e.target.value)} placeholder="e.g. Acme Corp" style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                          </label>
                          <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><FileText size={11} color="#94a3b8" /> Receivable Name <span style={{ color: '#ef4444' }}>*</span></span>
                            <input value={receivableName} onChange={e => setReceivableName(e.target.value)} placeholder="e.g. Invoice #1042" style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <label style={{ display: 'grid', gap: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Repeat size={11} color="#94a3b8" /> Type</span>
                              <select value={receivableType} onChange={e => setReceivableType(e.target.value)} style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur}>
                                <option value="">Select Type</option>
                                <option value="ONE_TIME">One Time</option>
                                <option value="RECURRING">Recurring</option>
                              </select>
                            </label>
                            <label style={{ display: 'grid', gap: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><DollarSign size={11} color="#94a3b8" /> Amount <span style={{ color: '#ef4444' }}>*</span></span>
                              <input type="number" value={receivableAmount} onChange={e => setReceivableAmount(e.target.value)} placeholder="0.00" style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                            </label>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <label style={{ display: 'grid', gap: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Repeat size={11} color="#94a3b8" /> Frequency</span>
                              <select value={receivableFrequency} onChange={e => setReceivableFrequency(e.target.value)} style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur}>
                                <option value="">Select Frequency</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="YEARLY">Yearly</option>
                              </select>
                            </label>
                            <label style={{ display: 'grid', gap: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><FolderOpen size={11} color="#94a3b8" /> Project</span>
                              <select value={receivableProjectId} onChange={e => setReceivableProjectId(e.target.value)} style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur}>
                                <option value="">Select Project</option>
                                {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                              </select>
                            </label>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <label style={{ display: 'grid', gap: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} color="#94a3b8" /> Start Date</span>
                              <input type="date" value={receivableStartDate} onChange={e => setReceivableStartDate(e.target.value)} style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                            </label>
                            <label style={{ display: 'grid', gap: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} color="#94a3b8" /> End Date</span>
                              <input type="date" value={receivableEndDate} onChange={e => setReceivableEndDate(e.target.value)} style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                            </label>
                          </div>
                          <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Landmark size={11} color="#94a3b8" /> Bank Account</span>
                            <select value={receivableBankAccountId} onChange={e => setReceivableBankAccountId(e.target.value)} style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur}>
                              <option value="">Select Account</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} — {a.account_number}</option>)}
                            </select>
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <label style={{ display: 'grid', gap: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><CreditCard size={11} color="#94a3b8" /> Payment Method</span>
                              <input value={receivablePaymentMethod} onChange={e => setReceivablePaymentMethod(e.target.value)} placeholder="e.g. Wire Transfer" style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                            </label>
                            <label style={{ display: 'grid', gap: 6 }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Hash size={11} color="#94a3b8" /> Reference Number</span>
                              <input value={receivableReferenceNumber} onChange={e => setReceivableReferenceNumber(e.target.value)} placeholder="e.g. INV-2024-001" style={drawerInputStyle} onFocus={dOnFocus} onBlur={dOnBlur} />
                            </label>
                          </div>
                          <label style={{ display: 'grid', gap: 6 }}>
                            <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><FileText size={11} color="#94a3b8" /> Description</span>
                            <textarea value={receivableDescription} onChange={e => setReceivableDescription(e.target.value)} rows={3} placeholder="Optional notes..." style={{ ...drawerInputStyle, resize: 'vertical' as const }} onFocus={dOnFocus} onBlur={dOnBlur} />
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <input type="checkbox" checked={receivableIsActive} onChange={e => setReceivableIsActive(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2563eb' }} />
                            <span style={{ fontWeight: 600, color: '#475569', fontSize: 13.5 }}>Mark as Active</span>
                          </label>
                        </div>
                      </div>
                      {/* Footer */}
                      <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#fff', flexShrink: 0 }}>
                        <button onClick={closeDrawer} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                        <button disabled={saving} onClick={handleSaveReceivable} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(37,99,235,0.3)', boxSizing: 'border-box' as const }}>
                          {saving ? 'Saving...' : <><Inbox size={15} /> Save Receivable</>}
                        </button>
                      </div>
                    </div>
                  </>
                )
              })()}
              </div>{/* end display:contents content wrapper */}
            </div>
          )}
          {tab === 'employees' && employeeSubTab === 'pto' && (
            <div>
              <div className="page-header">
                <div>
                  <div className="page-badge">Time Off</div>
                  <div className="page-title-row">
                    <Calendar size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Time Off</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Review, approve, and track employee leave requests and PTO balances</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <button
                    onClick={() => setPtoActiveTab('my-requests')}
                    className="add-emp-btn"
                    style={{ background: ptoActiveTab === 'my-requests' ? 'linear-gradient(135deg, #1a4a8a 0%, #063062 100%)' : '#f1f5f9', border: ptoActiveTab === 'my-requests' ? 'none' : '1.5px solid #e2e8f0', color: ptoActiveTab === 'my-requests' ? '#fff' : '#475569', boxShadow: ptoActiveTab === 'my-requests' ? '0 3px 10px rgba(6,48,98,0.3)' : 'none' }}
                  >
                    <span className="btn-icon"><FileText size={13} /></span>
                    <span>My Requests</span>
                  </button>
                  {(user.roleNames?.some(r => r === 'Admin' || r === 'Manager' || r === 'Super Admin') || user.roleName === 'Admin' || user.roleName === 'Manager') && (
                    <button
                      onClick={() => setPtoActiveTab('approvals')}
                      className="add-emp-btn"
                      style={{ background: ptoActiveTab === 'approvals' ? 'linear-gradient(135deg, #1a4a8a 0%, #063062 100%)' : '#f1f5f9', border: ptoActiveTab === 'approvals' ? 'none' : '1.5px solid #e2e8f0', color: ptoActiveTab === 'approvals' ? '#fff' : '#475569', boxShadow: ptoActiveTab === 'approvals' ? '0 3px 10px rgba(6,48,98,0.3)' : 'none' }}
                    >
                      <span className="btn-icon"><UserCheck size={13} /></span>
                      <span>Pending Approvals</span>
                    </button>
                  )}
                  <button
                    onClick={() => setPtoDrawerOpen(true)}
                    className="add-emp-btn"
                  >
                    <span className="btn-icon"><Plus size={13} /></span>
                    <span>Request Time Off</span>
                  </button>
                </div>
              </div>
              <PTORequests
                userId={user.id}
                isManager={user.roleNames?.some(r => r === 'Admin' || r === 'Manager' || r === 'Super Admin') || user.roleName === 'Admin' || user.roleName === 'Manager' || false}
                accessToken={accessToken}
                activeTab={ptoActiveTab}
                setActiveTab={setPtoActiveTab}
                drawerOpen={ptoDrawerOpen}
                setDrawerOpen={setPtoDrawerOpen}
              />
            </div>
          )}
          {tab === 'accounting' && accountingSubTab === 'subscriptions' && (
            <div style={{ width: '100%', display: 'grid', gap: 16, position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <Repeat      size={220} style={{ position: 'absolute', top: '-30px',  right: '-40px',  opacity: 0.06, color: '#3b82f6', transform: 'rotate(-8deg)'  }} />
                <CreditCard  size={160} style={{ position: 'absolute', top: '40px',   right: '120px',  opacity: 0.04, color: '#60a5fa', transform: 'rotate(5deg)'   }} />
                <DollarSign  size={180} style={{ position: 'absolute', top: '-20px',  right: '300px',  opacity: 0.04, color: '#93c5fd', transform: 'rotate(-5deg)'  }} />
                <Calendar    size={140} style={{ position: 'absolute', top: '10px',   left: '40%',     opacity: 0.035,color: '#7dd3fc', transform: 'rotate(8deg)'   }} />
                <Repeat      size={130} style={{ position: 'absolute', top: '-10px',  left: '20%',     opacity: 0.035,color: '#60a5fa', transform: 'rotate(-6deg)'  }} />
                <TrendingUp  size={150} style={{ position: 'absolute', top: '20px',   left: '-20px',   opacity: 0.04, color: '#3b82f6', transform: 'rotate(4deg)'   }} />
              </div>
              {/* Content sits above decorative layer */}
              <div style={{ position: 'relative', zIndex: 1, display: 'contents' }}>
                <div className="page-header">
                  <div>
                    <div className="page-badge">Subscriptions</div>
                    <div className="page-title-row">
                      <Repeat size={22} className="page-title-icon" />
                      <div className="page-title-oval">
                        <h1 className="page-title">Subscriptions</h1>
                      </div>
                    </div>
                    <p className="page-subtitle">Manage recurring software licenses, services, and scheduled expenses</p>
                  </div>
                </div>
                <Subscriptions />
              </div>
            </div>
          )}
          {tab === 'analytics' && (
            <div style={{ position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <BarChart3    size={220} style={{ position: 'absolute', top: '-30px', right: '-40px',  opacity: 0.06,  color: '#0ea5e9', transform: 'rotate(-8deg)'  }} />
                <TrendingUp   size={160} style={{ position: 'absolute', top:  '40px', right: '120px',  opacity: 0.04,  color: '#38bdf8', transform: 'rotate(5deg)'   }} />
                <TrendingDown size={180} style={{ position: 'absolute', top: '-20px', right: '300px',  opacity: 0.04,  color: '#7dd3fc', transform: 'rotate(-5deg)'  }} />
                <DollarSign   size={140} style={{ position: 'absolute', top:  '10px', left:  '40%',    opacity: 0.035, color: '#bae6fd', transform: 'rotate(8deg)'   }} />
                <Receipt      size={130} style={{ position: 'absolute', top: '-10px', left:  '20%',    opacity: 0.035, color: '#38bdf8', transform: 'rotate(-6deg)'  }} />
                <Coins        size={150} style={{ position: 'absolute', top:  '20px', left:  '-20px',  opacity: 0.04,  color: '#0ea5e9', transform: 'rotate(4deg)'   }} />
              </div>
              {/* Content */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                  <div>
                    <div className="page-badge">Analytics</div>
                    <div className="page-title-row">
                      <BarChart3 size={22} className="page-title-icon" />
                      <div className="page-title-oval">
                        <h1 className="page-title">Data Analytics</h1>
                      </div>
                    </div>
                    <p className="page-subtitle">Visualize financial trends, KPIs, and business performance insights</p>
                  </div>
                </div>
                <DataAnalytics />
              </div>
            </div>
          )}
          {tab === 'documents' && (
            <div style={{ position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <FileText     size={220} style={{ position: 'absolute', top: '-30px', right: '-40px',  opacity: 0.06,  color: '#4f46e5', transform: 'rotate(-8deg)'  }} />
                <FolderOpen   size={160} style={{ position: 'absolute', top:  '40px', right: '120px',  opacity: 0.04,  color: '#6366f1', transform: 'rotate(5deg)'   }} />
                <FileSignature size={180} style={{ position: 'absolute', top: '-20px', right: '300px', opacity: 0.04,  color: '#818cf8', transform: 'rotate(-5deg)'  }} />
                <Inbox        size={140} style={{ position: 'absolute', top:  '10px', left:  '40%',   opacity: 0.035, color: '#a5b4fc', transform: 'rotate(8deg)'   }} />
                <ClipboardList size={130} style={{ position: 'absolute', top: '-10px', left: '20%',   opacity: 0.035, color: '#6366f1', transform: 'rotate(-6deg)'  }} />
                <FileText     size={150} style={{ position: 'absolute', top:  '20px', left:  '-20px',  opacity: 0.04,  color: '#4f46e5', transform: 'rotate(4deg)'   }} />
              </div>
              {/* Content */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                  <div>
                    <div className="page-badge">Documents</div>
                    <div className="page-title-row">
                      <FileText size={22} className="page-title-icon" />
                      <div className="page-title-oval">
                        <h1 className="page-title">Document Bank</h1>
                      </div>
                    </div>
                    <p className="page-subtitle">Centralized storage for contracts, reports, receipts, and company files</p>
                  </div>
                </div>
                <DocumentBank user={{ roleNames: user.roleNames || [user.roleName].filter(Boolean) as string[] }} accessToken={accessToken} />
              </div>
            </div>
          )}
          {tab === 'accounting' && accountingSubTab === 'purchase_orders' && (
            <div style={{ position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <ShoppingCart size={220} style={{ position: 'absolute', top: '-30px', right: '-40px',  opacity: 0.06,  color: '#d97706', transform: 'rotate(-8deg)'  }} />
                <Receipt      size={160} style={{ position: 'absolute', top:  '40px', right: '120px',  opacity: 0.04,  color: '#f59e0b', transform: 'rotate(5deg)'   }} />
                <Coins        size={180} style={{ position: 'absolute', top: '-20px', right: '300px',  opacity: 0.04,  color: '#fbbf24', transform: 'rotate(-5deg)'  }} />
                <TrendingUp   size={140} style={{ position: 'absolute', top:  '10px', left:  '40%',   opacity: 0.035, color: '#fcd34d', transform: 'rotate(8deg)'   }} />
                <FileText     size={130} style={{ position: 'absolute', top: '-10px', left:  '20%',   opacity: 0.035, color: '#f59e0b', transform: 'rotate(-6deg)'  }} />
                <DollarSign   size={150} style={{ position: 'absolute', top:  '20px', left:  '-20px',  opacity: 0.04,  color: '#d97706', transform: 'rotate(4deg)'   }} />
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                  <div>
                    <div className="page-badge">Procurement</div>
                    <div className="page-title-row">
                      <ShoppingCart size={22} className="page-title-icon" />
                      <div className="page-title-oval">
                        <h1 className="page-title">Purchase Orders</h1>
                      </div>
                    </div>
                    <p className="page-subtitle">Create, approve, track, and close purchase orders with vendors</p>
                  </div>
                </div>
                <PurchaseOrders
                  user={user}
                  accessToken={accessToken}
                  vendors={vendors}
                  projects={projects
                    .filter(p => p.contract_id && p.contract_name)
                    .map(p => ({ contract_id: p.contract_id!, contract_name: p.contract_name! }))
                  }
                />
              </div>
            </div>
          )}
          {tab === 'accounting' && accountingSubTab === 'payroll' && (
            <div style={{ position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <Users      size={220} style={{ position: 'absolute', top: '-30px', right: '-40px',  opacity: 0.06,  color: '#7c3aed', transform: 'rotate(-8deg)'  }} />
                <Banknote   size={160} style={{ position: 'absolute', top:  '40px', right: '120px',  opacity: 0.04,  color: '#8b5cf6', transform: 'rotate(5deg)'   }} />
                <DollarSign size={180} style={{ position: 'absolute', top: '-20px', right: '300px',  opacity: 0.04,  color: '#a78bfa', transform: 'rotate(-5deg)'  }} />
                <TrendingUp size={140} style={{ position: 'absolute', top:  '10px', left:  '40%',   opacity: 0.035, color: '#c4b5fd', transform: 'rotate(8deg)'   }} />
                <Coins      size={130} style={{ position: 'absolute', top: '-10px', left:  '20%',   opacity: 0.035, color: '#8b5cf6', transform: 'rotate(-6deg)'  }} />
                <Banknote   size={150} style={{ position: 'absolute', top:  '20px', left:  '-20px',  opacity: 0.04,  color: '#7c3aed', transform: 'rotate(4deg)'   }} />
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                  <div>
                    <div className="page-badge">Payroll</div>
                    <div className="page-title-row">
                      <DollarSign size={22} className="page-title-icon" />
                      <div className="page-title-oval">
                        <h1 className="page-title">Payroll</h1>
                      </div>
                    </div>
                    <p className="page-subtitle">Process employee compensation, deductions, and generate pay summaries</p>
                  </div>
                </div>
                <Payroll />
              </div>
            </div>
          )}
          {tab === 'settings' && (
            hasPermission(user, 'settings', 'manage') ? (
              <div style={{ position: 'relative' }}>
                {/* ── Decorative visuals ── */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                  <SettingsIcon size={220} style={{ position: 'absolute', top: '-30px', right: '-40px',  opacity: 0.06,  color: '#334155', transform: 'rotate(-8deg)'  }} />
                  <Users        size={160} style={{ position: 'absolute', top:  '40px', right: '120px',  opacity: 0.04,  color: '#475569', transform: 'rotate(5deg)'   }} />
                  <UserCheck    size={180} style={{ position: 'absolute', top: '-20px', right: '300px',  opacity: 0.04,  color: '#64748b', transform: 'rotate(-5deg)'  }} />
                  <Briefcase    size={140} style={{ position: 'absolute', top:  '10px', left:  '40%',   opacity: 0.035, color: '#94a3b8', transform: 'rotate(8deg)'   }} />
                  <User         size={130} style={{ position: 'absolute', top: '-10px', left:  '20%',   opacity: 0.035, color: '#475569', transform: 'rotate(-6deg)'  }} />
                  <CheckCircle  size={150} style={{ position: 'absolute', top:  '20px', left:  '-20px', opacity: 0.04,  color: '#334155', transform: 'rotate(4deg)'   }} />
                </div>
                {/* Content */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                  <div>
                    <div className="page-badge">Settings</div>
                    <div className="page-title-row">
                      <SettingsIcon size={22} className="page-title-icon" />
                      <div className="page-title-oval">
                        <h1 className="page-title">System Settings</h1>
                      </div>
                    </div>
                    <p className="page-subtitle">Configure roles, permissions, companies, and application preferences</p>
                  </div>
                </div>
                <Settings accessToken={accessToken} />
                </div>{/* end zIndex:1 */}
              </div>
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
          {tab === 'accounting' && accountingSubTab === 'loans' && (
            <div style={{ position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <Landmark    size={220} style={{ position: 'absolute', top: '-30px', right: '-40px',  opacity: 0.06,  color: '#059669', transform: 'rotate(-8deg)'  }} />
                <DollarSign  size={160} style={{ position: 'absolute', top:  '40px', right: '120px',  opacity: 0.04,  color: '#10b981', transform: 'rotate(5deg)'   }} />
                <Scale       size={180} style={{ position: 'absolute', top: '-20px', right: '300px',  opacity: 0.04,  color: '#34d399', transform: 'rotate(-5deg)'  }} />
                <TrendingDown size={140} style={{ position: 'absolute', top:  '10px', left:  '40%',   opacity: 0.035, color: '#6ee7b7', transform: 'rotate(8deg)'   }} />
                <CreditCard  size={130} style={{ position: 'absolute', top: '-10px', left:  '20%',   opacity: 0.035, color: '#10b981', transform: 'rotate(-6deg)'  }} />
                <DollarSign  size={150} style={{ position: 'absolute', top:  '20px', left:  '-20px',  opacity: 0.04,  color: '#059669', transform: 'rotate(4deg)'   }} />
              </div>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="page-header">
                  <div>
                    <div className="page-badge">Loans</div>
                    <div className="page-title-row">
                      <CreditCard size={22} className="page-title-icon" />
                      <div className="page-title-oval">
                        <h1 className="page-title">Loan Management</h1>
                      </div>
                    </div>
                    <p className="page-subtitle">Manage outstanding loans, repayment schedules, and interest tracking</p>
                  </div>
                </div>
                <Loans />
              </div>
            </div>
          )}
          {tab === 'accounting' && accountingSubTab === 'assets' && (
            <div style={{ width: '100%', display: 'grid', gap: 16, position: 'relative' }}>
              {/* ── Decorative visuals ── */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <Building2  size={220} style={{ position: 'absolute', top: '-30px', right: '-40px',  opacity: 0.06,  color: '#2563eb', transform: 'rotate(-8deg)'  }} />
                <BarChart3  size={160} style={{ position: 'absolute', top:  '40px', right: '120px',  opacity: 0.04,  color: '#3b82f6', transform: 'rotate(5deg)'   }} />
                <TrendingDown size={180} style={{ position: 'absolute', top: '-20px', right: '300px', opacity: 0.04,  color: '#60a5fa', transform: 'rotate(-5deg)'  }} />
                <Coins      size={140} style={{ position: 'absolute', top:  '10px', left:  '40%',   opacity: 0.035, color: '#93c5fd', transform: 'rotate(8deg)'   }} />
                <Landmark   size={130} style={{ position: 'absolute', top: '-10px', left:  '20%',   opacity: 0.035, color: '#3b82f6', transform: 'rotate(-6deg)'  }} />
                <DollarSign size={150} style={{ position: 'absolute', top:  '20px', left:  '-20px',  opacity: 0.04,  color: '#2563eb', transform: 'rotate(4deg)'   }} />
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'contents' }}>
              <div className="page-header">
                <div>
                  <div className="page-badge">Assets</div>
                  <div className="page-title-row">
                    <Building2 size={22} className="page-title-icon" />
                    <div className="page-title-oval">
                      <h1 className="page-title">Fixed Assets</h1>
                    </div>
                  </div>
                  <p className="page-subtitle">Track asset acquisitions, depreciation schedules, and disposal records</p>
                </div>
                <button onClick={() => setAddAssetModalOpen(true)} style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ Add Asset</button>
              </div>
              {assetsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.08)', borderTop: '3px solid #f97316', animation: 'ql-spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                  Loading assets…
                </div>
              ) : assets.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No assets found. Add your first asset to get started.</div>
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
                        <tr key={asset.id} style={{ borderBottom: idx < assets.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', transition: 'background 0.12s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.04)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <td style={{ padding: '12px 16px' }}>{asset.id}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 500 }}>{asset.asset_name}</td>
                          <td style={{ padding: '12px 16px' }}>LKR {Number(asset.value).toLocaleString()}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: asset.depreciation_method ? '#0284c7' : 'inherit' }}>
                            LKR {Number(asset.current_book_value || asset.value).toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {asset.depreciation_method ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ padding: '3px 10px', borderRadius: 99, background: asset.depreciation_method === 'STRAIGHT_LINE' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', color: asset.depreciation_method === 'STRAIGHT_LINE' ? '#60a5fa' : '#fbbf24', border: `1px solid ${asset.depreciation_method === 'STRAIGHT_LINE' ? 'rgba(59,130,246,0.3)' : 'rgba(245,158,11,0.3)'}`, fontSize: 11, fontWeight: 700, display: 'inline-block', letterSpacing: '0.03em' }}>
                                  {asset.depreciation_method === 'STRAIGHT_LINE' ? 'Straight-Line' : 'DDB'}
                                </span>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                  Acc: LKR {Number(asset.accumulated_depreciation || 0).toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, fontStyle: 'italic' }}>Not Depreciable</span>
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
              </div>{/* end display:contents */}
            </div>
          )}
        </section>
      </main>
      {addOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => { setAddOpen(false); resetForm() }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)',
            background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
            animation: 'slideInFromRight 0.25s ease',
          }}>
            {/* Header */}
            {(() => {
              const liveInitials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase()
              const liveName = (firstName || lastName) ? `${firstName} ${lastName}`.trim() : 'New Employee'
              const liveSubtitle = [role, designation].filter(Boolean).join(' · ') || 'Fill in the details below'
              const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
              const colorIdx = firstName ? firstName.charCodeAt(0) % avatarColors.length : 0
              const avatarBg = liveInitials ? avatarColors[colorIdx] : 'rgba(255,255,255,0.15)'
              return (
                <div style={{ background: 'linear-gradient(135deg, #063062 0%, #0d1f3c 60%, #1a3a6b 100%)', padding: '28px 24px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                  {/* Decorative blobs */}
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: 20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', bottom: 10, right: 20, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                  {/* Dot grid */}
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="dotgrid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
                        <circle cx="2" cy="2" r="1.5" fill="white"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#dotgrid)"/>
                  </svg>
                  {/* Close button */}
                  <button onClick={() => { setAddOpen(false); resetForm() }} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, zIndex: 1 }}>×</button>
                  {/* Avatar */}
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: avatarBg, border: '3px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, position: 'relative', zIndex: 1 }}>
                    {liveInitials ? (
                      <span style={{ color: '#fff', fontWeight: 800, fontSize: 24, letterSpacing: 1 }}>{liveInitials}</span>
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                    )}
                  </div>
                  {/* Name */}
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 0.2, lineHeight: 1.2, position: 'relative', zIndex: 1 }}>{liveName}</div>
                  {/* Subtitle */}
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 }}>
                    {[role, designation].filter(Boolean).length > 0 && (
                      <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                        {liveSubtitle}
                      </span>
                    )}
                    {![role, designation].filter(Boolean).length && <span>{liveSubtitle}</span>}
                  </div>
                </div>
              )
            })()}

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 12px' }}>

              {/* Section: Personal */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(6,48,98,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={13} color="#063062" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Personal Info</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><User size={11} color="#94a3b8" /> First Name <span style={{ color: '#ef4444' }}>*</span></span>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="John" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><User size={11} color="#94a3b8" /> Last Name <span style={{ color: '#ef4444' }}>*</span></span>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Calendar size={11} color="#94a3b8" /> Date of Birth</span>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><CreditCard size={11} color="#94a3b8" /> NIC</span>
                    <input value={nic} onChange={e => setNic(e.target.value)} placeholder="National ID" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                </div>
              </div>

              <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

              {/* Section: Contact */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(6,48,98,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={13} color="#063062" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Contact</span>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Mail size={11} color="#94a3b8" /> Email <span style={{ color: '#ef4444' }}>*</span></span>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@company.com" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Phone size={11} color="#94a3b8" /> Phone <span style={{ color: '#ef4444' }}>*</span></span>
                    <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><MapPin size={11} color="#94a3b8" /> Address</span>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="Street, City, Country" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', resize: 'none', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                </div>
              </div>

              <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

              {/* Section: Employment */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(6,48,98,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Briefcase size={13} color="#063062" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Employment</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Hash size={11} color="#94a3b8" /> Employee # <span style={{ color: '#ef4444' }}>*</span></span>
                    <input value={employeeNumber} onChange={e => setEmployeeNumber(e.target.value)} placeholder="EMP-001" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Briefcase size={11} color="#94a3b8" /> Role <span style={{ color: '#ef4444' }}>*</span></span>
                    <select value={role} onChange={e => setRole(e.target.value as 'IT' | 'Accounting' | 'Marketing')} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', cursor: 'pointer', appearance: 'none', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }}>
                      <option value="IT">IT</option>
                      <option value="Accounting">Accounting</option>
                      <option value="Marketing">Marketing</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Award size={11} color="#94a3b8" /> Designation</span>
                    <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Senior Developer" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><FileText size={11} color="#94a3b8" /> Tax</span>
                    <input value={tax} onChange={e => setTax(e.target.value)} placeholder="Tax ID / Rate" style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13.5, color: '#1e293b', outline: 'none', background: '#f8fafc', transition: 'all 0.2s' }}
                      onFocus={e => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }} />
                  </label>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: '#fff' }}>
              <button onClick={() => { setAddOpen(false); resetForm() }} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button disabled={saving} onClick={addEmployee} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1a4a8a, #063062)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(6,48,98,0.3)' }}>
                {saving ? 'Adding...' : <><Plus size={15} /> Add Employee</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Bill Drawer */}
      {isAddingBill && (() => {
        const resetBillForm = () => {
          setIsAddingBill(false)
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
          setIsNewPayableName(false)
          setEditingPayable(null)
        }
        const selectedVendor = vendors.find(v => String(v.vendor_id) === billVendorId)
        const words = (selectedVendor?.vendor_name || '').trim().split(/s+/).filter(Boolean)
        const liveInitials = words.slice(0, 2).map((w) => w[0]).join('').toUpperCase()
        const avatarColors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6']
        const accentColor = liveInitials ? avatarColors[(selectedVendor?.vendor_name || '').charCodeAt(0) % avatarColors.length] : 'rgba(255,255,255,0.15)'
        const liveName = selectedVendor?.vendor_name || 'New Bill'
        const typeLabel = billType === 'RECURRING' ? 'Recurring' : billType === 'PETTY_CASH' ? 'Petty Cash' : 'One Time'
        const typeColor = billType === 'RECURRING' ? '#818cf8' : billType === 'PETTY_CASH' ? '#fb923c' : '#93c5fd'
        const inputStyle = { padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', transition: 'all 0.2s', width: '100%', boxSizing: 'border-box' }
        const onFocus = (e) => { e.target.style.borderColor = '#063062'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(6,48,98,0.08)' }
        const onBlur = (e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }
        const sectionHeader = (icon, label) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(6,48,98,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>{label}</span>
          </div>
        )
        const divider = <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />
        return (
          <>
            <div onClick={resetBillForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)', background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', animation: 'slideInFromRight 0.25s ease' }}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #063062 0%, #0d1f3c 60%, #1a3a6b 100%)', padding: '28px 24px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: 10, right: 20, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                  <defs><pattern id="billdotgrid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white"/></pattern></defs>
                  <rect width="100%" height="100%" fill="url(#billdotgrid)"/>
                </svg>
                <button onClick={resetBillForm} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, zIndex: 1 }}>×</button>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: accentColor, border: '3px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, position: 'relative', zIndex: 1 }}>
                  {liveInitials ? <span style={{ color: '#fff', fontWeight: 800, fontSize: 24, letterSpacing: 1 }}>{liveInitials}</span> : <Receipt size={28} color="rgba(255,255,255,0.7)" />}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2, position: 'relative', zIndex: 1 }}>{editingPayable ? 'Edit Bill' : 'Add Bill'}</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 0.2, lineHeight: 1.2, position: 'relative', zIndex: 1 }}>{liveName}</div>
                <div style={{ marginTop: 5, position: 'relative', zIndex: 1 }}>
                  <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, color: typeColor }}>{typeLabel}</span>
                </div>
              </div>
              {/* Scrollable Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 12px' }}>
                {/* Section 1: Vendor & Bill */}
                <div style={{ marginBottom: 24 }}>
                  {sectionHeader(<Store size={13} color="#063062" />, 'Vendor & Bill')}
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Building2 size={11} color="#94a3b8" /> Vendor {billType !== 'PETTY_CASH' && <span style={{ color: '#ef4444' }}>*</span>}</span>
                      <select value={billVendorId} onChange={e => setBillVendorId(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                        <option value="">Select Vendor</option>
                        {vendors.map(v => <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>)}
                      </select>
                    </label>
                    {billType !== 'PETTY_CASH' && (
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Receipt size={11} color="#94a3b8" /> Payable Name <span style={{ color: '#ef4444' }}>*</span></span>
                        {isNewPayableName ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" value={billName} onChange={e => setBillName(e.target.value)} placeholder="e.g. Internet Bill" autoFocus style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                            <button onClick={() => { setIsNewPayableName(false); setBillName('') }} style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f1f5f9', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>List</button>
                          </div>
                        ) : (
                          <select value={billName} onChange={e => { if (e.target.value === '__NEW__') { setIsNewPayableName(true); setBillName('') } else { setBillName(e.target.value) } }} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                            <option value="">Select Payable Name</option>
                            {uniquePayableNames.map(name => <option key={name} value={name}>{name}</option>)}
                            <option value="__NEW__" style={{ fontWeight: 'bold' }}>+ Add New Name</option>
                          </select>
                        )}
                      </label>
                    )}
                  </div>
                </div>
                {divider}
                {/* Section 2: Description */}
                <div style={{ marginBottom: 24 }}>
                  {sectionHeader(<FileText size={13} color="#063062" />, 'Description')}
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><FileText size={11} color="#94a3b8" /> Notes (Optional)</span>
                    <textarea value={billDescription} onChange={e => setBillDescription(e.target.value)} placeholder="Add any relevant notes or description..." rows={2}
                      style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur} />
                  </label>
                </div>
                {divider}
                {/* Section 3: Billing Details */}
                <div style={{ marginBottom: 24 }}>
                  {sectionHeader(<Receipt size={13} color="#063062" />, 'Billing Details')}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><ClipboardList size={11} color="#94a3b8" /> Type <span style={{ color: '#ef4444' }}>*</span></span>
                      <select value={billType} onChange={e => setBillType(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                        <option value="ONE_TIME">One Time</option>
                        <option value="RECURRING">Recurring</option>
                        <option value="PETTY_CASH">Petty Cash</option>
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><DollarSign size={11} color="#94a3b8" /> Amount <span style={{ color: '#ef4444' }}>*</span></span>
                      <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder="0.00" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </label>
                    {billType === 'RECURRING' && (
                      <label style={{ display: 'grid', gap: 5, gridColumn: '1 / -1' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Repeat size={11} color="#94a3b8" /> Frequency</span>
                        <select value={billFrequency} onChange={e => setBillFrequency(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                          <option value="">Select Frequency</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="YEARLY">Yearly</option>
                        </select>
                      </label>
                    )}
                  </div>
                </div>
                {divider}
                {/* Section 4: Schedule & Payment */}
                <div style={{ marginBottom: 24 }}>
                  {sectionHeader(<Calendar size={13} color="#063062" />, 'Schedule & Payment')}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Calendar size={11} color="#94a3b8" /> {billType === 'PETTY_CASH' ? 'Transaction Date' : 'Start Date'}</span>
                      <input type="date" value={billStartDate} onChange={e => setBillStartDate(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </label>
                    {billType !== 'PETTY_CASH' && (
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Calendar size={11} color="#94a3b8" /> End Date</span>
                        <input type="date" value={billEndDate} onChange={e => setBillEndDate(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                      </label>
                    )}
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Landmark size={11} color="#94a3b8" /> Bank Account</span>
                      <select value={billBankAccountId} onChange={e => setBillBankAccountId(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                        <option value="">Select Bank Account</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.bank_name} - {a.account_number}</option>)}
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><CreditCard size={11} color="#94a3b8" /> Payment Method</span>
                      <select value={billPaymentMethod} onChange={e => setBillPaymentMethod(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                        <option value="">Select Method</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: 5, gridColumn: '1 / -1' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><Hash size={11} color="#94a3b8" /> Reference Number</span>
                      <input type="text" value={billReferenceNumber} onChange={e => setBillReferenceNumber(e.target.value)} placeholder="Ref #" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                    </label>
                  </div>
                </div>
                {divider}
                {/* Section 5: Project & Status */}
                <div style={{ marginBottom: 8 }}>
                  {sectionHeader(<Briefcase size={13} color="#063062" />, 'Project & Status')}
                  <div style={{ display: 'grid', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}><FolderOpen size={11} color="#94a3b8" /> Project (Optional)</span>
                      <select value={billProjectId} onChange={e => setBillProjectId(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                        <option value="">Select Project</option>
                        {projects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)}
                      </select>
                    </label>
                    <div onClick={() => setBillIsActive(a => !a)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: `1.5px solid ${billIsActive ? '#10b981' : '#e2e8f0'}`, background: billIsActive ? 'rgba(16,185,129,0.05)' : '#f8fafc', cursor: 'pointer', transition: 'all 0.18s' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b' }}>Active Bill</div>
                        <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>Bill is tracked and included in payable totals</div>
                      </div>
                      <div style={{ width: 40, height: 22, borderRadius: 11, background: billIsActive ? '#10b981' : '#cbd5e1', position: 'relative', flexShrink: 0, transition: 'background 0.18s' }}>
                        <div style={{ position: 'absolute', top: 3, left: billIsActive ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: '#fff' }}>
                <button onClick={resetBillForm} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button disabled={saving} onClick={handleSaveBill} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1a4a8a, #063062)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(6,48,98,0.3)' }}>
                  {saving ? 'Saving...' : editingPayable ? <><CheckCircle size={15} /> Update Bill</> : <><Plus size={15} /> Save Bill</>}
                </button>
              </div>
            </div>
          </>
        )
      })()}
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
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', zIndex: 1200 }}
            onClick={() => setSelectedAccountForCards(null)}
          />

          {/* Right-side drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(460px, 100vw)',
            background: '#ffffff',
            zIndex: 1201,
            display: 'flex', flexDirection: 'column',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
            animation: 'slideInFromRight 0.28s cubic-bezier(0.25,0.8,0.25,1)',
          }}>

            {/* ── Drawer header ── */}
            <div style={{ background: 'linear-gradient(135deg, #063062 0%, #0d1f3c 60%, #1a3a6b 100%)', padding: '28px 24px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              {/* Decorative blobs */}
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              {/* Dot grid */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} xmlns="http://www.w3.org/2000/svg">
                <defs><pattern id="dotgrid-cards" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white"/></pattern></defs>
                <rect width="100%" height="100%" fill="url(#dotgrid-cards)"/>
              </svg>
              {/* Close button */}
              <button onClick={() => setSelectedAccountForCards(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, zIndex: 1 }}>×</button>
              {/* Bank icon */}
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, position: 'relative', zIndex: 1 }}>
                <CreditCard size={24} color="#fff" />
              </div>
              {/* Title */}
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: 0.2, lineHeight: 1.2, position: 'relative', zIndex: 1 }}>{selectedAccountForCards.bank_name}</div>
              <div style={{ marginTop: 6, position: 'relative', zIndex: 1 }}>
                <span style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                  {selectedAccountForCards.branch || 'Main Branch'}
                </span>
              </div>
            </div>

            {/* ── Account number info strip ── */}
            <div style={{ padding: '14px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Account Number</div>
                <div style={{ fontSize: 14, fontFamily: '"JetBrains Mono","Fira Code",monospace', fontWeight: 700, color: '#1e293b', letterSpacing: '0.06em' }}>{selectedAccountForCards.account_number}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 99, padding: '4px 12px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>Active</span>
              </div>
            </div>

            {/* ── Cards list ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Section label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(6,48,98,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CreditCard size={13} color="#063062" />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Associated Debit Cards</span>
                <span style={{ background: 'rgba(6,48,98,0.08)', borderRadius: 99, padding: '1px 8px', fontSize: '0.65rem', fontWeight: 700, color: '#063062' }}>
                  {cards.filter(c => c.bank_account_id === selectedAccountForCards.id).length}
                </span>
              </div>

              {cards.filter(c => c.bank_account_id === selectedAccountForCards.id).length > 0 ? (
                cards.filter(c => c.bank_account_id === selectedAccountForCards.id).map(card => (
                  <div key={card.id} style={{ borderRadius: 14, overflow: 'hidden', background: '#fff', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {/* Card top row */}
                    <div style={{ padding: '16px 18px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" style={{ height: 13, opacity: 0.65 }} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Debit Card</span>
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                        background: card.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: card.is_active ? '#16a34a' : '#dc2626',
                        border: `1px solid ${card.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>
                        {card.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {/* Card number */}
                    <div style={{ padding: '0 18px 14px' }}>
                      <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Card Number</div>
                      <div style={{ fontSize: 17, fontFamily: '"JetBrains Mono","Fira Code",monospace', fontWeight: 700, color: '#0f172a', letterSpacing: '0.1em' }}>
                        •••• •••• •••• {card.card_number_last4}
                      </div>
                    </div>
                    {/* Card footer */}
                    <div style={{ padding: '12px 18px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Card Holder</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{card.card_holder_name}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.55rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Expires</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{card.expiry_date}</div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '48px 24px', textAlign: 'center', background: '#f8fafc', borderRadius: 14, border: '1.5px dashed #e2e8f0' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>💳</div>
                  <div style={{ fontWeight: 700, color: '#475569', marginBottom: 6 }}>No cards found</div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>Add a card via Card Management.</div>
                </div>
              )}
            </div>

            {/* ── Drawer footer ── */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', flexShrink: 0 }}>
              <button
                onClick={() => setSelectedAccountForCards(null)}
                style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}
              >
                Close
              </button>
            </div>
          </div>
        </>
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

      {openAccountModalOpen && (() => {
        const close = () => { setOpenAccountModalOpen(false); resetOpenAccountForm() }
        const fi: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }
        const lb: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }
        const selectedBank = bankOptions.find(o => o.name === bankName)
        return (
          <>
            <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(4,15,37,0.45)', backdropFilter: 'blur(3px)', zIndex: 1000 }} />
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)', background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column', boxShadow: '-16px 0 56px rgba(4,15,37,0.22)', animation: 'slideInFromRight 0.28s cubic-bezier(0.16,1,0.3,1)' }}>

              {/* Header */}
              <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid #f1f5f9', background: 'linear-gradient(135deg, #063062 0%, #1e40af 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>Open Bank Account</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Add a new bank account to your workspace</div>
                </div>
                <button onClick={close} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, lineHeight: 1 }}>×</button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                <div style={{ display: 'grid', gap: 18 }}>

                  {/* Bank selection */}
                  <div>
                    <span style={lb}>Bank <span style={{ color: '#ef4444' }}>*</span></span>
                    {!customBankMode ? (
                      <div style={{ position: 'relative' }}>
                        <div
                          onClick={() => setBankDropdownOpen(o => !o)}
                          style={{ ...fi, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, userSelect: 'none' }}
                        >
                          {selectedBank ? (
                            <>
                              {!bankLogoRemoteFailed[selectedBank.slug] ? (
                                <img src={bankLogoLocalFailed[selectedBank.slug] ? selectedBank.logoRemote : selectedBank.logoLocal} alt="" style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} referrerPolicy="no-referrer"
                                  onError={() => { if (!bankLogoLocalFailed[selectedBank.slug]) setBankLogoLocalFailed(p => ({ ...p, [selectedBank.slug]: true })); else setBankLogoRemoteFailed(p => ({ ...p, [selectedBank.slug]: true })) }} />
                              ) : (
                                <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e40af', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                                  {selectedBank.name.replace(/[()]/g, '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')}
                                </span>
                              )}
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', flex: 1 }}>{selectedBank.name}</span>
                            </>
                          ) : (
                            <span style={{ fontSize: 14, color: '#94a3b8', flex: 1 }}>Select a bank…</span>
                          )}
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>▾</span>
                        </div>

                        {bankDropdownOpen && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 2000, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' }}>
                            {bankOptions.map(opt => (
                              <button key={opt.slug} type="button"
                                onMouseDown={() => { setBankName(opt.name); setCustomBankMode(false); setBankDropdownOpen(false) }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: bankName === opt.name ? '#eff6ff' : 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left' }}
                              >
                                {!bankLogoRemoteFailed[opt.slug] ? (
                                  <img src={bankLogoLocalFailed[opt.slug] ? opt.logoRemote : opt.logoLocal} alt="" style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }} referrerPolicy="no-referrer"
                                    onError={() => { if (!bankLogoLocalFailed[opt.slug]) setBankLogoLocalFailed(p => ({ ...p, [opt.slug]: true })); else setBankLogoRemoteFailed(p => ({ ...p, [opt.slug]: true })) }} />
                                ) : (
                                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e40af', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                    {opt.name.replace(/[()]/g, '').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')}
                                  </span>
                                )}
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{opt.name}</span>
                                {bankName === opt.name && <span style={{ marginLeft: 'auto', color: '#2563eb', fontSize: 16 }}>✓</span>}
                              </button>
                            ))}
                            {/* Other Bank option */}
                            <button type="button"
                              onMouseDown={() => { setBankName(''); setCustomBankMode(true); setBankDropdownOpen(false) }}
                              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                            >
                              <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>+</span>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#2563eb' }}>Other / Add Custom Bank</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Custom bank inputs */
                      <div style={{ display: 'grid', gap: 10, padding: '14px', background: '#f8fafc', borderRadius: 10, border: '1.5px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb' }}>Custom Bank</span>
                          <button type="button" onClick={() => { setCustomBankMode(false); setBankName('') }} style={{ fontSize: 12, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>← Back to list</button>
                        </div>
                        <div>
                          <span style={{ ...lb, marginBottom: 4 }}>Bank Name <span style={{ color: '#ef4444' }}>*</span></span>
                          <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Standard Chartered" style={fi} />
                        </div>
                        <div>
                          <span style={{ ...lb, marginBottom: 4 }}>Logo URL <span style={{ color: '#94a3b8', fontWeight: 400, textTransform: 'none' }}>(optional)</span></span>
                          <input value={customBankLogoUrl} onChange={e => setCustomBankLogoUrl(e.target.value)} placeholder="https://example.com/bank-logo.png" style={fi} />
                          {customBankLogoUrl && (
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                              <img src={customBankLogoUrl} alt="preview" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, border: '1px solid #e2e8f0' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                              <span style={{ fontSize: 12, color: '#64748b' }}>Logo preview</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Branch */}
                  <div>
                    <label style={lb}>Branch <span style={{ color: '#ef4444' }}>*</span></label>
                    <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="e.g. Colombo 03" style={fi} />
                  </div>

                  {/* Account Number & Account Name */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={lb}>Account Number <span style={{ color: '#ef4444' }}>*</span></label>
                      <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="0000-0000-0000" style={fi} />
                    </div>
                    <div>
                      <label style={lb}>Account Name <span style={{ color: '#ef4444' }}>*</span></label>
                      <input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. Operating Account" style={fi} />
                    </div>
                  </div>

                  {/* Opening Balance */}
                  <div>
                    <label style={lb}>Opening Balance <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#64748b' }}>LKR</span>
                      <input type="number" min="0" step="0.01" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0.00" style={{ ...fi, paddingLeft: 48 }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, flexShrink: 0, background: '#fff' }}>
                <button onClick={saveOpenAccount} disabled={saving} style={{ flex: 1, padding: '11px 0', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #063062 0%, #1e40af 100%)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Open Account'}
                </button>
                <button onClick={close} style={{ padding: '11px 20px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </>
        )
      })()}
      {cardModalOpen && (() => {
        const di = { padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, transition: 'all 0.2s' }
        const dF = e => { e.target.style.borderColor = '#2563eb'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }
        const dB = e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none' }
        const close = () => { setCardModalOpen(false); resetCardForm() }
        return (
          <>
            <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
            <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(440px, 100vw)', background: '#fff', zIndex: 1001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', animation: 'slideInFromRight 0.25s ease' }}>
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)', padding: '28px 24px 24px', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -20, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                <button onClick={close} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, lineHeight: 1, padding: 0, boxSizing: 'border-box' as const }}>×</button>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <CreditCard size={26} color="#fff" />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Accounts</div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, letterSpacing: 0.2 }}>Card Management</div>
                <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Link a debit card to a bank account</div>
              </div>
              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
                <div style={{ display: 'grid', gap: 18 }}>
                  <label style={{ display: 'grid', gap: 6, position: 'relative' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Landmark size={11} color="#94a3b8" /> Bank Account <span style={{ color: '#ef4444' }}>*</span></span>
                    <input
                      value={cardSelectedAccountLabel}
                      readOnly
                      onClick={() => setCardAccountDropdownOpen(o => !o)}
                      placeholder="Select bank account"
                      onBlur={() => setTimeout(() => setCardAccountDropdownOpen(false), 150)}
                      onKeyDown={e => { if (e.key === 'Escape') setCardAccountDropdownOpen(false) }}
                      ref={cardAccountInputRef}
                      style={{ ...di, cursor: 'pointer', background: cardSelectedAccountLabel ? '#fff' : '#f8fafc' }}
                    />
                    {cardAccountDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, marginTop: 6, maxHeight: 220, overflowY: 'auto', zIndex: 2000, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                        {accounts.map(acc => (
                          <button key={acc.id} onMouseDown={() => { setCardBankAccountId(String(acc.id)); setCardSelectedAccountLabel(`${acc.bank_name} — ${acc.account_number}`); setCardAccountDropdownOpen(false) }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', textAlign: 'left' }}
                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'}
                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(6,48,98,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Landmark size={13} color="#063062" /></div>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>{acc.bank_name}</span>
                            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 'auto' }}>···{acc.account_number}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Hash size={11} color="#94a3b8" /> Last 4 Digits <span style={{ color: '#ef4444' }}>*</span></span>
                      <input value={cardNumberLast4} onChange={e => setCardNumberLast4(e.target.value)} placeholder="e.g. 4242" maxLength={4} style={di} onFocus={dF} onBlur={dB} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><Calendar size={11} color="#94a3b8" /> Expiry Date <span style={{ color: '#ef4444' }}>*</span></span>
                      <input type="month" value={cardExpiryDate} onChange={e => setCardExpiryDate(e.target.value)} style={di} onFocus={dF} onBlur={dB} />
                    </label>
                  </div>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><User size={11} color="#94a3b8" /> Card Holder Name <span style={{ color: '#ef4444' }}>*</span></span>
                    <input value={cardHolderName} onChange={e => setCardHolderName(e.target.value)} placeholder="e.g. Jane Doe" style={di} onFocus={dF} onBlur={dB} />
                  </label>
                  <label style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}><CheckCircle size={11} color="#94a3b8" /> Status</span>
                    <select value={cardStatus} onChange={e => setCardStatus(e.target.value as 'Active' | 'Inactive' | 'Blocked')} style={di} onFocus={dF} onBlur={dB}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </label>
                  {/* Preview card */}
                  {cardNumberLast4 && (
                    <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', borderRadius: 14, padding: '20px 22px', color: '#fff', boxShadow: '0 8px 24px rgba(37,99,235,0.25)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7 }}>Debit Card</div>
                        <CreditCard size={22} color="rgba(255,255,255,0.8)" />
                      </div>
                      <div style={{ fontSize: 18, fontFamily: '"JetBrains Mono","Fira Code",monospace', fontWeight: 700, letterSpacing: '0.15em', marginBottom: 16 }}>
                        •••• •••• •••• {cardNumberLast4}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Card Holder</div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{cardHolderName || '—'}</div>
                        </div>
                        {cardExpiryDate && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Expires</div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{cardExpiryDate.replace('-', '/')}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', background: '#fff', flexShrink: 0 }}>
                <button onClick={close} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button disabled={saving} onClick={submitCard} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(37,99,235,0.3)', boxSizing: 'border-box' as const }}>
                  {saving ? 'Saving...' : <><CreditCard size={15} /> Save Card</>}
                </button>
              </div>
            </div>
          </>
        )
      })()}
      {cardSaveConfirmVisible && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', zIndex: 2000 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 12, background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', fontSize: 16, fontWeight: 600 }}>
            <span style={{ fontSize: 22 }}>👩‍💼</span>
            <span>Saved</span>
          </div>
        </div>
      )}

      {addAssetModalOpen && (
        <>
          <div className="emp-drawer-overlay" onClick={() => { setAddAssetModalOpen(false); setAssetName(''); setAssetValue(''); setPurchaseDate(''); setIsDepreciable(false); setSalvageValue(''); setUsefulLife('') }} />
          <div className="emp-drawer">

            {/* Header */}
            <div style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%)', padding: '24px 24px 20px', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -30, left: 30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Assets</div>
                  <div style={{ color: '#fff', fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px' }}>Add New Asset</div>
                </div>
                <button onClick={() => { setAddAssetModalOpen(false); setAssetName(''); setAssetValue(''); setPurchaseDate(''); setIsDepreciable(false); setSalvageValue(''); setUsefulLife('') }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, color: 'rgba(255,255,255,0.7)', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: assetName ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.1)', border: '2.5px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', boxShadow: assetName ? '0 4px 16px rgba(37,99,235,0.4)' : 'none', transition: 'all 0.3s', flexShrink: 0 }}>
                  {assetName ? assetName.split(' ').map((w: string) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() : <Coins size={24} color="rgba(255,255,255,0.35)" />}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.1px', minHeight: 22 }}>{assetName || 'New Asset'}</div>
                  <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 12, marginTop: 3 }}>{assetValue ? `LKR ${Number(assetValue).toLocaleString()}` : 'No value set'}</div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="emp-drawer-body">

              {/* Section: Asset Details */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Hash size={13} color="#2563eb" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Asset Details</span>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <Hash size={11} color="#94a3b8" /> Asset Name *
                    </span>
                    <input value={assetName} onChange={e => setAssetName(e.target.value)} placeholder="e.g. Office Laptop" style={{ ...ASSET_INPUT }} onFocus={assetFocusIn} onBlur={assetFocusOut} />
                  </label>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <DollarSign size={11} color="#94a3b8" /> Original Value (Cost) *
                    </span>
                    <input type="number" value={assetValue} onChange={e => setAssetValue(e.target.value)} placeholder="0.00" style={{ ...ASSET_INPUT }} onFocus={assetFocusIn} onBlur={assetFocusOut} />
                  </label>
                </div>

                <div>
                  <label style={{ display: 'grid', gap: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                      <Calendar size={11} color="#94a3b8" /> Purchase Date *
                    </span>
                    <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={{ ...ASSET_INPUT }} onFocus={assetFocusIn} onBlur={assetFocusOut} />
                  </label>
                </div>
              </div>

              <div style={{ height: 1, background: 'linear-gradient(to right, #e2e8f0, transparent)', marginBottom: 24 }} />

              {/* Section: Depreciation */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <TrendingDown size={13} color="#2563eb" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#475569' }}>Depreciation</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => setIsDepreciable(!isDepreciable)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                      border: `1.5px solid ${isDepreciable ? '#2563eb' : '#e2e8f0'}`,
                      background: isDepreciable ? 'rgba(37,99,235,0.08)' : '#f8fafc',
                      color: isDepreciable ? '#2563eb' : '#94a3b8',
                      boxShadow: isDepreciable ? '0 0 0 3px rgba(37,99,235,0.12)' : 'none'
                    }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isDepreciable ? '#2563eb' : '#cbd5e1'}`, background: isDepreciable ? '#2563eb' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                      {isDepreciable && <CheckCircle size={12} color="#fff" />}
                    </div>
                    This is a depreciable asset
                  </button>
                </div>

                {isDepreciable && (
                  <div style={{ display: 'grid', gap: 12, background: 'rgba(37,99,235,0.04)', padding: 16, borderRadius: 12, border: '1px solid rgba(37,99,235,0.1)' }}>
                    <div>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                          <TrendingDown size={11} color="#94a3b8" /> Depreciation Method *
                        </span>
                        <select value={depreciationMethod} onChange={e => setDepreciationMethod(e.target.value as 'STRAIGHT_LINE' | 'DOUBLE_DECLINING')} style={{ ...ASSET_INPUT }} onFocus={assetFocusIn} onBlur={assetFocusOut}>
                          <option value="STRAIGHT_LINE">Straight-Line Depreciation</option>
                          <option value="DOUBLE_DECLINING">Double-Declining Balance (DDB)</option>
                        </select>
                        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>{depreciationMethod === 'STRAIGHT_LINE' ? 'Best for: Office furniture, buildings — loses value steadily' : 'Best for: Technology, computers — becomes obsolete quickly'}</span>
                      </label>
                    </div>

                    <div>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                          <DollarSign size={11} color="#94a3b8" /> Salvage Value *
                        </span>
                        <input type="number" value={salvageValue} onChange={e => setSalvageValue(e.target.value)} placeholder="Estimated value at end of life" style={{ ...ASSET_INPUT }} onFocus={assetFocusIn} onBlur={assetFocusOut} />
                        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Estimated value when the asset reaches end of its useful life</span>
                      </label>
                    </div>

                    <div>
                      <label style={{ display: 'grid', gap: 5 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: '#64748b' }}>
                          <Clock size={11} color="#94a3b8" /> Useful Life (Years) *
                        </span>
                        <input type="number" value={usefulLife} onChange={e => setUsefulLife(e.target.value)} placeholder="e.g., 5" min="1" style={{ ...ASSET_INPUT }} onFocus={assetFocusIn} onBlur={assetFocusOut} />
                        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>Expected number of years the asset will be in service</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button type="button" onClick={() => { setAddAssetModalOpen(false); setAssetName(''); setAssetValue(''); setPurchaseDate(''); setIsDepreciable(false); setSalvageValue(''); setUsefulLife('') }} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={saveAsset} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}>
                + Save Asset
              </button>
            </div>

          </div>
        </>
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
