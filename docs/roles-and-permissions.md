# Roles and Permissions

## Core Principle

Do not model WTUS people with one role column.

Use global roles for app-wide authority, section roles for team responsibility, and temporary role coverage for short-term substitutions.

WTUS is a team, not a corporate approval ladder. Members should have agency over their own work and their section's work. Leads exist as knowledgeable point people who can oversee, help, review, and coordinate when someone needs support quickly.

Owner and operations lead should be operational peers. In normal use, they should be able to make the same broad global changes and co-run team operations. Any difference between them should be limited to rare owner-control actions, such as transferring the owner role or removing the owner account.

## Global Roles

### Owner

The owner has full operational access to the app.

Can:

- Manage all users
- Assign or remove global roles
- Assign section leads and section members
- Manage every task and view all member availability
- Manage all live events and event assignments
- Manage temporary role coverage
- Change app settings

### Operations Lead

The operations lead has full operational access to the app and co-runs team operations with the owner.

Can:

- Manage users
- Assign or remove global roles except rare owner-control actions
- Assign section leads and section members
- Manage every task and view all member availability
- Manage all live events and event assignments
- Manage temporary role coverage
- View all sections
- Configure operational metadata like statuses and priorities

### Member

Members can actively participate in and help shape the sections assigned to them.

Can:

- View tasks and availability visible to their sections
- Create tasks in their sections
- Edit tasks they own or are helping with
- Assign or self-assign section tasks when appropriate
- Update tasks assigned to them
- Comment on relevant tasks and update their own availability
- Own their work without waiting on a lead for every change
- View member and section directories

## Section Roles

Each section assignment has a role:

- Lead
- Member

Sections:

- Finance
- Forecasting
- Nowcasting
- YouTube
- Graphics
- Facebook
- Development
- Verification

## Temporary Role Coverage

Temporary role coverage lets a trusted member fill a role for a limited time without permanently changing the team structure.

Use cases:

- A section lead is on vacation
- A section lead is unavailable during active coverage
- A live event needs someone to temporarily fill a lead or coordinator role
- Owner or operations lead wants someone to cover a responsibility during a known window

Temporary coverage should have:

- Covered role
- Person being covered for, when relevant
- Temporary assignee
- Start time
- End time
- Reason
- Scope, such as global, section, or live event

## Permission Rules

### Tasks

Owner and operations lead can create, edit, assign, and close all tasks.

Section leads can create, edit, assign, review, and close tasks for their section.

Members can create, edit, assign, self-assign, update, and comment on tasks in their sections.

Members should be trusted to control their own work. Leads are there for coordination, review, and help, not to bottleneck every task.

### Member Availability

Owner and operations lead can view and filter all member availability.

Section leads can view availability for members in their section to help coordinate coverage.

Members can create and update their own current or scheduled availability.

### Live Events

Owner and operations lead can create and manage all live events.

Section leads can help manage live event assignments related to their section.

Event leads can coordinate assignments inside the event they lead.

Members can view live events, update their own event assignment, and help manage event work where they are involved.

Live event roles are temporary and do not grant permanent section or global permissions.

### Temporary Role Coverage

Owner and operations lead can create, edit, and end temporary role coverage.

Section leads can request temporary coverage for their section.

Temporary assignees receive the permissions needed for the covered scope during the active coverage window.

Temporary coverage should expire automatically at the end time.

### Member Management

Owner and operations lead can manage operational roles and broad global changes.

Owner-only controls, if implemented, should be limited to rare account ownership controls.

Section leads can help maintain their section member list and suggest role changes, but should not directly grant global roles.

### Onboarding

Owner and operations lead can create, disable, and review onboarding links.

Onboarding should not be a normal dashboard tab. A new member should receive a link, land on a focused onboarding page, connect their Discord identity, and choose the teams they want to be part of.

Members can later update their member-focused team preferences from their account page. Lead assignments and global roles stay in the owner/operations setup area.

## Data Shape

A user can have:

- Zero or more global roles
- Zero or more section memberships
- Zero or more section lead roles
- Zero or more temporary coverage roles

This supports the real WTUS structure without special cases.
