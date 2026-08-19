/**
 * Service-layer helpers for Session persistence.
 *
 * Architectural rule: session create/update logic lives exclusively here.
 * The controller must not call Prisma session methods directly.
 */

import type { Prisma } from "@prisma/client";

/**
 * Upsert (create-or-update) a session inside an existing transaction.
 *
 * - When the session_id does not exist: creates a new session row.
 * - When the session_id already exists: updates last_seen_at.
 * - Preserves started_at for existing sessions (never overwritten).
 * - Only persists anonymous_id when explicitly provided (does not clear
 *   an existing anonymous_id with undefined).
 */
export async function upsertSession(
  tx: Prisma.TransactionClient,
  params: {
    sessionId: string;
    workspaceId: string;
    userAgent: string;
    anonymousId?: string;
    timestamp: Date;
  }
): Promise<void> {
  // Build update payload — always bump last_seen_at
  const updateData: Prisma.SessionUpdateInput = {
    last_seen_at: params.timestamp,
  };

  // Only persist anonymous_id when the caller explicitly provides it.
  // This prevents overwriting a stored anonymous_id with undefined when
  // the incoming event does not carry the field.
  if (params.anonymousId !== undefined) {
    updateData.anonymous_id = params.anonymousId;
  }

  await tx.session.upsert({
    where: { id: params.sessionId },
    create: {
      id: params.sessionId,
      workspace_id: params.workspaceId,
      user_agent: params.userAgent,
      anonymous_id: params.anonymousId ?? null,
      started_at: params.timestamp,
      last_seen_at: params.timestamp,
    },
    update: updateData,
  });
}

/**
 * Lightweight touch: update only last_seen_at for a known session.
 *
 * Useful when you already know the session exists and want to minimise
 * the write payload.
 */
export async function touchSession(
  tx: Prisma.TransactionClient,
  sessionId: string,
  timestamp: Date
): Promise<void> {
  await tx.session.update({
    where: { id: sessionId },
    data: { last_seen_at: timestamp },
  });
}

/**
 * Retrieve a session by its primary key.
 *
 * Intended for internal use (e.g. validation or read-after-write checks).
 */
export async function getSessionById(
  tx: Prisma.TransactionClient,
  sessionId: string
) {
  return tx.session.findUnique({
    where: { id: sessionId },
  });
}

