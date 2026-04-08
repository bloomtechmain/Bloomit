-- ============================================================
-- Tenant Schema Template
-- This file is executed for every new tenant schema created.
-- Tables are ordered by dependency (referenced tables first).
-- Cross-schema refs to public.users resolve via search_path.
-- ============================================================

-- ------------------------------------------------------------
-- Banking
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS banks (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    branch VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_bank_accounts (
    id SERIAL PRIMARY KEY,
    bank_id INT NOT NULL,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(100),
    opening_balance NUMERIC(15,2) NOT NULL,
    current_balance NUMERIC(15,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bank_account_bank
        FOREIGN KEY (bank_id) REFERENCES banks(id)
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id SERIAL PRIMARY KEY,
    bank_account_id INT NOT NULL,
    transaction_type VARCHAR(10)
        CHECK (transaction_type IN ('DEBIT','CREDIT')),
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bank_transaction_account
        FOREIGN KEY (bank_account_id)
        REFERENCES company_bank_accounts(id)
);

CREATE TABLE IF NOT EXISTS debit_card (
    id SERIAL PRIMARY KEY,
    bank_account_id INT NOT NULL,
    card_number_last4 VARCHAR(4) NOT NULL,
    card_holder_name VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_debit_card_account
        FOREIGN KEY (bank_account_id) REFERENCES company_bank_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS debit_cards (
    id SERIAL PRIMARY KEY,
    bank_account_id INT NOT NULL,
    card_number_last4 VARCHAR(4) NOT NULL,
    card_holder_name VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_debit_cards_account
        FOREIGN KEY (bank_account_id) REFERENCES company_bank_accounts(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Vendors
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vendors (
    vendor_id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Projects → Contracts → Contract Items
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    project_name VARCHAR(200) NOT NULL,
    project_description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contracts (
    contract_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    contract_name VARCHAR(200) NOT NULL,
    customer_name VARCHAR(200),
    description TEXT,
    initial_cost_budget NUMERIC(12,2) DEFAULT 0,
    extra_budget_allocation NUMERIC(12,2) DEFAULT 0,
    payment_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_contract_project
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contract_items (
    contract_id INTEGER NOT NULL,
    requirements TEXT NOT NULL,
    service_category TEXT NOT NULL,
    unit_cost NUMERIC NOT NULL,
    requirement_type TEXT NOT NULL,
    PRIMARY KEY (contract_id, requirements),

    CONSTRAINT fk_contract_item_contract
        FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Payables & Receivables
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS payables (
    payable_id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL,
    payable_name VARCHAR(150) NOT NULL,
    description TEXT,

    payable_type VARCHAR(20)
        CHECK (payable_type IN ('ONE_TIME','RECURRING')),

    amount NUMERIC(12,2) NOT NULL,

    frequency VARCHAR(20)
        CHECK (frequency IN ('WEEKLY','MONTHLY','YEARLY')),

    start_date DATE,
    end_date DATE,

    contract_id INT,
    bank_account_id INT,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payables_vendor
        FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),

    CONSTRAINT fk_payables_contract
        FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE SET NULL,

    CONSTRAINT fk_payables_bank_account
        FOREIGN KEY (bank_account_id) REFERENCES company_bank_accounts(id)
);

CREATE TABLE IF NOT EXISTS payment_payables (
    payment_id SERIAL PRIMARY KEY,
    payable_id INT,
    payment_method VARCHAR(50),
    bank_account_id INT,
    payment_date DATE DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL,
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_payable
        FOREIGN KEY (payable_id) REFERENCES payables(payable_id) ON DELETE CASCADE,

    CONSTRAINT fk_payment_bank_account
        FOREIGN KEY (bank_account_id) REFERENCES company_bank_accounts(id)
);

CREATE TABLE IF NOT EXISTS receivables (
    receivable_id SERIAL PRIMARY KEY,
    payer_name VARCHAR(150) NOT NULL,
    receivable_name VARCHAR(150) NOT NULL,
    description TEXT,
    receivable_type VARCHAR(50),
    amount NUMERIC(12,2) NOT NULL,
    frequency VARCHAR(50),
    start_date DATE,
    end_date DATE,
    contract_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    bank_account_id INT,
    payment_method VARCHAR(50),
    reference_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_receivables_contract
        FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE SET NULL,

    CONSTRAINT fk_receivables_bank_account
        FOREIGN KEY (bank_account_id) REFERENCES company_bank_accounts(id)
);

-- ------------------------------------------------------------
-- Assets
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assets (
    id SERIAL PRIMARY KEY,
    asset_name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    purchase_date DATE NOT NULL,
    depreciation_method TEXT CHECK (depreciation_method IN ('STRAIGHT_LINE', 'DOUBLE_DECLINING')),
    salvage_value NUMERIC,
    useful_life INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Petty Cash
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS petty_cash_account (
    id SERIAL PRIMARY KEY,
    account_name VARCHAR(100) DEFAULT 'Petty Cash',
    current_balance NUMERIC(15,2) DEFAULT 0.00,
    monthly_float_amount NUMERIC(15,2) DEFAULT 0.00,
    last_replenished_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS petty_cash_transactions (
    id SERIAL PRIMARY KEY,
    petty_cash_account_id INTEGER,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('REPLENISHMENT', 'EXPENSE')),
    amount NUMERIC(15,2) NOT NULL,
    description TEXT,
    project_id INTEGER,
    source_bank_account_id INTEGER,
    payable_id INTEGER,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_petty_cash_account
        FOREIGN KEY (petty_cash_account_id) REFERENCES petty_cash_account(id) ON DELETE CASCADE
);


-- ------------------------------------------------------------
-- Employees
-- (user_id links to public.users via search_path)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_number VARCHAR(50) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30),
    dob DATE,
    nic VARCHAR(50),
    address TEXT,
    role VARCHAR(100),
    designation VARCHAR(150),
    employee_department VARCHAR(100),
    tax VARCHAR(100),
    hire_date DATE,
    manager_id INTEGER,
    user_id INTEGER,
    tenant_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,

    -- Payroll
    base_salary DECIMAL(12,2) DEFAULT 0,
    allowances JSONB DEFAULT '{}',
    epf_enabled BOOLEAN DEFAULT TRUE,
    epf_contribution_rate DECIMAL(5,2) DEFAULT 8.00,
    etf_enabled BOOLEAN DEFAULT TRUE,
    pto_allowance INTEGER DEFAULT 20,

    -- Bank details
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_branch VARCHAR(100),

    -- Emergency contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_relationship VARCHAR(50),
    emergency_contact_phone VARCHAR(20),

    -- Suspension tracking
    suspended_at TIMESTAMP,
    suspended_by INTEGER,
    suspended_reason TEXT,

    -- Termination tracking
    terminated_at TIMESTAMP,
    terminated_by INTEGER,
    terminated_reason TEXT,
    scheduled_purge_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patch existing employees tables missing the new columns
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS manager_id INTEGER;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS base_salary DECIMAL(12,2) DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances JSONB DEFAULT '{}';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS epf_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS epf_contribution_rate DECIMAL(5,2) DEFAULT 8.00;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS etf_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pto_allowance INTEGER DEFAULT 20;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_employees_scheduled_purge
    ON employees(scheduled_purge_date)
    WHERE scheduled_purge_date IS NOT NULL;

-- ------------------------------------------------------------
-- Documents
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    document_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    file_data BYTEA NOT NULL,
    uploaded_by INTEGER NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- ------------------------------------------------------------
-- Todos & Notes
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS todo_shares (
    id SERIAL PRIMARY KEY,
    todo_id INT NOT NULL,
    shared_with_user_id INT NOT NULL,
    permission VARCHAR(10) DEFAULT 'read' CHECK (permission IN ('read', 'write')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_todo_share_todo
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
    CONSTRAINT unique_todo_share
        UNIQUE (todo_id, shared_with_user_id)
);

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    color VARCHAR(20) DEFAULT '#ffffff',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS note_shares (
    id SERIAL PRIMARY KEY,
    note_id INT NOT NULL,
    shared_with_user_id INT NOT NULL,
    permission VARCHAR(10) DEFAULT 'read' CHECK (permission IN ('read', 'write')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_note_share_note
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    CONSTRAINT unique_note_share
        UNIQUE (note_id, shared_with_user_id)
);

-- ------------------------------------------------------------
-- Subscriptions
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    description VARCHAR(200) NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    due_date DATE NOT NULL,
    frequency VARCHAR(20) CHECK (frequency IN ('MONTHLY', 'YEARLY')),
    auto_pay BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Time Entries
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS time_entries (
    id SERIAL PRIMARY KEY,
    employee_id INT,
    project_id INT,
    contract_id INT,
    date DATE NOT NULL,
    clock_in TIMESTAMP,
    clock_out TIMESTAMP,
    total_hours NUMERIC(5,2),
    break_time_minutes INT DEFAULT 0,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_time_entry_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,

    CONSTRAINT fk_time_entry_project
        FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE SET NULL,

    CONSTRAINT fk_time_entry_contract
        FOREIGN KEY (contract_id) REFERENCES contracts(contract_id) ON DELETE SET NULL,

    CONSTRAINT fk_time_entry_approver
        FOREIGN KEY (approved_by) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_status ON time_entries(status);

-- ------------------------------------------------------------
-- Purchase Orders
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    requested_by_user_id INTEGER,
    requested_by_name VARCHAR(255),
    requested_by_title VARCHAR(255),
    vendor_id INTEGER,
    vendor_invoice_number VARCHAR(100),
    project_id INTEGER,

    subtotal DECIMAL(12,2) DEFAULT 0,
    sales_tax DECIMAL(12,2) DEFAULT 0,
    shipping_handling DECIMAL(12,2) DEFAULT 0,
    banking_fee DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,

    payment_method VARCHAR(50),
    check_number VARCHAR(100),
    payment_amount DECIMAL(12,2),
    payment_date DATE,

    status VARCHAR(50) DEFAULT 'PENDING',
    approved_by_user_id INTEGER,
    approved_by_name VARCHAR(255),
    approved_by_title VARCHAR(255),
    approved_at TIMESTAMP,
    rejection_reason TEXT,

    receipt_document_url TEXT,
    receipt_uploaded_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_po_vendor
        FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),

    CONSTRAINT fk_po_contract
        FOREIGN KEY (project_id) REFERENCES contracts(contract_id)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER,
    quantity INTEGER NOT NULL,
    description TEXT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total DECIMAL(12,2) NOT NULL,
    line_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_po_item_po
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_po_number ON purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON purchase_order_items(purchase_order_id);


-- ------------------------------------------------------------
-- Quotes
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quotes (
    quote_id SERIAL PRIMARY KEY,
    quote_number VARCHAR(20) UNIQUE NOT NULL,
    template_type VARCHAR(20) CHECK (template_type IN ('RESTAURANT', 'RETAIL')),
    company_name VARCHAR(200) NOT NULL,
    company_address TEXT,
    date_of_issue DATE NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    total_due NUMERIC(12,2) NOT NULL,
    notes TEXT,
    status VARCHAR(20) CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'FOLLOW_UP')) DEFAULT 'DRAFT',
    assigned_to INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quote_items (
    item_id SERIAL PRIMARY KEY,
    quote_id INT,
    description VARCHAR(200) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL,
    total NUMERIC(12,2) NOT NULL,

    CONSTRAINT fk_quote_item_quote
        FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quote_additional_services (
    service_id SERIAL PRIMARY KEY,
    quote_id INT,
    service_name VARCHAR(200) NOT NULL,
    price NUMERIC(12,2) NOT NULL,

    CONSTRAINT fk_quote_service_quote
        FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quote_status_history (
    history_id SERIAL PRIMARY KEY,
    quote_id INT,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_by INT,
    notes TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_quote_history_quote
        FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS quote_reminders (
    reminder_id SERIAL PRIMARY KEY,
    quote_id INT NOT NULL,
    reminder_date DATE NOT NULL,
    reminder_type VARCHAR(20) CHECK (reminder_type IN ('AUTO', 'MANUAL')) DEFAULT 'MANUAL',
    reminder_status VARCHAR(20) CHECK (reminder_status IN ('PENDING', 'SENT', 'DISMISSED')) DEFAULT 'PENDING',
    created_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reminder_quote
        FOREIGN KEY (quote_id) REFERENCES quotes(quote_id) ON DELETE CASCADE,

    CONSTRAINT fk_reminder_employee
        FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reminder_date_status ON quote_reminders(reminder_date, reminder_status);
CREATE INDEX IF NOT EXISTS idx_reminder_quote_id ON quote_reminders(quote_id);

CREATE TABLE IF NOT EXISTS quote_reminder_settings (
    setting_id SERIAL PRIMARY KEY,
    days_after_sent INT NOT NULL DEFAULT 3,
    days_after_follow_up INT NOT NULL DEFAULT 7,
    enable_email_notifications BOOLEAN DEFAULT TRUE,
    enable_dashboard_notifications BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO quote_reminder_settings (days_after_sent, days_after_follow_up, enable_email_notifications, enable_dashboard_notifications)
SELECT 3, 7, TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM quote_reminder_settings);

-- ------------------------------------------------------------
-- Loans
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    loan_account_number VARCHAR(100) UNIQUE NOT NULL,
    borrower_name VARCHAR(200) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    loan_amount NUMERIC(15,2) NOT NULL CHECK (loan_amount > 0),
    total_installments INTEGER NOT NULL CHECK (total_installments > 0),
    monthly_installment_amount NUMERIC(15,2) NOT NULL CHECK (monthly_installment_amount > 0),
    interest_rate NUMERIC(5,2) CHECK (interest_rate >= 0),
    loan_type VARCHAR(50) NOT NULL DEFAULT 'BUSINESS',
    start_date DATE NOT NULL,
    calculated_end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'PAID_OFF')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loan_installments (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL,
    installment_number INTEGER NOT NULL CHECK (installment_number > 0),
    due_date DATE NOT NULL,
    scheduled_amount NUMERIC(15,2) NOT NULL CHECK (scheduled_amount > 0),
    payment_date DATE,
    amount_paid NUMERIC(15,2) CHECK (amount_paid >= 0),
    paid_bank VARCHAR(150),
    payment_description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'PARTIAL')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_loan_installment_loan
        FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE,

    CONSTRAINT unique_loan_installment
        UNIQUE (loan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_borrower ON loans(borrower_name);
CREATE INDEX IF NOT EXISTS idx_loan_installments_loan_id ON loan_installments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_installments_status ON loan_installments(status);
CREATE INDEX IF NOT EXISTS idx_loan_installments_due_date ON loan_installments(due_date);

-- ------------------------------------------------------------
-- PTO Requests
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pto_requests (
    id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL,
    manager_id INT,
    absence_type VARCHAR(50) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_hours NUMERIC(6,2) NOT NULL,
    project_id INT,
    cover_person_id INT,
    cover_person_name VARCHAR(200),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    manager_comments TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pto_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,

    CONSTRAINT fk_pto_manager
        FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL,

    CONSTRAINT fk_pto_contract
        FOREIGN KEY (project_id) REFERENCES contracts(contract_id) ON DELETE SET NULL,

    CONSTRAINT fk_pto_cover
        FOREIGN KEY (cover_person_id) REFERENCES employees(id) ON DELETE SET NULL,

    CONSTRAINT check_pto_status CHECK (status IN ('pending', 'approved', 'denied')),
    CONSTRAINT check_pto_dates CHECK (to_date >= from_date)
);

CREATE INDEX IF NOT EXISTS idx_pto_employee ON pto_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_pto_status ON pto_requests(status);
CREATE INDEX IF NOT EXISTS idx_pto_manager ON pto_requests(manager_id);
CREATE INDEX IF NOT EXISTS idx_pto_dates ON pto_requests(from_date, to_date);

-- ------------------------------------------------------------
-- Default petty cash seed row
-- ------------------------------------------------------------

INSERT INTO petty_cash_account (account_name, current_balance, monthly_float_amount)
SELECT 'Petty Cash', 0.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM petty_cash_account);
