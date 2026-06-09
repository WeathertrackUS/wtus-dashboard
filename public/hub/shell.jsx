// ============================================================================
// Shell, Sidebar, Topbar, Command Palette
// ============================================================================

const { useState, useEffect, useMemo, useRef } = React;

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------
function Sidebar({ active, onNavigate, liveActive, urgentCount }) {
  const navItems = [
    { id: "dashboard",    label: "Dashboard",    Icon: Icon.LayoutDashboard,  count: null },
    { id: "tasks",        label: "Tasks",        Icon: Icon.ClipboardList,    count: urgentCount, badge: urgentCount > 0 },
    { id: "availability", label: "Availability", Icon: Icon.CalendarClock,    count: null },
    { id: "events",       label: "Live Events",  Icon: Icon.RadioTower,       count: liveActive ? 1 : null, badge: liveActive },
    { id: "members",      label: "Members",      Icon: Icon.Users,            count: MEMBERS.length },
    { id: "sections",     label: "Teams",        Icon: Icon.LayoutList,       count: TEAMS.length },
    { id: "portfolio",    label: "Portfolio",    Icon: Icon.FileText,         count: null },
  ];
  const adminItems = [
    { id: "discord",  label: "Discord Bot", Icon: Icon.Bot },
    { id: "admin",    label: "Team Setup",  Icon: Icon.ShieldCheck },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark">
          <span className="wt">WT</span><span className="us">US</span>
        </div>
        <div className="sidebar-brand-text">
          <strong>WTUS</strong>
          <span>Ops Hub</span>
        </div>
      </div>

      <div className={`sidebar-live-card ${liveActive ? "live" : "idle"}`} onClick={() => onNavigate("events")}>
        <div className="pulse-row">
          <span className="pulse-dot"></span>
          <span>{liveActive ? "Live on air" : "No active event"}</span>
        </div>
        {liveActive ? (
          <>
            <div className="live-name">{LIVE_EVENT.name}</div>
            <div className="live-meta">{LIVE_EVENT.duration} · {LIVE_EVENT.assignments.length} on coverage</div>
          </>
        ) : (
          <div className="live-meta" style={{ marginTop: 6 }}>Start one when severe wx fires.</div>
        )}
      </div>

      <div className="sidebar-section-label">Workspace</div>
      <nav className="nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <item.Icon size={16} />
            <span>{item.label}</span>
            {item.badge ? (
              <span className="nav-badge">{item.count}</span>
            ) : item.count != null ? (
              <span className="nav-count">{item.count}</span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="sidebar-section-label">Admin</div>
      <nav className="nav">
        {adminItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
          >
            <item.Icon size={16} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-user">
          <div className="avatar">WS</div>
          <div className="user-info">
            <strong>WeatherboySuper</strong>
            <span>OWNER · ONLINE</span>
          </div>
          <Icon.ChevronUp size={14} style={{ color: "var(--text-3)" }} />
        </button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------
function Topbar({ pageTitle, eyebrow, onSearch, primaryAction }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  const zones = [
    { code: "E",  tz: "America/New_York"    },
    { code: "C",  tz: "America/Chicago"     },
    { code: "M",  tz: "America/Denver"      },
    { code: "P",  tz: "America/Los_Angeles" },
    { code: "Z",  tz: "UTC",  utc: true     },
  ];

  function fmt(z) {
    if (z.utc) {
      // Z-time: HH:MM in 24h, suffixed with Z
      const hh = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });
      return hh.replace(/^24/, "00") + "Z";
    }
    // AM/PM for the CONUS zones
    return now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: z.tz });
  }

  // Determine which zone is currently the user's local time so we can mark it.
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{pageTitle}</h1>
      </div>
      <div className="topbar-spacer" />

      <div className="zone-clocks" title="CONUS time zones · Z = UTC">
        {zones.map((z) => (
          <div key={z.code} className={`zone-clock ${z.tz === localTz ? "is-local" : ""} ${z.utc ? "is-utc" : ""}`}>
            <span className="zone-code">{z.utc ? "UTC" : z.code}</span>
            <span className="zone-time mono">{fmt(z)}</span>
          </div>
        ))}
      </div>

      <button className="search-button" onClick={onSearch}>
        <Icon.Search size={15} />
        <span>Search tasks, members, events…</span>
        <span className="search-shortcut">⌘ K</span>
      </button>
      {primaryAction ? (
        <button className="topbar-action primary" onClick={primaryAction.onClick}>
          <Icon.Plus size={15} />
          {primaryAction.label}
        </button>
      ) : null}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Command palette
// ---------------------------------------------------------------------------
function CommandPalette({ open, onClose, onNavigate }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
    else { setQ(""); setIdx(0); }
  }, [open]);

  const navOptions = [
    { id: "go-dashboard", label: "Go to Dashboard",      group: "Navigate", icon: Icon.LayoutDashboard, action: () => onNavigate("dashboard") },
    { id: "go-tasks",     label: "Go to Tasks",          group: "Navigate", icon: Icon.ClipboardList,    action: () => onNavigate("tasks") },
    { id: "go-events",    label: "Open active event",    group: "Navigate", icon: Icon.RadioTower,       action: () => onNavigate("events"), kbd: "live" },
    { id: "go-avail",     label: "Open Availability",    group: "Navigate", icon: Icon.CalendarClock,    action: () => onNavigate("availability") },
    { id: "go-members",   label: "Open Members",         group: "Navigate", icon: Icon.Users,            action: () => onNavigate("members") },
  ];
  const actionOptions = [
    { id: "new-task",  label: "New task",          group: "Quick actions", icon: Icon.Plus, action: () => alert("New task modal") },
    { id: "new-event", label: "Start live event",  group: "Quick actions", icon: Icon.Radio, action: () => alert("Start event") },
    { id: "post-upd",  label: "Post event update", group: "Quick actions", icon: Icon.Send, action: () => alert("Post update") },
    { id: "set-avail", label: "Mark me available", group: "Quick actions", icon: Icon.UserCheck, action: () => alert("Marked available") },
  ];
  const taskOptions = TASKS.slice(0, 5).map((t) => ({
    id: "t-" + t.id, label: t.title, group: "Tasks", icon: Icon.ClipboardList,
    kbd: PRIORITY_LABEL[t.priority], action: () => { onNavigate("tasks"); }
  }));
  const memberOptions = MEMBERS.slice(0, 5).map((m) => ({
    id: "u-" + m.id, label: m.name + "  @" + m.handle, group: "Members", icon: Icon.User,
    action: () => onNavigate("members")
  }));

  const allOptions = [...navOptions, ...actionOptions, ...taskOptions, ...memberOptions];
  const filtered = q
    ? allOptions.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : allOptions;
  const groups = filtered.reduce((acc, o) => {
    (acc[o.group] = acc[o.group] || []).push(o);
    return acc;
  }, {});
  const flatList = filtered;

  useEffect(() => { setIdx(0); }, [q]);

  function handleKey(e) {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, flatList.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter") {
      const target = flatList[idx];
      if (target) { target.action(); onClose(); }
    }
  }

  if (!open) return null;

  let runningIdx = -1;
  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input-wrap">
          <Icon.Search size={16} style={{ color: "var(--text-3)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="What do you need to do?"
          />
          <span className="esc">ESC</span>
        </div>
        <div className="cmdk-list">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="cmdk-group-label">{group}</div>
              {items.map((item) => {
                runningIdx++;
                const sel = runningIdx === idx;
                const I = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`cmdk-row ${sel ? "selected" : ""}`}
                    onMouseEnter={() => setIdx(runningIdx)}
                    onClick={() => { item.action(); onClose(); }}
                  >
                    <I size={15} />
                    <span>{item.label}</span>
                    {item.kbd ? <span className="row-meta">{item.kbd}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared atoms used by multiple views
// ---------------------------------------------------------------------------
function Pill({ tone = "gray", children }) {
  return (
    <span className={`pill ${tone}`}>
      <span className="dot"></span>
      {children}
    </span>
  );
}

function PriorityPill({ p }) {
  return (
    <span className={`pill pri-${p}`}>
      <span className="dot"></span>
      {PRIORITY_LABEL[p]}
    </span>
  );
}

function Avatar({ member, size = 28, square = true }) {
  const s = { width: size, height: size, borderRadius: square ? 6 : "50%" };
  const bg = `linear-gradient(135deg, oklch(0.36 0.13 ${member.hue}), oklch(0.22 0.08 ${member.hue}))`;
  return (
    <div className="avatar-tile" style={{ ...s, background: bg, display: "grid", placeItems: "center",
      color: "var(--text)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: Math.round(size * 0.38),
      border: "1px solid rgba(255,255,255,0.06)" }}>
      {member.initials}
    </div>
  );
}

function SectionIcon({ section, size = 16 }) {
  const map = {
    Radio: Icon.Radio, CloudRain: Icon.CloudRain, Image: Icon.Image, Youtube: Icon.Youtube,
    Facebook: Icon.Facebook, ShieldCheck: Icon.ShieldCheck, Terminal: Icon.Terminal, DollarSign: Icon.DollarSign,
  };
  const I = map[section?.icon] || Icon.Hash;
  return <I size={size} />;
}

Object.assign(window, { Sidebar, Topbar, CommandPalette, Pill, PriorityPill, Avatar, SectionIcon });
