ALTER TABLE `customers`
  ADD COLUMN `legal_consent_at` TIMESTAMP(3) NULL AFTER `email_verified`;
