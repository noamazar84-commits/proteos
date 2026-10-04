ALTER TABLE `customers`
  ADD COLUMN `current_weight_kg` INT UNSIGNED NULL,
  ADD COLUMN `goal_weight_kg` INT UNSIGNED NULL,
  ADD COLUMN `activity` VARCHAR(16) NULL;
