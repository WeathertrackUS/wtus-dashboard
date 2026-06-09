import "dotenv/config";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Client,
  Events,
  SlashCommandBuilder,
} from "discord.js";
import { prisma } from "../../../src/db";
import { fetchLeantimeTasks } from "../../../src/server/leantime";
import type { AvailabilityStatus, ReminderFrequency } from "../../../src/types";
import type { BotPlugin, PluginContext } from "../../types";
import type { Scheduler } from "../../core/scheduler";

const briefHourUtc = Number(process.env.DISCORD_BRIEF_HOUR_UTC ?? 14);
const sentBriefs = new Set<string>();

export class CorePlugin implements BotPlugin {
  name = "core";
  private client!: Client;

  async onLoad(_ctx: PluginContext): Promise<void> {}

  async onReady(client: Client): Promise<void> {
    this.client = client;
    client.on(Events.InteractionCreate, async (interaction) => {
      try {
        if (interaction.isChatInputCommand()) await this.handleInteraction(interaction);
        if (interaction.isButton()) await this.handleButton(interaction);
      } catch (error) {
        console.error(error);
        if (!interaction.isRepliable()) return;
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "Dashboard command failed.", ephemeral: true });
        } else {
          await interaction.reply({ content: "Dashboard command failed.", ephemeral: true });
        }
      }
    });
  }

  registerCommands() {
    return [
      new SlashCommandBuilder().setName("wtus").setDescription("Check the WTUS bot connection"),
      new SlashCommandBuilder().setName("mytasks").setDescription("Show your open dashboard tasks"),
      new SlashCommandBuilder().setName("brief").setDescription("Show your 60-second WTUS assignment brief"),
      new SlashCommandBuilder()
        .setName("preferences")
        .setDescription("Update your WTUS reminder cadence")
        .addStringOption((option) =>
          option
            .setName("cadence")
            .setDescription("How often you want routine reminders")
            .setRequired(true)
            .addChoices(
              { name: "Daily", value: "daily" },
              { name: "Weekly", value: "weekly" },
              { name: "Event only", value: "event_only" },
              { name: "Special requests only", value: "special_request_only" },
              { name: "None", value: "none" },
            ),
        ),
      new SlashCommandBuilder().setName("specials").setDescription("Show your open special requests"),
      new SlashCommandBuilder()
        .setName("requesthelp")
        .setDescription("DM a WTUS member a Yes/No special request")
        .addUserOption((option) => option.setName("member").setDescription("Member to ask").setRequired(true))
        .addStringOption((option) => option.setName("title").setDescription("Short request title").setRequired(true))
        .addStringOption((option) => option.setName("role").setDescription("Role or work needed").setRequired(true))
        .addStringOption((option) => option.setName("ask").setDescription("The short Yes/No ask").setRequired(true))
        .addStringOption((option) => option.setName("platform").setDescription("Platform or channel")),
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
    ].map((c) => c.toJSON());
  }

  registerSchedules(scheduler: Scheduler): void {
    scheduler.interval("send-briefs", () => this.sendAutomaticBriefs(), 15 * 60 * 1000);
  }

  private async findDashboardUser(discordUserId: string) {
    return prisma.user.findUnique({
      where: { discordUserId },
      select: { id: true, name: true, discordHandle: true },
    });
  }

  private async isOperator(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { globalRoles: { select: { role: { select: { key: true } } } } },
    });
    const roles = user?.globalRoles.map((assignment) => assignment.role.key) ?? [];
    return roles.includes("owner") || roles.includes("operations_lead");
  }

  private async requireDashboardUser(interaction: ChatInputCommandInteraction) {
    const user = await this.findDashboardUser(interaction.user.id);
    if (!user) {
      await interaction.reply({
        content: "Connect your Discord account to the WTUS dashboard first.",
        ephemeral: true,
      });
      return null;
    }
    return user;
  }

  private async handleInteraction(interaction: ChatInputCommandInteraction) {
    switch (interaction.commandName) {
      case "wtus":
        await interaction.reply({ content: "WTUS bot is connected.", ephemeral: true });
        break;
      case "mytasks":
        await this.handleTasks(interaction);
        break;
      case "brief":
        await this.handleBrief(interaction);
        break;
      case "preferences":
        await this.handlePreferences(interaction);
        break;
      case "specials":
        await this.handleSpecials(interaction);
        break;
      case "requesthelp":
        await this.handleRequestHelp(interaction);
        break;
      case "available":
        await this.handleAvailability(interaction);
        break;
      case "eventroles":
        await this.handleEventRoles(interaction);
        break;
    }
  }

  private async handleTasks(interaction: ChatInputCommandInteraction) {
    const user = await this.requireDashboardUser(interaction);
    if (!user) return;

    const tasks = await prisma.task.findMany({
      where: {
        OR: [{ assigneeId: user.id }, { assigneeIds: { has: user.id } }],
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

  private async buildBrief(discordUserId: string) {
    const user = await prisma.user.findUnique({
      where: { discordUserId },
      select: { id: true, name: true },
    });
    if (!user) return null;

    const [taskResult, assignments, requests] = await Promise.all([
      fetchLeantimeTasks({ assigneeId: user.id, limit: 10 }),
      prisma.liveEventAssignment.findMany({
        where: { userId: user.id, status: { not: "done" }, liveEvent: { status: { in: ["active", "planned"] } } },
        include: { liveEvent: true, liveEventRole: true },
        take: 3,
      }),
      prisma.specialRequest.findMany({
        where: { targetUserId: user.id, status: "open" },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

    const lines = [`WTUS brief for ${user.name ?? "you"}`];
    const tasks = taskResult.tasks.filter((task) => task.status !== "done").slice(0, 3);
    if (!tasks.length && !assignments.length && !requests.length) {
      lines.push("You are clear right now. No assigned dashboard tasks, event roles, or special asks.");
    }
    tasks.forEach((task) => lines.push(`Task: ${task.title} (${task.priority})`));
    assignments.forEach((assignment) =>
      lines.push(
        `Event: ${assignment.liveEvent.name} - ${assignment.liveEventRole.name}${assignment.platform ? ` on ${assignment.platform}` : ""}`,
      ),
    );
    requests.forEach((request) => lines.push(`Ask: ${request.prompt}`));
    return lines.join("\n");
  }

  private async sendAutomaticBriefs() {
    const now = new Date();
    if (now.getUTCHours() !== briefHourUtc) return;
    const dayKey = now.toISOString().slice(0, 10);
    const users = await prisma.user.findMany({
      where: {
        discordUserId: { not: null },
        status: "active",
        reminderPreference: {
          OR: [{ frequency: "daily" }, { frequency: "weekly" }, { frequency: "event_only" }],
        },
      },
      include: { reminderPreference: true },
    });

    for (const user of users) {
      if (!user.discordUserId || !user.reminderPreference) continue;
      if (user.reminderPreference.frequency === "weekly" && now.getUTCDay() !== 1) continue;
      const sendKey = `${dayKey}:${user.id}`;
      if (sentBriefs.has(sendKey)) continue;
      const brief = await this.buildBrief(user.discordUserId);
      if (!brief) continue;
      const hasOnlyClearMessage = brief.includes("You are clear right now.");
      if (hasOnlyClearMessage && !user.reminderPreference.sendClearForDay) continue;
      const discordUser = await this.client.users.fetch(user.discordUserId).catch(() => null);
      if (!discordUser) continue;
      await discordUser.send(brief).catch(() => null);
      sentBriefs.add(sendKey);
    }
  }

  private async handleBrief(interaction: ChatInputCommandInteraction) {
    const brief = await this.buildBrief(interaction.user.id);
    if (!brief) {
      await interaction.reply({ content: "Connect your Discord account to the WTUS dashboard first.", ephemeral: true });
      return;
    }
    await interaction.reply({ content: brief, ephemeral: true });
  }

  private async handlePreferences(interaction: ChatInputCommandInteraction) {
    const user = await this.requireDashboardUser(interaction);
    if (!user) return;
    const cadence = interaction.options.getString("cadence", true) as ReminderFrequency;
    await prisma.reminderPreference.upsert({
      where: { userId: user.id },
      update: { frequency: cadence },
      create: { userId: user.id, frequency: cadence },
    });
    await interaction.reply({ content: `Reminder cadence updated to ${cadence.replace(/_/g, " ")}.`, ephemeral: true });
  }

  private async handleSpecials(interaction: ChatInputCommandInteraction) {
    const user = await this.requireDashboardUser(interaction);
    if (!user) return;
    const requests = await prisma.specialRequest.findMany({
      where: { targetUserId: user.id, status: "open" },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    if (!requests.length) {
      await interaction.reply({ content: "No open special requests.", ephemeral: true });
      return;
    }
    await interaction.reply({
      content: requests.map((request) => `- ${request.title}: ${request.prompt}`).join("\n"),
      ephemeral: true,
    });
  }

  private async handleRequestHelp(interaction: ChatInputCommandInteraction) {
    const creator = await this.requireDashboardUser(interaction);
    if (!creator) return;
    if (!(await this.isOperator(creator.id))) {
      await interaction.reply({
        content: "Only WTUS owner/operations leads can send special requests.",
        ephemeral: true,
      });
      return;
    }

    const discordMember = interaction.options.getUser("member", true);
    const target = await this.findDashboardUser(discordMember.id);
    if (!target) {
      await interaction.reply({
        content: "That Discord user is not connected to a WTUS dashboard account.",
        ephemeral: true,
      });
      return;
    }

    const specialRequest = await prisma.specialRequest.create({
      data: {
        targetUserId: target.id,
        createdById: creator.id,
        title: interaction.options.getString("title", true),
        role: interaction.options.getString("role", true),
        prompt: interaction.options.getString("ask", true),
        platform: interaction.options.getString("platform"),
      },
    });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`special:${specialRequest.id}:accepted`)
        .setLabel("Yes")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`special:${specialRequest.id}:declined`)
        .setLabel("No")
        .setStyle(ButtonStyle.Secondary),
    );

    await discordMember.send({
      content: `WTUS special request: ${specialRequest.prompt}\nRole: ${specialRequest.role}${specialRequest.platform ? `\nPlatform: ${specialRequest.platform}` : ""}`,
      components: [row],
    });
    await interaction.reply({
      content: `Sent ${discordMember.tag} a Yes/No WTUS special request.`,
      ephemeral: true,
    });
  }

  private async handleAvailability(interaction: ChatInputCommandInteraction) {
    const user = await this.requireDashboardUser(interaction);
    if (!user) return;

    const helpRole = interaction.options.getString("role", true);
    const status = (interaction.options.getString("status") ?? "available") as AvailabilityStatus;
    const hours = Math.max(1, Math.min(interaction.options.getNumber("hours") ?? 2, 24));
    const notes = interaction.options.getString("notes");
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);

    await prisma.availabilityWindow.create({
      data: { userId: user.id, helpRole, status, startsAt, endsAt, notes },
    });

    await interaction.reply({
      content: `Marked ${status} for ${helpRole} for ${hours} hour${hours === 1 ? "" : "s"}.`,
      ephemeral: true,
    });
  }

  private async handleEventRoles(interaction: ChatInputCommandInteraction) {
    const user = await this.requireDashboardUser(interaction);
    if (!user) return;

    const assignments = await prisma.liveEventAssignment.findMany({
      where: { userId: user.id, liveEvent: { status: "active" } },
      include: { liveEvent: true, liveEventRole: true },
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

  private async handleButton(interaction: ButtonInteraction) {
    const [kind, requestId, response] = interaction.customId.split(":");
    if (kind !== "special" || (response !== "accepted" && response !== "declined")) return;
    const user = await this.findDashboardUser(interaction.user.id);
    if (!user) {
      await interaction.reply({ content: "Connect your Discord account to the WTUS dashboard first.", ephemeral: true });
      return;
    }
    const existing = await prisma.specialRequest.findUnique({ where: { id: requestId } });
    if (!existing || existing.targetUserId !== user.id) {
      await interaction.reply({ content: "That request is no longer available for your account.", ephemeral: true });
      return;
    }
    await prisma.specialRequest.update({
      where: { id: requestId },
      data: { status: response, respondedAt: new Date() },
    });
    await interaction.update({
      content: `WTUS special request ${response === "accepted" ? "accepted" : "declined"}.`,
      components: [],
    });
  }
}

export default CorePlugin;
