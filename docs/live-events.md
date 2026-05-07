# Live Events

## Purpose

Live events are separate from normal operations.

Normal operations cover ongoing work like tasks, section management, member availability, and general admin.

Live events are focused workspaces for active or upcoming coverage where members need to know exactly what they are doing right now.

## Example

A severe weather event is active.

One member may be assigned:

- Event: Severe Weather Coverage
- Region: North Texas
- Event role: Twitter posts
- Section: Facebook or nowcasting if relevant
- Status: active
- Notes: post warning summaries and confirmed reports only

That event role is temporary. It applies to this live event until it is changed or the event ends. It does not permanently change the member's normal WTUS section roles.

## Core Requirements

The live event dashboard must be:

- Fast to scan
- Easy to update
- Separate from normal operations
- Focused on active assignments
- Useful during high-pressure weather coverage
- Sparse enough that every visible field has a reason to be there

## Live Event Dashboard

The event view should show:

- Event name
- Event status
- Event start and end time
- Active assignments
- Member availability for the event
- Open event tasks
- Quick notes or briefing text

The default view should answer:

- What is happening?
- Who is working it?
- What is each person doing?
- What areas or platforms are covered?
- What needs attention?

## Event Roles

Event roles are temporary labels for what someone is doing in a specific event.

Examples:

- Twitter posts
- Facebook updates
- YouTube stream support
- Graphics
- Nowcasting
- Forecast support
- Verification
- Regional monitor
- Lead coordinator

Event roles should be customizable per event because every event may need slightly different jobs.

Temporary role coverage can also apply during live events. If the normal lead is unavailable, owner or operations lead can temporarily elevate another member to fill the needed event or section role for that coverage window.

## Event Assignments

An event assignment connects:

- A live event
- A member
- A temporary event role
- An optional section
- An optional region or platform
- A status
- Notes

Initial assignment statuses:

- `assigned`
- `active`
- `paused`
- `done`

## UX Rules

During an event, the dashboard should not feel like paperwork.

Prioritize:

- One-click status changes
- Clear role labels
- Clear member ownership
- Member agency to update their own work quickly
- Large enough text for fast scanning
- Filters only where they help
- Minimal required fields
- A strong active event overview

Avoid:

- Complex forms during active coverage
- Deep navigation
- Long required descriptions
- Confusing permanent role changes with event-specific roles
- Requiring lead approval for every small update

## Discord Integration

The WTUS Discord bot should support live events early.

Useful first commands:

- `/event current`
- `/event assign`
- `/event role`
- `/event available`
- `/event mine`

The bot should make it easy to check or update event assignments without leaving Discord, while the dashboard remains the source of truth.
