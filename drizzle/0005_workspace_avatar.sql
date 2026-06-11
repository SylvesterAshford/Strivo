-- 0005: Workspace avatar — shop photo / logo as a small (≤256px) JPEG data
-- URL stored in-DB (decided 2026-06-11; object storage deferred past pilot
-- scale). Run after 0004.
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "avatar_url" text;
