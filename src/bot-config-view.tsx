"use client";

import { Bot, Bell, ShieldCheck, GitBranch, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type Tab = "commands" | "channels" | "roles" | "rules";

const guildId = "933208725198606336";

const SECTION_KEYS = [
  "finance", "forecasting", "nowcasting", "youtube",
  "graphics", "facebook", "development", "verification",
] as const;

const GLOBAL_ROLE_KEYS = ["owner", "operations_lead", "member"] as const;

const EVENT_TYPES = [
  "tornado_warning",
  "severe_thunderstorm_warning",
  "flash_flood_warning",
  "tornado_watch",
  "severe_thunderstorm_watch",
  "spc_outlook",
] as const;

interface DiscordAlertChannelRow {
  id: string;
  guildId: string;
  channelId: string;
  alertType: string;
  sectionId: string | null;
  section?: { name: string } | null;
}

interface DiscordRoleMappingRow {
  id: string;
  guildId: string;
  discordRoleId: string;
  sectionKey: string | null;
  globalRoleKey: string | null;
}

interface DispatchRuleRow {
  id: string;
  eventType: string;
  name: string;
  description: string | null;
  channelId: string | null;
  pingRoleIds: string[];
  pingUserIds: string[];
  isActive: boolean;
}

function CardHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="card-header">
      <div className="header-icon">{icon}</div>
      <h2>{title}</h2>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`pill ${tone}`}><span className="dot" />{children}</span>;
}

export function BotConfigView() {
  const [tab, setTab] = useState<Tab>("commands");

  return (
    <div className="page col-layout">
      <div className="bot-config-tabs" style={{ display: "flex", gap: 4, gridColumn: "1 / -1", marginBottom: 8 }}>
        {[
          { id: "commands" as Tab, label: "Commands", icon: <Bot size={15} /> },
          { id: "channels" as Tab, label: "Alert Channels", icon: <Bell size={15} /> },
          { id: "roles" as Tab, label: "Role Mapping", icon: <ShieldCheck size={15} /> },
          { id: "rules" as Tab, label: "Dispatch Rules", icon: <GitBranch size={15} /> },
        ].map((t) => (
          <button
            key={t.id}
            className={`btn btn-sm ${tab === t.id ? "btn-primary" : "btn-ghost"}`}
            onClick={() => setTab(t.id)}
            type="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      {tab === "commands" && <CommandsTab />}
      {tab === "channels" && <AlertChannelsTab />}
      {tab === "roles" && <RoleMappingTab />}
      {tab === "rules" && <DispatchRulesTab />}
    </div>
  );
}

function CommandsTab() {
  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <CardHeader icon={<Bot size={19} />} title="WTUS Discord bot" />
      <div className="bot-commands">
        {[
          ["/brief", "Show a 60-second assignment summary"],
          ["/mytasks", "Show member-owned and assigned work"],
          ["/available", "Mark live event help availability"],
          ["/eventroles", "Show current live event role and region"],
          ["/preferences", "Update reminder cadence from Discord"],
          ["/specials", "Show open special requests"],
          ["/requesthelp", "DM a member a Yes/No coverage request"],
        ].map(([command, detail]) => (
          <div className="command-row" key={command}>
            <code>{command}</code>
            <span>{detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AlertChannelsTab() {
  const [channels, setChannels] = useState<DiscordAlertChannelRow[]>([]);
  const [channelId, setChannelId] = useState("");
  const [alertType, setAlertType] = useState("tornado_warning");

  useEffect(() => {
    fetch("/api/discord/alert-channels")
      .then((r) => r.json())
      .then(setChannels)
      .catch(() => {});
  }, []);

  async function addChannel(e: FormEvent) {
    e.preventDefault();
    const item = { guildId, channelId, alertType };
    const res = await fetch("/api/discord/alert-channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      const created = (await res.json()) as DiscordAlertChannelRow;
      setChannels((prev) => [created, ...prev]);
      setChannelId("");
    }
  }

  async function deleteChannel(id: string) {
    const res = await fetch(`/api/discord/alert-channels/${id}`, { method: "DELETE" });
    if (res.ok) setChannels((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <CardHeader icon={<Bell size={19} />} title="Alert channel routing" />
      <div className="alert-list">
        {channels.length > 0 ? (
          channels.map((ch) => (
            <div className="coverage-row" key={ch.id}>
              <div>
                <strong>#{ch.channelId}</strong>
                <span>{ch.alertType.replace(/_/g, " ")}{ch.section ? ` · ${ch.section.name}` : ""}</span>
              </div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteChannel(ch.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <EmptyState title="No channels" body="Add a channel to route weather alerts." />
        )}
      </div>
      <form className="inline-form" onSubmit={addChannel} style={{ marginTop: 12 }}>
        <input
          placeholder="Channel ID (e.g. 123456789)"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          required
        />
        <select value={alertType} onChange={(e) => setAlertType(e.target.value)}>
          {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        <button className="btn btn-primary" type="submit">
          <Plus size={15} /> Add
        </button>
      </form>
    </section>
  );
}

function RoleMappingTab() {
  const [mappings, setMappings] = useState<DiscordRoleMappingRow[]>([]);
  const [discordRoleId, setDiscordRoleId] = useState("");
  const [sectionKey, setSectionKey] = useState("");
  const [globalRoleKey, setGlobalRoleKey] = useState("");

  useEffect(() => {
    fetch("/api/discord/role-mappings")
      .then((r) => r.json())
      .then(setMappings)
      .catch(() => {});
  }, []);

  async function addMapping(e: FormEvent) {
    e.preventDefault();
    const item = {
      guildId,
      discordRoleId,
      sectionKey: sectionKey || null,
      globalRoleKey: globalRoleKey || null,
    };
    const res = await fetch("/api/discord/role-mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      const created = (await res.json()) as DiscordRoleMappingRow;
      setMappings((prev) => [created, ...prev]);
      setDiscordRoleId("");
      setSectionKey("");
      setGlobalRoleKey("");
    }
  }

  async function deleteMapping(id: string) {
    const res = await fetch(`/api/discord/role-mappings/${id}`, { method: "DELETE" });
    if (res.ok) setMappings((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <CardHeader icon={<ShieldCheck size={19} />} title="Dashboard → Discord role mapping" />
      <div className="alert-list">
        {mappings.length > 0 ? (
          mappings.map((m) => (
            <div className="coverage-row" key={m.id}>
              <div>
                <strong>{m.discordRoleId}</strong>
                <span>
                  {m.sectionKey ? `Section: ${m.sectionKey}` : ""}
                  {m.globalRoleKey ? `Global: ${m.globalRoleKey}` : ""}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteMapping(m.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <EmptyState title="No mappings" body="Map a dashboard section or role to a Discord role ID." />
        )}
      </div>
      <form className="stack-form" onSubmit={addMapping} style={{ marginTop: 12 }}>
        <div className="form-row">
          <label>
            Discord Role ID
            <input
              placeholder="e.g. 123456789012345678"
              value={discordRoleId}
              onChange={(e) => setDiscordRoleId(e.target.value)}
              required
            />
          </label>
          <label>
            Section
            <select value={sectionKey} onChange={(e) => setSectionKey(e.target.value)}>
              <option value="">-- None --</option>
              {SECTION_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label>
            Global Role
            <select value={globalRoleKey} onChange={(e) => setGlobalRoleKey(e.target.value)}>
              <option value="">-- None --</option>
              {GLOBAL_ROLE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        </div>
        <button className="btn btn-primary" type="submit">
          <Plus size={15} /> Add mapping
        </button>
      </form>
    </section>
  );
}

function DispatchRulesTab() {
  const [rules, setRules] = useState<DispatchRuleRow[]>([]);
  const [eventType, setEventType] = useState("tornado_warning");
  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState("");
  const [pingRoleIds, setPingRoleIds] = useState("");

  useEffect(() => {
    fetch("/api/discord/dispatch-rules")
      .then((r) => r.json())
      .then(setRules)
      .catch(() => {});
  }, []);

  async function addRule(e: FormEvent) {
    e.preventDefault();
    const item = {
      eventType,
      name,
      channelId: channelId || null,
      pingRoleIds: pingRoleIds
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      pingUserIds: [] as string[],
    };
    const res = await fetch("/api/discord/dispatch-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
    });
    if (res.ok) {
      const created = (await res.json()) as DispatchRuleRow;
      setRules((prev) => [created, ...prev]);
      setName("");
      setChannelId("");
      setPingRoleIds("");
    }
  }

  async function toggleRule(id: string, isActive: boolean) {
    const res = await fetch(`/api/discord/dispatch-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) {
      setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r)));
    }
  }

  async function deleteRule(id: string) {
    const res = await fetch(`/api/discord/dispatch-rules/${id}`, { method: "DELETE" });
    if (res.ok) setRules((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <section className="card" style={{ gridColumn: "1 / -1" }}>
      <CardHeader icon={<GitBranch size={19} />} title="Weather alert dispatch rules" />
      <div className="alert-list">
        {rules.length > 0 ? (
          rules.map((rule) => (
            <div className="coverage-row" key={rule.id}>
              <div>
                <strong>{rule.name}</strong>
                <span>
                  {rule.eventType.replace(/_/g, " ")}
                  {rule.channelId ? ` → #${rule.channelId}` : ""}
                  {rule.pingRoleIds.length > 0 ? ` (ping ${rule.pingRoleIds.length} roles)` : ""}
                </span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <StatusPill tone={rule.isActive ? "green" : "amber"}>
                  {rule.isActive ? "active" : "paused"}
                </StatusPill>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => toggleRule(rule.id, rule.isActive)}>
                  {rule.isActive ? "Pause" : "Resume"}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteRule(rule.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No rules" body="Create a rule to route weather alert events." />
        )}
      </div>
      <form className="stack-form" onSubmit={addRule} style={{ marginTop: 12 }}>
        <div className="form-row">
          <label>
            Name
            <input
              placeholder="e.g. Tornado warning alert"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label>
            Event Type
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Channel ID
            <input
              placeholder="Channel to post in (optional)"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            />
          </label>
          <label>
            Role IDs to ping (comma-separated)
            <input
              placeholder="e.g. 123456, 789012"
              value={pingRoleIds}
              onChange={(e) => setPingRoleIds(e.target.value)}
            />
          </label>
        </div>
        <button className="btn btn-primary" type="submit">
          <Plus size={15} /> Add rule
        </button>
      </form>
    </section>
  );
}
