import "dotenv/config";
import {
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { prisma } from "../src/db";
import type { AvailabilityStatus } from "../src/types";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const botPermissions = "2147486720";

const commands = [
  new SlashCommandBuilder().setName("wtus").setDescription("Check the WTUS bot connection"),
  new SlashCommandBuilder().setName("mytasks").setDescription("Show your open dashboard tasks"),
  new SlashCommandBuilder()
    .setName("available")
    .setDescription("Mark yourself available for live event help")
    .addStringOption((option) => option.setName("role").setDescription("What you can help with").setRequired(true))
    .addStringOption((option) =>
      option
        .setName("status")
        .setDescription("Availability status")
        .addChoices(
          { name: "Available", value: "available" },
          { name: "Maybe", value: "maybe" },
          { name: "Unavailable", value: "unavailable" },
        ),
    )
    .addNumberOption((option) => option.setName("hours").setDescription("How many hours this window lasts"))
    .addStringOption((option) => option.setName("notes").setDescription("Limits or context")),
  new SlashCommandBuilder().setName("eventroles").setDescription("Show your active live event assignments"),
].map((command) => command.toJSON());

async function registerCommands() {
  if (!token || !clientId || !guildId) {
    console.log("Bot registration skipped. Set DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID.");
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  } catch (error) {
    const discordError = error as { code?: number; status?: number };
    if (discordError.code === 50001 || discordError.status === 403) {
      console.error("Discord rejected command registration with Missing Access.");
      console.error("Make sure this exact bot application is installed in the WTUS server with the bot and applications.commands scopes.");
      console.error(`Invite URL: ${botInviteUrl()}`);
    }
    throw error;
  }
  console.log("WTUS bot commands registered.");
}

function botInviteUrl() {
  if (!clientId) return "Set DISCORD_CLIENT_ID first.";
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions: botPermissions,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function findDashboardUser(discordUserId: string) {
  return prisma.user.findUnique({
    where: { discordUserId },
    select: { id: true, name: true, discordHandle: true },
  });
}

async function requireDashboardUser(interaction: ChatInputCommandInteraction) {
  const user = await findDashboardUser(interaction.user.id);
  if (!user) {
    await interaction.reply({
      content: "Connect your Discord account to the WTUS dashboard first.",
      ephemeral: true,
    });
    return null;
  }
  return user;
}

async function handleTasks(interaction: ChatInputCommandInteraction) {
  const user = await requireDashboardUser(interaction);
  if (!user) return;

  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: user.id,
      status: { not: "done" },
    },
    orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
    take: 8,
    include: { section: true },
  });

  if (!tasks.length) {
    await interaction.reply({ content: "No open tasks assigned to you.", ephemeral: true });
    return;
  }

  await interaction.reply({
    content: tasks.map((task) => `- ${task.title} [${task.section?.name ?? "General"} / ${task.status}]`).join("\n"),
    ephemeral: true,
  });
}

async function handleAvailability(interaction: ChatInputCommandInteraction) {
  const user = await requireDashboardUser(interaction);
  if (!user) return;

  const helpRole = interaction.options.getString("role", true);
  const status = (interaction.options.getString("status") ?? "available") as AvailabilityStatus;
  const hours = Math.max(1, Math.min(interaction.options.getNumber("hours") ?? 2, 24));
  const notes = interaction.options.getString("notes");
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);

  await prisma.availabilityWindow.create({
    data: {
      userId: user.id,
      helpRole,
      status,
      startsAt,
      endsAt,
      notes,
    },
  });

  await interaction.reply({
    content: `Marked ${status} for ${helpRole} for ${hours} hour${hours === 1 ? "" : "s"}.`,
    ephemeral: true,
  });
}

async function handleEventRoles(interaction: ChatInputCommandInteraction) {
  const user = await requireDashboardUser(interaction);
  if (!user) return;

  const assignments = await prisma.liveEventAssignment.findMany({
    where: {
      userId: user.id,
      liveEvent: { status: "active" },
    },
    include: {
      liveEvent: true,
      liveEventRole: true,
    },
    take: 8,
  });

  if (!assignments.length) {
    await interaction.reply({ content: "No active live event assignments for you right now.", ephemeral: true });
    return;
  }

  await interaction.reply({
    content: assignments
      .map((assignment) => {
        const region = assignment.region ? ` / ${assignment.region}` : "";
        const platform = assignment.platform ? ` / ${assignment.platform}` : "";
        return `- ${assignment.liveEvent.name}: ${assignment.liveEventRole.name}${region}${platform} [${assignment.status}]`;
      })
      .join("\n"),
    ephemeral: true,
  });
}

async function handleInteraction(interaction: ChatInputCommandInteraction) {
  if (interaction.commandName === "wtus") await interaction.reply({ content: "WTUS bot is connected.", ephemeral: true });
  if (interaction.commandName === "mytasks") await handleTasks(interaction);
  if (interaction.commandName === "available") await handleAvailability(interaction);
  if (interaction.commandName === "eventroles") await handleEventRoles(interaction);
}

if (process.argv.includes("--invite-url")) {
  console.log(botInviteUrl());
  await prisma.$disconnect();
} else if (process.argv.includes("--register-only")) {
  await registerCommands();
  await prisma.$disconnect();
} else if (!token) {
  console.log("WTUS bot not started. Set DISCORD_BOT_TOKEN.");
  await prisma.$disconnect();
} else {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`WTUS bot signed in as ${readyClient.user.tag}.`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    try {
      await handleInteraction(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "Dashboard command failed.", ephemeral: true });
      } else {
        await interaction.reply({ content: "Dashboard command failed.", ephemeral: true });
      }
    }
  });

  await registerCommands();
  await client.login(token);
}
