ALTER TABLE `customers`
  MODIFY COLUMN `google_sub` VARCHAR(255) NULL,
  ADD COLUMN `password_hash` VARCHAR(255) NULL AFTER `google_sub`;
