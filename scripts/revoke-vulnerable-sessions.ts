import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const verbose = process.argv.includes("--verbose");

  console.log("=== Session Revocation Script ===");
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("");

  // Find all sessions created via the vulnerable callback flow
  // The vulnerable flow was: manual JWT decode without verification
  // We revoke all sessions as a precaution
  const sessions = await prisma.session.findMany({
    select: {
      id: true,
      sessionToken: true,
      userId: true,
      expires: true,
      user: {
        select: {
          name: true,
          discordHandle: true,
          discordUserId: true,
          email: true,
        },
      },
    },
  });

  console.log(`Found ${sessions.length} total sessions`);

  if (verbose) {
    for (const session of sessions) {
      const userName =
        session.user.name || session.user.discordHandle || session.user.email || "unknown";
      console.log(
        `  - Session ${session.sessionToken.slice(0, 8)}... for user ${userName} (expires: ${session.expires.toISOString()})`,
      );
    }
  }

  if (dryRun) {
    console.log("\n[DRY RUN] Would delete all sessions listed above");
    console.log("Re-run without --dry-run to execute");
  } else {
    const result = await prisma.session.deleteMany();
    console.log(`\nDeleted ${result.count} sessions`);

    // Log affected users for audit
    const affectedUserIds = [...new Set(sessions.map((s) => s.userId))];
    console.log(`\nAffected users (${affectedUserIds.length}):`);
    for (const userId of affectedUserIds) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          discordHandle: true,
          discordUserId: true,
          email: true,
        },
      });
      const userName = user?.name || user?.discordHandle || user?.email || "unknown";
      console.log(`  - ${userName} (ID: ${userId})`);
    }

    console.log("\nAll sessions have been revoked.");
    console.log("Users will need to re-authenticate via the secure OIDC flow.");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
