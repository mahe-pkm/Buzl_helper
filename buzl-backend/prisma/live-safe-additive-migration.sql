-- Safe live Supabase migration for Buzl Helper workflow/category fields.
-- Review before running. This file is intentionally additive-only:
-- no DROP, TRUNCATE, DELETE, destructive rename, or table rebuild.

BEGIN;

CREATE TABLE IF NOT EXISTS "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");

ALTER TABLE IF EXISTS "Product"
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "reference_thumbnail_url" TEXT,
  ADD COLUMN IF NOT EXISTS "thumbnail_cached_data" TEXT,
  ADD COLUMN IF NOT EXISTS "reference_thumbnail_cached_data" TEXT,
  ADD COLUMN IF NOT EXISTS "current_phase" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS "regen_image_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "generated_image_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "full_regen_image_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ProductActionLog_productId_createdAt_idx"
  ON "ProductActionLog"("productId", "createdAt");

CREATE INDEX IF NOT EXISTS "ProductActionLog_userId_createdAt_idx"
  ON "ProductActionLog"("userId", "createdAt");

COMMIT;
