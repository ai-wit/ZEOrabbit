-- Fix invalid empty enum values in BudgetLedger.reason
UPDATE `BudgetLedger`
SET `reason` = 'ADJUSTMENT'
WHERE `reason` = '';

