import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { GlobalRoleKey } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const roleLabels: Record<GlobalRoleKey, string> = {
  owner: "Owner",
  operations_lead: "Operations Lead",
  member: "Member",
};

function argValue(name: string) {
  const prefixed = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (prefixed) return prefixed.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function printUsage() {
  console.log("Usage:");
  console.log("  pnpm admin:grant-role --discord-id <discordUserId> --role owner");
  console.log("  pnpm admin:grant-role --discord-id <discordUserId> --role operations_lead");
  console.log("  pnpm admin:grant-role --discord-id <discordUserId> --role member");
}

const discordUserId = argValue("--discord-id");
const roleKey = argValue("--role") as GlobalRoleKey | undefined;

if (!discordUserId || !roleKey || !Object.prototype.hasOwnProperty.call(roleLabels, roleKey)) {
  printUsage();
  await prisma.$disconnect();
  process.exitCode = 1;
} else {
  const user = await prisma.user.findUnique({
    where: { discordUserId },
    select: {
      id: true,
      name: true,
      discordHandle: true,
      onboardingStatus: true,
      status: true,
    },
  });

  if (!user) {
    console.error(`No dashboard user found for Discord ID ${discordUserId}. Have them sign in with Discord first.`);
    await prisma.$disconnect();
    process.exitCode = 1;
  } else {
    const role = await prisma.globalRole.upsert({
      where: { key: roleKey },
      update: { name: roleLabels[roleKey] },
      create: { key: roleKey, name: roleLabels[roleKey] },
    });

    await prisma.userGlobalRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    console.log(`Granted ${roleLabels[roleKey]} to ${user.name ?? user.discordHandle ?? discordUserId}.`);
    if (user.onboardingStatus !== "verified" || user.status !== "active") {
      console.log("Note: this user still needs to complete onboarding before dashboard access.");
    }
    await prisma.$disconnect();
  }
}
