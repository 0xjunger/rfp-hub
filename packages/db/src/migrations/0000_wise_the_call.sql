CREATE TYPE "public"."opportunity_status" AS ENUM('draft', 'open', 'closing_soon', 'closed', 'awarded');--> statement-breakpoint
CREATE TYPE "public"."publisher_role" AS ENUM('publisher', 'admin');--> statement-breakpoint
CREATE TYPE "public"."publisher_type" AS ENUM('community', 'verified_publisher');--> statement-breakpoint
CREATE TYPE "public"."rfp_type" AS ENUM('rfp', 'grant', 'bounty', 'fellowship', 'hackathon');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"changes" jsonb,
	"performed_by" varchar(255) NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "funding_opportunities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(500),
	"slug" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"summary" varchar(280) NOT NULL,
	"rfp_type" "rfp_type" NOT NULL,
	"funding_mechanism" varchar(100),
	"budget_min" numeric(15, 2),
	"budget_max" numeric(15, 2),
	"prize_pool" numeric(15, 2),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"project_duration" varchar(100),
	"status" "opportunity_status" DEFAULT 'draft' NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ecosystems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_id" uuid NOT NULL,
	"application_url" varchar(2048) NOT NULL,
	"source_url" varchar(2048) NOT NULL,
	"submitted_by" varchar(255) NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_by" varchar(255),
	"verified_at" timestamp with time zone,
	"publisher_type" "publisher_type" DEFAULT 'community' NOT NULL,
	"eligibility" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"required_credentials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact_email" varchar(255),
	"logo_url" varchar(2048),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"duplicate_of" uuid,
	"search_vector" text,
	CONSTRAINT "funding_opportunities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "funding_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"website_url" varchar(2048),
	"logo_url" varchar(2048),
	"contact_email" varchar(255),
	"ecosystems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "funding_sources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "publishers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"website_url" varchar(2048),
	"logo_url" varchar(2048),
	"contact_email" varchar(255) NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"api_key_hash" varchar(255) NOT NULL,
	"role" "publisher_role" DEFAULT 'publisher' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publishers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"summary" varchar(280) NOT NULL,
	"rfp_type" "rfp_type" NOT NULL,
	"application_url" varchar(2048) NOT NULL,
	"source_url" varchar(2048) NOT NULL,
	"budget_min" numeric(15, 2),
	"budget_max" numeric(15, 2),
	"prize_pool" numeric(15, 2),
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ecosystems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitter_email" varchar(255),
	"submitter_name" varchar(255),
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar(255),
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"opportunity_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "funding_opportunities" ADD CONSTRAINT "funding_opportunities_source_id_funding_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."funding_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_opportunity_id_funding_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."funding_opportunities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_performed_at_idx" ON "audit_log" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "opportunities_slug_idx" ON "funding_opportunities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "opportunities_status_idx" ON "funding_opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "opportunities_rfp_type_idx" ON "funding_opportunities" USING btree ("rfp_type");--> statement-breakpoint
CREATE INDEX "opportunities_source_id_idx" ON "funding_opportunities" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "opportunities_closes_at_idx" ON "funding_opportunities" USING btree ("closes_at");--> statement-breakpoint
CREATE INDEX "opportunities_created_at_idx" ON "funding_opportunities" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "opportunities_is_active_idx" ON "funding_opportunities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "funding_sources_slug_idx" ON "funding_sources" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "publishers_slug_idx" ON "publishers" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");