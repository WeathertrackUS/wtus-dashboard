// ============================================================================
// Tasks view + Events view
// ============================================================================
const { useState: useStateT } = React;

// ---------------------------------------------------------------------------
function TasksView({ onNavigate }) {
  // Normal Tasks excludes live-event tasks — those live inside the event workspace
  const NORMAL_TASKS = TASKS.filter(t => !t.eventId);
  const eventTaskCount = TASKS.length - NORMAL_TASKS.length;

  const [selectedId, setSelectedId] = useStateT(NORMAL_TASKS[0]?.id);
  const [filter, setFilter] = useStateT("all");
  const [sectionF, setSectionF] = useStateT("all");

  const filtered = NORMAL_TASKS.filter(t => {
    if (filter === "urgent" && t.priority !== "urgent" && t.priority !== "high") return false;
    if (filter === "mine") return false; // demo
    if (sectionF !== "all" && t.team !== sectionF) return false;
    return true;
  });
  const task = NORMAL_TASKS.find(t => t.id === selectedId) || filtered[0] || NORMAL_TASKS[0];

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="view-tabs">
          {[
            { id: "all", label: "All tasks", count: NORMAL_TASKS.length },
            { id: "urgent", label: "Urgent + High", count: NORMAL_TASKS.filter(t => t.priority === "urgent" || t.priority === "high").length },
            { id: "mine", label: "Assigned to me", count: 0 },
          ].map(t => (
            <button key={t.id} className={`view-tab ${filter === t.id ? "active" : ""}`} onClick={() => setFilter(t.id)}>
              {t.label} · {t.count}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Icon.SlidersHorizontal size={13}/>Filter</button>
          <button className="btn btn-secondary btn-sm"><Icon.ExternalLink size={13}/>Leantime</button>
          <button className="btn btn-primary btn-sm"><Icon.Plus size={13}/>New task</button>
        </div>
      </div>

      {eventTaskCount > 0 ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px",
          border: "1px solid rgba(229,23,46,0.22)",
          background: "linear-gradient(90deg, rgba(229,23,46,0.06), transparent 70%), var(--surface)",
          borderRadius: 10,
          fontSize: 12.5,
        }}>
          <Pill tone="red">Live event</Pill>
          <span style={{ color: "var(--text-2)" }}>
            <strong style={{ color: "var(--text)" }}>{eventTaskCount} task{eventTaskCount === 1 ? "" : "s"}</strong> hidden — assigned to <strong style={{ color: "var(--text)" }}>{LIVE_EVENT.name}</strong>.
            Live-event work lives in its own workspace so normal ops stays clean.
          </span>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} onClick={() => onNavigate("events")}>
            <Icon.RadioTower size={12}/>Open event workspace
          </button>
        </div>
      ) : null}

      <div className="split-layout">
        <div className="list-panel">
          <div className="list-panel-toolbar">
            <select className="select-input" value={sectionF} onChange={(e) => setSectionF(e.target.value)}>
              <option value="all">All teams</option>
              {TEAMS.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
            </select>
          </div>
          <div className="list-items">
            {filtered.map(t => (
              <div
                key={t.id}
                className={`list-item ${task?.id === t.id ? "active" : ""}`}
                onClick={() => setSelectedId(t.id)}
              >
                <div className="item-title">
                  <span className="item-title-text">{t.title}</span>
                  <PriorityPill p={t.priority}/>
                </div>
                <div className="item-meta">
                  <SectionIcon section={teamByKey(t.team)} size={11}/>
                  <span>{teamByKey(t.team)?.name}</span>
                  <span>·</span>
                  <span>{STATUS_LABEL[t.status]}</span>
                  <span style={{ marginLeft: "auto" }}>{t.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="detail-panel">
          <div className="detail-header">
            <div className="detail-title">
              <h2>{task.title}</h2>
              <div className="section-tag">
                <SectionIcon section={teamByKey(task.team)} size={11}/>
                &nbsp;{teamByKey(task.team)?.name}
              </div>
            </div>
            <div className="detail-actions">
              <PriorityPill p={task.priority}/>
              <select className="select-input" defaultValue={task.status} style={{ minWidth: 120 }}>
                {Object.entries(STATUS_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn btn-secondary btn-sm"><Icon.MoreHorizontal size={13}/></button>
            </div>
          </div>
          <div className="detail-body">
            <div className="detail-section">
              <div className="detail-section-label">Notes</div>
              <div className="body-text">{task.notes || "No notes."}</div>
            </div>

            <div className="detail-section">
              <div className="detail-section-label">Assigned to</div>
              <div className="assignee-grid">
                {task.assignees.map(id => {
                  const m = memberById(id);
                  return (
                    <div key={id} className="assignee-chip">
                      <Avatar member={m} size={22} square={false}/>
                      {m.name}
                    </div>
                  );
                })}
                <button className="assignee-chip" style={{ background: "transparent", color: "var(--text-3)" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: "1px dashed var(--hairline-strong)",
                    display: "grid", placeItems: "center" }}><Icon.Plus size={11}/></span>
                  Add
                </button>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-label">Updates</div>
              {task.updates?.length ? task.updates.map(u => (
                <div key={u.id} className="update-card">
                  <div className="uc-head">
                    <span className="author">{u.author}</span>
                    <span className="ago">{u.ago}</span>
                  </div>
                  <p>{u.body}</p>
                </div>
              )) : <div className="empty"><strong>No updates yet</strong><span>Post the first one below.</span></div>}
              <form className="inline-form" onSubmit={(e) => e.preventDefault()}>
                <input placeholder="Post an update…" />
                <button className="btn btn-primary btn-sm" type="submit"><Icon.Send size={12}/>Post</button>
              </form>
            </div>

            <div className="detail-section">
              <div className="detail-section-label">Metadata</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div className="field">
                  <label>Priority</label>
                  <select defaultValue={task.priority}>
                    {Object.entries(PRIORITY_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Due</label>
                  <input defaultValue={task.due}/>
                </div>
                <div className="field">
                  <label>Team</label>
                  <select defaultValue={task.team}>
                    {TEAMS.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Recurring</label>
                  <select defaultValue="no">
                    <option value="no">No</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="btn btn-danger-ghost btn-sm"><Icon.Trash2 size={13}/>Delete</button>
                <div style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm">Cancel</button>
                <button className="btn btn-primary btn-sm">Save changes</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function EventsView({ onNavigate }) {
  const ev = LIVE_EVENT;
  const [updateTab, setUpdateTab] = useStateT("team");
  const [editingAssignmentId, setEditingAssignmentId] = useStateT(null);
  const [addingAssignment, setAddingAssignment] = useStateT(false);
  const checkedIn = ev.assignments.filter(a => a.checkIn === "checked_in").length;
  const pending   = ev.assignments.length - checkedIn;

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="view-tabs">
          <button className="view-tab active">Active · 1</button>
          <button className="view-tab">Planned · 0</button>
          <button className="view-tab">Past · 12</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Icon.UserCheck size={13}/>Check me in</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setAddingAssignment(true)}>
            <Icon.UserPlus size={13}/>Assign someone
          </button>
          <button className="btn btn-primary btn-sm"><Icon.Plus size={13}/>Start event</button>
        </div>
      </div>

      {/* Compact hero — quick scan, gets out of the way */}
      <div className="live-hero">
        <div className="live-hero-grid" style={{ minHeight: 0, gridTemplateColumns: "1.7fr 1fr" }}>
          <div className="live-hero-main" style={{ padding: "18px 22px", gap: 10 }}>
            <div className="live-banner">
              <span className="pulse-dot"></span>
              <span>LIVE · ON AIR · {ev.duration} · STARTED {ev.startedAt}</span>
            </div>
            <h2 style={{ fontSize: 22 }}>{ev.name}</h2>
            <p className="desc" style={{ fontSize: 12.5, maxWidth: "75ch" }}>{ev.description}</p>
            <div className="live-meta-row">
              <span className="meta"><Icon.MapPin size={13}/> <strong>{ev.region}</strong></span>
              <span className="meta"><Icon.Eye size={13}/> <strong>{ev.watchers.toLocaleString()}</strong> watching</span>
              <span className="meta"><Icon.UserCheck size={13}/> <strong>{checkedIn}/{ev.assignments.length}</strong> checked in</span>
              <button className="btn btn-danger-ghost btn-sm" style={{ marginLeft: "auto" }}>
                <Icon.Square size={12}/>End event
              </button>
            </div>
          </div>
          <div className="live-hero-side" style={{ padding: "18px 22px" }}>
            <span className="eyebrow">Briefing</span>
            <div style={{
              padding: "10px 12px",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text-2)",
              lineHeight: 1.5,
            }}>{ev.briefing}</div>
          </div>
        </div>
      </div>

      {/* WORK BOARD — moved up so it's the second thing you see */}
      <EventTaskBoard event={ev} />

      {/* Updates panel — Team vs Event split (above roster per user pref) */}
      <div className="card">
        <div className="card-header" style={{ paddingBottom: 0, borderBottom: 0 }}>
          <span className="header-icon"><Icon.MessageSquare size={14}/></span>
          <h2>Updates</h2>
        </div>
        <div className="update-tabs">
          <button
            className={`update-tab ${updateTab === "team" ? "active" : ""}`}
            onClick={() => setUpdateTab("team")}
          >
            <Icon.Users size={13}/>
            <span>Team updates</span>
            <span className="ut-count">{ev.teamUpdates.length}</span>
            <span className="ut-hint">→ team Discord</span>
          </button>
          <button
            className={`update-tab ${updateTab === "event" ? "active" : ""}`}
            onClick={() => setUpdateTab("event")}
          >
            <Icon.RadioTower size={13}/>
            <span>Event updates</span>
            <span className="ut-count">{ev.eventUpdates.length}</span>
            <span className="ut-hint">→ broadcast + public Discord</span>
          </button>
        </div>
        <div className="card-body">
          {updateTab === "team" ? (
            <UpdateStream
              updates={ev.teamUpdates}
              placeholder="Message the team (internal — will post to team Discord)…"
              ctaIcon={<Icon.Users size={12}/>}
              ctaLabel="Send to team"
              streamLabel="Internal team thread"
            />
          ) : (
            <UpdateStream
              updates={ev.eventUpdates}
              placeholder="Post public update (broadcast + Discord)…"
              ctaIcon={<Icon.RadioTower size={12}/>}
              ctaLabel="Push live"
              streamLabel="Public broadcast feed"
              publicMode
            />
          )}
        </div>
      </div>

      {/* Coverage roster — editable, with inline add */}
      <CoverageRoster
        event={ev}
        editingId={editingAssignmentId}
        setEditingId={setEditingAssignmentId}
        adding={addingAssignment}
        setAdding={setAddingAssignment}
      />
    </div>
  );
}

// Standard event roles a lead can pick from when assigning. Roles are temporary
// and per-event — they do NOT alter permanent section roles.
const EVENT_ROLES = [
  "Lead Coordinator",
  "Live Broadcasting",
  "On Camera",
  "Stream Support",
  "Lead Nowcaster",
  "Nowcaster",
  "Regional Monitor",
  "Forecast Support",
  "Graphics",
  "Cut-ins / Loops",
  "Verification",
  "Reports / LSRs",
  "FB Live Host",
  "Twitter Posts",
  "Facebook Updates",
  "YouTube Chat",
];

function CoverageRoster({ event, editingId, setEditingId, adding, setAdding }) {
  const checkedIn = event.assignments.filter(a => a.checkIn === "checked_in").length;
  const pending   = event.assignments.length - checkedIn;
  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.Users size={14}/></span>
        <h2>Coverage roster</h2>
        <span className="eyebrow" style={{ marginLeft: 6 }}>
          <span style={{ color: "var(--green)" }}>{checkedIn} PRESENT</span>
          {pending > 0 ? <> · <span style={{ color: "var(--amber)" }}>{pending} NOT IN</span></> : null}
        </span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setAdding(true)}>
          <Icon.UserPlus size={13}/>Add assignment
        </button>
      </div>

      {adding ? (
        <AssignmentForm
          onCancel={() => setAdding(false)}
          onSave={() => setAdding(false)}
        />
      ) : null}

      <div style={{ padding: 0 }}>
        {event.assignments.map(a =>
          editingId === a.id ? (
            <AssignmentForm
              key={a.id}
              assignment={a}
              onCancel={() => setEditingId(null)}
              onSave={() => setEditingId(null)}
              onDelete={() => setEditingId(null)}
            />
          ) : (
            <AssignmentRow key={a.id} assignment={a} onEdit={() => setEditingId(a.id)} />
          )
        )}
      </div>

      <div style={{
        padding: "12px 18px",
        borderTop: "1px solid var(--hairline)",
        background: "var(--bg-elev)",
        fontSize: 11.5,
        color: "var(--text-3)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Icon.UserCheck size={13}/>
        <span>Members check in from the dashboard or via <span className="mono" style={{ color: "var(--text-2)" }}>/event checkin</span> in Discord.</span>
      </div>
    </div>
  );
}

function AssignmentRow({ assignment: a, onEdit }) {
  const m = memberById(a.memberId);
  const isPresent = a.checkIn === "checked_in";
  return (
    <div
      className="assignment-row-full"
      style={!isPresent ? { background: "rgba(246,183,60,0.04)" } : null}
    >
      <div style={{ position: "relative" }}>
        <Avatar member={m} size={32}/>
        <span style={{
          position: "absolute", right: -2, bottom: -2,
          width: 10, height: 10, borderRadius: "50%",
          background: isPresent ? "var(--green)" : "var(--text-4)",
          border: "2px solid var(--surface)",
          boxShadow: isPresent ? "0 0 6px var(--green)" : "none",
        }}/>
      </div>
      <div className="ar-name">
        <strong>{m.name}</strong>
        <span>@{m.handle}{isPresent && a.checkedInAt ? <> · in @ {a.checkedInAt}</> : null}</span>
      </div>
      <div className="ar-role">
        <span className="eyebrow">Role</span>
        <span className="ar-value" style={{ color: "var(--red)" }}>{a.eventRole}</span>
      </div>
      <div className="ar-region">
        <span className="eyebrow">Region / Focus</span>
        <span className="ar-value">{a.region}</span>
      </div>
      <div className="ar-checkin">
        {isPresent ? <Pill tone="green">Present</Pill> : <Pill tone="amber">Not in</Pill>}
      </div>
      <select className="select-input ar-status" defaultValue={a.status}>
        <option value="assigned">Assigned</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="done">Done</option>
      </select>
      <div className="ar-actions">
        <button className="btn btn-ghost btn-sm" onClick={onEdit} title="Edit assignment">
          <Icon.SlidersHorizontal size={12}/>
        </button>
        <button className="btn btn-ghost btn-sm" title="More">
          <Icon.MoreHorizontal size={12}/>
        </button>
      </div>
    </div>
  );
}

function AssignmentForm({ assignment, onCancel, onSave, onDelete }) {
  const a = assignment || {};
  return (
    <div style={{
      padding: "14px 18px",
      borderTop: "1px solid var(--hairline)",
      borderBottom: "1px solid var(--hairline)",
      background: "linear-gradient(90deg, rgba(229,23,46,0.04), transparent 70%), var(--bg-elev)",
    }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>
        {assignment ? "EDIT ASSIGNMENT" : "NEW ASSIGNMENT"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 0.8fr", gap: 10 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Member</label>
          <select defaultValue={a.memberId || ""}>
            <option value="">Pick a member…</option>
            {MEMBERS.map(m => (
              <option key={m.id} value={m.id}>{m.name} · @{m.handle}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Event role (temporary)</label>
          <select defaultValue={a.eventRole || ""}>
            <option value="">Pick a role…</option>
            {EVENT_ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Region / Focus</label>
          <input defaultValue={a.region || ""} placeholder="e.g. OK · I-44 corridor"/>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Status</label>
          <select defaultValue={a.status || "assigned"}>
            <option value="assigned">Assigned</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Platform (optional)</label>
          <input defaultValue={a.platform || ""} placeholder="e.g. Twitter, Facebook, YouTube"/>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Notes (optional)</label>
          <input defaultValue={a.notes || ""} placeholder="Anything the assignee should know"/>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {assignment && onDelete ? (
          <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>
            <Icon.Trash2 size={12}/>Remove
          </button>
        ) : null}
        <div style={{ flex: 1 }}/>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={onSave}>
          <Icon.Check size={12}/>{assignment ? "Save" : "Add assignment"}
        </button>
      </div>
      <div style={{
        marginTop: 10, padding: "6px 10px",
        borderRadius: 6, background: "rgba(180,138,255,0.06)",
        border: "1px solid rgba(180,138,255,0.18)",
        fontSize: 10.5, color: "var(--violet)",
        fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
      }}>
        TEMPORARY · This event role does not change the member's permanent team or lead roles.
      </div>
    </div>
  );
}

function UpdateStream({ updates, placeholder, ctaIcon, ctaLabel, streamLabel, publicMode }) {
  return (
    <>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 10px",
        background: publicMode ? "rgba(229,23,46,0.06)" : "var(--bg-elev)",
        border: "1px solid " + (publicMode ? "rgba(229,23,46,0.22)" : "var(--hairline)"),
        borderRadius: 8,
        marginBottom: 12,
        fontSize: 11.5,
        color: publicMode ? "var(--red-hot)" : "var(--text-3)",
        fontFamily: "var(--font-mono)",
        letterSpacing: "0.04em",
      }}>
        {publicMode ? <Icon.Eye size={12}/> : <Icon.Users size={12}/>}
        <span>{streamLabel.toUpperCase()}</span>
      </div>

      <form className="inline-form" onSubmit={(e) => e.preventDefault()} style={{ paddingTop: 0, marginBottom: 14 }}>
        <input placeholder={placeholder} />
        <button className={`btn ${publicMode ? "btn-primary" : "btn-secondary"} btn-sm`} type="submit">
          {ctaIcon}{ctaLabel}
        </button>
      </form>

      {updates.map(u => (
        <div key={u.id} className="update-card" style={u.urgent ? {
          borderColor: "rgba(229,23,46,0.3)",
          background: "linear-gradient(180deg, rgba(229,23,46,0.06), var(--bg-elev))",
        } : null}>
          <div className="uc-head">
            {u.urgent ? <Pill tone="red">URGENT</Pill> : null}
            <span className="author">{u.author}</span>
            <span className="ago">{u.ago}</span>
          </div>
          <p>{u.body}</p>
        </div>
      ))}
    </>
  );
}

function EventTaskBoard({ event }) {
  const [showAdd, setShowAdd] = useStateT(false);
  const eventTasks = TASKS.filter(t => t.eventId === event.id);

  // Group by status to make scanning fast (live-events.md: "easy to scan, one-click status changes")
  const groups = {
    in_progress: { label: "Active", tone: "red",   tasks: eventTasks.filter(t => t.status === "in_progress") },
    todo:        { label: "To do",  tone: "amber", tasks: eventTasks.filter(t => t.status === "todo") },
    review:      { label: "Review", tone: "blue",  tasks: eventTasks.filter(t => t.status === "review") },
    blocked:     { label: "Blocked",tone: "gray",  tasks: eventTasks.filter(t => t.status === "blocked") },
    done:        { label: "Done",   tone: "green", tasks: eventTasks.filter(t => t.status === "done") },
  };
  const visibleGroups = Object.entries(groups).filter(([, g]) => g.tasks.length);

  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.ClipboardList size={14}/></span>
        <h2>Event work board</h2>
        <span className="eyebrow" style={{ marginLeft: 6 }}>{eventTasks.length} TASKS · LIVE EVENT</span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={() => setShowAdd(s => !s)}>
          <Icon.Plus size={13}/>{showAdd ? "Hide" : "Add event task"}
        </button>
      </div>

      {showAdd ? (
        <div style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--hairline)",
          background: "linear-gradient(90deg, rgba(229,23,46,0.04), transparent 70%), var(--bg-elev)",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 110px", gap: 8 }}>
            <input className="select-input" style={{ flex: 1 }} placeholder="What needs doing for this event?" autoFocus/>
            <select className="select-input" defaultValue="">
              <option value="">Team…</option>
              {TEAMS.map(t => <option key={t.key} value={t.key}>{t.name}</option>)}
            </select>
            <select className="select-input" defaultValue="">
              <option value="">Assign…</option>
              {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select className="select-input" defaultValue="urgent">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <input className="select-input" placeholder="Due"/>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm"><Icon.Check size={12}/>Create event task</button>
          </div>
        </div>
      ) : null}

      <div style={{ padding: 0 }}>
        {!eventTasks.length ? (
          <div className="empty">
            <strong>No event tasks yet</strong>
            <span>Click "Add event task" above to create one. Event tasks stay separate from normal ops.</span>
          </div>
        ) : (
          <>
            <div className="task-row head">
              <div>Task</div>
              <div>Team</div>
              <div>Assignees</div>
              <div>Priority</div>
              <div>Due</div>
            </div>
            {visibleGroups.map(([key, group]) => (
              <React.Fragment key={key}>
                <div style={{
                  padding: "8px 18px",
                  background: "rgba(0,0,0,0.2)",
                  borderTop: "1px solid var(--hairline)",
                  borderBottom: "1px solid var(--hairline)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <Pill tone={group.tone}>{group.label}</Pill>
                  <span className="mono" style={{ fontSize: 11, color: "var(--text-4)" }}>{group.tasks.length}</span>
                </div>
                {group.tasks.map(t => {
                  const sec = teamByKey(t.team);
                  const dueClass = t.dueState === "soon" ? "soon" : t.dueState === "overdue" ? "overdue" : "";
                  return (
                    <div className={`task-row editable ${t.priority}`} key={t.id}>
                      <div className="title-cell">
                        <div className="pri-bar"></div>
                        <div style={{ minWidth: 0 }}>
                          <div className="title">{t.title}</div>
                          <div className="sub">{t.updates?.length || 0} updates · click any cell to edit</div>
                        </div>
                      </div>
                      <div className="cell">{sec?.name}</div>
                      <div>
                        <div className="assignee-stack">
                          {t.assignees.slice(0,3).map((id) => {
                            const mm = memberById(id);
                            return <span className="assignee-bubble" key={id}>{mm?.initials}</span>;
                          })}
                          <button className="assignee-bubble" style={{ background: "transparent", borderStyle: "dashed", color: "var(--text-4)" }} title="Add assignee">
                            +
                          </button>
                        </div>
                      </div>
                      <div>
                        <select className="select-input" defaultValue={t.priority}
                          style={{ height: 24, fontSize: 11, padding: "0 6px", minWidth: 84 }}>
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="normal">Normal</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <div className={`due ${dueClass}`}>
                        <input className="select-input" defaultValue={t.due}
                          style={{ height: 24, fontSize: 11, padding: "0 6px", width: 84,
                                   color: dueClass === "soon" ? "var(--amber)" : "var(--text-2)" }}/>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { TasksView, EventsView });
