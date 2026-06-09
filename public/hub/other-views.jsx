// ============================================================================
// Members, Availability, Teams + placeholder views
// ============================================================================
const { useState: useStateM } = React;

// ---------------------------------------------------------------------------
// Members view
// ---------------------------------------------------------------------------
function MembersView({ onNavigate }) {
  const [selectedId, setSelectedId] = useStateM("m_jason");
  const m = MEMBERS.find(x => x.id === selectedId) || MEMBERS[0];

  const opsMembers   = MEMBERS.filter(x => x.opsRole);
  const leadMembers  = MEMBERS.filter(x => !x.opsRole && x.leadRoles?.length);
  const baseMembers  = MEMBERS.filter(x => !x.opsRole && !x.leadRoles?.length);

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="view-tabs">
          <button className="view-tab active">All · {MEMBERS.length}</button>
          <button className="view-tab">Ops · {opsMembers.length}</button>
          <button className="view-tab">Leads · {leadMembers.length}</button>
          <button className="view-tab">On coverage · {MEMBERS.filter(x => isOnCoverage(x.id)).length}</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Icon.Link2 size={13}/>Generate invite</button>
          <button className="btn btn-primary btn-sm"><Icon.UserPlus size={13}/>Add member</button>
        </div>
      </div>

      <div className="split-layout" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="list-panel">
          <div className="list-panel-toolbar">
            <input className="select-input" placeholder="Search members…" />
          </div>
          <div style={{ overflow: "auto", padding: "4px 0" }}>
            <MemberGroup label="Operations"   members={opsMembers}  selectedId={selectedId} onSelect={setSelectedId}/>
            <MemberGroup label="Section Leads" members={leadMembers} selectedId={selectedId} onSelect={setSelectedId}/>
            <MemberGroup label="Team Members"  members={baseMembers} selectedId={selectedId} onSelect={setSelectedId}/>
          </div>
        </div>

        <div className="detail-panel">
          <MemberDetail member={m} />
        </div>
      </div>
    </div>
  );
}

function MemberGroup({ label, members, selectedId, onSelect }) {
  if (!members.length) return null;
  return (
    <div>
      <div style={{
        padding: "10px 18px 4px",
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--text-4)",
      }}>{label} · {members.length}</div>
      {members.map(member => (
        <div className="member-card" key={member.id} onClick={() => onSelect(member.id)}
          style={ selectedId === member.id ? { background: "var(--surface-2)", borderLeft: "2px solid var(--red)" } : null }>
          <Avatar member={member} size={40}/>
          <div>
            <div className="name">{member.name}</div>
            <div className="handle">@{member.handle} · {primaryRoleLabel(member)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isOnCoverage(member.id) ? <Pill tone="red">On coverage</Pill> : null}
            {member.status === "available" ? <Pill tone="green">Available</Pill> : null}
            {member.status === "maybe" ? <Pill tone="amber">Maybe</Pill> : null}
            {member.status === "unavailable" ? <Pill tone="gray">Unavailable</Pill> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberDetail({ member: m }) {
  return (
    <>
      <div className="detail-header">
        <Avatar member={m} size={56}/>
        <div className="detail-title">
          <h2>{m.name}</h2>
          <div className="section-tag">@{m.handle} · Discord verified · {primaryRoleLabel(m)}</div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary btn-sm"><Icon.MessageSquare size={13}/>DM</button>
          <button className="btn btn-secondary btn-sm"><Icon.MoreHorizontal size={13}/></button>
        </div>
      </div>
      <div className="detail-body">
        <div className="detail-section">
          <div className="detail-section-label">Roles</div>
          <div style={{ display: "grid", gap: 10 }}>
            <RoleRow
              label="Operations role"
              value={m.opsRole}
              valueLabel={m.opsRole ? opsRoleLabel(m.opsRole) : "—"}
              tone={m.opsRole === "owner" ? "red" : m.opsRole === "ops_lead" ? "red" : m.opsRole === "finance_lead" ? "amber" : "gray"}
              hint="Configured by Owner / Ops Lead"
              editable
            />
            <RoleRow
              label="Section lead roles"
              value={m.leadRoles}
              valueLabel={m.leadRoles?.length ? m.leadRoles.map(leadRoleLabel).join(" · ") : "—"}
              tone="blue"
              hint="Configured by Owner / Ops Lead"
              editable
            />
            <RoleRow
              label="Team Member"
              valueLabel="WTUS Team Member (base role)"
              tone="gray"
              hint="Base role for every verified member"
            />
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-label">Teams</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
            Members can join or leave teams themselves.
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {TEAMS.map(t => {
              const memberIn = m.teams?.includes(t.key);
              const isLead   = t.leadKey && m.leadRoles?.includes(t.leadKey);
              return (
                <div key={t.key} style={{
                  display: "grid", gridTemplateColumns: "26px 1fr auto auto", gap: 12, alignItems: "center",
                  padding: "9px 12px", border: "1px solid var(--hairline)", borderRadius: 8,
                  background: memberIn ? "var(--bg-elev)" : "transparent",
                  opacity: memberIn ? 1 : 0.55,
                }}>
                  <SectionIcon section={t} size={14}/>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.name} Team</div>
                    {isLead ? <div style={{ fontSize: 10.5, color: "var(--red)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginTop: 1 }}>LEAD</div> : null}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-3)" }}>
                    <input type="checkbox" defaultChecked={memberIn} />
                    Member
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="detail-section">
          <div className="detail-section-label">Activity (last 7 days)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { label: "Tasks closed", value: m.id === "m_dfw" ? 14 : 6 },
              { label: "Events covered", value: m.id === "m_dfw" ? 3 : 1 },
              { label: "Updates posted", value: m.id === "m_dfw" ? 47 : 12 },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: "12px 14px",
                background: "var(--bg-elev)",
                border: "1px solid var(--hairline)",
                borderRadius: 8,
              }}>
                <div className="eyebrow" style={{ fontSize: 10 }}>{stat.label}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, marginTop: 4 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function RoleRow({ label, valueLabel, tone = "gray", hint, editable }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "150px 1fr auto", alignItems: "center", gap: 12,
      padding: "10px 12px",
      border: "1px solid var(--hairline)", borderRadius: 8,
      background: "var(--bg-elev)",
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
        {hint ? <div style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{hint}</div> : null}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-2)" }}>
        {valueLabel === "—" ? <span style={{ color: "var(--text-4)" }}>—</span> : valueLabel}
      </div>
      {editable ? <button className="btn btn-ghost btn-sm" style={{ height: 26, padding: "0 8px", fontSize: 11 }}>Edit</button> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Availability view — three modes: Today (hourly), Week (days), Calendar (month)
// ---------------------------------------------------------------------------
function AvailabilityView() {
  const [mode, setMode] = useStateM("today");

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div className="view-tabs">
          <button className={`view-tab ${mode === "today" ? "active" : ""}`} onClick={() => setMode("today")}>Today · hourly</button>
          <button className={`view-tab ${mode === "week"  ? "active" : ""}`} onClick={() => setMode("week")}>This week</button>
          <button className={`view-tab ${mode === "month" ? "active" : ""}`} onClick={() => setMode("month")}>Calendar · 30 days</button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary btn-sm"><Icon.UserCheck size={13}/>Mark me available now</button>
          <button className="btn btn-primary btn-sm"><Icon.Plus size={13}/>Schedule availability</button>
        </div>
      </div>

      <AvailabilityLegend/>

      {mode === "today" ? <HourlyToday/> : null}
      {mode === "week"  ? <WeeklyAvailability/> : null}
      {mode === "month" ? <CalendarAvailability/> : null}

      <div className="col-layout">
        <AvailableNowList/>
        <ScheduleForm/>
      </div>
    </div>
  );
}

function AvailabilityLegend() {
  const items = [
    { key: "avail",   label: "Available",   className: "avail" },
    { key: "maybe",   label: "Maybe",       className: "maybe" },
    { key: "unavail", label: "Unavailable", className: "unavail" },
  ];
  return (
    <div style={{
      display: "flex", gap: 14, padding: "8px 14px",
      border: "1px solid var(--hairline)", background: "var(--surface)",
      borderRadius: 8, fontSize: 11, color: "var(--text-3)",
      alignItems: "center", flexWrap: "wrap",
    }}>
      <span className="eyebrow">LEGEND</span>
      {items.map(i => (
        <span key={i.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className={`avail-chip ${i.className}`} style={{ width: 18, height: 14, fontSize: 0 }}></span>
          {i.label}
        </span>
      ))}
      <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-4)" }}>
        Event check-ins live on the Live Events page — not here.
      </span>
    </div>
  );
}

function HourlyToday() {
  const nowHour = new Date().getHours();
  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.Clock size={14}/></span>
        <h2>Today · hour-by-hour</h2>
        <span className="eyebrow" style={{ marginLeft: 6 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </span>
      </div>
      <div className="card-body" style={{ padding: 0, overflowX: "auto" }}>
        <div className="hour-grid" style={{
          display: "grid",
          gridTemplateColumns: `160px repeat(${TODAY_HOURS.length}, minmax(38px, 1fr))`,
          fontSize: 11,
          minWidth: 900,
        }}>
          <div className="hour-corner"></div>
          {TODAY_HOURS.map(h => {
            const isNow = parseInt(h, 10) === nowHour;
            return (
              <div key={h} className={`hour-head ${isNow ? "now" : ""}`}>
                {h}
                {isNow ? <span className="now-marker">NOW</span> : null}
              </div>
            );
          })}
          {AVAILABILITY_HOURLY.map(row => {
            const m = memberById(row.mid);
            return (
              <React.Fragment key={row.mid}>
                <div className="hour-name-cell">
                  <Avatar member={m} size={22}/>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-4)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{primaryRoleLabel(m)}</div>
                  </div>
                </div>
                {row.hours.map((s, i) => (
                  <div key={i} className={`hour-cell h-${s}`} title={`${TODAY_HOURS[i]}:00 — ${s}`}>
                    <span></span>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeeklyAvailability() {
  const today = new Date();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.getDate(),
      today: i === 0,
    });
  }
  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.CalendarClock size={14}/></span>
        <h2>This week</h2>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="avail-grid">
          <div className="cell-head"></div>
          {days.map((d, i) => (
            <div key={i} className="cell-head day-head" style={ d.today ? { color: "var(--red-hot)" } : null }>
              {d.label}<span className="date">{d.date}</span>{d.today ? " · NOW" : ""}
            </div>
          ))}
          {AVAILABILITY_WEEK.map(row => {
            const m = memberById(row.mid);
            return (
              <React.Fragment key={row.mid}>
                <div className="name-cell">
                  <Avatar member={m} size={22}/>
                  <span>{m.name.split(" ")[0]}</span>
                </div>
                {row.days.map((status, i) => (
                  <div className="avail-cell" key={i}>
                    <div className={`avail-chip ${status}`}>
                      {status === "avail" ? "AVAIL" : status === "maybe" ? "MAYBE" : "UNAVAIL"}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CalendarAvailability() {
  const scheduled = useMemoCal(() => buildScheduledCalendar(), []);
  const today = new Date();
  // Show next 30 days as a calendar grid starting from today's Sunday
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay()); // back to Sunday
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const isPast = d < new Date(today.toDateString());
    const isToday = d.toDateString() === today.toDateString();
    cells.push({ date: d, key, isPast, isToday, entries: scheduled[key] || [] });
  }
  const monthLabel = today.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.CalendarClock size={14}/></span>
        <h2>{monthLabel}</h2>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn btn-secondary btn-sm"><Icon.ChevronLeft size={12}/></button>
          <button className="btn btn-secondary btn-sm">Today</button>
          <button className="btn btn-secondary btn-sm"><Icon.ChevronRight size={12}/></button>
        </div>
      </div>
      <div className="card-body" style={{ padding: 14 }}>
        <div className="cal-grid">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="cal-head">{d}</div>
          ))}
          {cells.map(c => (
            <div key={c.key} className={`cal-day ${c.isPast ? "past" : ""} ${c.isToday ? "today" : ""}`}>
              <div className="cal-date">
                {c.date.getDate()}
                {c.isToday ? <span className="cal-today-mark">TODAY</span> : null}
              </div>
              {c.entries.length ? (
                <>
                  <div className="cal-stack">
                    {c.entries.slice(0, 4).map((e, i) => (
                      <span key={i} className={`cal-bubble cal-${e.status}`} title={memberById(e.mid)?.name}>
                        {memberById(e.mid)?.initials}
                      </span>
                    ))}
                    {c.entries.length > 4 ? <span className="cal-more">+{c.entries.length - 4}</span> : null}
                  </div>
                  <div className="cal-count">{c.entries.filter(e => e.status === "avail").length} avail</div>
                </>
              ) : !c.isPast ? (
                <button className="cal-add">+ Add</button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
const useMemoCal = React.useMemo;

function AvailableNowList() {
  const available = MEMBERS.filter(m => m.status === "available");
  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.UserCheck size={14}/></span>
        <h2>Available right now</h2>
        <span className="eyebrow">{available.length} READY</span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        {available.map(m => (
          <div className="list-row" key={m.id}>
            <Avatar member={m} size={30}/>
            <div className="info">
              <strong>{m.name}</strong>
              <span>{primaryRoleLabel(m)} · available until 21:00 CT</span>
            </div>
            <button className="btn btn-secondary btn-sm"><Icon.UserPlus size={12}/>Assign</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleForm() {
  return (
    <div className="card">
      <div className="card-header">
        <span className="header-icon"><Icon.Plus size={14}/></span>
        <h2>Schedule availability</h2>
      </div>
      <div className="card-body">
        <div className="field">
          <label>Status</label>
          <select defaultValue="available">
            <option value="available">Available</option>
            <option value="maybe">Maybe</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div className="field">
            <label>Date</label>
            <input type="date" defaultValue={new Date().toISOString().slice(0,10)}/>
          </div>
          <div className="field">
            <label>Repeat</label>
            <select defaultValue="none">
              <option value="none">Just this date</option>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </div>
          <div className="field">
            <label>From</label>
            <input type="time" defaultValue="14:00"/>
          </div>
          <div className="field">
            <label>To</label>
            <input type="time" defaultValue="21:00"/>
          </div>
        </div>
        <div className="field">
          <label>Note (optional)</label>
          <input placeholder="e.g. on call from phone only"/>
        </div>
        <button className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
          <Icon.Check size={13}/>Save availability
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Teams view (was Sections)
// ---------------------------------------------------------------------------
function SectionsView({ onNavigate }) {
  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: 18 }}>Teams</h2>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
            Members can self-join. Leads are set by Owner / Ops Lead.
          </div>
        </div>
        <button className="btn btn-primary btn-sm"><Icon.Plus size={13}/>New team</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {TEAMS.map(t => {
          const stats = TEAM_STATS[t.key];
          const lead = t.leadKey ? MEMBERS.find(m => m.leadRoles?.includes(t.leadKey)) : null;
          const members = MEMBERS.filter(m => m.teams?.includes(t.key));
          const tasksOnTeam = TASKS.filter(x => x.team === t.key && !x.eventId);
          const eventTasksOnTeam = TASKS.filter(x => x.team === t.key && x.eventId).length;
          return (
            <div key={t.key} style={{
              padding: "16px 18px",
              border: "1px solid var(--hairline)",
              background: "var(--surface)",
              borderRadius: 12,
              display: "grid",
              gridTemplateColumns: "44px 1fr auto",
              alignItems: "start",
              gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                border: "1px solid var(--hairline)", background: "var(--bg-elev)",
                display: "grid", placeItems: "center",
                color: stats?.urgent > 0 ? "var(--red)" : "var(--text-2)",
              }}>
                <SectionIcon section={t} size={20}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700 }}>{t.name} Team</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
                  {lead ? <>Lead @{lead.handle}</> : <span style={{ color: "var(--text-4)" }}>No lead set</span>}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {members.slice(0, 6).map(m => <Avatar key={m.id} member={m} size={22}/>)}
                  {members.length > 6 ? <span style={{ fontSize: 11, color: "var(--text-3)" }}>+{members.length - 6}</span> : null}
                  <span style={{ flex: 1 }}/>
                  <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{members.length} member{members.length === 1 ? "" : "s"}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, lineHeight: 1 }}>{tasksOnTeam.length}</div>
                <div className="eyebrow" style={{ fontSize: 10 }}>open</div>
                {eventTasksOnTeam > 0 ? (
                  <div style={{ marginTop: 6 }}>
                    <Pill tone="red">{eventTasksOnTeam} on event</Pill>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role taxonomy summary */}
      <div className="card">
        <div className="card-header">
          <span className="header-icon"><Icon.ShieldCheck size={14}/></span>
          <h2>Role structure</h2>
          <span className="eyebrow" style={{ marginLeft: 6 }}>OWNER / OPS LEAD MANAGES LEADS · MEMBERS SELF-JOIN TEAMS</span>
        </div>
        <div className="card-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <RoleStack title="Operations" items={OPS_ROLES.map(r => {
              const holder = MEMBERS.find(m => m.opsRole === r.key);
              return { label: r.label, holder };
            })}/>
            <RoleStack title="Section Leads" items={LEAD_ROLES.map(r => {
              const holder = MEMBERS.find(m => m.leadRoles?.includes(r.key));
              return { label: r.label, holder };
            })}/>
            <RoleStack title="Base role" items={[{ label: "WTUS Team Member", holder: null, hint: "Every verified member" }]}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleStack({ title, items }) {
  return (
    <div style={{
      padding: 14, border: "1px solid var(--hairline)",
      background: "var(--bg-elev)", borderRadius: 10,
    }}>
      <div className="eyebrow" style={{ marginBottom: 10 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{it.label}</div>
              {it.hint ? <div style={{ fontSize: 10.5, color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>{it.hint}</div> : null}
            </div>
            {it.holder ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Avatar member={it.holder} size={20}/>
                <span style={{ fontSize: 11.5, color: "var(--text-2)" }}>@{it.holder.handle}</span>
              </div>
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-4)", fontFamily: "var(--font-mono)" }}>—</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function PlaceholderView({ icon, title, copy }) {
  return (
    <div className="page">
      <div className="card">
        <div className="card-body" style={{ padding: 48, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, margin: "0 auto 16px",
            display: "grid", placeItems: "center",
            background: "var(--surface-2)",
            border: "1px solid var(--hairline)",
            borderRadius: 14,
            color: "var(--red)",
          }}>{icon}</div>
          <h2 style={{ fontSize: 20, marginBottom: 6 }}>{title}</h2>
          <p style={{ color: "var(--text-3)", maxWidth: 480, margin: "0 auto" }}>{copy}</p>
        </div>
      </div>
    </div>
  );
}

function PortfolioView()  { return <PlaceholderView icon={<Icon.FileText size={26}/>} title="Portfolio"   copy="Submit and review work — graphics, forecast discussions, radar posts, recap clips. Hooks into Discord auto-tagging."/>; }
function DiscordBotView() { return <PlaceholderView icon={<Icon.Bot size={26}/>}      title="Discord Bot" copy="Configure auto-pins, alert webhooks, role sync, and reminder schedules. Owner + Ops only."/>; }
function AdminView()      { return <PlaceholderView icon={<Icon.ShieldCheck size={26}/>} title="Team Setup" copy="Invite tokens, role management, team configuration, and dashboard guardrails. Configures Ops roles and section leads."/>; }

Object.assign(window, { MembersView, AvailabilityView, SectionsView, PortfolioView, DiscordBotView, AdminView });
