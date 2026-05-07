import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const globalRoles = [
  { key: "owner", name: "Owner" },
  { key: "operations_lead", name: "Operations Lead" },
  { key: "member", name: "Member" },
] as const;

const sections = [
  { key: "finance", name: "Finance", description: "Budget, subscriptions, and expense tracking" },
  { key: "forecasting", name: "Forecasting", description: "Forecast packages and event outlooks" },
  { key: "nowcasting", name: "Nowcasting", description: "Real-time monitoring and short-fuse updates" },
  { key: "youtube", name: "YouTube", description: "Stream planning, uploads, and live support" },
  { key: "graphics", name: "Graphics", description: "Visual products, templates, and brand assets" },
  { key: "facebook", name: "Facebook", description: "Posts, comments, and platform coverage" },
  { key: "development", name: "Development", description: "Internal tools and site/app improvements" },
  { key: "verification", name: "Verification", description: "Report validation and source checks" },
] as const;

async function main() {
  for (const role of globalRoles) {
    await prisma.globalRole.upsert({
      where: { key: role.key },
      update: { name: role.name },
      create: role,
    });
  }

  for (const section of sections) {
    await prisma.section.upsert({
      where: { key: section.key },
      update: {
        name: section.name,
        description: section.description,
      },
      create: section,
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
