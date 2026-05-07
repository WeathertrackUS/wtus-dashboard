# Roadmap

## Phase 0: Repository Reset

Goal: create one clear home for the app.

Tasks:

- Write the consolidated README and docs
- Decide the starting stack
- Initialize the app
- Add linting, formatting, and basic test scripts
- Create the first database schema and seed roles/sections
- Document the VPS deployment target and production requirements

## Phase 1: App Foundation

Goal: make the app usable by a small admin group.

Tasks:

- App shell with dashboard navigation
- Authentication
- Production-ready session and secret handling
- Users
- Global roles
- Sections
- Section memberships
- Seed data for the initial WTUS sections
- Basic permission helpers
- Deployment notes for VPS setup
- Discord identity mapping plan
- First verified Discord user bootstrap as owner
- Server-side permission checks for dashboard and mutating APIs

Done when:

- The first owner can sign in through Discord OAuth
- Owner and operations lead can operate with the same broad dashboard permissions
- Users can have multiple section roles
- The app can show member and section directories
- The app has a clear path for linking Discord users to dashboard users

## Phase 2: Task Tracking

Goal: support the main work board for WTUS operations.

Tasks:

- Create tasks
- Assign tasks to members
- Let members create and own section tasks
- Let members edit tasks they own or are helping with
- Attach tasks to sections
- Track status and priority
- Add comments
- Add dashboard widgets for urgent and assigned tasks
- Add section-level task views

Done when:

- Leads can help coordinate and review section tasks
- Members can create, edit, own, and update section tasks
- The dashboard clearly shows what needs attention

## Phase 3: Member Availability

Goal: make it easy to see who can help with live events before that information gets lost in chat.

Tasks:

- Let members mark themselves available now
- Let members schedule future availability windows
- Track event name and coverage window
- Attach availability to sections or help roles
- Add notes for limits, preferences, or context
- Add dashboard widgets for currently available members
- Add filters by section, role, event, and time window

Done when:

- Members can update availability quickly
- Owner and operations lead can see who is available for live event help
- Section leads can filter availability for their areas

## Phase 4: Admin Polish

Goal: make the system manageable without code edits.

Tasks:

- User invitation flow
- Role management screens
- Section membership management
- Temporary role coverage management
- Status and priority configuration if needed
- Basic audit trail for role and task changes

Done when:

- Owner and operations lead can make broad operational changes
- Temporary coverage can be scheduled for vacations, unavailable leads, and live event needs
- Temporary coverage expires without changing permanent section roles

## Phase 5: Live Events

Goal: create a separate high-speed workspace for active event coverage.

Tasks:

- Create live events
- Track event status, start time, and end time
- Add temporary event roles
- Assign members to event roles
- Add optional region, platform, and notes to assignments
- Respect active temporary role coverage when assigning event leads
- Show member availability inside the event view
- Show event-specific tasks
- Build a focused live event dashboard

Done when:

- Leads can start an event workspace quickly
- Members can see their current event assignment without hunting
- Event roles do not change permanent section roles
- The active event view clearly shows who is doing what

## Phase 6: WTUS Discord Bot

Goal: connect the team's Discord server to the dashboard workflows people will use every day.

Tasks:

- Create the bot package inside this repository
- Add Discord app configuration documentation
- Link Discord users to dashboard users
- Add commands for assigned tasks
- Add commands for current and scheduled availability
- Add commands to list available members for live event help
- Add commands for current live event assignments
- Add commands to assign or update event roles
- Send task assignment alerts
- Send availability alerts to configured channels
- Send live event assignment alerts
- Respect dashboard roles and section permissions

Done when:

- Members can update availability from Discord
- Members can view and update their own tasks from Discord
- Leads can check who is available for live event help from Discord
- Leads and members can view current event assignments from Discord
- Bot data stays synced with the dashboard source of truth

## Later

Do not build these until the core app is working:

- Calendar sync
- File management
- Analytics
- Direct publishing integrations
- Broader all-in-one WTUS bot features beyond dashboard workflows
