-- 0003: Remove the voice-recording pipeline (feature removed from the app).
-- Safe to run: the voice_recordings table is unused and facts.recording_id is
-- entirely NULL. Dropping the column first clears the FK, then the table.
ALTER TABLE "facts" DROP COLUMN IF EXISTS "recording_id";
DROP TABLE IF EXISTS "voice_recordings";
