CREATE TABLE IF NOT EXISTS `admin_login_tokens` (
  `token_hash` VARCHAR(64) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `expires_at` TIMESTAMP(3) NOT NULL,
  `used_at` TIMESTAMP(3) NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`token_hash`),
  KEY `admin_login_tokens_email_idx` (`email`),
  KEY `admin_login_tokens_expires_idx` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
