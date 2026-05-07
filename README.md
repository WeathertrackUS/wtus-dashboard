# WTUS Operations Dashboard

A simple internal operations dashboard for WeatherTrackUS team coordination.

This repository is the new consolidated home for the WTUS team app. It replaces the scattered attempts in:

- `../member-dashboard`
- `../wtus-internal-dashboard`
- `../wtus-operations-dashboard`

The goal is not to merge every old feature. The goal is to keep the useful ideas, drop the overbuilt parts, and build one clear app that helps WTUS leads and members coordinate work.

## What This App Is For

WTUS needs a modern internal operations dashboard focused on:

- Task tracking for social media and weather brand operations
- Member availability for live event help
- A separate live event tracker with event-specific roles and assignments
- Discord integration because the team operates from a Discord server
- Team membership, section leads, and overlapping roles
- A future-friendly foundation for more operations tools

The app should feel like a WTUS operations tool, not a business dashboard, marketing site, or giant project management suite.

Mobile matters from the start. Some members will use this mainly from a phone, especially while checking tasks, availability, or live event assignments.

## Deployment Target

This app is intended to run on a VPS and be accessible on the web as a private WTUS internal tool.

That means the production build should include:

- Real authentication
- HTTPS in production
- Environment-based secrets
- A production database plan
- Basic backup expectations
- Admin-only access to role management

It should not rely on local-only storage or assumptions that only one trusted person can reach the app.

## First Product Scope

The first usable version should include:

- A dashboard overview showing urgent tasks, available members, and recent activity
- A task board for brand, social, and operations work
- A member availability board for live event help
- A live event dashboard for active events with temporary event roles and assignments
- A WTUS Discord bot that connects Discord workflows to dashboard tasks and availability
- Owner/operations-managed onboarding links
- Discord-linked onboarding page for new members
- Account page for members to edit team preferences
- Member profiles with multiple team roles and lead assignments
- Section views for finance, forecasting, nowcasting, YouTube, graphics, Facebook, development, and verification
- Role-aware permissions for owner, operations lead, section leads, and members

## Role Model

WTUS roles overlap, so the app should avoid a single rigid role field.

Use two layers:

- Global access roles: owner, operations lead, member
- Section roles: lead or member for one or more sections
- Temporary role coverage for short-term substitutions

Examples:

- The owner can also be the YouTube lead.
- The operations lead can also be a forecasting member and verification lead.
- Owner and operations lead can both make broad global operational changes.
- A member can be on graphics, Facebook, and nowcasting at the same time.
- A section lead is the point person for help, review, and coordination in that section.
- Members can create, edit, own, and coordinate work in their sections.
- A member can temporarily cover a lead role while someone is unavailable.

More detail lives in [docs/roles-and-permissions.md](docs/roles-and-permissions.md).

## Sections

The initial WTUS sections are:

- Finance
- Forecasting
- Nowcasting
- YouTube
- Graphics
- Facebook
- Development
- Verification

These sections should drive filtering, task ownership, availability visibility, and member profiles.

## Live Events

Normal operations and live events should be clearly separated.

Normal operations are for ongoing WTUS work: tasks, sections, members, availability, and admin.

Live events are short-term operational workspaces for active or upcoming coverage. Each event can have its own temporary roles and assignments. For example, during a severe weather event, a member may be assigned to make Twitter posts for a specific region until that assignment changes.

The live event dashboard should be fast, focused, and hard to misuse. During active weather coverage, nobody should have to dig through a complex tool to figure out what they are supposed to do.

## Current App

This repository currently contains a Next.js + React + TypeScript operations dashboard with:

- Dark WTUS branding using the real transparent logo
- Mobile-first layout behavior for the main dashboard and onboarding flow
- Empty runtime data for members, tasks, availability, live events, and temporary coverage
- Fixed WTUS section definitions
- Task creation and status updates
- Member creation with overlapping global and section roles
- Availability entry creation
- Live event creation with event-specific role assignments
- Temporary coverage creation backed by the database
- Invite-link onboarding flow outside the main dashboard chrome
- Discord OAuth-backed invite completion
- Owner/operations onboarding link management in Team Setup
- Account page for members to edit their team preferences
- Section, Discord bot, and team setup views
- Server-side permission checks for dashboard data and mutating app APIs
- First WTUS bot entrypoint with dashboard-linked task, availability, and live event commands

Members and availability are not hard-coded. Test/demo data should stay limited to tests or future seed scripts.

## Technical Direction

Keep this simple:

- One repository
- One web app
- One database
- Auth and permissions from day one
- No separate frontend/backend split until the app truly needs it

Current stack:

- Next.js
- React
- TypeScript
- Plain CSS

Production stack:

- Next.js app router
- PostgreSQL for local development and production
- Prisma or Drizzle for schema/migrations
- Auth.js with Discord OAuth
- Discord.js bot package in the same repo once the dashboard foundation exists

This keeps the project modern and easy to evolve without starting as a large distributed system.

Production/auth/Discord configuration starts from `.env.example`. Put real local values in `.env`, which is intentionally ignored. Real Discord membership verification requires the WTUS Discord guild ID plus either OAuth guild access or bot member lookup.

## Documentation

- [Product Brief](docs/product-brief.md)
- [Roles and Permissions](docs/roles-and-permissions.md)
- [Data Model](docs/data-model.md)
- [Roadmap](docs/roadmap.md)
- [Discord Bot](docs/discord-bot.md)
- [Deployment Notes](docs/deployment.md)
- [Environment Setup](docs/environment.md)
- [Consolidation Notes](docs/consolidation-notes.md)

## MVP Build Order

1. Add comments/activity history on tasks.
2. Add editable live event roles after event creation.
3. Add the first WTUS Discord bot commands and alerts.
4. Add VPS production deployment config.
5. Add automated tests for the core workflows.

## What Not To Build Yet

- Public-facing pages
- Direct social media posting
- Advanced analytics
- Calendar sync
- Complex department hierarchy
- Heavy file management

Those may be useful later, but they should not block the first working dashboard.
