ALTER TABLE `customers`
  ADD COLUMN `adult_confirmed_at` TIMESTAMP(3) NULL AFTER `legal_consent_at`;
