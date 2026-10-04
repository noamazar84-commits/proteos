CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `google_sub` VARCHAR(255) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `given_name` VARCHAR(200) NULL,
  `family_name` VARCHAR(200) NULL,
  `picture_url` VARCHAR(2048) NULL,
  `pathway` VARCHAR(32) NULL,
  `plan_name` VARCHAR(100) NOT NULL DEFAULT 'Single plan',
  `status` VARCHAR(32) NOT NULL DEFAULT 'not_started',
  `whop_membership_id` VARCHAR(255) NULL,
  `trial_started_at` TIMESTAMP(3) NULL,
  `trial_ends_at` TIMESTAMP(3) NULL,
  `subscription_started_at` TIMESTAMP(3) NULL,
  `amount_paid_cents` INT UNSIGNED NOT NULL DEFAULT 0,
  `payment_date` TIMESTAMP(3) NULL,
  `renewal_date` TIMESTAMP(3) NULL,
  `cancel_at_period_end` TINYINT(1) NOT NULL DEFAULT 0,
  `canceled_at` TIMESTAMP(3) NULL,
  `provider_event_at` TIMESTAMP(3) NULL,
  `last_login_at` TIMESTAMP(3) NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `customers_google_sub_unique` (`google_sub`),
  UNIQUE KEY `customers_email_unique` (`email`),
  UNIQUE KEY `customers_whop_membership_unique` (`whop_membership_id`),
  KEY `customers_status_idx` (`status`),
  KEY `customers_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `session_hash` VARCHAR(64) NOT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `expires_at` TIMESTAMP(3) NOT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`session_hash`),
  KEY `user_sessions_customer_idx` (`customer_id`),
  KEY `user_sessions_expires_idx` (`expires_at`),
  CONSTRAINT `user_sessions_customer_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `whop_webhook_events` (
  `webhook_id` VARCHAR(255) NOT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `event_at` TIMESTAMP(3) NULL,
  `processed_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`webhook_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
