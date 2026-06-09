// ============================================================================
// WTUS Operations Hub — Data model
//
// Roles are intentionally separated:
//   • Ops roles    — Owner, Ops Lead, Finance Lead (configured by Owner/Ops)
//   • Section leads — set by Owner/Ops Lead, one per team
//   • Teams        — members can self-add. Everyone has WTUS Team Member base.
//   • Live-event roles — temporary, per-event; do NOT change permanent roles.
// ============================================================================

// ---------- Permanent role taxonomy ----------------------------------------
const OPS_ROLES = [
  { key: "owner",        label: "Owner",        accent: "red" },
  { key: "ops_lead",     label: "Ops Lead",     accent: "red" },
  { key: "finance_lead", label: "Finance Lead", accent: "amber" },
];

const LEAD_ROLES = [
  { key: "forecast_lead",          label: "Forecast Lead",           teamKey: "forecast" },
  { key: "development_lead",       label: "Development Lead",        teamKey: "development" },
  { key: "graphics_lead",          label: "Graphics Lead",           teamKey: "graphics" },
  { key: "live_broadcasting_lead", label: "Live Broadcasting Lead",  teamKey: null },
  { key: "video_lead",             label: "Video Content Lead",      teamKey: "video" },
];

const TEAMS = [
  { key: "forecast",    name: "Forecast",      short: "Forecast",  icon: "CloudRain", leadKey: "forecast_lead" },
  { key: "nowcast",     name: "Nowcast",       short: "Nowcast",   icon: "Radio",     leadKey: null /* live broadcasting covers */ },
  { key: "graphics",    name: "Graphics",      short: "Graphics",  icon: "Image",     leadKey: "graphics_lead" },
  { key: "development", name: "Development",   short: "Dev",       icon: "Terminal",  leadKey: "development_lead" },
  { key: "video",       name: "Video Content", short: "Video",     icon: "Youtube",   leadKey: "video_lead" },
];

// ---------- Members --------------------------------------------------------
// Member `status` is *availability only*: available | maybe | unavailable.
// Whether someone is currently "on coverage" is derived from the active event's
// check-in roster — it is NOT an availability state.
const MEMBERS = [
  { id: "m_star",  name: "Starinbox",        handle: "Starinbox",       opsRole: "owner",        leadRoles: [],                                            teams: ["forecast"],                            status: "available",   initials: "SI", hue: 350, discordVerified: true },
  { id: "m_wbs",   name: "WeatherboySuper",  handle: "WeatherboySuper", opsRole: "ops_lead",     leadRoles: ["development_lead"],                          teams: ["development", "forecast"],             status: "available",   initials: "WS", hue: 0,   discordVerified: true },
  { id: "m_hydra", name: "Hydra",            handle: "Hydra",           opsRole: "finance_lead", leadRoles: ["graphics_lead"],                             teams: ["graphics", "video"],                   status: "maybe",       initials: "HY", hue: 175, discordVerified: true },
  { id: "m_jason", name: "Jason Harlow",     handle: "Jason_wx",        opsRole: null,           leadRoles: ["forecast_lead", "live_broadcasting_lead"],   teams: ["forecast", "nowcast"],                 status: "available",   initials: "JH", hue: 14,  discordVerified: true },
  { id: "m_rome",  name: "Wx_Rome",          handle: "Wx_Rome",         opsRole: null,           leadRoles: ["video_lead"],                                teams: ["video", "forecast", "graphics"],       status: "available",   initials: "WR", hue: 200, discordVerified: true },
  { id: "m_dfw",   name: "DFWStormChasers",  handle: "DFWStormChasers", opsRole: null,           leadRoles: [],                                            teams: ["nowcast"],                             status: "available",   initials: "DS", hue: 24,  discordVerified: true },
  { id: "m_livid", name: "LividWX",          handle: "LividWX",         opsRole: null,           leadRoles: [],                                            teams: ["nowcast"],                             status: "available",   initials: "LW", hue: 260, discordVerified: true },
  { id: "m_klp",   name: "KeyLimePie",       handle: "KeyLimePie",      opsRole: null,           leadRoles: [],                                            teams: ["graphics"],                            status: "available",   initials: "KP", hue: 80,  discordVerified: true },
  { id: "m_star2", name: "Star",             handle: "Star",            opsRole: null,           leadRoles: [],                                            teams: ["nowcast"],                             status: "unavailable", initials: "ST", hue: 50,  discordVerified: true },
];

// ---------- Tasks (normal ops) ---------------------------------------------
const TASKS = [
  { id: "t1", title: "Issue 2nd update for OK/AR tornado outbreak",
    team: "nowcast",     status: "in_progress", priority: "urgent", assignees: ["m_dfw","m_livid"],
    due: "in 12m", dueState: "soon", eventId: "e1",
    notes: "Push update to FB + YT chat. Confirm SPC MD #218 in graphic.",
    updates: [
      { id: "u1", author: "DFWStormChasers", body: "Tornado warning McClain → Cleveland Co. issued. Pulling clip.", ago: "3m ago" },
      { id: "u2", author: "Jason_wx",        body: "Confirmed couplet on KTLX 0.5°. Go ahead.", ago: "5m ago" },
    ],
  },
  { id: "t2", title: "Cut storm-relative motion loop — Lawton supercell",
    team: "graphics", status: "todo", priority: "urgent", assignees: ["m_hydra"],
    due: "in 28m", dueState: "soon", eventId: "e1",
    notes: "30-sec loop, KFDR + KTLX. 1080×1080.",
    updates: [] },
  { id: "t3", title: "Schedule 7PM CT FB Live recap",
    team: "video", status: "todo", priority: "high", assignees: ["m_rome"],
    due: "Today 7:00 PM", dueState: "later", eventId: "e1",
    notes: "Coordinate with Jason for radar share. 20-min target.",
    updates: [] },
  { id: "t4", title: "Verify reports — Custer County hail 2.75\"",
    team: "nowcast", status: "in_progress", priority: "high", assignees: ["m_star2"],
    due: "Today", dueState: "later", eventId: "e1",
    notes: "Two spotter reports. Cross-check NWS NORM LSR feed.",
    updates: [{ id: "u3", author: "Star", body: "One confirmed via spotter photo. Awaiting NWS LSR.", ago: "11m ago" }] },
  { id: "t5", title: "Push YouTube short — radar timelapse",
    team: "video", status: "review", priority: "normal", assignees: ["m_hydra","m_klp"],
    due: "Tomorrow", dueState: "later", eventId: null,
    notes: "Hydra edit ready. Need thumbnail approval.", updates: [] },
  { id: "t6", title: "Tornado warning ribbon — alt-style v2",
    team: "graphics", status: "todo", priority: "normal", assignees: ["m_klp"],
    due: "Fri", dueState: "later", eventId: null,
    notes: "Match the new red. 1920×120 + 1080×1080.", updates: [] },
  { id: "t7", title: "Discord bot — auto-pin pinned alerts",
    team: "development", status: "in_progress", priority: "normal", assignees: ["m_wbs"],
    due: "Next Mon", dueState: "later", eventId: null,
    notes: "Webhook trigger from #alerts.", updates: [] },
  { id: "t8", title: "Forecast: 5-day outlook for next severe window",
    team: "forecast", status: "todo", priority: "high", assignees: ["m_jason","m_rome"],
    due: "Wed", dueState: "later", eventId: null,
    notes: "Long-range models converging on Wed/Thu signal.", updates: [] },
  { id: "t9", title: "Patreon tier graphics refresh",
    team: "graphics", status: "blocked", priority: "low", assignees: ["m_hydra"],
    due: "—", dueState: "later", eventId: null,
    notes: "Waiting on copy from Jason.", updates: [] },
];

// ---------- Live event -----------------------------------------------------
//
// Two update streams (per user direction):
//   • Team Updates  — internal, will eventually post to team Discord
//   • Event Updates — public-facing, will eventually push to broadcast + Discord
//
// Assignments carry an event-time `eventRole` (temporary, separate from permanent roles)
// plus a `checkIn` for member presence tracking.

const LIVE_EVENT = {
  id: "e1",
  name: "OK / AR Severe Outbreak — PDS Watch 218",
  status: "active",
  description:
    "PDS Tornado Watch 218 in effect for southern OK, central/north TX, and NW AR until 9 PM CT. Multiple discrete supercells. Tornado emergencies likely.",
  startedAt: "14:42 CT",
  duration: "1h 14m",
  watchers: 4231,
  region: "OK · TX · AR",
  briefing: "Priorities: 1) Tornado-emergency clips within 90s · 2) Verified hail/wind reports · 3) Push every 15min to FB. Backup nowcaster on standby.",
  assignments: [
    { id: "a1", memberId: "m_dfw",   eventRole: "Lead Nowcaster",     region: "OK · I-44 corridor",     status: "active",   checkIn: "checked_in",    checkedInAt: "14:42 CT" },
    { id: "a2", memberId: "m_livid", eventRole: "Nowcaster",          region: "TX · Red River",         status: "active",   checkIn: "checked_in",    checkedInAt: "14:45 CT" },
    { id: "a3", memberId: "m_jason", eventRole: "Live Broadcasting",  region: "Command",                status: "active",   checkIn: "checked_in",    checkedInAt: "14:40 CT" },
    { id: "a4", memberId: "m_hydra", eventRole: "Graphics",           region: "Cut-ins / Loops",        status: "active",   checkIn: "checked_in",    checkedInAt: "14:48 CT" },
    { id: "a5", memberId: "m_star2", eventRole: "Verification",       region: "LSRs / Spotter reports", status: "active",   checkIn: "not_checked_in", checkedInAt: null      },
    { id: "a6", memberId: "m_rome",  eventRole: "FB Live Host",       region: "7PM recap",              status: "assigned", checkIn: "not_checked_in", checkedInAt: null      },
  ],
  // Internal team updates — eventually piped to team Discord channel
  teamUpdates: [
    { id: "tu1", author: "Jason_wx",        body: "Tornado emergency: Bridge Creek → Newcastle. All eyes on KTLX.", ago: "2m ago",  urgent: true  },
    { id: "tu2", author: "DFWStormChasers", body: "Confirmed wedge near Slaughterville. Pulling streamer clip.",   ago: "6m ago",  urgent: false },
    { id: "tu3", author: "Star",            body: "Heads up — I'm 10 min out, not checked in yet but on the way.",  ago: "8m ago",  urgent: false },
    { id: "tu4", author: "Hydra",           body: "Radar loop pushed to FB. IG/X next.",                            ago: "15m ago", urgent: false },
  ],
  // Public-facing updates — eventually shown on broadcast + posted to Discord
  eventUpdates: [
    { id: "eu1", author: "Jason_wx", body: "TORNADO EMERGENCY for Bridge Creek and Newcastle, OK. Take shelter NOW. Confirmed large wedge tornado.", ago: "2m ago",  urgent: true  },
    { id: "eu2", author: "DFWStormChasers", body: "Large, dangerous tornado on the ground in Cleveland County. Move to your safe place immediately.", ago: "7m ago", urgent: true },
    { id: "eu3", author: "Hydra",    body: "Updated radar loop showing the supercell now: ↗️ tracking NNE at 35 mph.", ago: "16m ago", urgent: false },
    { id: "eu4", author: "Jason_wx", body: "PDS Tornado Watch 218 in effect across southern OK, central/north TX, and NW AR until 9 PM CT.", ago: "1h ago", urgent: false },
  ],
};

// ---------- Availability ---------------------------------------------------
// Week (days) — avail | maybe | unavail
const AVAILABILITY_WEEK = [
  { mid: "m_star",  days: ["avail","avail","avail","maybe","avail","maybe","maybe"] },
  { mid: "m_wbs",   days: ["avail","avail","avail","avail","avail","avail","avail"] },
  { mid: "m_hydra", days: ["maybe","avail","avail","unavail","avail","avail","avail"] },
  { mid: "m_jason", days: ["avail","avail","avail","avail","avail","maybe","maybe"] },
  { mid: "m_rome",  days: ["avail","avail","maybe","avail","avail","avail","avail"] },
  { mid: "m_dfw",   days: ["avail","avail","avail","avail","avail","maybe","unavail"] },
  { mid: "m_livid", days: ["avail","maybe","avail","avail","avail","avail","maybe"] },
  { mid: "m_klp",   days: ["avail","avail","avail","avail","maybe","avail","avail"] },
  { mid: "m_star2", days: ["unavail","unavail","avail","avail","avail","maybe","avail"] },
];

// Today, hour-by-hour (06:00 → 23:00 = 18 hours).
// Statuses: avail | maybe | unavail. "On coverage" is derived separately from event check-ins.
const TODAY_HOURS = ["06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23"];
const AVAILABILITY_HOURLY = [
  { mid: "m_jason", hours: ["unavail","unavail","unavail","unavail","maybe","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","maybe","unavail"] },
  { mid: "m_dfw",   hours: ["unavail","unavail","unavail","unavail","unavail","unavail","maybe","avail","avail","avail","avail","avail","avail","avail","avail","avail","unavail","unavail"] },
  { mid: "m_livid", hours: ["unavail","unavail","unavail","unavail","unavail","maybe","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","maybe","unavail"] },
  { mid: "m_hydra", hours: ["unavail","unavail","unavail","maybe","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","maybe","maybe","unavail","unavail"] },
  { mid: "m_star2", hours: ["unavail","unavail","unavail","unavail","unavail","unavail","maybe","maybe","maybe","avail","avail","avail","avail","avail","maybe","unavail","unavail","unavail"] },
  { mid: "m_rome",  hours: ["unavail","maybe","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","maybe","unavail"] },
  { mid: "m_klp",   hours: ["unavail","unavail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","maybe","unavail","unavail"] },
  { mid: "m_wbs",   hours: ["maybe","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","maybe"] },
  { mid: "m_star",  hours: ["unavail","unavail","unavail","maybe","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","avail","maybe","unavail","unavail"] },
];

// Calendar: scheduled availability days for the next 30 days (any future date)
// We compute this dynamically — each entry: { date: 'YYYY-MM-DD', mid, status }
function buildScheduledCalendar() {
  const out = {};
  const today = new Date();
  // A few example future blocks per member
  const plans = [
    { mid: "m_jason", offsets: [1, 2, 3, 5, 6, 7, 8, 14, 15], status: "avail" },
    { mid: "m_jason", offsets: [9, 10, 11], status: "away" },
    { mid: "m_dfw",   offsets: [1, 2, 3, 4, 8, 9, 10], status: "avail" },
    { mid: "m_dfw",   offsets: [5, 6, 7], status: "away" },
    { mid: "m_hydra", offsets: [1, 3, 4, 7, 8, 11, 12, 18], status: "avail" },
    { mid: "m_hydra", offsets: [2, 9], status: "maybe" },
    { mid: "m_rome",  offsets: [1, 2, 4, 5, 6, 10, 11, 14], status: "avail" },
    { mid: "m_klp",   offsets: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12], status: "avail" },
    { mid: "m_livid", offsets: [1, 2, 6, 7, 8, 13, 14], status: "avail" },
    { mid: "m_livid", offsets: [3, 4], status: "maybe" },
    { mid: "m_star",  offsets: [2, 3, 9, 10, 16, 17], status: "avail" },
    { mid: "m_wbs",   offsets: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], status: "avail" },
    { mid: "m_star2", offsets: [4, 5, 11, 12], status: "avail" },
  ];
  plans.forEach(({ mid, offsets, status }) => {
    offsets.forEach((o) => {
      const d = new Date(today);
      d.setDate(d.getDate() + o);
      const key = d.toISOString().slice(0, 10);
      (out[key] = out[key] || []).push({ mid, status });
    });
  });
  return out;
}

// ---------- Team stats -----------------------------------------------------
const TEAM_STATS = {
  forecast:    { open: TASKS.filter(t => t.team === "forecast"    && !t.eventId).length, urgent: TASKS.filter(t => t.team === "forecast"    && !t.eventId && (t.priority === "urgent" || t.priority === "high")).length },
  nowcast:     { open: TASKS.filter(t => t.team === "nowcast"     && !t.eventId).length, urgent: 0 },
  graphics:    { open: TASKS.filter(t => t.team === "graphics"    && !t.eventId).length, urgent: 0 },
  development: { open: TASKS.filter(t => t.team === "development" && !t.eventId).length, urgent: 0 },
  video:       { open: TASKS.filter(t => t.team === "video"       && !t.eventId).length, urgent: 0 },
};

// ---------- Temporary role coverage ----------------------------------------
const TEMP_COVERAGE = [
  {
    id: "tc1", assigneeId: "m_klp", coveredId: "m_hydra",
    scope: "team", teamKey: "graphics",
    coverageRole: "Graphics Lead",
    reason: "Hydra on cut-ins this event — KeyLimePie covering normal graphics work",
    startsAt: "Today 14:00 CT", endsAt: "Event end",
    status: "active",
  },
];

// ---------- Helpers --------------------------------------------------------
function memberById(id) { return MEMBERS.find((m) => m.id === id); }
function teamByKey(k)   { return TEAMS.find((t) => t.key === k); }
function opsRoleLabel(key) { return OPS_ROLES.find(r => r.key === key)?.label; }
function leadRoleLabel(key) { return LEAD_ROLES.find(r => r.key === key)?.label; }

// Returns the primary role label for a member (highest authority shown first).
// If a member holds multiple lead roles, joins them with ' + '.
function primaryRoleLabel(m) {
  if (m.opsRole && m.leadRoles?.length) {
    return opsRoleLabel(m.opsRole) + " + " + m.leadRoles.map(leadRoleLabel).join(" + ");
  }
  if (m.opsRole) return opsRoleLabel(m.opsRole);
  if (m.leadRoles?.length) return m.leadRoles.map(leadRoleLabel).join(" + ");
  return "Team Member";
}

// Is this member currently on coverage? Derived from active event's check-in.
function isOnCoverage(memberId) {
  if (!LIVE_EVENT || LIVE_EVENT.status !== "active") return false;
  return LIVE_EVENT.assignments.some(a => a.memberId === memberId && a.checkIn === "checked_in");
}

const PRIORITY_LABEL = { urgent: "Urgent", high: "High", normal: "Normal", low: "Low" };
const STATUS_LABEL = { todo: "To do", in_progress: "In progress", blocked: "Blocked", review: "Review", done: "Done" };
const CHECKIN_LABEL = { checked_in: "Present", not_checked_in: "Not checked in", absent: "Absent" };

Object.assign(window, {
  OPS_ROLES, LEAD_ROLES, TEAMS, MEMBERS, TASKS, LIVE_EVENT,
  AVAILABILITY_WEEK, TODAY_HOURS, AVAILABILITY_HOURLY, buildScheduledCalendar,
  TEAM_STATS, TEMP_COVERAGE,
  PRIORITY_LABEL, STATUS_LABEL, CHECKIN_LABEL,
  memberById, teamByKey, opsRoleLabel, leadRoleLabel, primaryRoleLabel, isOnCoverage,
  // Back-compat aliases (some views still reference old names)
  SECTIONS: TEAMS, SECTION_STATS: TEAM_STATS, sectionByKey: teamByKey,
});
