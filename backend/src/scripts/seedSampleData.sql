-- Seed Sample Data for Bloomtech ERP System
-- This script inserts sample data into all tables in the correct order

-- 1. Insert Banks
INSERT INTO banks (bank_name, branch) VALUES
('Commercial Bank', 'Colombo Main Branch'),
('Sampath Bank', 'Kandy Branch'),
('Hatton National Bank', 'Nugegoda Branch'),
('Seylan Bank', 'Galle Road Branch');

-- 2. Insert Company Bank Accounts
INSERT INTO company_bank_accounts (bank_id, account_number, account_name, opening_balance, current_balance) VALUES
(1, '1234567890', 'Bloomtech Operations Account', 500000.00, 750000.00),
(2, '9876543210', 'Bloomtech Project Account', 300000.00, 450000.00),
(3, '5555666677', 'Bloomtech Savings Account', 1000000.00, 1200000.00);

-- 3. Insert Bank Transactions
INSERT INTO bank_transactions (bank_account_id, transaction_type, amount, description, transaction_date) VALUES
(1, 'CREDIT', 50000.00, 'Client payment for Project Alpha', '2025-12-01 10:30:00'),
(1, 'DEBIT', 15000.00, 'Office rent payment', '2025-12-05 14:20:00'),
(1, 'CREDIT', 75000.00, 'Project milestone payment', '2025-12-10 09:15:00'),
(2, 'CREDIT', 100000.00, 'Initial project funding', '2025-12-01 11:00:00'),
(2, 'DEBIT', 25000.00, 'Equipment purchase', '2025-12-08 16:45:00'),
(3, 'CREDIT', 200000.00, 'Investment income', '2025-12-15 10:00:00');

-- 4. Insert Employees
INSERT INTO employees (employee_number, first_name, last_name, email, phone, dob, nic, address, role, designation, tax) VALUES
('EMP001', 'Kasun', 'Perera', 'kasun.perera@bloomtech.com', '+94771234567', '1990-05-15', '199014501234', '123 Main Street, Colombo 03', 'Manager', 'Project Manager', '15'),
('EMP002', 'Nimali', 'Silva', 'nimali.silva@bloomtech.com', '+94772345678', '1992-08-22', '199223401234', '456 Galle Road, Colombo 04', 'Developer', 'Senior Developer', '12'),
('EMP003', 'Ranil', 'Fernando', 'ranil.fernando@bloomtech.com', '+94773456789', '1988-03-10', '198807101234', '789 Kandy Road, Kaduwela', 'Accountant', 'Finance Manager', '18'),
('EMP004', 'Sanduni', 'Wickramasinghe', 'sanduni.w@bloomtech.com', '+94774567890', '1995-11-30', '199533001234', '321 Temple Road, Nugegoda', 'Developer', 'Junior Developer', '10'),
('EMP005', 'Chaminda', 'Rathnayake', 'chaminda.r@bloomtech.com', '+94775678901', '1987-07-18', '198720001234', '654 Park Street, Mount Lavinia', 'Admin', 'HR Manager', '15');

-- 5. Insert Projects
INSERT INTO projects (projects_name, customer_name, description, initial_cost_budget, extra_budget_allocation, payment_type, status) VALUES
('E-Commerce Platform Development', 'TechMart Solutions', 'Complete e-commerce platform with payment gateway integration', 1500000.00, 200000.00, 'Milestone-based', 'In Progress'),
('Mobile Banking App', 'National Bank Ltd', 'iOS and Android mobile banking application', 2500000.00, 300000.00, 'Fixed Price', 'In Progress'),
('Inventory Management System', 'ABC Retail Chain', 'Cloud-based inventory management system for retail stores', 800000.00, 100000.00, 'Time and Materials', 'Completed'),
('CRM System Upgrade', 'Global Enterprises', 'Upgrade and modernization of existing CRM system', 1200000.00, 150000.00, 'Fixed Price', 'Planning');

-- 6. Insert Project Items
INSERT INTO project_items (project_id, requirements, service_category, unit_cost, requirement_type) VALUES
(1, 'Frontend Development - React', 'Development', 350000.00, 'Service'),
(1, 'Backend API Development', 'Development', 450000.00, 'Service'),
(1, 'Payment Gateway Integration', 'Integration', 200000.00, 'Service'),
(1, 'Cloud Hosting Setup', 'Infrastructure', 150000.00, 'Service'),
(2, 'iOS App Development', 'Development', 800000.00, 'Service'),
(2, 'Android App Development', 'Development', 750000.00, 'Service'),
(2, 'Security Implementation', 'Security', 400000.00, 'Service'),
(3, 'Database Design', 'Development', 180000.00, 'Service'),
(3, 'User Interface Design', 'Design', 120000.00, 'Service'),
(3, 'API Development', 'Development', 250000.00, 'Service');

-- 7. Insert Vendors
INSERT INTO vendors (vendor_name, contact_email, contact_phone, is_active) VALUES
('Cloud Services Lanka', 'info@cloudservices.lk', '+94112345678', TRUE),
('Office Supplies Hub', 'sales@officesupplies.lk', '+94113456789', TRUE),
('Tech Equipment Solutions', 'contact@techequipment.lk', '+94114567890', TRUE),
('Professional Services Co.', 'info@proservices.lk', '+94115678901', TRUE),
('Marketing Agency Plus', 'hello@marketingplus.lk', '+94116789012', FALSE);

-- 8. Insert Payables
INSERT INTO payables (vendor_id, payable_name, description, payable_type, amount, frequency, start_date, end_date, project_id, is_active) VALUES
(1, 'AWS Cloud Hosting', 'Monthly cloud hosting services', 'RECURRING', 45000.00, 'MONTHLY', '2025-01-01', '2025-12-31', 1, TRUE),
(2, 'Office Stationery', 'Monthly office supplies', 'RECURRING', 15000.00, 'MONTHLY', '2025-01-01', '2025-12-31', NULL, TRUE),
(3, 'MacBook Pro Purchase', 'Development laptops for team', 'ONE_TIME', 450000.00, NULL, '2025-12-15', NULL, NULL, TRUE),
(4, 'Legal Consultation', 'Contract review services', 'ONE_TIME', 75000.00, NULL, '2025-12-20', NULL, 2, TRUE),
(1, 'SSL Certificates', 'Annual SSL certificates renewal', 'RECURRING', 25000.00, 'YEARLY', '2025-01-01', '2026-01-01', NULL, TRUE);

-- 9. Insert Payment Payables
INSERT INTO payment_payables (payable_id, payment_method, bank_account_id, payment_date, amount, reference_number, status) VALUES
(1, 'Bank Transfer', 1, '2025-12-01', 45000.00, 'PAY-2025-001', 'Completed'),
(2, 'Bank Transfer', 1, '2025-12-05', 15000.00, 'PAY-2025-002', 'Completed'),
(3, 'Cheque', 2, '2025-12-15', 450000.00, 'CHQ-001234', 'Pending'),
(1, 'Bank Transfer', 1, '2026-01-01', 45000.00, 'PAY-2026-001', 'Completed');

-- 10. Insert Receivables
INSERT INTO receivables (payer_name, receivable_name, description, receivable_type, amount, frequency, start_date, end_date, project_id, is_active, bank_account_id, payment_method, reference_number) VALUES
('TechMart Solutions', 'E-Commerce Project - Milestone 1', 'Frontend development completion', 'ONE_TIME', 500000.00, NULL, '2025-12-10', NULL, 1, TRUE, 1, 'Bank Transfer', 'REC-2025-001'),
('TechMart Solutions', 'E-Commerce Project - Milestone 2', 'Backend development completion', 'ONE_TIME', 600000.00, NULL, '2026-01-15', NULL, 1, TRUE, 1, 'Bank Transfer', 'REC-2025-002'),
('National Bank Ltd', 'Mobile Banking App - Phase 1', 'Initial development phase payment', 'ONE_TIME', 1000000.00, NULL, '2025-12-20', NULL, 2, TRUE, 2, 'Bank Transfer', 'REC-2025-003'),
('ABC Retail Chain', 'Monthly Maintenance Fee', 'Inventory system maintenance', 'RECURRING', 50000.00, 'MONTHLY', '2026-01-01', '2026-12-31', 3, TRUE, 1, 'Bank Transfer', NULL),
('Global Enterprises', 'CRM Consulting Fee', 'Initial consultation and planning', 'ONE_TIME', 200000.00, NULL, '2026-01-10', NULL, 4, TRUE, 2, 'Cheque', 'REC-2025-004');

-- 11. Insert Assets
INSERT INTO assets (asset_name, value, purchase_date) VALUES
('Dell PowerEdge Server', 450000.00, '2024-06-15'),
('HP LaserJet Printer', 85000.00, '2024-08-20'),
('Conference Room Projector', 125000.00, '2024-09-10'),
('Office Furniture Set', 350000.00, '2024-05-01'),
('Network Switches and Routers', 180000.00, '2024-07-22'),
('CCTV Security System', 220000.00, '2024-10-15'),
('Air Conditioning Units (3)', 275000.00, '2024-06-30'),
('MacBook Pro 16" (Development)', 550000.00, '2025-12-15');

-- 12. Insert or Update Petty Cash Account
INSERT INTO petty_cash_account (account_name, monthly_float_amount, current_balance)
VALUES ('Petty Cash', 100000.00, 50000.00)
ON CONFLICT (id) DO UPDATE
SET current_balance = 50000.00, monthly_float_amount = 100000.00;

-- 13. Insert Debit Cards
INSERT INTO debit_cards (bank_account_id, card_number_last4, card_holder_name, expiry_date, is_active) VALUES
(1, '4521', 'Kasun Perera', '2027-12-31', TRUE),
(2, '8765', 'Ranil Fernando', '2028-06-30', TRUE),
(1, '3344', 'Chaminda Rathnayake', '2027-09-30', TRUE);

-- Display summary
SELECT 'Sample data inserted successfully!' as message;
SELECT COUNT(*) as bank_count FROM banks;
SELECT COUNT(*) as account_count FROM company_bank_accounts;
SELECT COUNT(*) as transaction_count FROM bank_transactions;
SELECT COUNT(*) as employee_count FROM employees;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as project_items_count FROM project_items;
SELECT COUNT(*) as vendor_count FROM vendors;
SELECT COUNT(*) as payables_count FROM payables;
SELECT COUNT(*) as payment_payables_count FROM payment_payables;
SELECT COUNT(*) as receivables_count FROM receivables;
SELECT COUNT(*) as assets_count FROM assets;
SELECT COUNT(*) as debit_cards_count FROM debit_cards;
