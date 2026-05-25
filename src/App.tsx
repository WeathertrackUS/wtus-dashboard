"use client";

import {
  Bell,
  Bot,
  CalendarClock,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Command,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  Plus,
  RadioTower,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import React from "react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  initialAvailability,
  initialCoverage,
  initialEvents,
  initialMembers,
  initialReminderPreferences,
  initialSpecialRequests,
  initialTasks,
  initialWorkSubmissions,
  sections,
} from "./data";
import wtusLogo from "../wtusredlogotransparent.png";
import type {
  AvailabilityWindow,
  LiveEvent,
  LiveEventAssignment,
  Member,
  OnboardingInvite,
  Priority,
  ReminderFrequency,
  ReminderPreference,
  RoleView,
  SectionKey,
  SpecialRequest,
  Task,
  TaskComment,
  TaskStatus,
  TemporaryCoverage,
  WorkSubmission,
  WorkSubmissionType,
} from "./types";

const wtusLogoSrc = typeof wtusLogo === "string" ? wtusLogo : wtusLogo.src;
const isLocalPreviewEnabled = process.env.NEXT_PUBLIC_ENABLE_LOCAL_PREVIEW === "true";
// Bump this version whenever the shape of cached data changes so stale localStorage is discarded.
const CACHE_VERSION = "v2";
const leantimeUrl = "https://tasks.weathertrackus.com";
const startDiscordLogin = () => {
  if (typeof window === "undefined") return;
  if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    void signIn("discord");
    return;
  }
  window.location.assign("/api/auth/login");
};

type DashboardData = {
  members: Member[];
  invites: OnboardingInvite[];
  tasks: Task[];
  availability: AvailabilityWindow[];
  liveEvents: LiveEvent[];
  coverage: TemporaryCoverage[];
  reminderPreferences: ReminderPreference[];
  workSubmissions: WorkSubmission[];
  specialRequests: SpecialRequest[];
};

type NavItem =
  | "dashboard"
  | "tasks"
  | "availability"
  | "events"
  | "members"
  | "sections"
  | "portfolio"
  | "account"
  | "discord"
  | "admin";

const isNavItem = (value: unknown): value is NavItem =>
  typeof value === "string" &&
  ["dashboard", "tasks", "availability", "events", "members", "sections", "portfolio", "account", "discord", "admin"].includes(value);

function useStoredState<T>(key: string, initialValue: T) {
  const versionedKey = `${key}@${CACHE_VERSION}`;
  const [value, setValue] = useState<T>(initialValue);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!isLocalPreviewEnabled || typeof window === "undefined") return;
    const stored = window.localStorage.getItem(versionedKey);
    if (!stored) {
      setHasLoaded(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as T;
      setValue(key === "wtus.activeView" && !isNavItem(parsed) ? initialValue : parsed);
    } catch {
      setValue(initialValue);
    }
    setHasLoaded(true);
  }, [key, versionedKey]);

  useEffect(() => {
    if (!isLocalPreviewEnabled || typeof window === "undefined" || !hasLoaded) return;
    window.localStorage.setItem(versionedKey, JSON.stringify(value));
  }, [hasLoaded, versionedKey, value]);

  return [value, setValue] as const;
}

const navItems: Array<{ id: NavItem; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "availability", label: "Availability", icon: CalendarClock },
  { id: "events", label: "Live Events", icon: RadioTower },
  { id: "members", label: "Members", icon: Users },
  { id: "sections", label: "Teams", icon: ListChecks },
  { id: "portfolio", label: "Portfolio", icon: FileText },
  { id: "account", label: "Account", icon: Settings },
  { id: "discord", label: "Discord Bot", icon: Bot },
  { id: "admin", label: "Team Setup", icon: ShieldCheck },
];

const memberNavItems: NavItem[] = ["dashboard", "tasks", "availability", "events", "sections", "portfolio", "account"];
const opsNavItems: NavItem[] = ["dashboard", "tasks", "availability", "events", "members", "sections", "portfolio", "discord", "admin"];

function canManageTeam(role: RoleView) {
  return role === "owner" || role === "operations";
}

function roleFromSession(globalRoles?: string[]): RoleView {
  if (globalRoles?.includes("owner")) return "owner";
  if (globalRoles?.includes("operations_lead")) return "operations";
  return "member";
}

const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  review: "Review",
  done: "Done",
};

const priorityLabels: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

const reminderLabels: Record<ReminderFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  event_only: "Event only",
  special_request_only: "Special requests only",
  none: "No routine reminders",
};

const workTypeLabels: Record<WorkSubmissionType, string> = {
  social_graphic: "Social graphic",
  forecast_discussion: "Forecast discussion",
  radar_post: "Radar post",
  spc_explainer: "SPC explainer",
  wpc_explainer: "WPC explainer",
  nhc_explainer: "NHC explainer",
  model_graphic: "Model graphic",
  recap_graphic: "Recap graphic",
  video_clip: "Video clip",
  other: "Other",
};

const sectionName = (key?: SectionKey) => sections.find((section) => section.key === key)?.name ?? "Any section";
const memberName = (members: Member[], id?: string) => members.find((member) => member.id === id)?.name ?? "Unassigned";
const memberHandle = (members: Member[], id?: string) => members.find((member) => member.id === id)?.handle ?? "Team";

function roleLabel(role: RoleView) {
  if (role === "owner") return "Owner";
  if (role === "operations") return "Operations Lead";
  return "Member";
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

function CardHeader({
  icon,
  title,
  action,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="card-header">
      <div className="header-icon">{icon}</div>
      <h2>{title}</h2>
      {action && (
        <button className="header-action btn btn-ghost btn-sm" onClick={onAction} type="button">
          {action}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

/** Backwards-compat alias so existing call sites keep working */
const PanelHeader = CardHeader;

const pageMeta: Record<NavItem, { title: string; eyebrow: string }> = {
  dashboard: { title: "Operations", eyebrow: "Overview · Live" },
  tasks: { title: "Tasks", eyebrow: "Work board" },
  availability: { title: "Availability", eyebrow: "Team schedule" },
  events: { title: "Live Events", eyebrow: "Coverage" },
  members: { title: "Members", eyebrow: "Team roster" },
  sections: { title: "Teams", eyebrow: "Operations · Teams" },
  portfolio: { title: "Portfolio", eyebrow: "Work submissions" },
  account: { title: "Account", eyebrow: "Preferences" },
  discord: { title: "Discord Bot", eyebrow: "Automation" },
  admin: { title: "Team Setup", eyebrow: "Admin · Owner" },
};

function formatShortTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatElapsedSince(value?: string) {
  if (!value) return "";
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return "";
  const minutes = Math.max(0, Math.round((Date.now() - start.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins ? ` ${mins}m` : ""}`;
}

function Topbar({ pageTitle, eyebrow, onSearch, onMenuToggle }: { pageTitle: string; eyebrow: string; onSearch: () => void; onMenuToggle: () => void }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const zones = [
    { code: "E", tz: "America/New_York" },
    { code: "C", tz: "America/Chicago" },
    { code: "M", tz: "America/Denver" },
    { code: "P", tz: "America/Los_Angeles" },
    { code: "UTC", tz: "UTC", utc: true },
  ];
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <header className="topbar">
      <button className="topbar-menu-btn" onClick={onMenuToggle} type="button" aria-label="Toggle sidebar">
        <Menu size={18} />
      </button>
      <div className="topbar-title">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{pageTitle}</h1>
      </div>
      <div className="topbar-spacer" />
      <div className="zone-clocks" title="CONUS time zones - UTC">
        {zones.map((zone) => {
          const time = now.toLocaleTimeString("en-US", {
            hour: zone.utc ? "2-digit" : "numeric",
            minute: "2-digit",
            hour12: !zone.utc,
            timeZone: zone.tz,
          });
          return (
            <div key={zone.code} className={`zone-clock ${zone.tz === localTz ? "is-local" : ""} ${zone.utc ? "is-utc" : ""}`}>
              <span className="zone-code">{zone.code}</span>
              <span className="zone-time mono">{zone.utc ? `${time.replace(/^24/, "00")}Z` : time}</span>
            </div>
          );
        })}
      </div>
      <button className="search-button" onClick={onSearch} type="button">
        <Search size={15} />
        <span>Search tasks, members, events...</span>
        <span className="search-shortcut">Ctrl K</span>
      </button>
      <button className="topbar-action primary" type="button" onClick={onSearch}>
        <Plus size={15} />
        Quick post
      </button>
    </header>
  );
}

function CommandPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (item: NavItem) => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 10);
    else setQuery("");
  }, [open]);

  if (!open) return null;

  const options = navItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={(event) => event.stopPropagation()}>
        <div className="cmdk-input-wrap">
          <Search size={16} />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Escape" && onClose()} placeholder="What do you need to do?" />
          <span className="cmdk-esc">ESC</span>
        </div>
        <div className="cmdk-list">
          <div className="cmdk-group-label">Navigate</div>
          {options.map((item, index) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={`cmdk-row ${index === 0 ? "sel" : ""}`} onClick={() => onNavigate(item.id)} type="button">
                <Icon size={15} />
                <span>Go to {item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AppShell({
  active,
  setActive,
  role,
  setRole,
  isDevelopmentFallback,
  tasks,
  events,
  members,
  children,
}: {
  active: NavItem;
  setActive: (item: NavItem) => void;
  role: RoleView;
  setRole: (role: RoleView) => void;
  isDevelopmentFallback: boolean;
  tasks: Task[];
  events: LiveEvent[];
  members: Member[];
  children: React.ReactNode;
}) {
  const allowedNav = canManageTeam(role) ? opsNavItems : memberNavItems;
  const workspaceNav = navItems.filter((item) => allowedNav.includes(item.id) && !["discord", "admin", "account"].includes(item.id));
  const adminNav = navItems.filter((item) => allowedNav.includes(item.id) && ["discord", "admin"].includes(item.id));
  const accountNav = navItems.filter((item) => allowedNav.includes(item.id) && item.id === "account");
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeEvent = events.find((event) => event.status === "active");
  const meta = pageMeta[active] ?? pageMeta.dashboard;
  const urgentCount = tasks.filter((task) => task.priority === "urgent").length;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCmdOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app" data-screen-label={`WTUS - ${meta.title}`}>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar${sidebarOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo" role="img" aria-label="WTUS" />
          <span className="sidebar-brand-eyebrow">Ops Hub</span>
        </div>

        <button className={`sidebar-live-card ${activeEvent ? "live" : "idle"}`} onClick={() => setActive("events")} type="button">
          <div className="pulse-row"><span className="pulse-dot" /><span>{activeEvent ? "Live on air" : "No active event"}</span></div>
          <div className="live-name">{activeEvent?.name ?? "Weather desk idle"}</div>
          <div className="live-meta">{activeEvent ? `${activeEvent.assignments.length} on coverage` : "Start one when severe wx fires."}</div>
        </button>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="nav" aria-label="Primary navigation">
          {workspaceNav.map((item) => {
            const Icon = item.icon;
            const count = item.id === "tasks" ? urgentCount : item.id === "events" && activeEvent ? 1 : item.id === "members" ? members.length : item.id === "sections" ? sections.length : null;
            return (
              <button className={active === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => { setActive(item.id); setSidebarOpen(false); }} type="button">
                <Icon size={16} />
                <span>{item.label}</span>
                {count ? <span className={item.id === "tasks" || item.id === "events" ? "nav-badge" : "nav-count"}>{count}</span> : null}
              </button>
            );
          })}
        </nav>

        {adminNav.length ? (
          <>
            <div className="sidebar-section-label">Admin</div>
            <nav className="nav" aria-label="Admin navigation">
              {adminNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button className={active === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => setActive(item.id)} type="button">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </>
        ) : null}

        {accountNav.length ? (
          <>
            <div className="sidebar-section-label">Account</div>
            <nav className="nav" aria-label="Account navigation">
              {accountNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button className={active === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => setActive(item.id)} type="button">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </>
        ) : null}

        <div className="sidebar-footer">
          {isDevelopmentFallback ? (
            <div className="role-switcher" aria-label="Local role preview">
              {(["owner", "operations", "member"] as RoleView[]).map((roleOption) => (
                <button key={roleOption} className={role === roleOption ? "active" : ""} onClick={() => setRole(roleOption)} type="button">
                  {roleLabel(roleOption)}
                </button>
              ))}
            </div>
          ) : null}
          <button className="sidebar-user" type="button" onClick={() => (isSignedIn ? signOut() : startDiscordLogin())}>
            <div className="avatar">{(session?.user?.name ?? "WT").slice(0, 2).toUpperCase()}</div>
            <div className="user-info"><strong>{isSignedIn ? session.user?.name ?? "WTUS" : "Discord"}</strong><span>{roleLabel(role).toUpperCase()}</span></div>
            {isSignedIn ? <LogOut size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </aside>
      <main className="main">
        <Topbar pageTitle={meta.title} eyebrow={meta.eyebrow} onSearch={() => setCmdOpen(true)} onMenuToggle={() => setSidebarOpen((o) => !o)} />
        {children}
      </main>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={(item) => { setActive(item); setCmdOpen(false); }} />
    </div>
  );
}

function ProductionAuthGate({ state }: { state: "loading" | "signin" | "unverified" }) {
  const isLoading = state === "loading";
  const isUnverified = state === "unverified";

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-brand">
          <div className="auth-brand-mark"><span style={{ color: "var(--text)" }}>WT</span><span style={{ color: "var(--red)" }}>US</span></div>
          <div className="auth-brand-text">
            <strong>WTUS</strong>
            <span>Operations Hub</span>
          </div>
        </div>
        <div className="auth-copy">
          <h1>Operations</h1>
          <p>
            {isLoading
              ? "Checking your session."
              : isUnverified
                ? "This Discord account is not verified in the WTUS server."
                : "Sign in with Discord to continue."}
          </p>
        </div>
        {isUnverified ? (
          <button className="btn btn-secondary" type="button" onClick={() => signOut()}>
            <LogOut size={16} />
            Sign out
          </button>
        ) : (
          <button className="btn btn-primary" type="button" disabled={isLoading} onClick={startDiscordLogin}>
            <LogIn size={16} />
            {isLoading ? "Checking…" : "Sign in with Discord"}
          </button>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value, sub, live }: { label: string; value: string; sub?: string; live?: boolean }) {
  return (
    <div className={`status-cell${live ? " sc-live" : ""}`}>
      <span className="sc-label">{label}</span>
      <div className="sc-value">{value}</div>
      {sub && <span className="sc-sub">{sub}</span>}
    </div>
  );
}

function TaskTable({
  tasks,
  members,
  compact,
  onStatusChange,
  onSelect,
  selectedTaskId,
}: {
  tasks: Task[];
  members: Member[];
  compact?: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onSelect?: (taskId: string) => void;
  selectedTaskId?: string;
}) {
  return (
    <div className="table-wrap">
      <table className={compact ? "task-table compact" : "task-table"}>
        <thead>
          <tr>
            <th>Task</th>
            <th>Section</th>
            <th>Point person</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr className={selectedTaskId === task.id ? "selected-row" : ""} key={task.id}>
              <td>
                <button className="task-title-button" type="button" onClick={() => onSelect?.(task.id)}>
                  {task.title}
                </button>
                {!compact && <span>{task.notes}</span>}
                {!compact && task.comments?.length ? <small>{task.comments.length} updates</small> : null}
              </td>
              <td>{sectionName(task.section)}</td>
              <td>{memberHandle(members, task.ownerId)}</td>
              <td>
                <select value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}>
                  {(Object.keys(statusLabels) as TaskStatus[]).map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <StatusPill tone={`priority-${task.priority}`}>{priorityLabels[task.priority]}</StatusPill>
              </td>
              <td>{task.due}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AvailabilityRow({ item, members }: { item: AvailabilityWindow; members: Member[] }) {
  return (
    <div className="availability-row">
      <div className="avatar">{memberHandle(members, item.memberId).slice(0, 1)}</div>
      <div>
        <strong>{memberName(members, item.memberId)}</strong>
        <span>
          {item.helpRole} · {item.startsAt}-{item.endsAt}
        </span>
      </div>
      <StatusPill tone={item.status === "available" ? "green" : item.status === "maybe" ? "amber" : "slate"}>{item.status}</StatusPill>
    </div>
  );
}

function AssignmentRow({
  event,
  assignment,
  members,
  onStatus,
}: {
  event: LiveEvent;
  assignment: LiveEventAssignment;
  members: Member[];
  onStatus: (status: LiveEventAssignment["status"]) => void;
}) {
  const eventRole = event.roles.find((item) => item.id === assignment.roleId);
  return (
    <div className="assignment-row">
      <div>
        <strong>{memberName(members, assignment.memberId)}</strong>
        <span>
          {eventRole?.name ?? "Event role"} {assignment.region ? `- ${assignment.region}` : ""}
        </span>
      </div>
      <select value={assignment.status} onChange={(event) => onStatus(event.target.value as LiveEventAssignment["status"])}>
        <option value="assigned">Assigned</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}

function DashboardView({
  tasks,
  availability,
  events,
  coverage,
  members,
  setActive,
  onTaskStatus,
  onAssignmentStatus,
}: {
  tasks: Task[];
  availability: AvailabilityWindow[];
  events: LiveEvent[];
  coverage: TemporaryCoverage[];
  members: Member[];
  setActive: (item: NavItem) => void;
  onTaskStatus: (taskId: string, status: TaskStatus) => void;
  onAssignmentStatus: (eventId: string, assignmentId: string, status: LiveEventAssignment["status"]) => void;
}) {
  const activeEvent = events.find((event) => event.status === "active");
  const eventTasks = activeEvent ? tasks.filter((task) => task.notes?.includes(activeEvent.name) || task.title.toLowerCase().includes("event")) : [];
  const eventTaskIds = new Set(eventTasks.map((task) => task.id));
  const normalTasks = tasks.filter((task) => !eventTaskIds.has(task.id));
  const urgentTasks = normalTasks.filter((task) => task.priority === "urgent");
  const highTasks = normalTasks.filter((task) => task.priority === "high");
  const inProgressTasks = normalTasks.filter((task) => task.status === "in_progress");
  const availableNow = availability.filter((window) => window.status === "available");
  const maybeNow = availability.filter((window) => window.status === "maybe");
  const activeCoverage = coverage.filter((item) => item.status === "active");
  const onCoverageIds = new Set(activeEvent?.assignments.filter((assignment) => assignment.status === "active").map((assignment) => assignment.memberId) ?? []);
  const memberAvailability = new Map(availability.map((item) => [item.memberId, item.status]));
  const elapsed = activeEvent?.duration ?? formatElapsedSince(activeEvent?.startsAt);
  const sortedTasks = [...normalTasks]
    .sort((a, b) => {
      const order: Record<Priority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    })
    .slice(0, 6);

  return (
    <div className="page dashboard-page">
      <section className="status-strip">
        <div className="status-cell sc-live">
          <div className="sc-label"><span className="pulse-dot" />Live event</div>
          <div className="sc-value">{activeEvent ? "ACTIVE" : "-"}</div>
          <div className="sc-sub">{activeEvent ? `${activeEvent.briefing || activeEvent.name.split("-")[0].trim()} · ${elapsed || "live"} on air · ${eventTasks.length} event tasks` : "No active event"}</div>
        </div>
        <div className="status-cell">
          <div className="sc-label">Urgent / High (ops)</div>
          <div className="sc-value">{urgentTasks.length + highTasks.length} <span className="unit">tasks</span></div>
          <div className="sc-sub"><span className="delta-warn">{urgentTasks.length} urgent</span> - {highTasks.length} high</div>
        </div>
        <div className="status-cell">
          <div className="sc-label">Available now</div>
          <div className="sc-value">{availableNow.length} <span className="unit">/ {members.length}</span></div>
          <div className="sc-sub"><span className="delta-up">{onCoverageIds.size} on coverage</span> · {maybeNow.length} maybe</div>
        </div>
        <div className="status-cell">
          <div className="sc-label">In progress</div>
          <div className="sc-value">{inProgressTasks.length} <span className="unit">tasks</span></div>
          <div className="sc-sub">{normalTasks.length} ops total · {normalTasks.filter((task) => task.status === "done").length} done today</div>
        </div>
      </section>

      {activeCoverage.length ? (
        <div className="temp-coverage-banner">
          <StatusPill tone="blue">Temp coverage</StatusPill>
          <span>
            <strong>{memberName(members, activeCoverage[0].assigneeId)}</strong> covering <strong>{activeCoverage[0].coverageRole}</strong>
            {activeCoverage[0].coveredForId ? <> for <strong>{memberName(members, activeCoverage[0].coveredForId)}</strong></> : null}
            {" "}until <span className="mono">{activeCoverage[0].endsAt}</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setActive("admin")} type="button">Manage <ChevronRight size={12} /></button>
        </div>
      ) : null}

      <section className="live-hero">
        {activeEvent ? (
          <div className="live-hero-grid">
            <div className="live-hero-main">
              <div className="live-banner"><span className="pulse-dot" /><span>LIVE · ON AIR · {elapsed || activeEvent.status.toUpperCase()}</span></div>
              <h2>{activeEvent.name}</h2>
              <p className="desc">{activeEvent.description}</p>
              <div className="live-meta-row">
                <span className="meta"><RadioTower size={13} /> <strong>{activeEvent.briefing || "WTUS"}</strong></span>
                <span className="meta"><CalendarClock size={13} /> started <strong>{formatShortTime(activeEvent.startsAt)}</strong></span>
                <span className="meta"><Sparkles size={13} /> <strong>{activeEvent.updates.length}</strong> updates</span>
                <span className="meta"><Users size={13} /> <strong>{activeEvent.assignments.length}</strong> assigned</span>
              </div>
              <div className="live-hero-actions">
                <button className="btn btn-primary" onClick={() => setActive("events")} type="button"><RadioTower size={14} />Open coverage</button>
                <button className="btn btn-secondary" onClick={() => setActive("events")} type="button"><Send size={14} />Post update</button>
                <button className="btn btn-ghost" onClick={() => setActive("events")} type="button"><UserPlus size={14} />Assign</button>
              </div>
            </div>
            <div className="live-hero-side">
              <span className="eyebrow">Coverage roster</span>
              {activeEvent.assignments.slice(0, 5).map((assignment) => {
                const role = activeEvent.roles.find((r) => r.id === assignment.roleId);
                return (
                  <div className="assignment-row-hero" key={assignment.id}>
                    <div className="av">{memberHandle(members, assignment.memberId).slice(0, 2).toUpperCase()}</div>
                    <div className="info">
                      <strong>{memberName(members, assignment.memberId)}</strong>
                      <span>{role?.name ?? "Unassigned"}{assignment.region ? ` - ${assignment.region}` : ""}</span>
                    </div>
                    <StatusPill tone={assignment.status === "active" ? "red" : "slate"}>{assignment.status}</StatusPill>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="card live-empty-card"><EmptyState title="No active live event" body="Start one from Live Events when a severe-weather window opens." /></div>
        )}
      </section>

      <div className="col-layout">
        <section className="card">
          <div className="card-header">
            <span className="header-icon"><ClipboardList size={14} /></span>
            <h2>Work board</h2>
            <span className="eyebrow">Normal ops</span>
            <button className="header-action" onClick={() => setActive("tasks")} type="button">All tasks <ChevronRight size={13} /></button>
          </div>
          <div className="card-body tight">
            <div className="task-row head"><div>Task</div><div>Section</div><div>Assignees</div><div>Priority</div><div>Due</div></div>
            {sortedTasks.map((task) => (
              <div className={`task-row ${task.priority}`} key={task.id} onClick={() => setActive("tasks")}>
                <div className="task-title-cell"><div className="pri-bar" /><div><div className="t-title">{task.title}</div><div className="t-sub">{statusLabels[task.status]} · {task.comments?.length ?? 0} updates</div></div></div>
                <div className="t-cell">{sectionName(task.section)}</div>
                <div className="assignee-stack">{task.assigneeIds.slice(0, 3).map((id) => <span className="assignee-bubble" key={id}>{memberHandle(members, id).slice(0, 2).toUpperCase()}</span>)}</div>
                <div><StatusPill tone={`priority-${task.priority}`}>{priorityLabels[task.priority]}</StatusPill></div>
                <div className="t-due">{task.due}</div>
              </div>
            ))}
            {eventTasks.length ? (
              <button className="event-task-link" onClick={() => setActive("events")} type="button">
                <RadioTower size={14} />
                <span><strong>{eventTasks.length} live-event task{eventTasks.length === 1 ? "" : "s"}</strong> in the active event workspace</span>
                <span>Open event <ChevronRight size={11} /></span>
              </button>
            ) : null}
            {!sortedTasks.length ? <EmptyState title="No tasks yet" body="Create one from Tasks." /> : null}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <span className="header-icon"><Sparkles size={14} /></span>
            <h2>Team pulse</h2>
            <span className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
          </div>
          <div className="card-body tight">
            {members.filter((member) => onCoverageIds.has(member.id)).length ? (
              <div className="list-group-label"><StatusPill tone="red">On coverage now</StatusPill><span className="mono">{onCoverageIds.size}</span></div>
            ) : null}
            {members.filter((member) => onCoverageIds.has(member.id)).map((member) => {
              const assignment = activeEvent?.assignments.find((item) => item.memberId === member.id);
              const role = activeEvent?.roles.find((item) => item.id === assignment?.roleId);
              return (
                <div className="list-row" key={member.id}>
                  <div className="assignee-bubble">{member.handle.slice(0, 2).toUpperCase()}</div>
                  <div className="lr-info"><strong>{member.name}</strong><span>{role?.name ?? "Coverage"}{assignment?.region ? ` - ${assignment.region}` : ""}</span></div>
                  <StatusPill tone="red">On coverage</StatusPill>
                </div>
              );
            })}
            {members.filter((member) => !onCoverageIds.has(member.id) && memberAvailability.get(member.id) === "available").length ? (
              <div className="list-group-label"><StatusPill tone="green">Available</StatusPill></div>
            ) : null}
            {members.filter((member) => !onCoverageIds.has(member.id) && memberAvailability.get(member.id) === "available").slice(0, 4).map((member) => (
              <div className="list-row" key={member.id}>
                <div className="assignee-bubble">{member.handle.slice(0, 2).toUpperCase()}</div>
                <div className="lr-info"><strong>{member.name}</strong><span>{member.sections.map((entry) => sectionName(entry.section)).join(" - ") || "Team member"}</span></div>
              </div>
            ))}
            {!members.length ? <EmptyState title="No team members" body="Invite members from Team Setup." /> : null}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card-header">
          <span className="header-icon"><ListChecks size={14} /></span>
          <h2>Teams</h2>
          <button className="header-action" onClick={() => setActive("sections")} type="button">Manage <ChevronRight size={13} /></button>
        </div>
        <div className="card-body">
          <div className="section-grid">
            {sections.map((section) => {
              const openTasks = tasks.filter((task) => task.section === section.key && task.status !== "done");
              const lead = members.find((member) => member.sections.some((entry) => entry.section === section.key && entry.role === "lead"));
              return (
                <button className={`section-card ${openTasks.some((task) => task.priority === "urgent" || task.priority === "high") ? "has-urgent" : ""}`} key={section.key} onClick={() => setActive("tasks")} type="button">
                  <div className="si"><ListChecks size={16} /></div>
                  <div className="sn">{section.name}</div>
                  <div className="ss"><strong>{openTasks.length}</strong> open - {lead ? `lead @${lead.handle}` : "no lead"}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function TasksView({
  tasks,
  members,
  setTasks,
  onTaskStatus,
}: {
  tasks: Task[];
  members: Member[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onTaskStatus: (taskId: string, status: TaskStatus) => void;
}) {
  const [sectionFilter, setSectionFilter] = useState<SectionKey | "all">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? tasks[0];
  const visibleTasks = sectionFilter === "all" ? tasks : tasks.filter((task) => task.section === sectionFilter);

  useEffect(() => {
    if (selectedTask && selectedTask.id !== selectedTaskId) setSelectedTaskId(selectedTask.id);
    if (!selectedTask && visibleTasks.length) setSelectedTaskId(visibleTasks[0].id);
  }, [selectedTask, selectedTaskId, visibleTasks]);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selectedAssignees = form.getAll("assigneeIds") as string[];
    const fallbackTask: Task = {
      id: `t${Date.now()}`,
      title: String(form.get("title")),
      section: form.get("section") as SectionKey,
      status: "todo",
      priority: form.get("priority") as Priority,
      assigneeIds: selectedAssignees,
      ownerId: "",
      due: String(form.get("due")),
      notes: String(form.get("notes")),
      isRecurring: form.get("isRecurring") === "true",
      recurringPattern: String(form.get("recurringPattern") || ""),
    };
    let task = fallbackTask;
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fallbackTask.title,
          section: fallbackTask.section,
          assigneeIds: fallbackTask.assigneeIds,
          priority: fallbackTask.priority,
          due: fallbackTask.due,
          notes: fallbackTask.notes,
          isRecurring: fallbackTask.isRecurring,
          recurringPattern: fallbackTask.recurringPattern,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { task: Task };
        task = data.task;
      }
    } catch {}
    setTasks((current) => [task, ...current]);
    setSelectedTaskId(task.id);
    setShowCreate(false);
    formElement.reset();
  }

  async function editTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const form = new FormData(event.currentTarget);
    const selectedAssignees = form.getAll("assigneeIds") as string[];
    const updatedTask: Task = {
      ...selectedTask,
      title: String(form.get("title")),
      section: form.get("section") as SectionKey,
      assigneeIds: selectedAssignees,
      priority: form.get("priority") as Priority,
      due: String(form.get("due")),
      notes: String(form.get("notes")),
      isRecurring: form.get("isRecurring") === "true",
      recurringPattern: String(form.get("recurringPattern") || ""),
    };
    let task = updatedTask;
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updatedTask.title,
          section: updatedTask.section,
          assigneeIds: updatedTask.assigneeIds,
          priority: updatedTask.priority,
          due: updatedTask.due,
          notes: updatedTask.notes,
          isRecurring: updatedTask.isRecurring,
          recurringPattern: updatedTask.recurringPattern,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { task: Task };
        task = data.task;
      }
    } catch {}
    setTasks((current) => current.map((item) => (item.id === selectedTask.id ? task : item)));
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedTask) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = String(form.get("body") || "").trim();
    if (!body) return;
    const fallbackComment: TaskComment = {
      id: `c${Date.now()}`,
      taskId: selectedTask.id,
      body,
      createdAt: new Date().toLocaleString(),
    };
    let comment = fallbackComment;
    try {
      const response = await fetch(`/api/tasks/${selectedTask.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (response.ok) {
        const data = (await response.json()) as { comment: TaskComment };
        comment = data.comment;
      }
    } catch {}
    setTasks((current) =>
      current.map((task) =>
        task.id === selectedTask.id ? { ...task, comments: [comment, ...(task.comments ?? [])] } : task,
      ),
    );
    formElement.reset();
  }

  return (
    <div className="page split-layout">
      <div className="list-panel">
        <div className="list-panel-header">
          <PanelHeader icon={<ClipboardList size={19} />} title="Tasks" />
          <button className="btn btn-primary" type="button" onClick={() => setShowCreate(true)}>
            <Plus size={15} />
            New
          </button>
        </div>
        <div className="list-panel-toolbar">
          <label style={{ flex: 1 }}>
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value as SectionKey | "all")}>
              <option value="all">All sections</option>
              {sections.map((s) => (
                <option key={s.key} value={s.key}>{s.name}</option>
              ))}
            </select>
          </label>
          <button className="btn btn-secondary" type="button" onClick={() => window.open(leantimeUrl, "_blank", "noreferrer")}>
            Open Leantime
            <ChevronRight size={15} />
          </button>
        </div>
        <div className="list-items">
          {visibleTasks.length ? (
            visibleTasks.map((task) => (
              <button
                key={task.id}
                className={`list-item ${selectedTaskId === task.id ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedTaskId(task.id)}
              >
                <div className="li-title">
                  <span className="li-title-text">{task.title}</span>
                  <StatusPill tone={`priority-${task.priority}`}>{priorityLabels[task.priority]}</StatusPill>
                </div>
                <div className="li-meta">
                  <span>{sectionName(task.section)}</span>
                  <StatusPill tone={task.status === "done" ? "green" : task.status === "blocked" ? "amber" : "slate"}>
                    {statusLabels[task.status]}
                  </StatusPill>
                  {task.isRecurring && <StatusPill tone="blue">Recurring</StatusPill>}
                </div>
              </button>
            ))
          ) : (
            <EmptyState title="No tasks" body="Create a task to get started." />
          )}
        </div>
      </div>

      <div className="detail-panel">
        {selectedTask ? (
          <>
            <div className="detail-header">
              <div>
                <h2>{selectedTask.title}</h2>
                <span className="section-tag">{sectionName(selectedTask.section)}</span>
              </div>
              <div className="detail-actions">
                <StatusPill tone={`priority-${selectedTask.priority}`}>{priorityLabels[selectedTask.priority]}</StatusPill>
                <select value={selectedTask.status} onChange={(e) => onTaskStatus(selectedTask.id, e.target.value as TaskStatus)}>
                  {(Object.keys(statusLabels) as TaskStatus[]).map((s) => (
                    <option key={s} value={s}>{statusLabels[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="detail-body">
              <div className="detail-main">
                <div className="detail-section">
                  <strong>Notes</strong>
                  <p>{selectedTask.notes || "No notes."}</p>
                </div>

                <div className="detail-section">
                  <strong>Assigned to</strong>
                  <div className="assignee-chips">
                    {selectedTask.assigneeIds.length ? (
                      selectedTask.assigneeIds.map((id) => (
                        <StatusPill key={id} tone="blue">{memberName(members, id)}</StatusPill>
                      ))
                    ) : (
                      <span className="no-assignees">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="detail-section">
                  <strong>Updates</strong>
                  <div className="comment-list">
                    {selectedTask.comments?.length ? (
                      selectedTask.comments.map((c) => (
                        <div className="update-card" key={c.id}>
                          <span>{c.authorName ?? "Team"}</span>
                          <p>{c.body}</p>
                          <small>{c.createdAt}</small>
                        </div>
                      ))
                    ) : (
                      <p className="no-comments">No updates yet.</p>
                    )}
                  </div>
                  <form className="inline-form" onSubmit={addComment}>
                    <input name="body" placeholder="Add an update..." />
                    <button className="btn btn-primary" type="submit">Post</button>
                  </form>
                </div>
              </div>

              <div className="detail-meta-col">
                <form className="stack-form" key={selectedTask.id} onSubmit={editTask}>
                  <label>
                    Title
                    <input name="title" defaultValue={selectedTask.title} />
                  </label>
                  <label>
                    Section
                    <select name="section" defaultValue={selectedTask.section}>
                      {sections.map((s) => (
                        <option key={s.key} value={s.key}>{s.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assigned to
                    <div className="assignee-checkboxes">
                      {members.map((m) => (
                        <label key={m.id} className="assignee-checkbox">
                          <input
                            type="checkbox"
                            name="assigneeIds"
                            value={m.id}
                            defaultChecked={selectedTask.assigneeIds.includes(m.id)}
                          />
                          <span>{m.name}</span>
                        </label>
                      ))}
                    </div>
                  </label>
                  <label>
                    Priority
                    <select name="priority" defaultValue={selectedTask.priority}>
                      {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                        <option key={p} value={p}>{priorityLabels[p]}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Recurring
                    <select name="isRecurring" defaultValue={selectedTask.isRecurring ? "true" : "false"}>
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </label>
                  {selectedTask.isRecurring && (
                    <label>
                      Pattern
                      <input name="recurringPattern" defaultValue={selectedTask.recurringPattern} placeholder="e.g. Weekly, Daily" />
                    </label>
                  )}
                  <label>
                    Due
                    <input name="due" defaultValue={selectedTask.due} />
                  </label>
                  <label>
                    Notes
                    <textarea name="notes" defaultValue={selectedTask.notes} />
                  </label>
                  <div className="form-actions">
                    <button className="btn btn-danger" type="button" onClick={async () => {
                      if (!window.confirm(`Delete "${selectedTask.title}"?`)) return;
                      try {
                        const res = await fetch(`/api/tasks/${selectedTask.id}`, { method: "DELETE" });
                        if (res.ok) {
                          setTasks((current) => current.filter((t) => t.id !== selectedTask.id));
                          setSelectedTaskId("");
                        }
                      } catch {}
                    }}>
                      <Trash2 size={15} />
                      Delete
                    </button>
                    <button className="btn btn-primary" type="submit">Save changes</button>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="detail-empty">
            <EmptyState title="Select a task" body="Pick a task from the list to view details." />
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create task</h2>
              <button className="modal-close" type="button" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form className="stack-form" onSubmit={createTask}>
              <label>
                Title
                <input name="title" required placeholder="Post storm timing graphic" />
              </label>
              <label>
                Section
                <select name="section" defaultValue="graphics">
                  {sections.map((s) => (
                    <option key={s.key} value={s.key}>{s.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Assigned to
                <div className="assignee-checkboxes">
                  {members.map((m) => (
                    <label key={m.id} className="assignee-checkbox">
                      <input type="checkbox" name="assigneeIds" value={m.id} />
                      <span>{m.name}</span>
                    </label>
                  ))}
                </div>
              </label>
              <label>
                Priority
                <select name="priority" defaultValue="normal">
                  {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                    <option key={p} value={p}>{priorityLabels[p]}</option>
                  ))}
                </select>
              </label>
              <label>
                Recurring
                <select name="isRecurring" defaultValue="false">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>
              <label>
                Due
                <input name="due" defaultValue="Today" />
              </label>
              <label>
                Notes
                <textarea name="notes" placeholder="Context, source, or review note" />
              </label>
              <div className="form-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit"><Plus size={15} />Create task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AvailabilityView({
  availability,
  members,
  setAvailability,
}: {
  availability: AvailabilityWindow[];
  members: Member[];
  setAvailability: React.Dispatch<React.SetStateAction<AvailabilityWindow[]>>;
}) {
  const [mode, setMode] = useState<"today" | "week" | "month">("today");

  async function markAvailable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const memberId = String(form.get("memberId") || "");
    if (!memberId) return;
    const fallbackItem: AvailabilityWindow = {
      id: `a${Date.now()}`,
      memberId,
      status: form.get("status") as AvailabilityWindow["status"],
      helpRole: String(form.get("helpRole")),
      startsAt: String(form.get("startsAt")),
      endsAt: String(form.get("endsAt")),
      notes: String(form.get("notes")),
    };
    let item = fallbackItem;
    try {
      const resp = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallbackItem),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { availability: AvailabilityWindow };
        item = data.availability;
      }
    } catch {}
    setAvailability((cur) => [item, ...cur]);
    formElement.reset();
  }

  const TODAY_HOURS = ["06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23"];

  // Parse a user-entered time string to a 24h hour number (best-effort)
  function parseHour(s: string): number | null {
    if (!s) return null;
    const lower = s.toLowerCase().trim();
    if (lower === "now" || lower === "asap") return new Date().getHours();
    if (lower.includes("event end") || lower === "late" || lower === "midnight") return 24;
    // "9:00 PM", "9 PM", "21:00", "21"
    const m12 = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (m12) {
      let h = parseInt(m12[1], 10);
      if (m12[3] === "pm" && h < 12) h += 12;
      if (m12[3] === "am" && h === 12) h = 0;
      return h;
    }
    const m24 = lower.match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (m24) return parseInt(m24[1], 10);
    return null;
  }

  const today = new Date();
  const nowHour = today.getHours();

  // Build hourly rows from REAL availability data
  const hourlyRows = members.map((m) => {
    const av = availability.find((a) => a.memberId === m.id);
    if (!av) return { member: m, hours: TODAY_HOURS.map(() => "unavail") };
    const chipStatus = av.status === "available" ? "avail" : av.status === "maybe" ? "maybe" : "unavail";
    const startH = parseHour(av.startsAt) ?? nowHour;
    const endH   = parseHour(av.endsAt)   ?? 23;
    const hours = TODAY_HOURS.map((h) => {
      const n = parseInt(h, 10);
      if (n < startH || n > endH) return "unavail";
      return chipStatus;
    });
    return { member: m, hours };
  });

  // Weekly rows — show today's status for all 7 days (real data: same window)
  const weekDays: Array<{ label: string; date: number; today: boolean }> = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    weekDays.push({ label: d.toLocaleDateString("en-US", { weekday: "short" }), date: d.getDate(), today: i === 0 });
  }
  const weekRows = members.map((m) => {
    const av = availability.find((a) => a.memberId === m.id);
    const chipStatus = !av ? "unavail" : av.status === "available" ? "avail" : av.status === "maybe" ? "maybe" : "unavail";
    // Day 0 = today (use real status), future days fade to maybe if avail
    const days = weekDays.map((_, i) => {
      if (i === 0) return chipStatus;
      if (chipStatus === "unavail") return "unavail";
      if (i >= 5) return chipStatus === "avail" ? "maybe" : "unavail";
      return chipStatus;
    });
    return { member: m, days };
  });

  // Calendar — show availability entries on today + near future dates
  const calStart = new Date(today);
  calStart.setDate(calStart.getDate() - calStart.getDay());
  const calCells: Array<{ date: Date; key: string; isPast: boolean; isToday: boolean; entries: Array<{ member: Member; status: string }> }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(calStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const isPast = d < new Date(today.toDateString());
    const isToday = d.toDateString() === today.toDateString();
    // Show availability entries on today; future days show members marked available
    const entries = (isToday || !isPast) ? availability
      .map((a) => {
        const mem = members.find((x) => x.id === a.memberId);
        if (!mem) return null;
        return { member: mem, status: a.status === "available" ? "avail" : a.status === "maybe" ? "maybe" : "away" };
      })
      .filter((e): e is { member: Member; status: string } => e !== null && e.status !== "away") : [];
    calCells.push({ date: d, key, isPast, isToday, entries });
  }
  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const availableNow = availability.filter((a) => a.status === "available");

  return (
    <div className="page">
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div className="view-tabs">
          <button className={`view-tab ${mode === "today" ? "active" : ""}`} onClick={() => setMode("today")}>Today · hourly</button>
          <button className={`view-tab ${mode === "week"  ? "active" : ""}`} onClick={() => setMode("week")}>This week</button>
          <button className={`view-tab ${mode === "month" ? "active" : ""}`} onClick={() => setMode("month")}>Calendar · 30 days</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><UserPlus size={13} />Schedule availability</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, padding: "8px 14px", border: "1px solid var(--hairline)", background: "var(--surface)", borderRadius: 8, fontSize: 11, color: "var(--text-3)", alignItems: "center", flexWrap: "wrap" }}>
        <span className="eyebrow">LEGEND</span>
        {(["avail","maybe","unavail"] as const).map((s) => (
          <span key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className={`avail-chip ${s}`} style={{ width: 18, height: 14, fontSize: 0 }}></span>
            {s === "avail" ? "Available" : s === "maybe" ? "Maybe" : "Unavailable"}
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-4)" }}>
          Event check-ins live on the Live Events page — not here.
        </span>
      </div>

      {/* Today — hourly grid */}
      {mode === "today" && (
        <div className="card">
          <div className="card-header">
            <span className="header-icon"><Clock size={14} /></span>
            <h2>Today · hour-by-hour</h2>
            <span className="eyebrow" style={{ marginLeft: 6 }}>{today.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
          </div>
          <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
            <div className="hour-grid" style={{ gridTemplateColumns: `160px repeat(${TODAY_HOURS.length}, minmax(38px, 1fr))` }}>
              <div className="hour-corner"></div>
              {TODAY_HOURS.map((h) => {
                const isNow = parseInt(h, 10) === nowHour;
                return (
                  <div key={h} className={`hour-head ${isNow ? "now" : ""}`}>
                    {h}{isNow ? <span className="now-marker">NOW</span> : null}
                  </div>
                );
              })}
              {hourlyRows.map(({ member, hours }) => (
                <React.Fragment key={member.id}>
                  <div className="hour-name-cell">
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: `linear-gradient(135deg, var(--red-deep), #1a1424)`, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", flexShrink: 0 }}>
                      {member.name.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>Member</div>
                    </div>
                  </div>
                  {hours.map((s, i) => (
                    <div key={i} className={`hour-cell h-${s}`} title={`${TODAY_HOURS[i]}:00 — ${s}`}><span></span></div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Week */}
      {mode === "week" && (
        <div className="card">
          <div className="card-header">
            <span className="header-icon"><CalendarClock size={14} /></span>
            <h2>This week</h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="avail-grid">
              <div className="cell-head"></div>
              {weekDays.map((d, i) => (
                <div key={i} className="cell-head day-head" style={d.today ? { color: "var(--red-hot)" } : undefined}>
                  {d.label}<span className="date">{d.date}</span>{d.today ? " · NOW" : ""}
                </div>
              ))}
              {weekRows.map(({ member, days }) => (
                <React.Fragment key={member.id}>
                  <div className="name-cell">
                    <div style={{ width: 22, height: 22, borderRadius: 5, background: "var(--surface-3)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-display)", flexShrink: 0 }}>
                      {member.name.slice(0,2).toUpperCase()}
                    </div>
                    <span>{member.name.split(" ")[0]}</span>
                  </div>
                  {days.map((status, i) => (
                    <div className="avail-cell" key={i}>
                      <div className={`avail-chip ${status}`}>{status === "avail" ? "AVAIL" : status === "maybe" ? "MAYBE" : "UNAVAIL"}</div>
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      {mode === "month" && (
        <div className="card">
          <div className="card-header">
            <span className="header-icon"><CalendarClock size={14} /></span>
            <h2>{monthLabel}</h2>
          </div>
          <div className="card-body" style={{ padding: 14 }}>
            <div className="cal-grid">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
                <div key={d} className="cal-head">{d}</div>
              ))}
              {calCells.map((c) => (
                <div key={c.key} className={`cal-day ${c.isPast ? "past" : ""} ${c.isToday ? "today" : ""}`}>
                  <div className="cal-date">
                    {c.date.getDate()}
                    {c.isToday ? <span className="cal-today-mark">TODAY</span> : null}
                  </div>
                  {c.entries.length > 0 ? (
                    <>
                      <div className="cal-stack">
                        {c.entries.slice(0,4).map((e, i) => (
                          <span key={i} className={`cal-bubble cal-${e.status}`} title={e.member.name}>
                            {e.member.name.slice(0,2).toUpperCase()}
                          </span>
                        ))}
                        {c.entries.length > 4 ? <span className="cal-more">+{c.entries.length - 4}</span> : null}
                      </div>
                      <div className="cal-count">{c.entries.filter((e) => e.status === "avail").length} avail</div>
                    </>
                  ) : !c.isPast ? (
                    <button className="cal-add">+ Add</button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom row: available now + schedule form */}
      <div className="col-layout">
        <div className="card">
          <div className="card-header">
            <span className="header-icon"><UserPlus size={14} /></span>
            <h2>Available right now</h2>
            <span className="eyebrow">{availableNow.length} READY</span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {availableNow.length ? availableNow.map((item) => (
              <div className="list-row" key={item.id}>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: "var(--surface-3)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)", flexShrink: 0 }}>
                  {memberName(members, item.memberId).slice(0,2).toUpperCase()}
                </div>
                <div className="lr-info">
                  <strong>{memberName(members, item.memberId)}</strong>
                  <span>{item.helpRole} · until {item.endsAt}</span>
                </div>
              </div>
            )) : (
              <div style={{ padding: "20px 18px" }}><EmptyState title="No one available now" body="Check back during storm events." /></div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <span className="header-icon"><Plus size={14} /></span>
            <h2>Schedule availability</h2>
          </div>
          <div className="card-body">
            <form onSubmit={markAvailable}>
              <div className="field">
                <label>Member</label>
                <select name="memberId" className="select-input" disabled={!members.length}>
                  {members.length ? members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  )) : <option value="">Add a member first</option>}
                </select>
              </div>
              <div className="field">
                <label>Status</label>
                <select name="status" className="select-input" defaultValue="available">
                  <option value="available">Available</option>
                  <option value="maybe">Maybe</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
              <div className="field">
                <label>Role / How can you help</label>
                <input name="helpRole" className="select-input" defaultValue="Live event help" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label>From</label>
                  <input name="startsAt" className="select-input" defaultValue="Now" />
                </div>
                <div className="field">
                  <label>To</label>
                  <input name="endsAt" className="select-input" defaultValue="9:00 PM" />
                </div>
              </div>
              <div className="field">
                <label>Notes (optional)</label>
                <input name="notes" className="select-input" placeholder="e.g. on call from phone only" />
              </div>
              <button className="btn btn-primary btn-sm" type="submit" style={{ width: "100%", justifyContent: "center" }} disabled={!members.length}>
                Save availability
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventsView({
  events,
  setEvents,
  availability,
  members,
  onAssignmentStatus,
}: {
  events: LiveEvent[];
  setEvents: React.Dispatch<React.SetStateAction<LiveEvent[]>>;
  availability: AvailabilityWindow[];
  members: Member[];
  onAssignmentStatus: (eventId: string, assignmentId: string, status: LiveEventAssignment["status"]) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [editingEventId, setEditingEventId] = useState("");
  const [updateTab, setUpdateTab] = useState<"team" | "event">("team");

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fallbackEvent: LiveEvent = {
      id: `e${Date.now()}`,
      name: String(form.get("name")),
      description: String(form.get("description")),
      status: "active",
      startsAt: String(form.get("startsAt")),
      briefing: String(form.get("briefing")),
      updates: [],
      roles: [],
      assignments: [],
    };
    let newEvent = fallbackEvent;
    try {
      const response = await fetch("/api/live-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fallbackEvent.name,
          description: fallbackEvent.description,
          startsAt: fallbackEvent.startsAt,
          briefing: fallbackEvent.briefing,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { event: LiveEvent };
        newEvent = data.event;
      }
    } catch {}
    setEvents((current) => [newEvent, ...current]);
    setShowCreate(false);
    formElement.reset();
  }

  async function saveEventUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeEv = events.find((e) => e.status === "active") ?? events[0];
    if (!activeEv) return;
    const form = new FormData(event.currentTarget);
    const updated: LiveEvent = {
      ...activeEv,
      name: String(form.get("name")),
      description: String(form.get("description")),
      briefing: String(form.get("briefing")),
    };
    let saved = updated;
    try {
      const response = await fetch(`/api/live-events/${activeEv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: updated.name, description: updated.description, briefing: updated.briefing }),
      });
      if (response.ok) {
        const data = (await response.json()) as { event: LiveEvent };
        saved = data.event;
      }
    } catch {}
    setEvents((current) => current.map((e) => (e.id === activeEv.id ? saved : e)));
    setEditingEventId("");
  }

  async function postUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeEv = events.find((e) => e.status === "active") ?? events[0];
    if (!activeEv) return;
    const formElement = event.currentTarget as HTMLFormElement;
    const form = new FormData(formElement);
    const body = String(form.get("body") || "").trim();
    if (!body) return;
    const newUpdate = { id: `eu${Date.now()}`, body, createdAt: new Date().toLocaleString() };
    const updated: LiveEvent = { ...activeEv, updates: [newUpdate, ...(activeEv.updates ?? [])] };
    setEvents((current) => current.map((e) => (e.id === activeEv.id ? updated : e)));
    try {
      await fetch(`/api/live-events/${activeEv.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ update: body }) });
    } catch {}
    formElement.reset();
  }

  async function addAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeEv = events.find((e) => e.status === "active") ?? events[0];
    if (!activeEv) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const memberId = String(form.get("memberId") || "");
    if (!memberId) return;
    const fallbackAssignment: LiveEventAssignment = {
      id: `ea${Date.now()}`,
      memberId,
      roleId: String(form.get("roleId")),
      region: String(form.get("region")),
      platform: String(form.get("platform")),
      status: "assigned",
      notes: String(form.get("notes")),
    };
    let assignment = fallbackAssignment;
    try {
      const response = await fetch(`/api/live-events/${activeEv.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallbackAssignment),
      });
      if (response.ok) {
        const data = (await response.json()) as { assignment: LiveEventAssignment };
        assignment = data.assignment;
      }
    } catch {}
    setEvents((current) =>
      current.map((item) => (item.id === activeEv.id ? { ...item, assignments: [assignment, ...item.assignments] } : item)),
    );
    setShowAssign(false);
    formElement.reset();
  }

  async function addEventRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const activeEv2 = events.find((e) => e.status === "active") ?? events[0];
    if (!activeEv2) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const roleName = String(form.get("roleName") || "").trim();
    if (!roleName) return;
    const newRole = { id: `er${Date.now()}`, name: roleName, description: "" };
    const updated: LiveEvent = {
      ...activeEv2,
      roles: [...activeEv2.roles, newRole],
    };
    setEvents((current) => current.map((e) => (e.id === activeEv2.id ? updated : e)));
    formElement.reset();
  }

  // Active event is the first active one, otherwise the first event
  const activeEvent = events.find((e) => e.status === "active") ?? events[0];
  const isEditing = editingEventId === activeEvent?.id;

  return (
    <div className="page">
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="view-tabs">
          <button className="view-tab active">Active · {events.filter((e) => e.status === "active").length}</button>
          <button className="view-tab">Past · {events.filter((e) => e.status !== "active").length}</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowAssign(true)}>
            <UserPlus size={13} />Assign someone
          </button>
          <button className="btn btn-primary btn-sm" type="button" onClick={() => setShowCreate(true)}>
            <Plus size={13} />Start event
          </button>
        </div>
      </div>

      {activeEvent ? (
        <>
          {/* Live hero */}
          <div className="live-hero">
            <div className="live-hero-grid" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
              <div className="live-hero-main" style={{ padding: "18px 22px", gap: 10 }}>
                <div className="live-banner">
                  <span className="pulse-dot"></span>
                  <span>LIVE · ON AIR · STARTED {activeEvent.startsAt}</span>
                </div>
                <h2 style={{ fontSize: 22 }}>{activeEvent.name}</h2>
                <p className="desc" style={{ fontSize: 12.5, maxWidth: "75ch" }}>{activeEvent.description}</p>
                <div className="live-meta-row">
                  <span className="meta"><Users size={13} /> <strong>{activeEvent.assignments.length}/{activeEvent.assignments.length}</strong> assigned</span>
                  {isEditing ? null : (
                    <button className="btn btn-danger-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={() => setEditingEventId(activeEvent.id)}>
                      Edit event
                    </button>
                  )}
                </div>
                {isEditing && (
                  <form className="stack-form" style={{ marginTop: 12, padding: 0 }} onSubmit={saveEventUpdate}>
                    <label>Name<input name="name" defaultValue={activeEvent.name} /></label>
                    <label>Description<textarea name="description" defaultValue={activeEvent.description} /></label>
                    <label>Briefing<textarea name="briefing" defaultValue={activeEvent.briefing} /></label>
                    <div className="form-actions">
                      <button className="btn btn-secondary btn-sm" type="button" onClick={() => setEditingEventId("")}>Cancel</button>
                      <button className="btn btn-primary btn-sm" type="submit">Save</button>
                    </div>
                  </form>
                )}
              </div>
              <div className="live-hero-side" style={{ padding: "18px 22px" }}>
                <span className="eyebrow">Briefing</span>
                <div style={{ padding: "10px 12px", background: "rgba(0,0,0,0.25)", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                  {activeEvent.briefing || "No briefing set."}
                </div>
              </div>
            </div>
          </div>

          {/* Updates card */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 0, borderBottom: 0 }}>
              <span className="header-icon"><Send size={14} /></span>
              <h2>Updates</h2>
            </div>
            <div className="update-tabs">
              <button className={`update-tab ${updateTab === "team" ? "active" : ""}`} onClick={() => setUpdateTab("team")}>
                <Users size={13} />
                <span>Team updates</span>
                <span className="ut-count">{activeEvent.updates?.length ?? 0}</span>
                <span className="ut-hint">→ team Discord</span>
              </button>
              <button className={`update-tab ${updateTab === "event" ? "active" : ""}`} onClick={() => setUpdateTab("event")}>
                <RadioTower size={13} />
                <span>Event updates</span>
                <span className="ut-count">0</span>
                <span className="ut-hint">→ broadcast + public Discord</span>
              </button>
            </div>
            <div className="card-body">
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: updateTab === "event" ? "rgba(229,23,46,0.06)" : "var(--bg-elev)", border: `1px solid ${updateTab === "event" ? "rgba(229,23,46,0.22)" : "var(--hairline)"}`, borderRadius: 8, marginBottom: 12, fontSize: 11.5, color: updateTab === "event" ? "var(--red-hot)" : "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                {updateTab === "event" ? <RadioTower size={12} /> : <Users size={12} />}
                <span>{updateTab === "team" ? "INTERNAL TEAM THREAD" : "PUBLIC BROADCAST FEED"}</span>
              </div>
              <form className="inline-form" style={{ marginBottom: 14 }} onSubmit={postUpdate}>
                <input name="body" placeholder={updateTab === "team" ? "Message the team (internal — will post to team Discord)…" : "Post public update (broadcast + Discord)…"} style={{ flex: 1, height: 36, padding: "0 12px", background: "var(--bg-elev)", border: "1px solid var(--hairline)", borderRadius: 6, fontSize: 13, color: "var(--text)", fontFamily: "var(--font-body)" }} />
                <button className={`btn ${updateTab === "event" ? "btn-primary" : "btn-secondary"} btn-sm`} type="submit">
                  {updateTab === "event" ? <><RadioTower size={12} />Push live</> : <><Send size={12} />Send to team</>}
                </button>
              </form>
              {(activeEvent.updates ?? []).map((u) => (
                <div key={u.id} className="update-card">
                  <div className="uc-head">
                    <span className="uc-author">Update</span>
                    <span className="uc-ago">{u.createdAt}</span>
                  </div>
                  <p>{u.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Coverage roster */}
          <div className="card">
            <div className="card-header">
              <span className="header-icon"><Users size={14} /></span>
              <h2>Coverage roster</h2>
              <span className="eyebrow" style={{ marginLeft: 6 }}>
                <span style={{ color: "var(--green)" }}>{activeEvent.assignments.filter((a) => a.status === "active").length} ACTIVE</span>
                {activeEvent.assignments.filter((a) => a.status === "assigned").length > 0 && (
                  <> · <span style={{ color: "var(--amber)" }}>{activeEvent.assignments.filter((a) => a.status === "assigned").length} STANDBY</span></>
                )}
              </span>
              <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setShowAssign(true)}>
                <UserPlus size={13} />Add assignment
              </button>
            </div>
            <div style={{ padding: 0 }}>
              {activeEvent.assignments.length ? activeEvent.assignments.map((a) => {
                const m = members.find((x) => x.id === a.memberId);
                const role = activeEvent.roles.find((r) => r.id === a.roleId);
                const isPresent = a.status === "active";
                return (
                  <div key={a.id} className="assignment-row-full" style={!isPresent ? { background: "rgba(246,183,60,0.04)" } : undefined}>
                    <div style={{ position: "relative" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: `linear-gradient(135deg, var(--red-deep), #1a1424)`, display: "grid", placeItems: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12 }}>
                        {(m?.name ?? "?").slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ position: "absolute", right: -2, bottom: -2, width: 10, height: 10, borderRadius: "50%", background: isPresent ? "var(--green)" : "var(--text-4)", border: "2px solid var(--surface)", boxShadow: isPresent ? "0 0 6px var(--green)" : "none" }} />
                    </div>
                    <div className="ar-name">
                      <strong>{m?.name ?? "Unknown"}</strong>
                      <span>@{m?.handle ?? a.memberId}</span>
                    </div>
                    <div className="ar-role">
                      <span className="eyebrow" style={{ fontSize: 9.5 }}>Role</span>
                      <span className="ar-value" style={{ color: "var(--red)", fontSize: 13 }}>{role?.name ?? a.notes ?? "—"}</span>
                    </div>
                    <div className="ar-region">
                      <span className="eyebrow" style={{ fontSize: 9.5 }}>Region / Focus</span>
                      <span className="ar-value" style={{ fontSize: 13 }}>{a.region || "—"}</span>
                    </div>
                    <div className="ar-checkin">
                      <StatusPill tone={isPresent ? "green" : "amber"}>{isPresent ? "Active" : "Standby"}</StatusPill>
                    </div>
                    <select className="select-input ar-status" value={a.status} onChange={(e) => onAssignmentStatus(activeEvent.id, a.id, e.target.value as LiveEventAssignment["status"])}>
                      <option value="assigned">Assigned</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="done">Done</option>
                    </select>
                    <div className="ar-actions">
                      <button className="btn btn-ghost btn-sm" title="More"><Send size={12} /></button>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ padding: "20px 18px" }}><EmptyState title="No assignments" body="Assign team members to get started." /></div>
              )}
            </div>
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--hairline)", background: "var(--bg-elev)", fontSize: 11.5, color: "var(--text-3)", display: "flex", alignItems: "center", gap: 8 }}>
              <UserPlus size={13} />
              <span>Members check in from the dashboard or via <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>/event checkin</span> in Discord.</span>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 48, textAlign: "center" }}>
            <EmptyState title="No active events" body="Start a live event when severe weather fires." />
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowCreate(true)}><Plus size={15} />Start event</button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Start live event</h2>
              <button className="modal-close" type="button" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form className="stack-form" onSubmit={createEvent}>
              <label>Event name<input name="name" required placeholder="Severe weather coverage" /></label>
              <label>Description<input name="description" placeholder="Coverage area and purpose" /></label>
              <label>Start time<input name="startsAt" defaultValue="Now" /></label>
              <label>Briefing<textarea name="briefing" placeholder="Key notes for this event..." /></label>
              <div className="form-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit"><Plus size={15} />Start event</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssign && activeEvent && (
        <div className="modal-overlay" onClick={() => setShowAssign(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign to event</h2>
              <button className="modal-close" type="button" onClick={() => setShowAssign(false)}>×</button>
            </div>
            <form className="stack-form" onSubmit={addAssignment}>
              <label>Member
                <select name="memberId" disabled={!members.length}>
                  {members.length ? members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>) : <option value="">Add a member first</option>}
                </select>
              </label>
              <label>Event role
                <select name="roleId" defaultValue="">
                  <option value="">Pick a role…</option>
                  {["Lead Coordinator","Live Broadcasting","On Camera","Lead Nowcaster","Nowcaster","Regional Monitor","Graphics","Cut-ins / Loops","Verification","Reports / LSRs","FB Live Host","Twitter Posts"].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label>Region / Focus<input name="region" placeholder="e.g. OK · I-44 corridor" /></label>
              <label>Platform (optional)<input name="platform" placeholder="e.g. Twitter, Facebook" /></label>
              <label>Notes (optional)<textarea name="notes" placeholder="Anything the assignee should know" /></label>
              <div style={{ marginTop: 6, padding: "6px 10px", borderRadius: 6, background: "rgba(180,138,255,0.06)", border: "1px solid rgba(180,138,255,0.18)", fontSize: 10.5, color: "var(--violet, #b48aff)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
                TEMPORARY · This event role does not change permanent team or lead roles.
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setShowAssign(false)}>Cancel</button>
                <button className="btn btn-primary" type="submit" disabled={!members.length}>Add assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function OnboardingPage({
  invite,
  members,
  setMembers,
  setInvites,
}: {
  invite?: OnboardingInvite;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  setInvites: React.Dispatch<React.SetStateAction<OnboardingInvite[]>>;
}) {
  const { data: session, status, update } = useSession();
  const [submitState, setSubmitState] = useState<"idle" | "saving" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const isSignedIn = status === "authenticated";
  const discordVerified = session?.user?.discordServerVerified ?? false;
  const signedInName = session?.user?.name ?? "";
  const signedInHandle = session?.user?.discordHandle ?? session?.user?.name ?? "";
  const canUseInvite = invite?.status === "open";
  const canSelfOnboard = !invite && isSignedIn && discordVerified;
  const canShowForm = canUseInvite || canSelfOnboard;

  async function submitOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canShowForm || !isSignedIn || !discordVerified || submitState === "saving") return;
    setSubmitState("saving");
    setSubmitError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const selectedSections = form.getAll("sections") as SectionKey[];
    const handle = String(form.get("handle")).replace(/^@/, "");
    const fallbackMember: Member = {
      id: `m${Date.now()}`,
      name: String(form.get("name")),
      handle,
      discordUserId: session?.user?.discordUserId,
      onboardingStatus: "pending",
      globalRoles: ["member"],
      sections: selectedSections.map((section) => ({ section, role: "member" })),
    };
    let member = fallbackMember;
    let updatedInvite: OnboardingInvite | undefined = invite ? { ...invite, status: "used", memberId: fallbackMember.id } : undefined;
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: invite?.token,
          name: fallbackMember.name,
          handle,
          sections: selectedSections,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "Onboarding failed");
      }
      member = data.member;
      updatedInvite = data.invite;
    } catch (error) {
      setSubmitState("error");
      setSubmitError(error instanceof Error ? error.message : "Onboarding failed");
      return;
    }
    setMembers((current) => [member, ...current]);
    if (updatedInvite) {
      setInvites((current) => current.map((item) => (item.id === updatedInvite.id ? updatedInvite : item)));
    }
    formElement.reset();
    await update();
    window.location.assign("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-brand">
          <div className="auth-brand-mark"><span style={{ color: "var(--text)" }}>WT</span><span style={{ color: "var(--red)" }}>US</span></div>
          <div className="auth-brand-text">
            <strong>WTUS</strong>
            <span>Dashboard onboarding</span>
          </div>
        </div>
        <div className="auth-copy">
          <StatusPill tone={canShowForm ? "green" : "amber"}>{canSelfOnboard ? "discord verified" : invite?.status ?? "sign in"}</StatusPill>
          <h1>Join the WTUS dashboard</h1>
        </div>
        {canShowForm || !isSignedIn ? (
          <form className="stack-form" onSubmit={submitOnboarding}>
            {!isSignedIn ? (
              <button className="btn btn-primary" type="button" onClick={startDiscordLogin}>
                Connect Discord
              </button>
            ) : null}
            {isSignedIn && !discordVerified ? (
              <EmptyState title="Server check needed" body="This Discord account is not verified in the WTUS server." />
            ) : null}
            <label>
              Name
              <input name="name" required placeholder="Name" defaultValue={signedInName} disabled={!isSignedIn || !discordVerified} />
            </label>
            <label>
              Discord handle
              <input name="handle" required placeholder="handle" defaultValue={signedInHandle} disabled={!isSignedIn || !discordVerified} />
            </label>
            <fieldset className="section-picker">
              <legend>Teams</legend>
              {sections.map((section) => (
                <label key={section.key}>
                  <input name="sections" type="checkbox" value={section.key} disabled={!isSignedIn || !discordVerified} />
                  <span>{section.name}</span>
                </label>
              ))}
            </fieldset>
            {submitError ? <p className="form-error">{submitError}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={!isSignedIn || !discordVerified || submitState === "saving"}>
              {submitState === "saving" ? "Saving..." : "Submit"}
            </button>
          </form>
        ) : (
          <EmptyState title="Server check needed" body="Sign in with a Discord account that is in the WTUS server." />
        )}
      </section>
    </main>
  );
}

function AccountView({
  members,
  setMembers,
}: {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
}) {
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const activeMember = members.find((member) => member.id === memberId) ?? members[0];

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeMember) return;
    const form = new FormData(event.currentTarget);
    const selectedSections = form.getAll("sections") as SectionKey[];
    const fallbackMember: Member = {
      ...activeMember,
      name: String(form.get("name")),
      handle: String(form.get("handle")).replace(/^@/, ""),
      discordUserId: String(form.get("discordUserId")),
      sections: selectedSections.map((section) => ({ section, role: "member" })),
    };
    let updatedMember = fallbackMember;
    try {
      const response = await fetch(`/api/members/${activeMember.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fallbackMember.name,
          handle: fallbackMember.handle,
          discordUserId: fallbackMember.discordUserId,
          sections: selectedSections,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { member: Member };
        updatedMember = data.member;
      }
    } catch {}
    setMembers((current) =>
      current.map((member) => (member.id === activeMember.id ? updatedMember : member)),
    );
  }

  return (
    <div className="page col-layout equal">
      <section className="card">
        <PanelHeader icon={<Settings size={19} />} title="Account" />
        {activeMember ? (
          <form className="stack-form" key={activeMember.id} onSubmit={saveAccount}>
            <label>
              Member
              <select value={activeMember.id} onChange={(event) => setMemberId(event.target.value)}>
                {members.map((member) => (
                  <option value={member.id} key={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Name
              <input name="name" defaultValue={activeMember.name} />
            </label>
            <label>
              Discord handle
              <input name="handle" defaultValue={activeMember.handle} />
            </label>
            <label>
              Discord user ID
              <input name="discordUserId" defaultValue={activeMember.discordUserId ?? ""} />
            </label>
            <fieldset className="section-picker">
              <legend>Teams</legend>
              {sections.map((section) => (
                <label key={section.key}>
                  <input
                    defaultChecked={activeMember.sections.some((entry) => entry.section === section.key)}
                    name="sections"
                    type="checkbox"
                    value={section.key}
                  />
                  <span>{section.name}</span>
                </label>
              ))}
            </fieldset>
            <button className="btn btn-primary" type="submit">
              Save account
            </button>
          </form>
        ) : (
          <EmptyState title="No account yet" body="Start with Onboarding." />
        )}
      </section>
      <section className="card">
        <PanelHeader icon={<ListChecks size={19} />} title="Current teams" />
        {activeMember ? (
          <div className="member-tags">
            {activeMember.sections.length ? (
              activeMember.sections.map((entry) => (
                <StatusPill key={`${activeMember.id}-${entry.section}`} tone="slate">
                  {sectionName(entry.section)}
                </StatusPill>
              ))
            ) : (
              <EmptyState title="No teams selected" body="Pick what fits." />
            )}
          </div>
        ) : (
          <EmptyState title="No member selected" body="No account loaded." />
        )}
      </section>
    </div>
  );
}

function MembersView({
  members,
  invites,
  role,
  setActive,
  setMembers,
  coverage,
  setCoverage,
  events,
}: {
  members: Member[];
  invites: OnboardingInvite[];
  role: RoleView;
  setActive: (item: NavItem) => void;
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  coverage: TemporaryCoverage[];
  setCoverage: React.Dispatch<React.SetStateAction<TemporaryCoverage[]>>;
  events: LiveEvent[];
}) {
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const canManage = canManageTeam(role);

  useEffect(() => {
    if (!selectedMemberId && members.length) setSelectedMemberId(members[0].id);
  }, [members, selectedMemberId]);

  function saveMemberUpdate(memberId: string, updates: Partial<Member>) {
    setMembers((current) => current.map((m) => (m.id === memberId ? { ...m, ...updates } : m)));
  }

  async function changeGlobalRole(memberId: string, newRole: string) {
    saveMemberUpdate(memberId, { globalRoles: [newRole] });
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ globalRole: newRole }),
      });
      if (response.ok) {
        const data = (await response.json()) as { member: Member };
        saveMemberUpdate(memberId, data.member);
      }
    } catch {}
  }

  async function changeSectionRole(memberId: string, section: SectionKey, newRole: "lead" | "member" | "remove") {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    let updatedSections: Member["sections"];
    if (newRole === "remove") {
      updatedSections = member.sections.filter((s) => s.section !== section);
    } else {
      const existing = member.sections.find((s) => s.section === section);
      if (existing) {
        updatedSections = member.sections.map((s) => (s.section === section ? { ...s, role: newRole } : s));
      } else {
        updatedSections = [...member.sections, { section, role: newRole }];
      }
    }
    saveMemberUpdate(memberId, { sections: updatedSections });
    try {
      const response = await fetch(`/api/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, sectionRole: newRole === "remove" ? null : newRole }),
      });
      if (response.ok) {
        const data = (await response.json()) as { member: Member };
        saveMemberUpdate(memberId, data.member);
      }
    } catch {}
  }

  async function addCoverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const assigneeId = String(form.get("assigneeId") || "");
    if (!assigneeId) return;
    const item: TemporaryCoverage = {
      id: `tc${Date.now()}`,
      assigneeId,
      coverageRole: String(form.get("coverageRole")),
      reason: String(form.get("reason")),
      startsAt: String(form.get("startsAt")),
      endsAt: String(form.get("endsAt")),
      status: "active",
    };
    let coverageItem = item;
    try {
      const response = await fetch("/api/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (response.ok) {
        const data = (await response.json()) as { coverage: TemporaryCoverage };
        coverageItem = data.coverage;
      }
    } catch {}
    setCoverage((current) => [coverageItem, ...current]);
    formElement.reset();
  }

  return (
    <div className="page col-layout equal">
      <section className="card">
        <PanelHeader icon={<Users size={19} />} title="Team members" />
        <div className="card-body tight">
          {members.length ? (
            members.map((member) => (
              <button
                key={member.id}
                className={`member-card ${selectedMemberId === member.id ? "selected" : ""}`}
                type="button"
                onClick={() => setSelectedMemberId(member.id)}
              >
                <div className="av-lg">{member.handle.slice(0, 1)}</div>
                <div className="mc-info">
                  <strong className="mc-name">{member.name}</strong>
                  <span className="mc-handle">@{member.handle}</span>
                </div>
                <div className="mc-pills">
                  {member.globalRoles.map((r) => (
                    <StatusPill key={r} tone="blue">{r.replace("_", " ")}</StatusPill>
                  ))}
                  {member.sections.map((entry) => (
                    <StatusPill key={`${member.id}-${entry.section}`} tone={entry.role === "lead" ? "green" : "slate"}>
                      {sectionName(entry.section)}
                    </StatusPill>
                  ))}
                </div>
              </button>
            ))
          ) : (
            <EmptyState title="No members yet" body="Members join via onboarding." />
          )}
        </div>
      </section>

      <section className="card">
        <PanelHeader icon={<Settings size={19} />} title="Manage member" />
        {selectedMember ? (
          <div className="manage-member-form">
            <div className="member-info-header">
              <strong>{selectedMember.name}</strong>
              <span>@{selectedMember.handle}</span>
            </div>

            {canManage && (
              <div className="role-control">
                <label className="control-label">Global role</label>
                <select
                  className="role-select"
                  value={selectedMember.globalRoles[0] ?? "member"}
                  onChange={(e) => changeGlobalRole(selectedMember.id, e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="operations_lead">Operations Lead</option>
                  <option value="owner">Owner</option>
                </select>
              </div>
            )}

            <div className="section-controls">
              <label className="control-label">Section roles</label>
              {sections.map((section) => {
                const membership = selectedMember.sections.find((s) => s.section === section.key);
                return (
                  <div className="section-control-row" key={section.key}>
                    <span className="section-control-name">{section.name}</span>
                    {canManage ? (
                      <select
                        className="role-select"
                        value={membership?.role ?? "none"}
                        onChange={(e) => {
                          const val = e.target.value as "lead" | "member" | "none";
                          changeSectionRole(selectedMember.id, section.key, val === "none" ? "remove" : val);
                        }}
                      >
                        <option value="none">Not assigned</option>
                        <option value="member">Member</option>
                        <option value="lead">Lead</option>
                      </select>
                    ) : (
                      <StatusPill tone={membership?.role === "lead" ? "green" : "slate"}>
                        {membership ? sectionName(section.key) : "Not assigned"}
                      </StatusPill>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <EmptyState title="Select a member" body="Choose someone from the list." />
        )}

        {canManage && (
          <div className="temp-coverage-section">
            <strong className="subsection-title">Temp role coverage</strong>
            <div className="coverage-list">
              {coverage.filter((c) => c.assigneeId === selectedMemberId).length ? (
                coverage.filter((c) => c.assigneeId === selectedMemberId).map((item) => (
                  <div className="coverage-row" key={item.id}>
                    <strong>{item.coverageRole}</strong>
                    <p>{item.reason}</p>
                  </div>
                ))
              ) : (
                <p className="no-coverage">No temp coverage for this member.</p>
              )}
            </div>
            <form className="stack-form compact-form" onSubmit={addCoverage}>
              <div className="form-row">
                <label>
                  Role
                  <input name="coverageRole" placeholder="e.g. Nowcasting lead" />
                </label>
                <input type="hidden" name="assigneeId" value={selectedMemberId} />
                <label>
                  Member
                  <input value={selectedMember?.name ?? ""} readOnly />
                </label>
              </div>
              <div className="form-row">
                <label>
                  From
                  <input name="startsAt" defaultValue="Now" />
                </label>
                <label>
                  To
                  <input name="endsAt" defaultValue="End of event" />
                </label>
              </div>
              <label>
                Reason
                <input name="reason" placeholder="Vacation, unavailable, etc." />
              </label>
              <button className="btn btn-primary" type="submit">Add coverage</button>
            </form>
          </div>
        )}

        <div className="invite-cta">
          <p className="panel-note">New members join via onboarding invites.</p>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setActive("admin")}>
            Go to Team Setup <ChevronRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}

function SectionsView({ tasks, members }: { tasks: Task[]; members: Member[] }) {
  return (
    <section className="card">
      <PanelHeader icon={<ListChecks size={19} />} title="Sections" />
      <div className="card-body tight">
        {sections.map((section) => {
          const leads = members.filter((member) => member.sections.some((entry) => entry.section === section.key && entry.role === "lead"));
          const sectionMembers = members.filter((member) => member.sections.some((entry) => entry.section === section.key));
          const sectionTasks = tasks.filter((task) => task.section === section.key);
          return (
            <div className="section-detail-row" key={section.key}>
              <div className="sd-icon"><ListChecks size={15} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sd-name">{section.name}</div>
                <div className="sd-desc">{section.description}</div>
              </div>
              <span className="sd-cell">{leads.map((lead) => lead.handle).join(", ") || "No lead"}</span>
              <span className="sd-cell">{sectionMembers.length} members</span>
              <span className="sd-cell">{sectionTasks.length} tasks</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WorkflowView({
  members,
  tasks,
  events,
  reminderPreferences,
  specialRequests,
  setReminderPreferences,
  setSpecialRequests,
  role,
}: {
  members: Member[];
  tasks: Task[];
  events: LiveEvent[];
  reminderPreferences: ReminderPreference[];
  specialRequests: SpecialRequest[];
  setReminderPreferences: React.Dispatch<React.SetStateAction<ReminderPreference[]>>;
  setSpecialRequests: React.Dispatch<React.SetStateAction<SpecialRequest[]>>;
  role: RoleView;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? "");
  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? members[0];
  const preference = selectedMember ? reminderPreferences.find((item) => item.memberId === selectedMember.id) : undefined;
  const memberRequests = selectedMember ? specialRequests.filter((item) => item.memberId === selectedMember.id) : [];
  const assignedTasks = selectedMember ? tasks.filter((task) => task.assigneeIds.includes(selectedMember.id) && task.status !== "done") : [];
  const assignedEvents = selectedMember
    ? events.flatMap((event) =>
        event.assignments
          .filter((assignment) => assignment.memberId === selectedMember.id && assignment.status !== "done")
          .map((assignment) => ({ event, assignment })),
      )
    : [];

  useEffect(() => {
    if (!selectedMemberId && members.length) setSelectedMemberId(members[0].id);
  }, [members, selectedMemberId]);

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMember) return;
    const form = new FormData(event.currentTarget);
    const nextPreference: ReminderPreference = {
      id: preference?.id ?? `rp${Date.now()}`,
      memberId: selectedMember.id,
      frequency: form.get("frequency") as ReminderFrequency,
      sendClearForDay: form.get("sendClearForDay") === "on",
      taskReminders: form.get("taskReminders") === "on",
      liveEventReminders: form.get("liveEventReminders") === "on",
      specialRequestReminders: form.get("specialRequestReminders") === "on",
      preferredDays: String(form.get("preferredDays") || "").split(",").map((item) => item.trim()).filter(Boolean),
      preferredTimes: String(form.get("preferredTimes") || "").split(",").map((item) => item.trim()).filter(Boolean),
      preferredPlatforms: String(form.get("preferredPlatforms") || "").split(",").map((item) => item.trim()).filter(Boolean),
      preferredContentTypes: String(form.get("preferredContentTypes") || "").split(",").map((item) => item.trim()).filter(Boolean),
      notes: String(form.get("notes") || ""),
    };
    let savedPreference = nextPreference;
    try {
      const response = await fetch("/api/reminder-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextPreference),
      });
      if (response.ok) {
        const data = (await response.json()) as { preference: ReminderPreference };
        savedPreference = data.preference;
      }
    } catch {}
    setReminderPreferences((current) => [savedPreference, ...current.filter((item) => item.memberId !== selectedMember.id)]);
  }

  async function createSpecialRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fallbackRequest: SpecialRequest = {
      id: `sr${Date.now()}`,
      memberId: String(form.get("memberId")),
      title: String(form.get("title")),
      prompt: String(form.get("prompt")),
      role: String(form.get("requestRole")),
      platform: String(form.get("platform") || ""),
      dueAt: String(form.get("dueAt") || ""),
      status: "open",
      responseNote: "",
      createdAt: new Date().toLocaleString(),
    };
    let specialRequest = fallbackRequest;
    try {
      const response = await fetch("/api/special-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallbackRequest),
      });
      if (response.ok) {
        const data = (await response.json()) as { specialRequest: SpecialRequest };
        specialRequest = data.specialRequest;
      }
    } catch {}
    setSpecialRequests((current) => [specialRequest, ...current]);
    formElement.reset();
  }

  async function respondToRequest(requestId: string, status: SpecialRequest["status"]) {
    setSpecialRequests((current) => current.map((item) => (item.id === requestId ? { ...item, status } : item)));
    try {
      const response = await fetch(`/api/special-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        const data = (await response.json()) as { specialRequest: SpecialRequest };
        setSpecialRequests((current) => current.map((item) => (item.id === requestId ? data.specialRequest : item)));
      }
    } catch {}
  }

  return (
    <div className="page col-layout equal">
      <section className="card">
        <PanelHeader icon={<Bell size={19} />} title="60-second assignment brief" />
        <label>
          Member
          <select value={selectedMember?.id ?? ""} onChange={(event) => setSelectedMemberId(event.target.value)}>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </label>
        <div className="brief-card">
          <strong>{selectedMember ? `${selectedMember.name}'s quick brief` : "No member selected"}</strong>
          <span>{assignedTasks[0]?.title ?? "No regular task assigned."}</span>
          <span>{assignedEvents[0] ? `${assignedEvents[0].event.name}: ${assignedEvents[0].assignment.platform ?? "coverage"}` : "No live event role active."}</span>
          <span>{memberRequests.find((item) => item.status === "open")?.prompt ?? "No special request waiting."}</span>
        </div>
        <form className="stack-form" key={selectedMember?.id ?? "none"} onSubmit={savePreferences}>
          <label>
            Reminder cadence
            <select name="frequency" defaultValue={preference?.frequency ?? "daily"}>
              {(Object.keys(reminderLabels) as ReminderFrequency[]).map((frequency) => (
                <option key={frequency} value={frequency}>{reminderLabels[frequency]}</option>
              ))}
            </select>
          </label>
          <div className="toggle-grid">
            <label><input name="taskReminders" type="checkbox" defaultChecked={preference?.taskReminders ?? true} /> Tasks</label>
            <label><input name="liveEventReminders" type="checkbox" defaultChecked={preference?.liveEventReminders ?? true} /> Events</label>
            <label><input name="specialRequestReminders" type="checkbox" defaultChecked={preference?.specialRequestReminders ?? true} /> Special requests</label>
            <label><input name="sendClearForDay" type="checkbox" defaultChecked={preference?.sendClearForDay ?? true} /> Clear day DM</label>
          </div>
          <label>
            Free days
            <input name="preferredDays" placeholder="Mon, Wed, Sat" defaultValue={preference?.preferredDays.join(", ") ?? ""} />
          </label>
          <label>
            Preferred posting times
            <input name="preferredTimes" placeholder="Morning, 4-7 PM CT" defaultValue={preference?.preferredTimes.join(", ") ?? ""} />
          </label>
          <label>
            Platforms
            <input name="preferredPlatforms" placeholder="X, Facebook, Discord" defaultValue={preference?.preferredPlatforms.join(", ") ?? ""} />
          </label>
          <label>
            Content types
            <input name="preferredContentTypes" placeholder="Radar, SPC, recap graphics" defaultValue={preference?.preferredContentTypes.join(", ") ?? ""} />
          </label>
          <label>
            Notes
            <textarea name="notes" defaultValue={preference?.notes ?? ""} placeholder="Limits, school schedule, review preferences" />
          </label>
          <button className="btn btn-primary" type="submit">Save reminders</button>
        </form>
      </section>

      <section className="card">
        <PanelHeader icon={<Send size={19} />} title="Special requests" />
        {canManageTeam(role) && (
          <form className="stack-form request-form" onSubmit={createSpecialRequest}>
            <label>
              Member
              <select name="memberId" defaultValue={selectedMember?.id ?? ""}>
                {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <label><span>Title</span><input name="title" required placeholder="Cover SPC updates" /></label>
            <label><span>Role</span><input name="requestRole" required placeholder="SPC updates" /></label>
            <label><span>Platform</span><input name="platform" placeholder="X / Facebook / Discord" /></label>
            <label><span>Needed by</span><input name="dueAt" type="datetime-local" /></label>
            <label><span>Ask</span><textarea name="prompt" required placeholder="Can you cover SPC updates this afternoon?" /></label>
            <button className="btn btn-primary" type="submit">Send request</button>
          </form>
        )}
        <div className="request-list">
          {specialRequests.length ? (
            specialRequests.map((request) => (
              <div className="request-card" key={request.id}>
                <div>
                  <strong>{request.title}</strong>
                  <span>{memberName(members, request.memberId)} - {request.role}{request.platform ? ` - ${request.platform}` : ""}</span>
                  <p>{request.prompt}</p>
                </div>
                <div className="request-actions">
                  <StatusPill tone={request.status === "accepted" ? "green" : request.status === "declined" ? "amber" : "blue"}>{request.status}</StatusPill>
                  {request.status === "open" && (
                    <>
                      <button className="btn btn-secondary" type="button" onClick={() => respondToRequest(request.id, "declined")}>No</button>
                      <button className="btn btn-primary" type="button" onClick={() => respondToRequest(request.id, "accepted")}>Yes</button>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No special requests" body="Leadership can ask for extra coverage here." />
          )}
        </div>
      </section>
    </div>
  );
}

function PortfolioView({
  members,
  tasks,
}: {
  members: Member[];
  tasks: Task[];
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? "");
  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? members[0];
  const completedTasks = selectedMember
    ? tasks.filter((task) => task.status === "done" && task.assigneeIds.includes(selectedMember.id))
    : [];
  const skillSet = Array.from(new Set(completedTasks.flatMap((task) => [sectionName(task.section), task.priority === "urgent" || task.priority === "high" ? "deadline work" : "team operations"])));

  useEffect(() => {
    if (!selectedMemberId && members.length) setSelectedMemberId(members[0].id);
  }, [members, selectedMemberId]);

  function exportResume() {
    const lines = [
      `${selectedMember?.name ?? "WTUS Member"} - WTUS Portfolio Summary`,
      `Roles: ${selectedMember?.sections.map((entry) => `${sectionName(entry.section)} ${entry.role}`).join(", ") || "Contributor"}`,
      "",
      "Completed WTUS tasks:",
      ...completedTasks.map((task) => `- ${task.title} (${sectionName(task.section)}, ${task.priority}${task.due ? `, due ${task.due}` : ""}) - ${task.notes || "Completed team task"}`),
      "",
      `Skills: ${skillSet.join(", ") || "Weather communication, teamwork"}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedMember?.handle ?? "wtus"}-portfolio-summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page col-layout equal">
      <section className="card">
        <PanelHeader icon={<FileText size={19} />} title="Portfolio source" action="Export summary" onAction={exportResume} />
        <label>
          Member
          <select value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)}>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </label>
        <div className="portfolio-summary">
          <strong>{selectedMember?.name ?? "WTUS member"}</strong>
          <span>{completedTasks.length} completed task{completedTasks.length === 1 ? "" : "s"}</span>
          <span>{skillSet.join(", ") || "No completed task skills yet"}</span>
        </div>
      </section>
      <section className="card">
        <PanelHeader icon={<ListChecks size={19} />} title="Completed tasks" />
        <div className="table-wrap">
          {completedTasks.length ? (
            <table className="task-table compact">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Section</th>
                  <th>Priority</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {completedTasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{sectionName(task.section)}</td>
                    <td>{priorityLabels[task.priority]}</td>
                    <td>{task.due || "Done"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No completed tasks" body="Completed Leantime tasks assigned to this member will appear here." />
          )}
        </div>
      </section>
    </div>
  );
}

function DiscordView() {
  return (
    <div className="page col-layout equal">
      <section className="card">
        <PanelHeader icon={<Bot size={19} />} title="WTUS Discord bot" />
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
      <section className="card">
        <PanelHeader icon={<Bell size={19} />} title="Alert channels" />
        <div className="alert-list">
          <div>
            <strong>#ops-dashboard</strong>
            <span>Task assignment and blocked work</span>
          </div>
          <div>
            <strong>#live-coverage</strong>
            <span>Availability and event roles</span>
          </div>
          <div>
            <strong>#verification</strong>
            <span>Reports needing review</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function AdminView({
  coverage,
  members,
  events,
  invites,
  role,
  setCoverage,
  setInvites,
}: {
  coverage: TemporaryCoverage[];
  members: Member[];
  events: LiveEvent[];
  invites: OnboardingInvite[];
  role: RoleView;
  setCoverage: React.Dispatch<React.SetStateAction<TemporaryCoverage[]>>;
  setInvites: React.Dispatch<React.SetStateAction<OnboardingInvite[]>>;
}) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin + window.location.pathname);
  }, []);

  async function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fallbackInvite: OnboardingInvite = {
      id: `oi${Date.now()}`,
      token: globalThis.crypto?.randomUUID?.() ?? `invite-${Date.now()}`,
      label: String(form.get("label") || "New member"),
      createdByRole: role === "owner" ? "owner" : "operations",
      createdAt: new Date().toLocaleString(),
      status: "open",
    };
    let invite = fallbackInvite;
    try {
      const response = await fetch("/api/onboarding/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: fallbackInvite.label }),
      });
      if (response.ok) {
        const data = (await response.json()) as { invite: OnboardingInvite };
        invite = data.invite;
      }
    } catch {}
    setInvites((current) => [invite, ...current]);
    formElement.reset();
  }

  async function setInviteStatus(inviteId: string, status: OnboardingInvite["status"]) {
    const previous = invites;
    setInvites((current) => current.map((invite) => (invite.id === inviteId ? { ...invite, status } : invite)));
    try {
      const response = await fetch(`/api/onboarding/invites/${inviteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Request failed");
      const data = (await response.json()) as { invite: OnboardingInvite };
      setInvites((current) => current.map((invite) => (invite.id === inviteId ? data.invite : invite)));
    } catch {
      setInvites(previous);
    }
  }

  async function addCoverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const assigneeId = String(form.get("assigneeId") || "");
    if (!assigneeId) return;
    const item: TemporaryCoverage = {
      id: `tc${Date.now()}`,
      assigneeId,
      coverageRole: String(form.get("coverageRole")),
      reason: String(form.get("reason")),
      startsAt: String(form.get("startsAt")),
      endsAt: String(form.get("endsAt")),
      status: "active",
    };
    let coverageItem = item;
    try {
      const response = await fetch("/api/coverage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (response.ok) {
        const data = (await response.json()) as { coverage: TemporaryCoverage };
        coverageItem = data.coverage;
      }
    } catch {}
    setCoverage((current) => [coverageItem, ...current]);
    formElement.reset();
  }

  return (
    <div className="page col-layout equal">
      <section className="card">
        <PanelHeader icon={<UserPlus size={19} />} title="Onboarding invites" />
        <form className="inline-form" onSubmit={createInvite}>
          <label className="">
            Label
            <input name="label" placeholder="New member, graphics recruit..." />
          </label>
          <button className="btn btn-primary" type="submit">Create link</button>
        </form>
        <div className="invite-list">
          {invites.length ? (
            invites.map((invite) => (
              <div className="invite-row" key={invite.id}>
                <div className="invite-info">
                  <strong>{invite.label}</strong>
                  <span className="invite-url">{origin}#/onboard/{invite.token}</span>
                </div>
                <div className="invite-actions">
                  <StatusPill tone={invite.status === "open" ? "green" : invite.status === "used" ? "slate" : "amber"}>
                    {invite.status}
                  </StatusPill>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigator.clipboard.writeText(`${origin}#/onboard/${invite.token}`)}>
                    Copy
                  </button>
                  {invite.status === "open" ? (
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setInviteStatus(invite.id, "disabled")}>Disable</button>
                  ) : (
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setInviteStatus(invite.id, "open")}>Reopen</button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No invites" body="Create a link when someone is ready to join." />
          )}
        </div>
      </section>

      <section className="card">
        <PanelHeader icon={<ShieldCheck size={19} />} title="Temp role coverage" />
        <div className="coverage-list">
          {coverage.length ? (
            coverage.map((item) => (
              <div className="coverage-row" key={item.id}>
                <div>
                  <strong>{memberName(members, item.assigneeId)}</strong>
                  <span>{item.coverageRole}</span>
                </div>
                <p>{item.reason}</p>
              </div>
            ))
          ) : (
            <EmptyState title="No coverage" body="No temporary fill-ins." />
          )}
        </div>
        <form className="stack-form" onSubmit={addCoverage}>
          <div className="form-row">
            <label>
              Member
              <select name="assigneeId" disabled={!members.length}>
                <option value="">Select...</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label>
              Role
              <input name="coverageRole" placeholder="e.g. Nowcasting lead" />
            </label>
          </div>
          <div className="form-row">
            <label>
              From
              <input name="startsAt" defaultValue="Now" />
            </label>
            <label>
              To
              <input name="endsAt" defaultValue="End of event" />
            </label>
          </div>
          <label>
            Reason
            <textarea name="reason" placeholder="Vacation, unavailable during event, etc." />
          </label>
          <button className="btn btn-primary" type="submit" disabled={!members.length}>Add coverage</button>
        </form>
      </section>
    </div>
  );
}

export function App() {
  const [active, setActive] = useStoredState<NavItem>("wtus.activeView", "dashboard");
  const [role, setRole] = useStoredState<RoleView>("wtus.roleView", "operations");
  const { data: session, status } = useSession();
  const isDevelopmentFallback = isLocalPreviewEnabled && status !== "authenticated";
  const effectiveRole = isDevelopmentFallback ? role : roleFromSession(session?.user?.globalRoles);
  const [members, setMembers] = useStoredState<Member[]>("wtus.members", initialMembers);
  const [invites, setInvites] = useStoredState<OnboardingInvite[]>("wtus.onboardingInvites", []);
  const [tasks, setTasks] = useStoredState<Task[]>("wtus.tasks", initialTasks);
  const [availability, setAvailability] = useStoredState<AvailabilityWindow[]>("wtus.availability", initialAvailability);
  const [events, setEvents] = useStoredState<LiveEvent[]>("wtus.liveEvents", initialEvents);
  const [coverage, setCoverage] = useStoredState<TemporaryCoverage[]>("wtus.temporaryCoverage", initialCoverage);
  const [reminderPreferences, setReminderPreferences] = useStoredState<ReminderPreference[]>("wtus.reminderPreferences", initialReminderPreferences);
  const [workSubmissions, setWorkSubmissions] = useStoredState<WorkSubmission[]>("wtus.workSubmissions", initialWorkSubmissions);
  const [specialRequests, setSpecialRequests] = useStoredState<SpecialRequest[]>("wtus.specialRequests", initialSpecialRequests);
  const [hash, setHash] = useState("");
  const onboardingToken = hash.match(/^#\/onboard\/([^/]+)$/)?.[1];
  const onboardingInvite = invites.find((invite) => invite.token === onboardingToken);

  useEffect(() => {
    let activeRequest = true;

    async function loadDashboardData() {
      if (isDevelopmentFallback || status !== "authenticated") return;

      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) return;
        const data = (await response.json()) as DashboardData;
        if (!activeRequest) return;
        setMembers(data.members);
        setInvites(data.invites);
        setTasks(data.tasks);
        setAvailability(data.availability);
        setEvents(data.liveEvents);
        setCoverage(data.coverage);
        setReminderPreferences(data.reminderPreferences ?? []);
        setWorkSubmissions(data.workSubmissions ?? []);
        setSpecialRequests(data.specialRequests ?? []);
      } catch {
      }
    }

    loadDashboardData();
    return () => {
      activeRequest = false;
    };
  }, [isDevelopmentFallback, setAvailability, setCoverage, setEvents, setInvites, setMembers, setReminderPreferences, setSpecialRequests, setTasks, setWorkSubmissions, status]);

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  useEffect(() => {
    if (isDevelopmentFallback) return;
    setRole(effectiveRole);
  }, [effectiveRole, isDevelopmentFallback, setRole]);

  useEffect(() => {
    const allowed = canManageTeam(effectiveRole) ? opsNavItems : memberNavItems;
    if (!allowed.includes(active)) setActive(effectiveRole === "member" ? "dashboard" : "admin");
  }, [active, effectiveRole, setActive]);

  const content = useMemo(() => {
    const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
      setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (response.ok) {
          const data = (await response.json()) as { task: Task };
          setTasks((current) => current.map((task) => (task.id === taskId ? data.task : task)));
        }
      } catch {}
    };
    const updateAssignmentStatus = async (eventId: string, assignmentId: string, status: LiveEventAssignment["status"]) => {
      setEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                assignments: event.assignments.map((assignment) =>
                  assignment.id === assignmentId ? { ...assignment, status } : assignment,
                ),
              }
            : event,
        ),
      );
      try {
        const response = await fetch(`/api/live-events/${eventId}/assignments/${assignmentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (response.ok) {
          const data = (await response.json()) as { assignment: LiveEventAssignment };
          setEvents((current) =>
            current.map((event) =>
              event.id === eventId
                ? {
                    ...event,
                    assignments: event.assignments.map((assignment) =>
                      assignment.id === assignmentId ? data.assignment : assignment,
                    ),
                  }
                : event,
            ),
          );
        }
      } catch {}
    };

    if (active === "tasks") return <TasksView tasks={tasks} members={members} setTasks={setTasks} onTaskStatus={updateTaskStatus} />;
    if (active === "availability") return <AvailabilityView availability={availability} members={members} setAvailability={setAvailability} />;
    if (active === "events") {
      return (
        <EventsView
          events={events}
          setEvents={setEvents}
          availability={availability}
          members={members}
          onAssignmentStatus={updateAssignmentStatus}
        />
      );
    }
    if (active === "members") return <MembersView members={members} invites={invites} role={effectiveRole} setActive={setActive} setMembers={setMembers} coverage={coverage} setCoverage={setCoverage} events={events} />;
    if (active === "sections") return <SectionsView tasks={tasks} members={members} />;
    if (active === "portfolio") return <PortfolioView members={members} tasks={tasks} />;
    if (active === "account") return <AccountView members={members} setMembers={setMembers} />;
    if (active === "discord" && canManageTeam(effectiveRole)) return <DiscordView />;
    if (active === "admin" && canManageTeam(effectiveRole)) {
      return (
        <AdminView
          coverage={coverage}
          members={members}
          setCoverage={setCoverage}
          events={events}
          invites={invites}
          role={effectiveRole}
          setInvites={setInvites}
        />
      );
    }
    return (
      <DashboardView
        tasks={tasks}
        availability={availability}
        events={events}
        coverage={coverage}
        members={members}
        setActive={setActive}
        onTaskStatus={updateTaskStatus}
        onAssignmentStatus={updateAssignmentStatus}
      />
    );
  }, [active, availability, coverage, effectiveRole, events, invites, members, reminderPreferences, specialRequests, tasks, workSubmissions]);

  if (onboardingToken) {
    return <OnboardingPage invite={onboardingInvite} members={members} setMembers={setMembers} setInvites={setInvites} />;
  }

  if (!isDevelopmentFallback && status !== "authenticated") {
    return <ProductionAuthGate state={status === "loading" ? "loading" : "signin"} />;
  }

  if (!isDevelopmentFallback && !session?.user?.discordServerVerified) {
    return <ProductionAuthGate state="unverified" />;
  }

  if (!isDevelopmentFallback && (session?.user?.onboardingStatus !== "verified" || session?.user?.status !== "active")) {
    return <OnboardingPage members={members} setMembers={setMembers} setInvites={setInvites} />;
  }

  return (
    <AppShell active={active} setActive={setActive} role={effectiveRole} setRole={setRole} isDevelopmentFallback={isDevelopmentFallback} tasks={tasks} events={events} members={members}>
      {content}
    </AppShell>
  );
}
