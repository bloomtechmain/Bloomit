# Section 10 — Fixed Assets

**Priority:** Optional  
**Time to prepare:** 1–2 hours  
**Who should fill this:** Finance manager or accountant  
**Source document:** Fixed asset register, depreciation schedule, purchase receipts

---

## What This Is

Fixed assets are physical items your company owns that have a useful life of more
than one year and significant value — vehicles, computers, machinery, furniture,
office equipment, and property. Bloomit tracks each asset's current book value
and calculates depreciation automatically.

---

## Data Fields Required

Provide one row per asset.

| Field | What It Is | Required | Example |
|-------|-----------|----------|---------|
| Asset Name | A clear name for the asset | ✅ Yes | Toyota HiAce Van — WP CAB-1234 |
| Purchase Value (LKR) | The original cost when purchased (what you paid) | ✅ Yes | 8,500,000.00 |
| Purchase Date | When the asset was acquired (DD/MM/YYYY) | ✅ Yes | 15/03/2021 |
| Depreciation Method | How the asset loses value over time | ✅ Yes | See options below |
| Salvage Value (LKR) | The estimated value at the end of its useful life | Optional | 500,000.00 |
| Useful Life (Years) | How many years the asset is expected to be usable | Optional | 5 |

---

## Depreciation Methods

| Method | What It Means | Best For |
|--------|-------------|---------|
| `STRAIGHT_LINE` | The asset loses equal value every year. Annual depreciation = (Cost − Salvage Value) ÷ Useful Life | Furniture, computers, equipment |
| `DOUBLE_DECLINING` | The asset loses more value in its early years, less later. Rate = (2 ÷ Useful Life) × Current Book Value | Vehicles, technology equipment |

**If you are unsure which method to use, check with your accountant.**
Sri Lanka does not mandate a specific method — consistency is most important.
If you have been using Straight Line in the past, continue with Straight Line.

---

## Worked Depreciation Example

**Asset:** Toyota HiAce Van  
**Purchase Value:** LKR 8,500,000  
**Salvage Value:** LKR 500,000  
**Useful Life:** 5 years  
**Method:** Straight Line  

```
Depreciable Amount = 8,500,000 − 500,000 = 8,000,000
Annual Depreciation = 8,000,000 ÷ 5 = 1,600,000 per year
Monthly Depreciation = 1,600,000 ÷ 12 = 133,333 per month
```

After 3 years (36 months):
```
Accumulated Depreciation = 133,333 × 36 = 4,799,988
Current Book Value = 8,500,000 − 4,799,988 = 3,700,012
```

---

## Sample Dataset

| Asset Name | Purchase Value (LKR) | Purchase Date | Method | Salvage Value (LKR) | Useful Life (Yrs) |
|-----------|---------------------|--------------|--------|--------------------|--------------------|
| Toyota HiAce Van — WP CAB-1234 | 8,500,000 | 15/03/2021 | STRAIGHT_LINE | 500,000 | 5 |
| Dell PowerEdge Server | 1,200,000 | 01/09/2022 | DOUBLE_DECLINING | 50,000 | 4 |
| Office Furniture — 3rd Floor | 850,000 | 10/06/2020 | STRAIGHT_LINE | 0 | 8 |
| Honda Generator 25kVA | 650,000 | 22/11/2021 | STRAIGHT_LINE | 100,000 | 7 |
| Air Conditioning Units (×6) | 1,440,000 | 05/01/2022 | STRAIGHT_LINE | 0 | 6 |
| MacBook Pro Laptops (×12) | 2,400,000 | 03/07/2023 | DOUBLE_DECLINING | 0 | 3 |
| Forklift — Warehouse | 3,200,000 | 18/04/2019 | STRAIGHT_LINE | 200,000 | 8 |

---

## What the System Calculates Automatically

Once your assets are loaded, Bloomit will automatically calculate:
- Current book value (purchase value minus accumulated depreciation)
- Monthly depreciation charge for each asset
- Full depreciation schedule until end of useful life
- Total accumulated depreciation per asset

You do not need to calculate any of these — just provide the original purchase
value, date, method, and useful life.

---

## Tips

**Use the original purchase price, not the current market value.**
Depreciation starts from what you paid, not what it is worth today in the market.

**If your asset is already partly depreciated at go-live:**
The system will calculate depreciation from the purchase date automatically.
It will show the correct accumulated depreciation and book value based on
how long you have owned the asset.

**Land is not depreciated.**
If you own land, enter it as a fixed asset with:
- Depreciation Method: `STRAIGHT_LINE`
- Salvage Value: same as Purchase Value
- Useful Life: 999 years
(This keeps it on the Balance Sheet at cost without depreciating it.)

**Group small items together if needed.**
If you bought 20 office chairs at LKR 15,000 each (total LKR 300,000), you can
enter them as one asset: "Office Chairs (×20) — LKR 300,000" rather than 20 rows.

**Your accountant's existing depreciation schedule is the best source.**
They will have the correct purchase dates, values, and methods used for tax purposes.
