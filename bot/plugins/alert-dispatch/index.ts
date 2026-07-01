import { EmbedBuilder, Client, TextChannel } from "discord.js";
import { prisma } from "../../../src/db";
import type { BotPlugin, PluginContext, BotEvent } from "../../types";

const SEVERITY_COLORS: Record<string, number> = {
  minor: 0xf39c12,
  moderate: 0xe67e22,
  severe: 0xe74c3c,
  extreme: 0x8e44ad,
};

export class AlertDispatchPlugin implements BotPlugin {
  name = "alert-dispatch";
  private client!: Client;

  async onLoad(ctx: PluginContext): Promise<void> {
    ctx.dispatcher.subscribe("weather:alert", (event) => this.handleWeatherAlert(event));
  }

  async onReady(client: Client): Promise<void> {
    this.client = client;
  }

  private async handleWeatherAlert(event: BotEvent) {
    const data = event.data as {
      eventId?: string;
      eventType: string;
      title: string;
      description?: string;
      severity?: string;
      affectedArea?: string;
    };

    try {
      const [channels, dispatchRules] = await Promise.all([
        prisma.discordAlertChannel.findMany({ where: { alertType: data.eventType } }),
        prisma.dispatchRule.findMany({ where: { eventType: data.eventType, isActive: true } }),
      ]);

      if (channels.length === 0 && dispatchRules.length === 0) return;

      const color = SEVERITY_COLORS[data.severity ?? "minor"] ?? 0xf39c12;
      const embed = new EmbedBuilder()
        .setTitle(data.title)
        .setColor(color)
        .setTimestamp(event.timestamp);

      if (data.description) {
        embed.setDescription(data.description.slice(0, 2000));
      }
      if (data.affectedArea) {
        embed.addFields({ name: "Affected Area", value: data.affectedArea.slice(0, 1024) });
      }
      embed.addFields(
        { name: "Severity", value: data.severity ?? "unknown", inline: true },
        { name: "Type", value: data.eventType.replace(/_/g, " "), inline: true },
      );

      const allChannelIds = new Map<string, string[]>();
      for (const ch of channels) {
        const existing = allChannelIds.get(ch.channelId) ?? [];
        allChannelIds.set(ch.channelId, existing);
      }
      for (const rule of dispatchRules) {
        if (rule.channelId) {
          const existing = allChannelIds.get(rule.channelId) ?? [];
          allChannelIds.set(rule.channelId, existing);
        }
      }

      for (const [channelId] of allChannelIds) {
        await this.postToChannel(channelId, embed, dispatchRules, data);
      }

      for (const rule of dispatchRules) {
        await this.sendUserDMs(rule.pingUserIds, embed, data);
      }
    } catch (error) {
      console.error(
        `[AlertDispatch] Failed to dispatch weather alert (eventId=${data.eventId ?? "unknown"}, type=${data.eventType}, title=${data.title}):`,
        error,
      );
      throw error;
    }
  }

  private async postToChannel(
    channelId: string,
    embed: EmbedBuilder,
    rules: { pingRoleIds: string[] }[],
    data: { title: string; eventType: string },
  ) {
    try {
      const discordChannel = await this.client.channels.fetch(channelId);
      if (!(discordChannel instanceof TextChannel)) return;

      const mentions = rules
        .flatMap((r) => r.pingRoleIds)
        .filter((id, i, a) => a.indexOf(id) === i)
        .map((id) => `<@&${id}>`)
        .join(" ");

      await discordChannel.send({
        content: mentions || undefined,
        embeds: [embed],
      });
    } catch (error) {
      console.error(`[AlertDispatch] Failed to post to channel ${channelId}:`, error);
    }
  }

  private async sendUserDMs(
    userIds: string[],
    embed: EmbedBuilder,
    data: { title: string; eventType: string },
  ) {
    const unique = userIds.filter((id, i, a) => a.indexOf(id) === i);
    for (const userId of unique) {
      try {
        const user = await this.client.users.fetch(userId).catch(() => null);
        if (!user) continue;
        await user.send({ embeds: [embed] });
      } catch (error) {
        console.error(`[AlertDispatch] Failed to DM user ${userId}:`, error);
      }
    }
  }
}

export default AlertDispatchPlugin;
