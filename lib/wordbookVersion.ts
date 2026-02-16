type VersionDelta = {
  addedCount?: number;
  updatedCount?: number;
  deletedCount?: number;
};

type VersionTx = {
  wordbook: {
    update(args: unknown): Promise<{ contentVersion: number }>;
  };
  wordbookVersionLog: {
    create(args: unknown): Promise<unknown>;
    findMany(args: unknown): Promise<Array<{
      wordbookId: number;
      addedCount: number;
      updatedCount: number;
      deletedCount: number;
      version: number;
    }>>;
  };
};

export function sanitizeVersionDelta(delta: VersionDelta) {
  const addedCount = Math.max(0, Math.floor(delta.addedCount ?? 0));
  const updatedCount = Math.max(0, Math.floor(delta.updatedCount ?? 0));
  const deletedCount = Math.max(0, Math.floor(delta.deletedCount ?? 0));
  return { addedCount, updatedCount, deletedCount };
}

export async function bumpWordbookVersion(
  tx: VersionTx,
  wordbookId: number,
  delta: VersionDelta
): Promise<number> {
  const normalized = sanitizeVersionDelta(delta);
  if (normalized.addedCount + normalized.updatedCount + normalized.deletedCount <= 0) {
    return -1;
  }

  const wb = await tx.wordbook.update({
    where: { id: wordbookId },
    data: { contentVersion: { increment: 1 } },
    select: { contentVersion: true }
  });

  await tx.wordbookVersionLog.create({
    data: {
      wordbookId,
      version: wb.contentVersion,
      ...normalized
    }
  });

  return wb.contentVersion;
}

export function aggregateVersionLogs(
  logs: Array<{ addedCount: number; updatedCount: number; deletedCount: number }>
) {
  return logs.reduce(
    (acc, log) => {
      acc.addedCount += log.addedCount;
      acc.updatedCount += log.updatedCount;
      acc.deletedCount += log.deletedCount;
      return acc;
    },
    { addedCount: 0, updatedCount: 0, deletedCount: 0 }
  );
}
