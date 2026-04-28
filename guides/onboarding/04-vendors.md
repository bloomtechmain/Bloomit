# Section 04 — Vendors / Suppliers

**Priority:** Must Have (Go-Live)  
**Time to prepare:** 1–3 hours (depending on number of vendors)  
**Who should fill this:** Procurement manager or accounts payable team  
**Source document:** Supplier list from existing accounting software, Excel, or your accounts payable folder

---

## What This Is

Your list of suppliers and vendors — every company or individual that you pay money
to for goods or services. Vendors are used when creating Purchase Orders and
recording Payables.

---

## Data Fields Required

Provide one row per vendor.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Vendor Name | Full business name of the supplier | ✅ Yes | Lanka Office Supplies (Pvt) Ltd |
| Contact Email | Email address for the vendor | Optional | orders@lankaofficeplies.lk |
| Contact Phone | Phone number for the vendor | Optional | +94 11 234 5678 |
| Active? | Is this vendor currently being used? | ✅ Yes | Yes |

---

## Sample Dataset

| Vendor Name | Contact Email | Contact Phone | Active? |
|-------------|--------------|---------------|---------|
| Lanka Office Supplies (Pvt) Ltd | orders@lankaofficeplies.lk | +94 11 234 5678 | Yes |
| Nawaloka Printers | info@nawaloka.lk | +94 11 256 7890 | Yes |
| Dialog Axiata PLC | enterprise@dialog.lk | +94 777 000 000 | Yes |
| CEB (Ceylon Electricity Board) | (no email) | 1987 | Yes |
| Mobitel (Pvt) Ltd | b2b@mobitel.lk | +94 71 100 0000 | Yes |
| SLT-Mobitel Broadband | enterprise@slt.lk | +94 11 200 0000 | Yes |
| Perera & Sons Hardware | (no email) | +94 11 345 6789 | Yes |
| MAS Holdings | supplier@mas.lk | +94 11 400 0000 | No |

---

## Tips

**Include all vendors, even infrequent ones.**
If you have ever created a Purchase Order or recorded a payment to them in the past
12 months, include them. You can mark rarely used vendors as Inactive.

**One entry per company.**
If the same supplier has multiple contacts or departments, use the main purchasing
contact. Do not create duplicate entries for the same vendor.

**Utility companies and telecoms count as vendors.**
Dialog, SLT, CEB, Water Board — any recurring payment to an external party should
have a vendor record.

**You do not need to enter historical transactions.**
We are only loading the vendor list at this stage. Unpaid bills and payment history
are entered separately in Section 09 (Payables).

---

## How Many Vendors Do You Need?

| Business Size | Typical Vendor Count |
|--------------|---------------------|
| Small (< 10 staff) | 10 – 30 vendors |
| Medium (10–50 staff) | 30 – 100 vendors |
| Large (50+ staff) | 100+ vendors |

Do not worry if your list is large — the template accepts unlimited rows.
