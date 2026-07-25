-- AlterTable: make ip_hash nullable in sessions
ALTER TABLE "sessions" ALTER COLUMN "ip_hash" DROP NOT NULL;

-- AlterTable: add session_id to events
ALTER TABLE "events" ADD COLUMN "session_id" UUID;

-- CreateIndex
CREATE INDEX "events_session_id_idx" ON "events"("session_id");

-- CreateIndex
CREATE INDEX "sessions_workspace_id_anonymous_id_idx" ON "sessions"("workspace_id", "anonymous_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

