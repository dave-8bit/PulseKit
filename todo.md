# Phase 8C - Backend Session Persistence

- [x] 1. Create `apps/api/src/services/session.service.ts` — upsertSession, touchSession, getSessionById
- [x] 2. Update `apps/api/src/services/event.service.ts` — add createEventWithTx
- [x] 3. Update `apps/api/src/controllers/events.controller.ts` — wrap in prisma.$transaction
- [ ] Run: npx prisma generate
- [ ] Run: npx tsc --noEmit -p apps/api/tsconfig.json
- [ ] Run: npx tsc --noEmit -p apps/web/tsconfig.json

