-- Roster management (NASCAR-032): soft-delete column on memberships. Keeping the
-- row preserves RaceParticipant/RaceResult links so removed members stay in
-- standings/history; access gates filter `removedAt IS NULL`.
ALTER TABLE "LeagueMembership" ADD COLUMN "removedAt" TIMESTAMP(3);
