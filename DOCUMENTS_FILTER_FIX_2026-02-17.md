# Employee Portal Documents Filter Fix - February 17, 2026

## Problem Summary
Employee Portal showed "0 documents" while Admin Document Bank had 3 documents visible (letterheads and employee handbook).

## Root Cause
**Mismatch between filter and actual data:**

The employee portal was filtering for document categories:
```typescript
WHERE d.file_type IN ('policy', 'handbook', 'form', 'template')
```

But the admin upload stores MIME types in `file_type`:
```typescript
file_type: req.file.mimetype  // e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
```

**Result:** No documents matched the filter, so employees saw 0 documents.

## Solution Applied
**Option A: Quick Fix** - Removed the file_type filter to show all documents to employees.

### Changes Made

#### File: `backend/src/controllers/employeePortalController.ts`

**1. Fixed `getDocuments()` function:**
```typescript
// OLD (filtered, no matches):
WHERE d.file_type IN ('policy', 'handbook', 'form', 'template')

// NEW (show all documents):
WHERE 1=1
```

**2. Fixed `downloadDocument()` function:**
```typescript
// OLD (filtered, blocked downloads):
WHERE d.id = $1
  AND d.file_type IN ('policy', 'handbook', 'form', 'template')

// NEW (allow all downloads):
WHERE d.id = $1
```

## Deployment Status

✅ **Changes committed:** `7d6d411`  
✅ **Pushed to GitHub:** February 17, 2026, 12:32 AM CST  
✅ **Railway deployment:** Triggered automatically  

## Expected Result

After Railway redeploys (within 2-3 minutes):

1. **Employee Portal Documents Page:**
   - Should now display all 3 documents
   - BLOOMSWIFTPOS_LETTERHEAD
   - Bloomtech_LetterHead
   - BloomTech Pvt Ltd. Employee Handbook

2. **Download functionality:**
   - Employees can download any document
   - Files served directly from database (BYTEA)

## Testing Checklist

- [ ] Employee portal shows 3 documents (was 0)
- [ ] Document names display correctly
- [ ] File sizes display correctly  
- [ ] Upload dates display correctly
- [ ] Search functionality works
- [ ] Download buttons work for each document
- [ ] Downloaded files open correctly

## Technical Details

### Database Schema
- `documents.file_type` = MIME type (e.g., 'application/pdf')
- `documents.file_data` = BYTEA (binary file data)
- `documents.upload_date` = Timestamp
- `documents.document_name` = Display name

### Future Enhancement Options

**Option B: Proper Categorization**
Add a separate `category` column to documents table:
```sql
ALTER TABLE documents ADD COLUMN category VARCHAR(50);
```

Then update admin upload to set category:
- policy
- handbook
- form
- template
- general

This would allow proper filtering while maintaining MIME types in `file_type`.

**Option C: Access Control**
Add `is_employee_accessible` boolean column:
```sql
ALTER TABLE documents ADD COLUMN is_employee_accessible BOOLEAN DEFAULT false;
```

Admin can toggle which documents employees can see.

## Files Modified
- `backend/src/controllers/employeePortalController.ts`

## Rollback Plan

If issues arise:
```bash
git revert 7d6d411
git push origin main
```

---
**Fix applied by:** Cline AI Assistant  
**Date:** February 17, 2026, 12:32 AM CST  
**Commits:** f1abba6 (schema fix), 7d6d411 (filter fix)  
**Status:** ✅ Deployed to Railway
