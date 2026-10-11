import type { PrismaClient } from "@prisma/client";

export async function incrementRateLimit(db: PrismaClient, key: string) {
  // The write lock stays held until the read completes, including across function instances.
  return db.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO login_attempts (\`key\`, attempts, reset_at)
      VALUES (${key}, 1, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 15 MINUTE))
      ON DUPLICATE KEY UPDATE
        attempts = IF(reset_at < UTC_TIMESTAMP(3), 1, attempts + 1),
        reset_at = IF(reset_at < UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 15 MINUTE), reset_at)
    `;
    const bucket = await transaction.loginAttempt.findUniqueOrThrow({ where: { key }, select: { attempts: true } });
    return bucket.attempts;
  }, { maxWait: 10000, timeout: 10000 });
}
