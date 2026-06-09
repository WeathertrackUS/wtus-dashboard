import "dotenv/config";
import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js";
import { prisma } from "../src/db";
import { PluginRegistry } from "./core/registry";
import { CorePlugin } from "./plugins/core";
import { WeatherAlertsPlugin } from "./plugins/weather-alerts";
import { AlertDispatchPlugin } from "./plugins/alert-dispatch";
import { RoleManagerPlugin } from "./plugins/role-manager";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const botPermissions = "2415922176";

function botInviteUrl() {
  if (!clientId) return "Set DISCORD_CLIENT_ID first.";
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "bot applications.commands",
    permissions: botPermissions,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

async function registerCommands(registry: PluginRegistry) {
  if (!token || !clientId || !guildId) {
    console.log("Bot registration skipped. Set DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, and DISCORD_GUILD_ID.");
    return;
  }
  const rest = new REST({ version: "10" }).setToken(token);
  const commands = registry.getAllCommands();
  if (commands.length === 0) {
    console.log("No commands registered by any plugin.");
    return;
  }
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log(`Registered ${commands.length} WTUS bot commands.`);
  } catch (error) {
    const discordError = error as { code?: number; status?: number };
    if (discordError.code === 50001 || discordError.status === 403) {
      console.error("Discord rejected command registration with Missing Access.");
      console.error("Make sure this exact bot application is installed in the WTUS server with the bot and applications.commands scopes.");
      console.error(`Invite URL: ${botInviteUrl()}`);
    }
    throw error;
  }
}

function buildRegistry() {
  const registry = new PluginRegistry();
  registry.register(new CorePlugin());
  registry.register(new WeatherAlertsPlugin());
  registry.register(new AlertDispatchPlugin());
  registry.register(new RoleManagerPlugin());
  return registry;
}

if (process.argv.includes("--invite-url")) {
  console.log(botInviteUrl());
  await prisma.$disconnect();
} else if (process.argv.includes("--register-only")) {
  const registry = buildRegistry();
  await registry.loadAll();
  await registerCommands(registry);
  await prisma.$disconnect();
} else if (!token) {
  console.log("WTUS bot not started. Set DISCORD_BOT_TOKEN.");
  await prisma.$disconnect();
} else {
  const registry = buildRegistry();
  await registry.loadAll();
  await registerCommands(registry);

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers] });

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`WTUS bot signed in as ${readyClient.user.tag}.`);
    await registry.readyAll(readyClient);
  });

  await client.login(token);
}
