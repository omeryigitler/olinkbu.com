export type AuditEventSeverity = 'info' | 'warning' | 'error';

export type AuditEvent = {
  action: string;
  severity?: AuditEventSeverity;
  userId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
};

function sanitizeMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => {
      const normalizedKey = key.toLowerCase();
      return !normalizedKey.includes('token') &&
        !normalizedKey.includes('secret') &&
        !normalizedKey.includes('key') &&
        !normalizedKey.includes('authorization');
    }),
  );
}

export function writeAuditLog(event: AuditEvent) {
  const payload = {
    timestamp: new Date().toISOString(),
    severity: event.severity || 'info',
    action: event.action,
    userId: event.userId || null,
    ip: event.ip || null,
    metadata: sanitizeMetadata(event.metadata) || {},
  };

  const line = JSON.stringify(payload);

  if (payload.severity === 'error') {
    console.error(`[audit] ${line}`);
    return;
  }

  if (payload.severity === 'warning') {
    console.warn(`[audit] ${line}`);
    return;
  }

  console.info(`[audit] ${line}`);
}
