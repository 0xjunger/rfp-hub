import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const rfpTypeEnum = pgEnum('rfp_type', [
  'rfp',
  'grant',
  'bounty',
  'fellowship',
  'hackathon',
]);

export const opportunityStatusEnum = pgEnum('opportunity_status', [
  'draft',
  'open',
  'closing_soon',
  'closed',
  'awarded',
]);

export const publisherTypeEnum = pgEnum('publisher_type', ['community', 'verified_publisher']);

export const publisherRoleEnum = pgEnum('publisher_role', ['publisher', 'admin']);

export const submissionStatusEnum = pgEnum('submission_status', [
  'pending',
  'approved',
  'rejected',
]);

// Tables
export const fundingSources = pgTable(
  'funding_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    websiteUrl: varchar('website_url', { length: 2048 }),
    logoUrl: varchar('logo_url', { length: 2048 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    ecosystems: jsonb('ecosystems').$type<string[]>().notNull().default([]),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('funding_sources_slug_idx').on(table.slug)],
);

export const fundingOpportunities = pgTable(
  'funding_opportunities',
  {
    // Identity
    id: uuid('id').primaryKey().defaultRandom(),
    externalId: varchar('external_id', { length: 500 }),
    slug: varchar('slug', { length: 255 }).notNull().unique(),

    // Content
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description').notNull(),
    summary: varchar('summary', { length: 280 }).notNull(),
    rfpType: rfpTypeEnum('rfp_type').notNull(),

    // Funding
    fundingMechanism: varchar('funding_mechanism', { length: 100 }),
    budgetMin: numeric('budget_min', { precision: 15, scale: 2 }),
    budgetMax: numeric('budget_max', { precision: 15, scale: 2 }),
    prizePool: numeric('prize_pool', { precision: 15, scale: 2 }),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),

    // Dates
    opensAt: timestamp('opens_at', { withTimezone: true }),
    closesAt: timestamp('closes_at', { withTimezone: true }),
    projectDuration: varchar('project_duration', { length: 100 }),

    // Classification
    status: opportunityStatusEnum('status').notNull().default('draft'),
    categories: jsonb('categories').$type<string[]>().notNull().default([]),
    ecosystems: jsonb('ecosystems').$type<string[]>().notNull().default([]),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),

    // Source & Provenance
    sourceId: uuid('source_id')
      .notNull()
      .references(() => fundingSources.id),
    applicationUrl: varchar('application_url', { length: 2048 }).notNull(),
    sourceUrl: varchar('source_url', { length: 2048 }).notNull(),

    // Provenance
    submittedBy: varchar('submitted_by', { length: 255 }).notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    verifiedBy: varchar('verified_by', { length: 255 }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    publisherType: publisherTypeEnum('publisher_type').notNull().default('community'),

    // Metadata
    eligibility: jsonb('eligibility').$type<string[]>().notNull().default([]),
    requiredCredentials: jsonb('required_credentials').$type<string[]>().notNull().default([]),
    contactEmail: varchar('contact_email', { length: 255 }),
    logoUrl: varchar('logo_url', { length: 2048 }),

    // System
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    version: integer('version').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),
    duplicateOf: uuid('duplicate_of'),

    // Full-text search vector (auto-maintained via trigger)
    searchVector: text('search_vector'),
  },
  (table) => [
    index('opportunities_slug_idx').on(table.slug),
    index('opportunities_status_idx').on(table.status),
    index('opportunities_rfp_type_idx').on(table.rfpType),
    index('opportunities_source_id_idx').on(table.sourceId),
    index('opportunities_closes_at_idx').on(table.closesAt),
    index('opportunities_created_at_idx').on(table.createdAt),
    index('opportunities_is_active_idx').on(table.isActive),
  ],
);

export const publishers = pgTable(
  'publishers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    websiteUrl: varchar('website_url', { length: 2048 }),
    logoUrl: varchar('logo_url', { length: 2048 }),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    isVerified: boolean('is_verified').notNull().default(false),
    apiKeyHash: varchar('api_key_hash', { length: 255 }).notNull(),
    role: publisherRoleEnum('role').notNull().default('publisher'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('publishers_slug_idx').on(table.slug)],
);

export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Content
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description').notNull(),
    summary: varchar('summary', { length: 280 }).notNull(),
    rfpType: rfpTypeEnum('rfp_type').notNull(),
    applicationUrl: varchar('application_url', { length: 2048 }).notNull(),
    sourceUrl: varchar('source_url', { length: 2048 }).notNull(),

    // Funding
    budgetMin: numeric('budget_min', { precision: 15, scale: 2 }),
    budgetMax: numeric('budget_max', { precision: 15, scale: 2 }),
    prizePool: numeric('prize_pool', { precision: 15, scale: 2 }),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),

    // Dates
    opensAt: timestamp('opens_at', { withTimezone: true }),
    closesAt: timestamp('closes_at', { withTimezone: true }),

    // Classification
    categories: jsonb('categories').$type<string[]>().notNull().default([]),
    ecosystems: jsonb('ecosystems').$type<string[]>().notNull().default([]),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),

    // Submitter
    submitterEmail: varchar('submitter_email', { length: 255 }),
    submitterName: varchar('submitter_name', { length: 255 }),

    // Moderation
    status: submissionStatusEnum('status').notNull().default('pending'),
    reviewedBy: varchar('reviewed_by', { length: 255 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    opportunityId: uuid('opportunity_id').references(() => fundingOpportunities.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('submissions_status_idx').on(table.status),
    index('submissions_created_at_idx').on(table.createdAt),
  ],
);

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'opportunity', 'source', etc.
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(), // 'create', 'update', 'delete'
    changes: jsonb('changes').$type<Record<string, unknown>>(),
    performedBy: varchar('performed_by', { length: 255 }).notNull(),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_log_entity_idx').on(table.entityType, table.entityId),
    index('audit_log_performed_at_idx').on(table.performedAt),
  ],
);
