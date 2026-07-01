import { Client, GuildMember } from "discord.js";
import { prisma } from "../../../src/db";
import type { BotPlugin, PluginContext } from "../../types";
import type { Scheduler } from "../../core/scheduler";
import { startSyncWebhook } from "./webhook";

const guildId = process.env.DISCORD_GUILD_ID;

export class RoleManagerPlugin implements BotPlugin {
  name = "role-manager";
  private client!: Client;
  /** Coalesces overlapping syncs for the same user within one bot process. */
  private inFlightSyncs = new Map<string, Promise<void>>();

  async onLoad(_ctx: PluginContext): Promise<void> {}

  async onReady(client: Client): Promise<void> {
    this.client = client;
    startSyncWebhook((userId) => this.syncUser(userId));
  }

  registerSchedules(scheduler: Scheduler): void {
    scheduler.interval("role-sync", () => this.syncAll(), 30 * 1000);
  }

  async syncUser(userId: string): Promise<void> {
    const inFlight = this.inFlightSyncs.get(userId);
    if (inFlight) {
      return inFlight;
    }

    const promise = this.runSyncUser(userId).finally(() => {
      this.inFlightSyncs.delete(userId);
    });
    this.inFlightSyncs.set(userId, promise);
    return promise;
  }

  private async runSyncUser(userId: string): Promise<void> {
    if (!guildId) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        globalRoles: { include: { role: true } },
        sectionMemberships: { include: { section: true } },
      },
    });

    if (!user?.discordUserId) return;

    const mappings = await prisma.discordRoleMapping.findMany();
    if (mappings.length === 0) return;

    try {
      const guild = await this.client.guilds.fetch(guildId);
      const member = await guild.members.fetch(user.discordUserId);

      const expected = new Set<string>();
      for (const mapping of mappings) {
        if (mapping.sectionKey && user.sectionMemberships.some((m) => m.section.key === mapping.sectionKey)) {
          expected.add(mapping.discordRoleId);
        }
        if (mapping.globalRoleKey && user.globalRoles.some((r) => r.role.key === mapping.globalRoleKey)) {
          expected.add(mapping.discordRoleId);
        }
      }

      const mappedRoleIds = new Set(mappings.map((m) => m.discordRoleId));
      const currentMapped = new Set([...member.roles.cache.keys()].filter((r) => mappedRoleIds.has(r)));
      const toAdd = [...expected].filter((r) => !currentMapped.has(r));
      const toRemove = [...currentMapped].filter((r) => !expected.has(r));

      if (toAdd.length > 0) await this.batchRoleUpdate(member, "add", toAdd);
      if (toRemove.length > 0) await this.batchRoleUpdate(member, "remove", toRemove);

      if (toAdd.length > 0 || toRemove.length > 0) {
        console.log(`[RoleManager] Synced ${user.name ?? user.discordUserId}: +${toAdd.length} -${toRemove.length}`);
      }
    } catch (error) {
      console.error(`[RoleManager] Failed to sync user ${userId}:`, error);
    }
  }

  private async syncAll() {
    if (!guildId) return;

    const users = await prisma.user.findMany({
      where: { discordUserId: { not: null }, status: "active" },
      select: { id: true },
    });

    for (const user of users) {
      await this.syncUser(user.id);
    }
  }

  private async batchRoleUpdate(member: GuildMember, action: "add" | "remove", roleIds: string[]) {
    const chunkSize = 10;
    for (let i = 0; i < roleIds.length; i += chunkSize) {
      const chunk = roleIds.slice(i, i + chunkSize);
      try {
        if (action === "add") {
          await member.roles.add(chunk);
        } else {
          await member.roles.remove(chunk);
        }
      } catch (error) {
        console.error(`[RoleManager] Failed to ${action} roles on ${member.id}:`, error);
      }
    }
  }
}

export default RoleManagerPlugin;
