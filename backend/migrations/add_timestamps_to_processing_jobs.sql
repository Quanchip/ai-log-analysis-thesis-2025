-- Migration: Add timestamp columns to processing_jobs table
-- Created: 2025-11-21
-- Purpose: Enable Recent Activity feature with created_at and completed_at tracking

-- Add created_at column
ALTER TABLE processing_jobs
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Add completed_at column
ALTER TABLE processing_jobs
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

-- Update existing records with current timestamp for created_at
UPDATE processing_jobs
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

-- Update existing completed jobs with completed_at timestamp
UPDATE processing_jobs
SET completed_at = CURRENT_TIMESTAMP
WHERE status = 'completed' AND completed_at IS NULL;

-- Verify migration
SELECT COUNT(*) as total_jobs,
       COUNT(created_at) as with_created_at,
       COUNT(completed_at) as with_completed_at
FROM processing_jobs;
