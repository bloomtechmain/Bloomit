export type SchemeConfig = {
  name: string
  fullName: string
  employeeRate: number
  employerRate: number
  minEmployeeRate: number
  employeeEditable: boolean
  description: string
}

export type CountryPreset = {
  code: string
  label: string
  flag: string
  currency: string
  currencySymbol: string
  scheme1: SchemeConfig
  scheme2: SchemeConfig | null
  notes: string
}

export const COUNTRY_PRESETS: CountryPreset[] = [
  {
    code: 'lk',
    label: 'Sri Lanka',
    flag: '🇱🇰',
    currency: 'LKR',
    currencySymbol: 'LKR',
    scheme1: {
      name: 'EPF',
      fullName: "Employees' Provident Fund",
      employeeRate: 8,
      employerRate: 12,
      minEmployeeRate: 8,
      employeeEditable: true,
      description: 'Mandatory for private sector. Employee min 8%, employer 12% of gross salary.',
    },
    scheme2: {
      name: 'ETF',
      fullName: "Employees' Trust Fund",
      employeeRate: 0,
      employerRate: 3,
      minEmployeeRate: 0,
      employeeEditable: false,
      description: 'Employer-only contribution of 3% of gross salary.',
    },
    notes: 'EPF & ETF governed by the EPF Act & ETF Act. Contributions remitted to the Central Bank of Sri Lanka.',
  },
  {
    code: 'in',
    label: 'India',
    flag: '🇮🇳',
    currency: 'INR',
    currencySymbol: '₹',
    scheme1: {
      name: 'PF',
      fullName: 'Provident Fund (EPFO)',
      employeeRate: 12,
      employerRate: 12,
      minEmployeeRate: 0,
      employeeEditable: true,
      description: 'Employee & employer each contribute 12% of basic+DA. Employers with <20 employees may use reduced rates.',
    },
    scheme2: {
      name: 'ESI',
      fullName: 'Employees State Insurance',
      employeeRate: 0.75,
      employerRate: 3.25,
      minEmployeeRate: 0,
      employeeEditable: false,
      description: 'Applicable for salaries ≤ ₹21,000/month. Employee 0.75%, employer 3.25%. Add employee portion as Other Deduction.',
    },
    notes: 'PF governed by EPFO. ESI governed by ESIC. Voluntary VPF contributions can be added as allowances.',
  },
  {
    code: 'gb',
    label: 'United Kingdom',
    flag: '🇬🇧',
    currency: 'GBP',
    currencySymbol: '£',
    scheme1: {
      name: 'NI',
      fullName: 'National Insurance (Class 1)',
      employeeRate: 8,
      employerRate: 13.8,
      minEmployeeRate: 0,
      employeeEditable: true,
      description: 'Employee 8% on earnings between £12,570–£50,270/yr; 2% above. Employer 13.8% above secondary threshold.',
    },
    scheme2: {
      name: 'Pension',
      fullName: 'Workplace Pension (Auto-Enrolment)',
      employeeRate: 5,
      employerRate: 3,
      minEmployeeRate: 0,
      employeeEditable: true,
      description: 'Minimum employer 3%, employee 5% of qualifying earnings. Add employee portion as Other Deduction.',
    },
    notes: 'Auto-enrolment mandatory for eligible workers aged 22–State Pension Age. Income Tax (PAYE) handled separately.',
  },
  {
    code: 'us',
    label: 'United States',
    flag: '🇺🇸',
    currency: 'USD',
    currencySymbol: '$',
    scheme1: {
      name: 'Social Security',
      fullName: 'Social Security (OASDI)',
      employeeRate: 6.2,
      employerRate: 6.2,
      minEmployeeRate: 0,
      employeeEditable: false,
      description: 'Fixed at 6.2% each up to the annual wage base ($168,600 for 2024). Medicare is separate.',
    },
    scheme2: {
      name: 'Medicare',
      fullName: 'Medicare Tax (FICA)',
      employeeRate: 1.45,
      employerRate: 1.45,
      minEmployeeRate: 0,
      employeeEditable: false,
      description: 'Employee & employer each pay 1.45%. Additional 0.9% employee-only for wages >$200K. Add employee portion as Other Deduction.',
    },
    notes: 'Federal Income Tax (withholding) and state taxes are handled separately as Other Deductions. 401(k) contributions can be added as allowances.',
  },
  {
    code: 'au',
    label: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD',
    currencySymbol: 'A$',
    scheme1: {
      name: 'Super',
      fullName: 'Superannuation (SGC)',
      employeeRate: 0,
      employerRate: 11.5,
      minEmployeeRate: 0,
      employeeEditable: true,
      description: 'Employer pays 11.5% of ordinary time earnings (2024–25). Employees may make voluntary salary-sacrifice contributions.',
    },
    scheme2: null,
    notes: 'SGC rate rises to 12% from 1 July 2025. PAYG withholding (income tax) added as Other Deduction. No mandatory employee-side super contribution.',
  },
  {
    code: 'sg',
    label: 'Singapore',
    flag: '🇸🇬',
    currency: 'SGD',
    currencySymbol: 'S$',
    scheme1: {
      name: 'CPF',
      fullName: 'Central Provident Fund',
      employeeRate: 20,
      employerRate: 17,
      minEmployeeRate: 0,
      employeeEditable: true,
      description: 'For employees ≤55 earning >$750/month. Rates taper with age: 55–60: 15%/15%, 60–65: 9.5%/11.5%, 65+: 7%/9%.',
    },
    scheme2: null,
    notes: 'CPF contributions apply only to Singapore citizens and PRs. SDL (Skills Development Levy) at 0.25% of gross wages can be added as Other Deduction.',
  },
  {
    code: 'my',
    label: 'Malaysia',
    flag: '🇲🇾',
    currency: 'MYR',
    currencySymbol: 'RM',
    scheme1: {
      name: 'EPF',
      fullName: 'Employees Provident Fund (KWSP)',
      employeeRate: 11,
      employerRate: 13,
      minEmployeeRate: 0,
      employeeEditable: true,
      description: 'Employee 11% (or 9% by election), employer 13% for salaries ≤ RM5,000; 12% for > RM5,000.',
    },
    scheme2: {
      name: 'SOCSO',
      fullName: 'Social Security Organisation (PERKESO)',
      employeeRate: 0.5,
      employerRate: 1.75,
      minEmployeeRate: 0,
      employeeEditable: false,
      description: 'Employee 0.5%, employer 1.75% up to RM5,000 ceiling. Add employee portion as Other Deduction.',
    },
    notes: 'EIS (Employment Insurance System) at 0.2% each side also applies — add as Other Deduction. PCB (income tax) withheld separately.',
  },
  {
    code: 'za',
    label: 'South Africa',
    flag: '🇿🇦',
    currency: 'ZAR',
    currencySymbol: 'R',
    scheme1: {
      name: 'UIF',
      fullName: 'Unemployment Insurance Fund',
      employeeRate: 1,
      employerRate: 1,
      minEmployeeRate: 0,
      employeeEditable: false,
      description: 'Employee 1% and employer 1% of remuneration, capped at the annual remuneration ceiling.',
    },
    scheme2: {
      name: 'Pension',
      fullName: 'Pension / Provident Fund',
      employeeRate: 7.5,
      employerRate: 7.5,
      minEmployeeRate: 0,
      employeeEditable: true,
      description: 'Rates vary by fund rules. Common structure: employee & employer each contribute 7.5%. Add employee portion as Other Deduction.',
    },
    notes: 'PAYE (income tax) withheld separately. SDL (Skills Development Levy) at 1% of leviable amount paid by employer.',
  },
  {
    code: 'ae',
    label: 'UAE / Gulf',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'AED',
    scheme1: {
      name: 'GPSSA',
      fullName: 'General Pension & Social Security (UAE Nationals only)',
      employeeRate: 5,
      employerRate: 15,
      minEmployeeRate: 0,
      employeeEditable: true,
      description: 'Applies to UAE nationals only. Employee 5%, employer 15% (federal entity) or 12.5% (private). Expats are exempt.',
    },
    scheme2: null,
    notes: 'No income tax in UAE. Expatriate employees have no mandatory pension deductions — any contributions are voluntary. End-of-Service Gratuity can be tracked as Other Deduction.',
  },
  {
    code: 'custom',
    label: 'Custom',
    flag: '🌍',
    currency: '',
    currencySymbol: '',
    scheme1: {
      name: 'Statutory Deduction',
      fullName: 'Primary Statutory Deduction',
      employeeRate: 0,
      employerRate: 0,
      minEmployeeRate: 0,
      employeeEditable: true,
      description: 'Define your own statutory deduction with a custom name and rates.',
    },
    scheme2: {
      name: 'Employer Contribution',
      fullName: 'Secondary Employer Contribution',
      employeeRate: 0,
      employerRate: 0,
      minEmployeeRate: 0,
      employeeEditable: false,
      description: 'Optional secondary employer-side contribution with a custom name and rate.',
    },
    notes: 'Fully customisable. Enter scheme names and rates that match your local statutory requirements.',
  },
]

export const DEFAULT_PRESET_CODE = 'lk'

export function getPreset(code: string): CountryPreset {
  return COUNTRY_PRESETS.find(p => p.code === code) ?? COUNTRY_PRESETS[0]
}

export function getStoredPreset(): CountryPreset {
  try {
    const code = localStorage.getItem('payroll_country') ?? DEFAULT_PRESET_CODE
    return getPreset(code)
  } catch {
    return getPreset(DEFAULT_PRESET_CODE)
  }
}

export function storePresetCode(code: string): void {
  try {
    localStorage.setItem('payroll_country', code)
  } catch {}
}

export function getCustomEmployerRates(): { rate1: number; rate2: number } {
  try {
    return {
      rate1: Number(localStorage.getItem('payroll_custom_employer_rate1') ?? '0'),
      rate2: Number(localStorage.getItem('payroll_custom_employer2_rate') ?? '0'),
    }
  } catch {
    return { rate1: 0, rate2: 0 }
  }
}

export function storeCustomEmployerRates(rate1: number, rate2: number): void {
  try {
    localStorage.setItem('payroll_custom_employer_rate1', String(rate1))
    localStorage.setItem('payroll_custom_employer2_rate', String(rate2))
  } catch {}
}
