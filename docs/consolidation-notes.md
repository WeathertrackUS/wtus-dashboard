# Consolidation Notes

## Source Repositories Reviewed

### `../member-dashboard`

Useful ideas:

- Task dashboard with assignment, status, labels, due dates, and comments
- Scheduling and availability concepts
- File/resource sharing concept for design assets
- React plus Flask split as a possible reference

What not to carry forward immediately:

- Full separate frontend/backend architecture
- Large documentation set before the product shape is stable
- File management as an MVP requirement

### `../wtus-internal-dashboard`

Useful ideas:

- WTUS-branded operations UI direction
- SPC/NHC outlook widgets as possible future operational context

What not to carry forward immediately:

- Single-file dashboard approach
- Mock storm data

### `../wtus-operations-dashboard`

Useful ideas:

- Availability and operations coordination focus
- Owner/manager/member permission concept
- Phase-based development approach
- Hostinger/VPS deployment notes, if that remains the deployment target

What not to carry forward immediately:

- Large single-file Flask app
- Owner/manager/member as the only role model
- Availability as a live event help feature instead of a full scheduling suite

## Consolidated Direction

Build one simple app in this repository.

Keep:

- Task tracking
- Member availability
- Live event tracker
- Members and sections
- Multi-role support
- Temporary role coverage
- Member-owned work instead of corporate approval flow
- Simple admin controls

Defer:

- Calendar sync
- Advanced availability
- File sharing
- Weather data widgets for later, not the core operations surface
- Analytics

Prioritize soon:

- WTUS Discord bot for dashboard-linked tasks, availability, and alerts
- Separate live event dashboard with temporary event roles and assignments
- Owner and operations lead as operational peers for broad global changes

## Product Decision

The new app should be based on WTUS sections and overlapping roles.

The old apps generally assume either:

- Simple owner/manager/member roles, or
- A general team/task system, or
- A weather information dashboard

The new app needs to combine the useful parts into one operations dashboard:

- Who owns this?
- What section does it belong to?
- What is urgent?
- Who is available to help with live event coverage?
- During an event, who is doing what right now?
- Who can fix it?
