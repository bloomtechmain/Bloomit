# Section 07 — Projects & Contracts

**Priority:** Recommended  
**Time to prepare:** 1–3 hours  
**Who should fill this:** Project manager or operations manager  
**Source document:** Project register, contracts folder, client agreements

---

## What This Is

Bloomit organises work in a three-level hierarchy:

```
Project
  └── Contract (one project can have multiple contracts)
        └── Contract Items (line items / deliverables within the contract)
```

- A **Project** is the top-level engagement (e.g., "Head Office Fit-Out for XYZ Corp")
- A **Contract** is a specific agreement under that project (e.g., "Phase 1 — Civil Works")
- **Contract Items** are the individual line items or scope items within each contract

---

## Part A — Projects

Provide one row per active project.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Project Name | Short, clear name for the project | ✅ Yes | Head Office Fit-Out — XYZ Corp |
| Project Description | Brief description of what the project is | Optional | Full renovation of client's 5-floor office building |
| Status | Current stage of the project | ✅ Yes | See options below |

**Project Status options:**
- `active` — currently in progress
- `pending` — not yet started / awaiting sign-off
- `completed` — finished
- `on hold` — temporarily paused

### Sample Project Dataset

| Project Name | Description | Status |
|-------------|-------------|--------|
| Head Office Fit-Out — XYZ Corp | Full renovation of 5-floor office | active |
| ERP Implementation — ABC Bank | System deployment and training | active |
| Annual Maintenance — City Hotel | Preventive maintenance contract | active |
| Website Redesign — National Trust | Corporate website and mobile app | pending |
| Factory Extension — DEF Mills | Civil and structural works | completed |

---

## Part B — Contracts

For each contract under a project, provide:

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Project Name | Which project this contract belongs to (must match Part A) | ✅ Yes | Head Office Fit-Out — XYZ Corp |
| Contract Name | Name of this specific contract | ✅ Yes | Phase 1 — Civil Works |
| Customer Name | The client / customer for this contract | Optional | XYZ Corporation (Pvt) Ltd |
| Description | What this contract covers | Optional | Foundation, columns, slab work |
| Initial Cost Budget (LKR) | The budgeted cost to deliver this contract | Optional | 12,500,000.00 |
| Extra Budget Allocation (LKR) | Any approved budget additions | Optional | 500,000.00 |
| Payment Type | How the client pays | Optional | See options below |
| Status | Current state of this contract | ✅ Yes | See options below |

**Payment Type options:**
- `Milestone` — paid on completion of defined milestones
- `Monthly` — fixed monthly payment
- `Lump Sum` — single payment on completion
- `Progress Claim` — payment based on work completed each period
- `Retainer` — fixed monthly fee

**Contract Status options:**
- `pending` — signed but not yet started
- `active` — currently being delivered
- `completed` — all deliverables done
- `on hold` — paused

### Sample Contract Dataset

| Project | Contract Name | Customer | Budget (LKR) | Payment Type | Status |
|---------|-------------|----------|-------------|-------------|--------|
| Head Office Fit-Out — XYZ Corp | Phase 1 — Civil Works | XYZ Corporation (Pvt) Ltd | 12,500,000 | Milestone | active |
| Head Office Fit-Out — XYZ Corp | Phase 2 — Interior Fit-Out | XYZ Corporation (Pvt) Ltd | 8,200,000 | Milestone | pending |
| ERP Implementation — ABC Bank | Phase 1 — Discovery & Design | ABC Bank PLC | 3,500,000 | Milestone | active |
| Annual Maintenance — City Hotel | Year 3 Maintenance Agreement | City Hotel (Pvt) Ltd | 1,800,000 | Monthly | active |

---

## Part C — Contract Items (Line Items / Scope Items)

For each contract, list the individual work items or deliverables. These make up the
detailed scope and unit costs.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Contract Name | Which contract this item belongs to | ✅ Yes | Phase 1 — Civil Works |
| Requirements / Description | Description of this line item | ✅ Yes | Excavation and foundation works |
| Service Category | Type of work | ✅ Yes | Civil Engineering |
| Unit Cost (LKR) | Cost per unit of this item | ✅ Yes | 2,500,000.00 |
| Requirement Type | How this item is measured | ✅ Yes | Fixed / Per Unit / Per Hour / Per m² |

### Sample Contract Items Dataset

| Contract | Description | Category | Unit Cost (LKR) | Type |
|----------|------------|----------|-----------------|------|
| Phase 1 — Civil Works | Excavation and foundation | Civil Engineering | 2,500,000 | Fixed |
| Phase 1 — Civil Works | Ground floor slab | Civil Engineering | 3,200,000 | Fixed |
| Phase 1 — Civil Works | Columns and beams | Civil Engineering | 4,100,000 | Fixed |
| Phase 1 — Civil Works | Supervision fee | Project Management | 700,000 | Fixed |
| Phase 2 — Interior Fit-Out | Partition walls | Interior | 1,800,000 | Fixed |
| Phase 2 — Interior Fit-Out | False ceiling | Interior | 2,400,000 | Fixed |

---

## Tips

**Only include active and recently completed projects.**
You do not need to enter every project from the last 10 years. Focus on:
- Projects currently in progress (active)
- Projects in the pipeline (pending)
- Contracts where payments are still expected or outstanding

**Project budgets vs. contract amounts:**
The budget fields are the **cost** to you (what you spend to deliver).
They are not the same as the revenue you charge the client.
Revenue tracking is done through Receivables (Section 08).

**You can add more projects any time after go-live.**
You do not need to have a complete project list before starting. Enter the most
important active ones, and add the rest at any time.
