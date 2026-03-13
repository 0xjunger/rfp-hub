-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Full-text search index
CREATE INDEX IF NOT EXISTS opportunities_fts_idx
  ON funding_opportunities
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(description,'')));

-- Trigram index for fuzzy title matching (duplicate detection)
CREATE INDEX IF NOT EXISTS opportunities_title_trgm_idx
  ON funding_opportunities
  USING GIN (title gin_trgm_ops);

-- URL indexes for exact duplicate detection
CREATE INDEX IF NOT EXISTS opportunities_source_url_idx
  ON funding_opportunities (source_url);

CREATE INDEX IF NOT EXISTS opportunities_application_url_idx
  ON funding_opportunities (application_url);
