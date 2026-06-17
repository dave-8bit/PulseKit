# TODO

- [ ] Implement Phase 2 idempotency enforcement in `apps/api/src/controllers/events.controller.ts` only:
  - [ ] Reorder logic: workspace resolution first, then duplicate check (before mapping/insert)
  - [ ] On duplicate: return 409 with `{ success:false, error:"Duplicate event" }`
  - [ ] Ensure race-safety: catch Prisma unique-constraint violation on create and return 409

