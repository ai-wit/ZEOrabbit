-- Add point usage fields for product orders
ALTER TABLE `ProductOrder`
  ADD COLUMN `pointsAppliedKrw` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `payableAmountKrw` INTEGER NOT NULL DEFAULT 0;

