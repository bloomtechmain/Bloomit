CREATE TABLE banks (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    branch VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE company_bank_accounts (
    id SERIAL PRIMARY KEY,
    bank_id INT NOT NULL,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(100),
    opening_balance NUMERIC(15,2) NOT NULL,
    current_balance NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bank_account_bank
        FOREIGN KEY (bank_id) REFERENCES banks(id)
);

CREATE TABLE bank_transactions (
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

CREATE TABLE projects (
    project_id SERIAL PRIMARY KEY,
    projects_name VARCHAR(200),
    customer_name VARCHAR(200),
    description TEXT,
    initial_cost_budget NUMERIC(12,2),
    extra_budget_allocation NUMERIC(12,2),
    payment_type VARCHAR(50),
    status VARCHAR(50)
);

CREATE TABLE vendors (
    vendor_id SERIAL PRIMARY KEY,
    vendor_name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(100),
    contact_phone VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payables (
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

    project_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payables_vendor
        FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),

    CONSTRAINT fk_payables_project
        FOREIGN KEY (project_id) REFERENCES projects(project_id)
);


