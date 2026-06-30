-- Race scheduling timezone (NASCAR-050). Admins enter race times in this IANA
-- zone; the reminder cron computes the lead-day boundary on the race's local
-- date here. Default to US Eastern (NASCAR's home zone).
ALTER TABLE "League" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/New_York';
