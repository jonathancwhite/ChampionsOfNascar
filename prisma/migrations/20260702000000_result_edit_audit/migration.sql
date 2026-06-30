-- Edit audit (NASCAR-062): the admin who last entered/edited a result. Plain
-- id paired with the existing updatedAt — a lightweight who/when note.
ALTER TABLE "RaceResult" ADD COLUMN "lastEditedById" TEXT;
