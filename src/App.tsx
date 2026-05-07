"use client";

import {
  Bell,
  Bot,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Command,
  LayoutDashboard,
  ListChecks,
  LogIn,
  LogOut,
  Plus,
  RadioTower,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import type React from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { initialAvailability, initialCoverage, initialEvents, initialMembers, initialTasks, sections } from "./data";
import wtusLogo from "../wtusredlogotransparent.png";
import type {
  AvailabilityWindow,
  LiveEvent,
  LiveEventAssignment,
  Member,
  OnboardingInvite,
  Priority,
  RoleView,
  SectionKey,
  Task,
  TaskStatus,
  TemporaryCoverage,
} from "./types";

const wtusLogoSrc = typeof wtusLogo === "string" ? wtusLogo : wtusLogo.src;

type DashboardData = {
  members: Member[];
  invites: OnboardingInvite[];
  tasks: Task[];
  availability: AvailabilityWindow[];
  liveEvents: LiveEvent[];
  coverage: TemporaryCoverage[];
};

type NavItem =
  | "dashboard"
  | "tasks"
  | "availability"
  | "events"
  | "members"
  | "sections"
  | "account"
  | "discord"
  | "admin";

function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      setHasLoaded(true);
      return;
    }

    try {
      setValue(JSON.parse(stored) as T);
    } catch {
      setValue(initialValue);
    }
    setHasLoaded(true);
  }, [key]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasLoaded) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [hasLoaded, key, value]);

  return [value, setValue] as const;
}

const navItems: Array<{ id: NavItem; label: string; icon: React.ComponentType<{ size?: number }> }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "Tasks", icon: ClipboardList },
  { id: "availability", label: "Availability", icon: CalendarClock },
  { id: "events", label: "Live Events", icon: RadioTower },
  { id: "members", label: "Members", icon: Users },
  { id: "sections", label: "Sections", icon: ListChecks },
  { id: "account", label: "Account", icon: Settings },
  { id: "discord", label: "Discord Bot", icon: Bot },
  { id: "admin", label: "Team Setup", icon: ShieldCheck },
];

const memberNavItems: NavItem[] = ["dashboard", "tasks", "availability", "events", "sections", "account"];
const opsNavItems: NavItem[] = ["dashboard", "tasks", "availability", "events", "members", "sections", "discord", "admin"];

function canManageTeam(role: RoleView) {
  return role === "owner" || role === "operations";
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
    <div className="empty-state">
      <Sparkles size={18} />
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function StatusPill({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

function PanelHeader({
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
    <div className="panel-header">
      <div>
        {icon}
        <h2>{title}</h2>
      </div>
      {action && (
        <button className="text-button" onClick={onAction} type="button">
          {action}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

function AppShell({
  active,
  setActive,
  role,
  setRole,
  children,
}: {
  active: NavItem;
  setActive: (item: NavItem) => void;
  role: RoleView;
  setRole: (role: RoleView) => void;
  children: React.ReactNode;
}) {
  const visibleNav = navItems.filter((item) => (canManageTeam(role) ? opsNavItems : memberNavItems).includes(item.id));
  const { data: session, status } = useSession();
  const isSignedIn = status === "authenticated";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src={wtusLogoSrc} alt="WTUS" />
          <div>
            <strong>WTUS</strong>
            <span>Operations hub</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <button className={active === item.id ? "nav-item active" : "nav-item"} key={item.id} onClick={() => setActive(item.id)} type="button">
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <Command size={17} />
          <span>WTUS internal</span>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div>
            <h1>Operations</h1>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={17} />
              <input placeholder="Search tasks, members, events" />
            </label>
            <div className="role-switcher" aria-label="Role view">
              {(["owner", "operations", "member"] as RoleView[]).map((roleOption) => (
                <button key={roleOption} className={role === roleOption ? "active" : ""} onClick={() => setRole(roleOption)} type="button">
                  {roleLabel(roleOption)}
                </button>
              ))}
            </div>
            <button className="auth-button" type="button" onClick={() => (isSignedIn ? signOut() : signIn("discord"))}>
              {isSignedIn ? <LogOut size={16} /> : <LogIn size={16} />}
              <span>{isSignedIn ? session.user?.name ?? "Sign out" : "Discord"}</span>
            </button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "amber" | "slate" }) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TaskTable({
  tasks,
  members,
  compact,
  onStatusChange,
}: {
  tasks: Task[];
  members: Member[];
  compact?: boolean;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
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
            <tr key={task.id}>
              <td>
                <strong>{task.title}</strong>
                {!compact && <span>{task.notes}</span>}
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
  const activeEvent = events.find((event) => event.status === "active") ?? events[0];
  const urgentTasks = tasks.filter((task) => task.priority === "urgent" || task.priority === "high");
  const availableNow = availability.filter((window) => window.status === "available");

  return (
    <div className="dashboard-grid">
      <section className="overview-band">
        <Metric label="Urgent or high tasks" value={`${urgentTasks.length}`} tone="amber" />
        <Metric label="Available now" value={`${availableNow.length}`} tone="green" />
        <Metric label="Active live event" value={activeEvent ? "1" : "0"} tone="blue" />
        <Metric label="Members added" value={`${members.length}`} tone="slate" />
      </section>

      <section className="panel wide">
        <PanelHeader icon={<ClipboardList size={19} />} title="Work board" action="Open tasks" onAction={() => setActive("tasks")} />
        {tasks.length ? (
          <TaskTable tasks={tasks.slice(0, 5)} members={members} compact onStatusChange={onTaskStatus} />
        ) : (
          <EmptyState title="No tasks yet" body="Create one from Tasks." />
        )}
      </section>

      <section className="panel">
        <PanelHeader icon={<RadioTower size={19} />} title="Live event" action="Open event" onAction={() => setActive("events")} />
        {activeEvent ? (
          <div className="event-summary">
            <div className="event-title-row">
              <div>
                <h3>{activeEvent.name}</h3>
                <p>{activeEvent.description}</p>
              </div>
              <StatusPill tone="green">{activeEvent.status}</StatusPill>
            </div>
            <p className="briefing">{activeEvent.briefing}</p>
            <div className="assignment-list">
              {activeEvent.assignments.length ? (
                activeEvent.assignments.map((assignment) => (
                  <AssignmentRow
                    key={assignment.id}
                    event={activeEvent}
                    assignment={assignment}
                    members={members}
                    onStatus={(status) => onAssignmentStatus(activeEvent.id, assignment.id, status)}
                  />
                ))
              ) : (
                <EmptyState title="No event assignments" body="No roles assigned." />
              )}
            </div>
          </div>
        ) : (
          <EmptyState title="No active live event" body="Start one from Live Events." />
        )}
      </section>

      <section className="panel">
        <PanelHeader icon={<CalendarClock size={19} />} title="Available for help" action="Open availability" onAction={() => setActive("availability")} />
        <div className="availability-list">
          {availability.length ? (
            availability.map((window) => <AvailabilityRow key={window.id} item={window} members={members} />)
          ) : (
            <EmptyState title="No availability shared" body="No live help windows." />
          )}
        </div>
      </section>

      <section className="panel wide">
        <PanelHeader icon={<ListChecks size={19} />} title="Section health" action="Open sections" onAction={() => setActive("sections")} />
        <div className="section-grid">
          {sections.map((section) => {
            const sectionTasks = tasks.filter((task) => task.section === section.key);
            const sectionMembers = members.filter((member) => member.sections.some((entry) => entry.section === section.key));
            return (
              <div className="section-row" key={section.key}>
                <div>
                  <strong>{section.name}</strong>
                  <span>{section.description}</span>
                </div>
                <div className="section-meta">
                  <span>{sectionTasks.length} tasks</span>
                  <span>{sectionMembers.length} members</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <PanelHeader icon={<Bot size={19} />} title="Discord bridge" action="Bot docs" onAction={() => setActive("discord")} />
        <div className="discord-card">
          <p>Tasks, availability, live events, temp roles.</p>
          <div className="command-list">
            <code>/tasks create</code>
            <code>/available now</code>
            <code>/event mine</code>
            <code>/roles temp</code>
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
  const visibleTasks = sectionFilter === "all" ? tasks : tasks.filter((task) => task.section === sectionFilter);

  function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assigneeId = String(form.get("assigneeId") || "");
    const task: Task = {
      id: `t${Date.now()}`,
      title: String(form.get("title")),
      section: form.get("section") as SectionKey,
      status: "todo",
      priority: form.get("priority") as Priority,
      assigneeId,
      ownerId: assigneeId,
      due: String(form.get("due")),
      notes: String(form.get("notes")),
    };
    setTasks((current) => [task, ...current]);
    event.currentTarget.reset();
  }

  return (
    <div className="two-column-page">
      <section className="panel wide">
        <PanelHeader icon={<ClipboardList size={19} />} title="Tasks" />
        <div className="toolbar">
          <label>
            Section
            <select value={sectionFilter} onChange={(event) => setSectionFilter(event.target.value as SectionKey | "all")}>
              <option value="all">All sections</option>
              {sections.map((section) => (
                <option key={section.key} value={section.key}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {visibleTasks.length ? (
          <TaskTable tasks={visibleTasks} members={members} onStatusChange={onTaskStatus} />
        ) : (
          <EmptyState title="No tasks match this view" body="Nothing here yet." />
        )}
      </section>

      <section className="panel">
        <PanelHeader icon={<Plus size={19} />} title="Create task" />
        <form className="stack-form" onSubmit={createTask}>
          <label>
            Title
            <input name="title" required placeholder="Post storm timing graphic" />
          </label>
          <label>
            Section
            <select name="section" defaultValue="graphics">
              {sections.map((section) => (
                <option key={section.key} value={section.key}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Point person
            <select name="assigneeId" disabled={!members.length}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" defaultValue="normal">
              {(Object.keys(priorityLabels) as Priority[]).map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabels[priority]}
                </option>
              ))}
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
          <button className="primary-button" type="submit">
            <Plus size={17} />
            Create task
          </button>
        </form>
      </section>
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
  function markAvailable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const memberId = String(form.get("memberId") || "");
    if (!memberId) return;
    const item: AvailabilityWindow = {
      id: `a${Date.now()}`,
      memberId,
      status: form.get("status") as AvailabilityWindow["status"],
      section: form.get("section") as SectionKey,
      helpRole: String(form.get("helpRole")),
      eventName: String(form.get("eventName")),
      startsAt: String(form.get("startsAt")),
      endsAt: String(form.get("endsAt")),
      notes: String(form.get("notes")),
    };
    setAvailability((current) => [item, ...current]);
    event.currentTarget.reset();
  }

  return (
    <div className="two-column-page">
      <section className="panel wide">
        <PanelHeader icon={<CalendarClock size={19} />} title="Member availability" />
        <div className="availability-board">
          {availability.length ? (
            availability.map((item) => (
              <div className="availability-card" key={item.id}>
                <div>
                  <strong>{memberName(members, item.memberId)}</strong>
                  <span>{sectionName(item.section)}</span>
                </div>
                <StatusPill tone={item.status === "available" ? "green" : item.status === "maybe" ? "amber" : "slate"}>{item.status}</StatusPill>
                <p>{item.helpRole}</p>
                <small>
                  {item.eventName || "General"} · {item.startsAt}-{item.endsAt}
                </small>
                <em>{item.notes}</em>
              </div>
            ))
          ) : (
            <EmptyState title="No availability yet" body="No entries yet." />
          )}
        </div>
      </section>
      <section className="panel">
        <PanelHeader icon={<Plus size={19} />} title="Share availability" />
        <form className="stack-form" onSubmit={markAvailable}>
          <label>
            Member
            <select name="memberId" disabled={!members.length}>
              {members.length ? (
                members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))
              ) : (
                <option value="">Add a member first</option>
              )}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue="available">
              <option value="available">Available</option>
              <option value="maybe">Maybe</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </label>
          <label>
            Section
            <select name="section" defaultValue="nowcasting">
              {sections.map((section) => (
                <option key={section.key} value={section.key}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Help role
            <input name="helpRole" defaultValue="Live event help" />
          </label>
          <label>
            Event
            <input name="eventName" placeholder="Optional event name" />
          </label>
          <div className="form-grid">
            <label>
              From
              <input name="startsAt" defaultValue="Now" />
            </label>
            <label>
              To
              <input name="endsAt" defaultValue="9:00 PM" />
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" placeholder="Limits, platform, or region" />
          </label>
          <button className="primary-button" type="submit" disabled={!members.length}>
            Share availability
          </button>
        </form>
      </section>
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
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const activeEvent = events.find((event) => event.id === eventId) ?? events[0];

  function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newEvent: LiveEvent = {
      id: `e${Date.now()}`,
      name: String(form.get("name")),
      description: String(form.get("description")),
      status: "active",
      startsAt: String(form.get("startsAt")),
      briefing: String(form.get("briefing")),
      roles: [{ id: `er${Date.now()}`, name: String(form.get("roleName")), description: "Custom event role" }],
      assignments: [],
    };
    setEvents((current) => [newEvent, ...current]);
    setEventId(newEvent.id);
    event.currentTarget.reset();
  }

  function addAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeEvent) return;
    const form = new FormData(event.currentTarget);
    const memberId = String(form.get("memberId") || "");
    if (!memberId) return;
    const assignment: LiveEventAssignment = {
      id: `ea${Date.now()}`,
      memberId,
      roleId: String(form.get("roleId")),
      section: form.get("section") as SectionKey,
      region: String(form.get("region")),
      platform: String(form.get("platform")),
      status: "assigned",
      notes: String(form.get("notes")),
    };
    setEvents((current) =>
      current.map((item) => (item.id === activeEvent.id ? { ...item, assignments: [assignment, ...item.assignments] } : item)),
    );
    event.currentTarget.reset();
  }

  const eventAvailability = activeEvent
    ? availability.filter((item) => item.eventName === activeEvent.name || item.status === "available")
    : [];

  return (
    <div className="event-page">
      <section className="panel event-hero">
        <div>
          {activeEvent ? (
            <>
              <label>
                Event
                <select value={activeEvent.id} onChange={(event) => setEventId(event.target.value)}>
                  {events.map((item) => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <h2>{activeEvent.name}</h2>
              <p>{activeEvent.description}</p>
              <div className="event-meta">
                <StatusPill tone="green">{activeEvent.status}</StatusPill>
                <span>{activeEvent.startsAt}</span>
              </div>
            </>
          ) : (
            <EmptyState title="No live event active" body="No active event." />
          )}
        </div>
        <form className="briefing-card event-create-form" onSubmit={createEvent}>
          <strong>Start live event</strong>
          <input name="name" required placeholder="Event name" />
          <input name="description" placeholder="Coverage area and purpose" />
          <input name="startsAt" defaultValue="Now" />
          <input name="roleName" required placeholder="First event role" />
          <textarea name="briefing" placeholder="Briefing" />
          <button type="submit">Start event</button>
        </form>
      </section>

      {activeEvent && (
        <>
          <section className="panel wide">
            <PanelHeader icon={<RadioTower size={19} />} title="Current assignments" />
            {activeEvent.assignments.length ? (
              <div className="assignment-board">
                {activeEvent.assignments.map((assignment) => (
                  <div className="assignment-card" key={assignment.id}>
                    <AssignmentRow
                      event={activeEvent}
                      assignment={assignment}
                      members={members}
                      onStatus={(status) => onAssignmentStatus(activeEvent.id, assignment.id, status)}
                    />
                    <p>{assignment.notes}</p>
                    <div className="assignment-meta">
                      <span>{assignment.region || "Any region"}</span>
                      <span>{assignment.platform || "Any platform"}</span>
                      <span>{sectionName(assignment.section)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No event assignments yet" body="No roles assigned." />
            )}
          </section>

          <section className="panel">
            <PanelHeader icon={<Plus size={19} />} title="Assign event role" />
            <form className="stack-form" onSubmit={addAssignment}>
              <label>
                Member
                <select name="memberId" disabled={!members.length}>
                  {members.length ? (
                    members.map((member) => (
                      <option value={member.id} key={member.id}>
                        {member.name}
                      </option>
                    ))
                  ) : (
                    <option value="">Add a member first</option>
                  )}
                </select>
              </label>
              <label>
                Event role
                <select name="roleId" defaultValue={activeEvent.roles[0]?.id}>
                  {activeEvent.roles.map((role) => (
                    <option value={role.id} key={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Section
                <select name="section" defaultValue="nowcasting">
                  {sections.map((section) => (
                    <option value={section.key} key={section.key}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Region
                <input name="region" placeholder="Region" />
              </label>
              <label>
                Platform
                <input name="platform" placeholder="Platform" />
              </label>
              <label>
                Notes
                <textarea name="notes" placeholder="Notes" />
              </label>
              <button className="primary-button" type="submit" disabled={!members.length}>
                Add assignment
              </button>
            </form>
          </section>
        </>
      )}

      <section className="panel">
        <PanelHeader icon={<Users size={19} />} title="Available for this event" />
        <div className="availability-list">
          {eventAvailability.length ? (
            eventAvailability.map((item) => <AvailabilityRow key={item.id} item={item} members={members} />)
          ) : (
            <EmptyState title="No matching availability" body="No matching entries." />
          )}
        </div>
      </section>
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
  function submitOnboarding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invite || invite.status !== "open") return;
    const form = new FormData(event.currentTarget);
    const selectedSections = form.getAll("sections") as SectionKey[];
    const handle = String(form.get("handle")).replace(/^@/, "");
    const member: Member = {
      id: `m${Date.now()}`,
      name: String(form.get("name")),
      handle,
      discordUserId: String(form.get("discordUserId")),
      onboardingStatus: "pending",
      globalRoles: ["member"],
      sections: selectedSections.map((section) => ({ section, role: "member" })),
    };
    setMembers((current) => [member, ...current]);
    setInvites((current) =>
      current.map((item) => (item.id === invite.id ? { ...item, status: "used", memberId: member.id } : item)),
    );
    event.currentTarget.reset();
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-shell">
        <div className="onboarding-brand">
          <img className="brand-logo" src={wtusLogoSrc} alt="WTUS" />
          <div>
            <strong>WTUS</strong>
            <span>Dashboard onboarding</span>
          </div>
        </div>
        <div className="onboarding-copy">
          <StatusPill tone={invite?.status === "open" ? "green" : "amber"}>{invite?.status ?? "missing link"}</StatusPill>
          <h1>Join the WTUS dashboard</h1>
        </div>
        {invite?.status === "open" ? (
          <form className="stack-form" onSubmit={submitOnboarding}>
            <label>
              Name
              <input name="name" required placeholder="Name" />
            </label>
            <label>
              Discord handle
              <input name="handle" required placeholder="handle" />
            </label>
            <label>
              Discord user ID
              <input name="discordUserId" required placeholder="User ID" />
            </label>
            <fieldset className="section-picker">
              <legend>Teams</legend>
              {sections.map((section) => (
                <label key={section.key}>
                  <input name="sections" type="checkbox" value={section.key} />
                  <span>{section.name}</span>
                </label>
              ))}
            </fieldset>
            <button className="primary-button" type="submit">
              Submit
            </button>
          </form>
        ) : (
          <EmptyState title="Link unavailable" body="Ask the owner or operations lead for a fresh link." />
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

  function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeMember) return;
    const form = new FormData(event.currentTarget);
    const selectedSections = form.getAll("sections") as SectionKey[];
    setMembers((current) =>
      current.map((member) =>
        member.id === activeMember.id
          ? {
              ...member,
              name: String(form.get("name")),
              handle: String(form.get("handle")).replace(/^@/, ""),
              discordUserId: String(form.get("discordUserId")),
              sections: selectedSections.map((section) => ({ section, role: "member" })),
            }
          : member,
      ),
    );
  }

  return (
    <div className="two-column-page">
      <section className="panel wide">
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
            <button className="primary-button" type="submit">
              Save account
            </button>
          </form>
        ) : (
          <EmptyState title="No account yet" body="Start with Onboarding." />
        )}
      </section>
      <section className="panel">
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
  setMembers,
}: {
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
}) {
  function addMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const member: Member = {
      id: `m${Date.now()}`,
      name: String(form.get("name")),
      handle: String(form.get("handle")),
      globalRoles: [String(form.get("globalRole") || "member")],
      sections: [{ section: form.get("section") as SectionKey, role: form.get("sectionRole") as "lead" | "member" }],
    };
    setMembers((current) => [member, ...current]);
    event.currentTarget.reset();
  }

  return (
    <div className="members-page">
      <section className="panel wide">
        <PanelHeader icon={<Users size={19} />} title="Members and roles" />
        <div className="member-list">
          {members.length ? (
            members.map((member) => (
              <div className="member-card" key={member.id}>
                <div className="member-avatar">{member.handle.slice(0, 1)}</div>
                <div>
                  <strong>{member.name}</strong>
                  <span>@{member.handle}</span>
                </div>
                <div className="member-tags">
                  {member.globalRoles.map((role) => (
                    <StatusPill key={role} tone="blue">
                      {role.replace("_", " ")}
                    </StatusPill>
                  ))}
                  {member.sections.map((entry) => (
                    <StatusPill key={`${member.id}-${entry.section}`} tone={entry.role === "lead" ? "green" : "slate"}>
                      {sectionName(entry.section)} {entry.role}
                    </StatusPill>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No members added" body="Add members here." />
          )}
        </div>
      </section>
      <section className="panel">
        <PanelHeader icon={<Plus size={19} />} title="Add member" />
        <form className="stack-form" onSubmit={addMember}>
          <label>
            Name
            <input name="name" required placeholder="Member name" />
          </label>
          <label>
            Handle
            <input name="handle" required placeholder="Discord or team handle" />
          </label>
          <label>
            Global role
            <select name="globalRole" defaultValue="member">
              <option value="member">Member</option>
              <option value="operations_lead">Operations lead</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <label>
            Section
            <select name="section" defaultValue="nowcasting">
              {sections.map((section) => (
                <option key={section.key} value={section.key}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Section role
            <select name="sectionRole" defaultValue="member">
              <option value="member">Member</option>
              <option value="lead">Lead</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            Add member
          </button>
        </form>
      </section>
    </div>
  );
}

function SectionsView({ tasks, members }: { tasks: Task[]; members: Member[] }) {
  return (
    <section className="panel full-page-panel">
      <PanelHeader icon={<ListChecks size={19} />} title="Sections" />
      <div className="sections-table">
        {sections.map((section) => {
          const leads = members.filter((member) => member.sections.some((entry) => entry.section === section.key && entry.role === "lead"));
          const sectionMembers = members.filter((member) => member.sections.some((entry) => entry.section === section.key));
          const sectionTasks = tasks.filter((task) => task.section === section.key);
          return (
            <div className="section-detail" key={section.key}>
              <div>
                <strong>{section.name}</strong>
                <span>{section.description}</span>
              </div>
              <span>{leads.map((lead) => lead.handle).join(", ") || "No lead"}</span>
              <span>{sectionMembers.length} members</span>
              <span>{sectionTasks.length} active tasks</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DiscordView() {
  return (
    <div className="two-column-page">
      <section className="panel wide">
        <PanelHeader icon={<Bot size={19} />} title="WTUS Discord bot" />
        <div className="bot-plan">
          {[
            ["/tasks mine", "Show member-owned and assigned work"],
            ["/tasks create", "Create work from the server without losing context"],
            ["/available now", "Mark live event help availability"],
            ["/event mine", "Show current live event role and region"],
            ["/event assign", "Let leads coordinate event-specific roles"],
            ["/roles temp", "Show or create temporary role coverage"],
          ].map(([command, detail]) => (
            <div className="command-row" key={command}>
              <code>{command}</code>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
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

  function createInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const invite: OnboardingInvite = {
      id: `oi${Date.now()}`,
      token: globalThis.crypto?.randomUUID?.() ?? `invite-${Date.now()}`,
      label: String(form.get("label") || "New member"),
      createdByRole: role === "owner" ? "owner" : "operations",
      createdAt: new Date().toLocaleString(),
      status: "open",
    };
    setInvites((current) => [invite, ...current]);
    event.currentTarget.reset();
  }

  function setInviteStatus(inviteId: string, status: OnboardingInvite["status"]) {
    setInvites((current) => current.map((invite) => (invite.id === inviteId ? { ...invite, status } : invite)));
  }

  function addCoverage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const assigneeId = String(form.get("assigneeId") || "");
    if (!assigneeId) return;
    const scope = form.get("scope") as TemporaryCoverage["scope"];
    const item: TemporaryCoverage = {
      id: `tc${Date.now()}`,
      assigneeId,
      coveredForId: String(form.get("coveredForId") || ""),
      scope,
      section: scope === "section" ? (form.get("section") as SectionKey) : undefined,
      eventId: scope === "live_event" ? String(form.get("eventId") || "") : undefined,
      coverageRole: String(form.get("coverageRole")),
      reason: String(form.get("reason")),
      startsAt: String(form.get("startsAt")),
      endsAt: String(form.get("endsAt")),
      status: "active",
    };
    setCoverage((current) => [item, ...current]);
    event.currentTarget.reset();
  }

  return (
    <div className="two-column-page">
      <section className="panel wide">
        <PanelHeader icon={<ShieldCheck size={19} />} title="Operational controls" />
        <div className="admin-grid">
          <div>
            <strong>Owner and operations lead</strong>
            <span>Global changes.</span>
          </div>
          <div>
            <strong>Member agency</strong>
            <span>Create, own, update.</span>
          </div>
          <div>
            <strong>Lead system</strong>
            <span>Help and review.</span>
          </div>
          <div>
            <strong>Temporary coverage</strong>
            <span>Short-term fill-ins.</span>
          </div>
        </div>
        <div className="invite-manager">
          <PanelHeader icon={<UserPlus size={19} />} title="Onboarding links" />
          <form className="inline-form" onSubmit={createInvite}>
            <label>
              Link label
              <input name="label" placeholder="New member, graphics recruit..." />
            </label>
            <button className="primary-button" type="submit">
              Create link
            </button>
          </form>
          <div className="invite-list">
            {invites.length ? (
              invites.map((invite) => (
                <div className="invite-card" key={invite.id}>
                  <div>
                    <strong>{invite.label}</strong>
                    <span>{origin}#/onboard/{invite.token}</span>
                  </div>
                  <StatusPill tone={invite.status === "open" ? "green" : invite.status === "used" ? "slate" : "amber"}>
                    {invite.status}
                  </StatusPill>
                  <button className="text-button" type="button" onClick={() => navigator.clipboard.writeText(`${origin}#/onboard/${invite.token}`)}>
                    Copy
                  </button>
                  {invite.status === "open" ? (
                    <button className="text-button" type="button" onClick={() => setInviteStatus(invite.id, "disabled")}>
                      Disable
                    </button>
                  ) : (
                    <button className="text-button" type="button" onClick={() => setInviteStatus(invite.id, "open")}>
                      Reopen
                    </button>
                  )}
                </div>
              ))
            ) : (
              <EmptyState title="No links yet" body="Create a link when someone is ready to join." />
            )}
          </div>
        </div>
      </section>
      <section className="panel">
        <PanelHeader icon={<ShieldCheck size={19} />} title="Active temp coverage" />
        <div className="coverage-list">
          {coverage.length ? (
            coverage.map((item) => (
              <div className="coverage-card" key={item.id}>
                <strong>{memberName(members, item.assigneeId)}</strong>
                <span>{item.coverageRole}</span>
                <p>{item.reason}</p>
              </div>
            ))
          ) : (
            <EmptyState title="No temporary coverage" body="No fill-ins active." />
          )}
        </div>
        <form className="stack-form coverage-form" onSubmit={addCoverage}>
          <label>
            Member
            <select name="assigneeId" disabled={!members.length}>
              {members.length ? (
                members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))
              ) : (
                <option value="">Add a member first</option>
              )}
            </select>
          </label>
          <label>
            Covering for
            <select name="coveredForId" disabled={!members.length}>
              <option value="">Open coverage</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scope
            <select name="scope" defaultValue="section">
              <option value="global">Global</option>
              <option value="section">Section</option>
              <option value="live_event">Live event</option>
            </select>
          </label>
          <label>
            Section
            <select name="section" defaultValue="nowcasting">
              {sections.map((section) => (
                <option key={section.key} value={section.key}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Event
            <select name="eventId">
              <option value="">None</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Role
            <input name="coverageRole" required placeholder="Role" />
          </label>
          <div className="form-grid">
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
            <textarea name="reason" placeholder="Reason" />
          </label>
          <button className="primary-button" type="submit" disabled={!members.length}>
            Add coverage
          </button>
        </form>
      </section>
    </div>
  );
}

export function App() {
  const [active, setActive] = useStoredState<NavItem>("wtus.activeView", "dashboard");
  const [role, setRole] = useStoredState<RoleView>("wtus.roleView", "operations");
  const [members, setMembers] = useStoredState<Member[]>("wtus.members", initialMembers);
  const [invites, setInvites] = useStoredState<OnboardingInvite[]>("wtus.onboardingInvites", []);
  const [tasks, setTasks] = useStoredState<Task[]>("wtus.tasks", initialTasks);
  const [availability, setAvailability] = useStoredState<AvailabilityWindow[]>("wtus.availability", initialAvailability);
  const [events, setEvents] = useStoredState<LiveEvent[]>("wtus.liveEvents", initialEvents);
  const [coverage, setCoverage] = useStoredState<TemporaryCoverage[]>("wtus.temporaryCoverage", initialCoverage);
  const [hash, setHash] = useState("");
  const onboardingToken = hash.match(/^#\/onboard\/([^/]+)$/)?.[1];
  const onboardingInvite = invites.find((invite) => invite.token === onboardingToken);

  useEffect(() => {
    let activeRequest = true;

    async function loadDashboardData() {
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
      } catch {
      }
    }

    loadDashboardData();
    return () => {
      activeRequest = false;
    };
  }, [setAvailability, setCoverage, setEvents, setInvites, setMembers, setTasks]);

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  useEffect(() => {
    const allowed = canManageTeam(role) ? opsNavItems : memberNavItems;
    if (!allowed.includes(active)) setActive(role === "member" ? "dashboard" : "admin");
  }, [active, role, setActive]);

  const content = useMemo(() => {
    const updateTaskStatus = (taskId: string, status: TaskStatus) => {
      setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status } : task)));
    };
    const updateAssignmentStatus = (eventId: string, assignmentId: string, status: LiveEventAssignment["status"]) => {
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
    if (active === "members") return <MembersView members={members} setMembers={setMembers} />;
    if (active === "sections") return <SectionsView tasks={tasks} members={members} />;
    if (active === "account") return <AccountView members={members} setMembers={setMembers} />;
    if (active === "discord") return <DiscordView />;
    if (active === "admin") {
      return (
        <AdminView
          coverage={coverage}
          members={members}
          setCoverage={setCoverage}
          events={events}
          invites={invites}
          role={role}
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
  }, [active, availability, coverage, events, invites, members, role, tasks]);

  if (onboardingToken) {
    return <OnboardingPage invite={onboardingInvite} members={members} setMembers={setMembers} setInvites={setInvites} />;
  }

  return (
    <AppShell active={active} setActive={setActive} role={role} setRole={setRole}>
      <div className="role-context">
        <Sparkles size={16} />
        <span>
          View: <strong>{roleLabel(role)}</strong>
        </span>
      </div>
      {content}
    </AppShell>
  );
}
