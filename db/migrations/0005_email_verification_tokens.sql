CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `token_hash` VARCHAR(64) NOT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `expires_at` TIMESTAMP(3) NOT NULL,
  `used_at` TIMESTAMP(3) NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`token_hash`),
  KEY `email_verification_customer_idx` (`customer_id`),
  CONSTRAINT `email_verification_tokens_customer_fk`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
