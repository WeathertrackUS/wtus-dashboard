// ============================================================================
// WTUS Operations Hub — Main app
// ============================================================================

const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentRed": "#e5172e",
  "denseRows": false,
  "showCommandHint": true,
  "headerStyle": "operations"
}/*EDITMODE-END*/;

const PAGE_META = {
  dashboard:    { title: "Operations",     eyebrow: "OVERVIEW · LIVE" },
  tasks:        { title: "Tasks",          eyebrow: "WORK BOARD" },
  availability: { title: "Availability",   eyebrow: "TEAM SCHEDULE" },
  events:       { title: "Live Events",    eyebrow: "COVERAGE" },
  members:      { title: "Members",        eyebrow: "TEAM ROSTER" },
  sections:     { title: "Teams",          eyebrow: "OPERATIONS · TEAMS" },
  portfolio:    { title: "Portfolio",      eyebrow: "WORK SUBMISSIONS" },
  discord:      { title: "Discord Bot",    eyebrow: "AUTOMATION" },
  admin:        { title: "Team Setup",     eyebrow: "ADMIN · OWNER" },
};

function App() {
  const [active, setActive] = useStateApp("dashboard");
  const [cmdOpen, setCmdOpen] = useStateApp(false);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffectApp(() => {
    if (t.accentRed) {
      document.documentElement.style.setProperty("--red", t.accentRed);
    }
  }, [t.accentRed]);

  useEffectApp(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meta = PAGE_META[active] || PAGE_META.dashboard;
  const liveActive = !!LIVE_EVENT;
  const urgentCount = TASKS.filter(t => t.priority === "urgent").length;

  function renderView() {
    switch (active) {
      case "dashboard":    return <DashboardView   onNavigate={setActive} onOpenCmdK={() => setCmdOpen(true)} />;
      case "tasks":        return <TasksView       onNavigate={setActive} />;
      case "events":       return <EventsView      onNavigate={setActive} />;
      case "availability": return <AvailabilityView />;
      case "members":      return <MembersView     onNavigate={setActive} />;
      case "sections":     return <SectionsView    onNavigate={setActive} />;
      case "portfolio":    return <PortfolioView />;
      case "discord":      return <DiscordBotView />;
      case "admin":        return <AdminView />;
      default:             return <DashboardView   onNavigate={setActive} onOpenCmdK={() => setCmdOpen(true)} />;
    }
  }

  const primaryAction = active === "tasks"   ? { label: "New task",   onClick: () => alert("New task") } :
                        active === "events"  ? { label: "Start event", onClick: () => alert("New event") } :
                        active === "members" ? { label: "Add member",  onClick: () => alert("Add member") } :
                        active === "dashboard" ? { label: "Quick post", onClick: () => alert("Quick post") } :
                        null;

  return (
    <div className="app" data-screen-label={`WTUS · ${meta.title}`}>
      <Sidebar active={active} onNavigate={setActive} liveActive={liveActive} urgentCount={urgentCount} />
      <div className="main">
        <Topbar
          pageTitle={meta.title}
          eyebrow={meta.eyebrow}
          onSearch={() => setCmdOpen(true)}
          primaryAction={primaryAction}
        />
        {renderView()}
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onNavigate={(v) => { setActive(v); setCmdOpen(false); }} />

      {/* Tweaks panel */}
      {typeof TweaksPanel !== "undefined" ? (
        <TweaksPanel title="Tweaks">
          <TweakSection title="Brand">
            <TweakColor
              label="Accent red"
              value={t.accentRed}
              onChange={(v) => setTweak("accentRed", v)}
              options={["#e5172e", "#ff2a44", "#c81027", "#d63a48"]}
            />
          </TweakSection>
          <TweakSection title="Layout">
            <TweakToggle
              label="Dense table rows"
              value={t.denseRows}
              onChange={(v) => setTweak("denseRows", v)}
            />
            <TweakToggle
              label="Show ⌘K hint"
              value={t.showCommandHint}
              onChange={(v) => setTweak("showCommandHint", v)}
            />
          </TweakSection>
          <TweakSection title="Quick jump">
            <TweakButton onClick={() => setCmdOpen(true)}>Open command palette (⌘K)</TweakButton>
          </TweakSection>
        </TweaksPanel>
      ) : null}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
