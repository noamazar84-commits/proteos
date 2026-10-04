import {
  boolean,
  int,
  mysqlTable,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core'

/** One row per Proteus account and its single Whop plan. */
export const customers = mysqlTable('customers', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  googleSub: varchar('google_sub', { length: 255 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  email: varchar('email', { length: 320 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  legalConsentAt: timestamp('legal_consent_at', { mode: 'date' }),
  adultConfirmedAt: timestamp('adult_confirmed_at', { mode: 'date' }),
  name: varchar('name', { length: 255 }).notNull(),
  givenName: varchar('given_name', { length: 200 }),
  familyName: varchar('family_name', { length: 200 }),
  pictureUrl: varchar('picture_url', { length: 2048 }),
  pathway: varchar('pathway', { length: 32 }),
  currentWeightKg: int('current_weight_kg', { unsigned: true }),
  goalWeightKg: int('goal_weight_kg', { unsigned: true }),
  activity: varchar('activity', { length: 16 }),
  planName: varchar('plan_name', { length: 100 }).notNull().default('Single plan'),
  /** not_started | trialing | active | past_due | canceled */
  status: varchar('status', { length: 32 }).notNull().default('not_started'),
  whopMembershipId: varchar('whop_membership_id', { length: 255 }).unique(),
  trialStartedAt: timestamp('trial_started_at', { mode: 'date' }),
  trialEndsAt: timestamp('trial_ends_at', { mode: 'date' }),
  subscriptionStartedAt: timestamp('subscription_started_at', { mode: 'date' }),
  amountPaidCents: int('amount_paid_cents', { unsigned: true }).notNull().default(0),
  paymentDate: timestamp('payment_date', { mode: 'date' }),
  renewalDate: timestamp('renewal_date', { mode: 'date' }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  canceledAt: timestamp('canceled_at', { mode: 'date' }),
  providerEventAt: timestamp('provider_event_at', { mode: 'date' }),
  lastLoginAt: timestamp('last_login_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
})

/** Opaque browser sessions; only a SHA-256 hash is stored in the database. */
export const userSessions = mysqlTable('user_sessions', {
  sessionHash: varchar('session_hash', { length: 64 }).primaryKey(),
  customerId: int('customer_id', { unsigned: true })
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

/** Idempotency ledger for Whop's at-least-once webhook delivery. */
export const whopWebhookEvents = mysqlTable('whop_webhook_events', {
  webhookId: varchar('webhook_id', { length: 255 }).primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventAt: timestamp('event_at', { mode: 'date' }),
  processedAt: timestamp('processed_at', { mode: 'date' }).defaultNow().notNull(),
})

/** Single-use, hashed email-verification tokens; raw tokens are never persisted. */
export const emailVerificationTokens = mysqlTable('email_verification_tokens', {
  tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
  customerId: int('customer_id', { unsigned: true })
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

/** Single-use, hashed owner login codes; raw codes are never persisted. */
export const adminLoginTokens = mysqlTable('admin_login_tokens', {
  tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
  email: varchar('email', { length: 320 }).notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export type Customer = typeof customers.$inferSelect
export type CustomerInsert = typeof customers.$inferInsert
export type UserSession = typeof userSessions.$inferSelect
