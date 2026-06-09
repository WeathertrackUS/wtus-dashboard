// ============================================================================
// Inline SVG icon set — Lucide-style stroke icons (24x24, stroke 1.75)
// All accept { size = 16, ...props }
// ============================================================================

function makeIcon(paths, viewBox = "0 0 24 24") {
  return function IconCmp({ size = 16, strokeWidth = 1.75, style, ...props }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: "inline-block", flexShrink: 0, verticalAlign: "middle", ...style }}
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

const Icons = {
  LayoutDashboard: makeIcon(<>
    <rect x="3" y="3" width="7" height="9" rx="1"/>
    <rect x="14" y="3" width="7" height="5" rx="1"/>
    <rect x="14" y="12" width="7" height="9" rx="1"/>
    <rect x="3" y="16" width="7" height="5" rx="1"/>
  </>),
  ClipboardList: makeIcon(<>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="M12 11h4"/><path d="M12 16h4"/>
    <circle cx="8" cy="11" r="0.5" fill="currentColor"/><circle cx="8" cy="16" r="0.5" fill="currentColor"/>
  </>),
  CalendarClock: makeIcon(<>
    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/>
    <path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/>
    <circle cx="16" cy="16" r="5"/><path d="M16 14v2l1.5 1.5"/>
  </>),
  RadioTower: makeIcon(<>
    <path d="M4.9 16.1A10 10 0 1 1 19.1 16.1"/>
    <path d="M7.8 13.2A6 6 0 0 1 16.2 13.2"/>
    <circle cx="12" cy="10" r="1.5"/>
    <path d="M12 11.5V22"/><path d="M9 22h6"/>
  </>),
  Radio: makeIcon(<>
    <path d="M4.9 19.1A10 10 0 0 1 4.9 4.9"/><path d="M19.1 4.9a10 10 0 0 1 0 14.2"/>
    <path d="M7.8 16.2A6 6 0 0 1 7.8 7.8"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4"/>
    <circle cx="12" cy="12" r="2"/>
  </>),
  Users: makeIcon(<>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </>),
  User: makeIcon(<>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </>),
  UserPlus: makeIcon(<>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M19 8v6"/><path d="M22 11h-6"/>
  </>),
  UserCheck: makeIcon(<>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="m16 11 2 2 4-4"/>
  </>),
  LayoutList: makeIcon(<>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/>
  </>),
  FileText: makeIcon(<>
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
    <path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/><path d="M9 9h1"/>
  </>),
  Bot: makeIcon(<>
    <rect x="3" y="8" width="18" height="12" rx="2"/>
    <circle cx="8.5" cy="14" r="1"/><circle cx="15.5" cy="14" r="1"/>
    <path d="M12 8V5"/><circle cx="12" cy="4" r="1"/>
    <path d="M3 14h-1"/><path d="M22 14h-1"/>
  </>),
  ShieldCheck: makeIcon(<>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </>),
  Search: makeIcon(<>
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
  </>),
  Plus: makeIcon(<><path d="M12 5v14"/><path d="M5 12h14"/></>),
  ChevronRight: makeIcon(<><path d="m9 18 6-6-6-6"/></>),
  ChevronLeft: makeIcon(<><path d="m15 18-6-6 6-6"/></>),
  ChevronUp: makeIcon(<><path d="m18 15-6-6-6 6"/></>),
  ChevronDown: makeIcon(<><path d="m6 9 6 6 6-6"/></>),
  MapPin: makeIcon(<>
    <path d="M20 10c0 7-8 13-8 13s-8-6-8-13a8 8 0 0 1 16 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </>),
  Clock: makeIcon(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>),
  Eye: makeIcon(<>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
  </>),
  Send: makeIcon(<><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></>),
  Activity: makeIcon(<>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
  </>),
  MessageSquare: makeIcon(<>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </>),
  Filter: makeIcon(<>
    <path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/>
  </>),
  SlidersHorizontal: makeIcon(<>
    <path d="M21 4H14"/><path d="M10 4H3"/>
    <path d="M21 12h-9"/><path d="M8 12H3"/>
    <path d="M21 20h-7"/><path d="M10 20H3"/>
    <circle cx="12" cy="4" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="12" cy="20" r="2"/>
  </>),
  ExternalLink: makeIcon(<>
    <path d="M15 3h6v6"/><path d="M10 14 21 3"/>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  </>),
  MoreHorizontal: makeIcon(<>
    <circle cx="12" cy="12" r="1.4" fill="currentColor"/>
    <circle cx="19" cy="12" r="1.4" fill="currentColor"/>
    <circle cx="5" cy="12" r="1.4" fill="currentColor"/>
  </>),
  Trash2: makeIcon(<>
    <path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
  </>),
  Square: makeIcon(<><rect x="3" y="3" width="18" height="18" rx="2"/></>),
  Link2: makeIcon(<>
    <path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><path d="M8 12h8"/>
  </>),
  Check: makeIcon(<><path d="m20 6-11 11-5-5"/></>),
  CloudRain: makeIcon(<>
    <path d="M4 14.9A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.24"/>
    <path d="M8 19v1"/><path d="M8 14v1"/><path d="M16 19v1"/><path d="M16 14v1"/><path d="M12 21v1"/><path d="M12 16v1"/>
  </>),
  Image: makeIcon(<>
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="9" cy="9" r="2"/><path d="m21 15-3.5-3.5L9 21"/>
  </>),
  Youtube: makeIcon(<>
    <rect x="2" y="5" width="20" height="14" rx="3"/>
    <path d="m10 9 5 3-5 3V9z" fill="currentColor"/>
  </>),
  Facebook: makeIcon(<>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </>),
  Terminal: makeIcon(<>
    <path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>
  </>),
  DollarSign: makeIcon(<>
    <line x1="12" y1="2" x2="12" y2="22"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </>),
  Hash: makeIcon(<>
    <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
    <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
  </>),
  LogIn: makeIcon(<>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
    <path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>
  </>),
  LogOut: makeIcon(<>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>
  </>),
  Command: makeIcon(<>
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
  </>),
};

window.Icon = Icons;
