# Product Brief

## Problem

WTUS has several attempted dashboards, but none cleanly match how the team actually works. The team needs one simple internal app for tracking operational work, seeing member availability for live event help, and understanding who is responsible for each section.

The app should reduce coordination friction instead of becoming another complicated tool people avoid.

The app will run on a VPS and be reachable on the web, so the product should be private-by-default with real authentication and role-based access from the beginning.

Because the team operates from Discord, the dashboard should be paired with a WTUS Discord bot early. The bot should start with dashboard-connected tasks, availability, live event assignments, and alerts, then expand into the all-in-one WTUS bot over time.

## Primary Users

- Owner: high-level oversight and full operational control
- Operations lead: high-level oversight and full operational control
- Section leads: serve as point people who can oversee, help, review, and coordinate section work
- Team members: create, own, edit, and complete work in their sections while sharing availability for live event help

## Core Jobs

### Track Work

Users need to create, assign, filter, and complete tasks across WTUS sections. This is especially important for a social media/weather brand where work may include posts, graphics, video uploads, verification work, forecast support, nowcasting coverage, and development tasks.

Members should be able to own their work. The lead system is not meant to make every task flow through a manager; it exists so people know who to go to when they need help, review, or fast coordination.

### Track Member Availability

Leads need a single place to see who is available to help during live event coverage. This should not start as a full scheduling suite. It should start as a clear availability board:

- Who is available now?
- Who is available for a scheduled coverage window?
- Which sections or roles can they help with?
- How long are they available?
- Are there any notes or limits on what they can do?

### Run Live Events

Live events need a separate focused workspace from normal operations.

During events, leads and members need to see:

- Which event is active
- Who is assigned
- What each person is currently doing
- Which region, platform, or section they are covering
- What still needs attention

Event roles are temporary. Assigning someone to Twitter posts for a severe weather event should not permanently change their normal WTUS section role.

### Connect Discord

Members should be able to interact with the dashboard from Discord for the workflows that happen in the server.

The first Discord scope should include:

- Task reminders and assignment alerts
- Quick task lookup and status updates
- Availability updates
- Live event help lookups
- Live event assignment lookup and updates
- Links back to dashboard records

### Represent Real Roles

WTUS members may belong to multiple sections. A person may be a global operations lead, a section lead, and a member of other sections at the same time. The app must support that without awkward workarounds.

Section leads are not meant to remove agency from members. They are knowledgeable point people for support, oversight, review, and on-the-fly coordination.

Owner and operations lead should be treated as operational peers. They should both be able to make broad global changes and co-run the team.

The app should also support temporary role coverage. If a lead is on vacation, unavailable, or busy during a live event, another member can temporarily fill that role without permanently changing the section structure.

## MVP Pages

- Dashboard: urgent tasks, available members, recent updates, quick filters
- Tasks: board/table/list for all operational tasks
- Availability: current and scheduled member availability for live event help
- Live Events: active event dashboard with temporary event roles and assignments
- Discord Bot: server commands and alerts connected to dashboard data
- Members: people, sections, and roles
- Sections: per-section task and member views
- Admin: role and section management for owner and operations lead

## Design Direction

The dashboard should be modern, dense, and operational. It should feel closer to a calm team command center than a marketing page.

Prioritize:

- Fast scanning
- Clear ownership
- Strong status labels
- Mobile-friendly views for checking tasks during active weather coverage
- Minimal clicks for common updates
- Safe access from a web-hosted production environment

Avoid:

- Overly decorative landing pages
- Complex project management features
- Hidden role logic
- Corporate approval workflows
- Too many nested menus
