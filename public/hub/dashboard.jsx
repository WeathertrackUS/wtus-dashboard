// ============================================================================
// Dashboard view — the 3-5 minute landing page
// ============================================================================
const { useState: useStateD } = React;

function StatusStrip({ live, tasks, available }) {
  const normalTasks = tasks.filter(t => !t.eventId);
  const eventTasks = tasks.filter(t => t.eventId);
  const urgent = normalTasks.filter(t => t.priority === "urgent").length;
  const high   = normalTasks.filter(t => t.priority === "high").length;
  const inProg = normalTasks.filter(t => t.status === "in_progress").length;
  const liveMin = live ? live.duration : "—";
  return (
    <div className="status-strip">
      <div className="status-cell live">
        <div className="label live-row"><span className="pulse-dot" style={{width:6,height:6}}></span>LIVE EVENT</div>
        <div className="value">{live ? "ACTIVE" : "—"}</div>
        <div className="sub">{live ? `${live.region} · ${liveMin} on air · ${eventTasks.length} event tasks` : "No active event"}</div>
      </div>
      <div className="status-cell">
        <div className="label">Urgent / High (ops)</div>
        <div className="value">{urgent + high} <span className="unit">tasks</span></div>
        <div className="sub"><span className="delta warn">{urgent} urgent</span> · {high} high</div>
      </div>
      <div className="status-cell">
        <div className="label">Available now</div>
        <div className="value">{available} <span className="unit">/ {MEMBERS.length}</span></div>
        <div className="sub"><span className="delta up">4 on coverage</span> · 1 maybe</div>
      </div>
      <div className="status-cell">
        <div className="label">In progress</div>
        <div className="value">{inProg} <span className="unit">tasks</span></div>
        <div className="sub">{normalTasks.length} ops total · {normalTasks.filter(t=>t.status==="done").length} done today</div>
      </div>
    </div>
  );
}

function LiveHero({ event, onOpen, onPost }) {
  if (!event) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="header-icon"><Icon.RadioTower size={14}/></span>
          <h2>Live event</h2>
        </div>
        <div className="empty">
          <strong>No active live event</strong>
          <span>Start one from Live Events when a severe-weather window opens.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="live-hero">
      <div className="live-hero-grid">
        <div className="live-hero-main">
          <div className="live-banner">
            <span className="pulse-dot"></span>
            <span>LIVE · ON AIR · {event.duration}</span>
          </div>
          <h2>{event.name}</h2>
          <p className="desc">{event.description}</p>
          <div className="live-meta-row">
            <span className="meta"><Icon.MapPin size={13}/> <strong>{event.region}</strong></span>
            <span className="meta"><Icon.Clock size={13}/> started <strong>{event.startedAt}</strong></span>
            <span className="meta"><Icon.Eye size={13}/> <strong>{event.watchers.toLocaleString()}</strong> watching</span>
            <span className="meta"><Icon.Users size={13}/> <strong>{event.assignments.length}</strong> assigned</span>
          </div>
          <div className="live-hero-actions">
            <button className="btn btn-primary" onClick={onOpen}>
              <Icon.RadioTower size={14}/>
              Open coverage
            </button>
            <button className="btn btn-secondary" onClick={onPost}>
              <Icon.Send size={14}/>
              Post update
            </button>
            <button className="btn btn-ghost">
              <Icon.UserPlus size={14}/>
              Assign
            </button>
          </div>
        </div>
        <div className="live-hero-side">
          <span className="eyebrow">Coverage Roster</span>
          {event.assignments.slice(0, 5).map((a) => {
            const m = memberById(a.memberId);
            return (
              <div className="assignment-row" key={a.id}>
                <Avatar member={m} size={28}/>
                <div className="info">
                  <strong>{m.name}</strong>
                  <span>{a.role} · {a.region}</span>
                </div>
                <Pill tone={a.status === "active" ? "red" : "gray"}>{a.status}</Pill>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorkBoard({ tasks, onOpen, onOpenEvent }) {
  // Dashboard work board = normal ops only. Live event tasks live inside the event workspace.
  const normalTasks = tasks.filter(t => !t.eventId);
  const eventTaskCount = tasks.length - normalTasks.length;

  // Sort: urgent → high → normal → low; then by due
  const sorted = [...normalTasks].sort((a, b) => {
    const ord = { urgent: 0, high: 1, normal: 2, low: 3 };
    return ord[a.priority] - ord[b.priority];
  }).slice(0, 6);

  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.ClipboardList size={14}/></span>
        <h2>Work board</h2>
        <span className="eyebrow" style={{ marginLeft: 6 }}>NORMAL OPS</span>
        <button className="header-action" onClick={onOpen} style={{ marginLeft: "auto" }}>All tasks <Icon.ChevronRight size={13}/></button>
      </div>
      <div className="card-body tight">
        <div className="task-row head">
          <div>Task</div>
          <div>Section</div>
          <div>Assignees</div>
          <div>Priority</div>
          <div>Due</div>
        </div>
        {sorted.map((t) => {
          const sec = teamByKey(t.team);
          const dueClass = t.dueState === "soon" ? "soon" : t.dueState === "overdue" ? "overdue" : "";
          return (
            <div className={`task-row ${t.priority}`} key={t.id} onClick={onOpen}>
              <div className="title-cell">
                <div className="pri-bar"></div>
                <div style={{ minWidth: 0 }}>
                  <div className="title">{t.title}</div>
                  <div className="sub">{STATUS_LABEL[t.status]} · {t.updates?.length || 0} updates</div>
                </div>
              </div>
              <div className="cell">{sec?.name}</div>
              <div>
                <div className="assignee-stack">
                  {t.assignees.slice(0,3).map((id, i) => {
                    const m = memberById(id);
                    return (
                      <span className="assignee-bubble" key={id} style={{ zIndex: 3-i }}>
                        {m?.initials}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div><PriorityPill p={t.priority}/></div>
              <div className={`due ${dueClass}`}>{t.due}</div>
            </div>
          );
        })}
        {eventTaskCount > 0 ? (
          <button
            onClick={onOpenEvent}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "12px 18px",
              borderTop: "1px solid var(--hairline)",
              background: "linear-gradient(90deg, rgba(229,23,46,0.05), transparent 80%)",
              cursor: "pointer", textAlign: "left",
            }}
          >
            <Icon.RadioTower size={14} style={{ color: "var(--red)" }}/>
            <span style={{ fontSize: 12.5, color: "var(--text-2)" }}>
              <strong style={{ color: "var(--text)" }}>{eventTaskCount} live-event task{eventTaskCount === 1 ? "" : "s"}</strong> in the active event workspace
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--red)" }}>
              OPEN EVENT <Icon.ChevronRight size={11} style={{ verticalAlign: -1 }}/>
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TeamPulse({ members }) {
  const onCov = members.filter(m => isOnCoverage(m.id));
  const groups = {
    coverage:    onCov,
    available:   members.filter(m => m.status === "available" && !isOnCoverage(m.id)),
    maybe:       members.filter(m => m.status === "maybe"),
    unavailable: members.filter(m => m.status === "unavailable"),
  };
  const labels = {
    coverage:    { label: "On coverage now", tone: "red" },
    available:   { label: "Available",       tone: "green" },
    maybe:       { label: "Maybe",           tone: "amber" },
    unavailable: { label: "Unavailable",     tone: "gray" },
  };
  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.Activity size={14}/></span>
        <h2>Team pulse</h2>
        <span className="eyebrow">{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {Object.entries(groups).map(([key, list]) => list.length ? (
          <div key={key}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px 6px", borderTop: "1px solid var(--hairline)",
            }}>
              <Pill tone={labels[key].tone}>{labels[key].label}</Pill>
              <span className="mono" style={{ fontSize: 11, color: "var(--text-4)" }}>{list.length}</span>
            </div>
            {list.map(m => {
              const onCoverage = isOnCoverage(m.id);
              const assignment = onCoverage ? LIVE_EVENT.assignments.find(a => a.memberId === m.id) : null;
              return (
                <div className="list-row" key={m.id}>
                  <Avatar member={m} size={30}/>
                  <div className="info">
                    <strong>{m.name}</strong>
                    <span>{onCoverage && assignment ? `${assignment.eventRole} · ${assignment.region}` : primaryRoleLabel(m)}</span>
                  </div>
                  {onCoverage ? <Pill tone="red">On coverage</Pill> : null}
                </div>
              );
            })}
          </div>
        ) : null)}
      </div>
    </div>
  );
}

function SectionsGrid({ onOpen }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.LayoutList size={14}/></span>
        <h2>Teams</h2>
        <button className="header-action" onClick={() => onOpen("sections")}>Manage <Icon.ChevronRight size={13}/></button>
      </div>
      <div className="card-body">
        <div className="section-grid">
          {TEAMS.map((s) => {
            const stats = TEAM_STATS[s.key];
            const lead = s.leadKey ? MEMBERS.find(m => m.leadRoles?.includes(s.leadKey)) : null;
            return (
              <div key={s.key} className={`section-card ${stats.urgent > 0 ? "has-urgent" : ""}`} onClick={() => onOpen("tasks")}>
                <div className="section-icon"><SectionIcon section={s} size={16}/></div>
                <div className="section-name">{s.name}</div>
                <div className="section-stats">
                  <strong>{stats.open}</strong> open · {lead ? <>lead @{lead.handle}</> : <span style={{ color: "var(--text-4)" }}>no lead</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TempCoverageBanner({ coverage }) {
  if (!coverage?.length) return null;
  const active = coverage.filter(c => c.status === "active");
  if (!active.length) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "10px 16px",
      border: "1px solid var(--hairline)",
      background: "linear-gradient(90deg, rgba(180,138,255,0.06), transparent 70%), var(--surface)",
      borderRadius: 10,
      fontSize: 12.5,
    }}>
      <Pill tone="blue">Temp coverage</Pill>
      <span style={{ color: "var(--text-2)" }}>
        {active.length === 1
          ? <>
              <strong style={{ color: "var(--text)" }}>{memberById(active[0].assigneeId)?.name}</strong> covering <strong style={{ color: "var(--text)" }}>{active[0].coverageRole}</strong>
              {active[0].coveredId ? <> for <strong style={{ color: "var(--text)" }}>{memberById(active[0].coveredId)?.name}</strong></> : null}
              {" "}· until <span className="mono" style={{ color: "var(--text-2)" }}>{active[0].endsAt}</span>
            </>
          : <><strong style={{ color: "var(--text)" }}>{active.length} active</strong> temporary role coverages this shift</>
        }
      </span>
      <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }}>
        Manage <Icon.ChevronRight size={12}/>
      </button>
    </div>
  );
}

function DashboardView({ onNavigate, onOpenCmdK }) {
  const availableCount = MEMBERS.filter(m => m.status === "available").length;
  return (
    <div className="page">
      <StatusStrip live={LIVE_EVENT} tasks={TASKS} available={availableCount}/>
      <TempCoverageBanner coverage={TEMP_COVERAGE}/>
      <LiveHero event={LIVE_EVENT} onOpen={() => onNavigate("events")} onPost={() => onOpenCmdK()} />

      <div className="col-layout">
        <WorkBoard tasks={TASKS} onOpen={() => onNavigate("tasks")} onOpenEvent={() => onNavigate("events")} />
        <TeamPulse members={MEMBERS} />
      </div>

      <SectionsGrid onOpen={onNavigate} />
    </div>
  );
}

window.DashboardView = DashboardView;
