-- VERIFICATION SCRIPT: List Active Partners Details

-- List all APPROVED (Active) Partners with details
SELECT 
    id,
    company_name,
    contact_email,
    status,
    created_at
FROM partners
WHERE status = 'approved'
ORDER BY created_at DESC;

-- Summary Count
SELECT count(*) as "Total Active Partners"
FROM partners
WHERE status = 'approved';
