CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"status" text DEFAULT 'trialing' NOT NULL,
	"amount_paid_cents" integer DEFAULT 0 NOT NULL,
	"payment_date" timestamp,
	"renewal_date" timestamp,
	"canceled" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
