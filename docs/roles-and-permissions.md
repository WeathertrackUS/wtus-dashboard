# Roles and Permissions

## Core Principle

Do not model WTUS people with one role column.

Use global roles for app-wide authority, section roles for team responsibility, and temporary role coverage for short-term substitutions.

WTUS is a team, not a corporate approval ladder. Members should have agency over their own work and their section's work. Leads exist as knowledgeable point people who can oversee, help, review, and coordinate when someone needs support quickly.

Owner and operations lead should be operational peers. In normal use, they should be able to make the same broad global changes and co-run team operations. Any difference between them should be limited to rare owner-control actions, such as transferring the owner role or removing the owner account.

## Permission Matrix

The app uses a centralized permission matrix defined in `src/server/permissions.ts`. All routes use `requirePermission()` to enforce permissions consistently.

### Tasks & Comments

| Action | Owner | Ops Lead | Section Lead | Member | Scope |
|--------|-------|----------|--------------|--------|-------|
| Create task | ✅ | ✅ | ✅ | ✅ | section_scoped |
| Read tasks | ✅ | ✅ | ✅ | ✅ | section_scoped |
| Update task | ✅ | ✅ | ✅ | ✅ | section_scoped |
| Delete task | ✅ | ✅ | ✅ | ❌ | section_scoped |
| Add comment | ✅ | ✅ | ✅ | ✅ | section_scoped |

### Availability

| Action | Owner | Ops Lead | Section Lead | Member | Scope |
|--------|-------|----------|--------------|--------|-------|
| Create availability | ✅ | ✅ | ✅ | ✅ | self_only |
| Read availability | ✅ | ✅ | ✅ | ✅ | section_scoped |
| Update availability | ✅ | ✅ | ✅ | ✅ | self_only |
| Delete availability | ✅ | ✅ | ✅ | ✅ | self_only |
| Create recurring | ✅ | ✅ | ✅ | ✅ | self_only |
| Read recurring | ✅ | ✅ | ✅ | ✅ | self_only |

### Live Events & Assignments

| Action | Owner | Ops Lead | Section Lead | Member | Scope |
|--------|-------|----------|--------------|--------|-------|
| Create event | ✅ | ✅ | ❌ | ❌ | global |
| Read events | ✅ | ✅ | ✅ | ✅ | global |
| Update event | ✅ | ✅ | ❌ | ❌ | global |
| Create assignment | ✅ | ✅ | ❌ | ❌ | global |
| Update assignment | ✅ | ✅ | ❌ | ✅ | self_only |
| Delete assignment | ✅ | ✅ | ❌ | ❌ | global |

### Members, Roles & Coverage

| Action | Owner | Ops Lead | Section Lead | Member | Scope |
|--------|-------|----------|--------------|--------|-------|
| Create member | ✅ | ✅ | ❌ | ❌ | global |
| Read members | ✅ | ✅ | ✅ | ✅ | global |
| Update member | ✅ | ✅ | ❌ | ✅ | self_only |
| Create coverage | ✅ | ✅ | ❌ | ❌ | global |
| Read coverage | ✅ | ✅ | ✅ | ✅ | global |

### Special Requests

| Action | Owner | Ops Lead | Section Lead | Member | Scope |
|--------|-------|----------|--------------|--------|-------|
| Create request | ✅ | ✅ | ✅ | ✅ | global |
| Read requests | ✅ | ✅ | ✅ | ✅ | section_scoped |
| Update request | ✅ | ✅ | ✅ | ❌ | self_only |

### Discord Configuration

| Action | Owner | Ops Lead | Section Lead | Member |
|--------|-------|----------|--------------|--------|
| Read config | ✅ | ✅ | ❌ | ❌ |
| Create config | ✅ | ✅ | ❌ | ❌ |
| Update config | ✅ | ✅ | ❌ | ❌ |
| Delete config | ✅ | ✅ | ❌ | ❌ |

### Onboarding Invites

| Action | Owner | Ops Lead | Section Lead | Member |
|--------|-------|----------|--------------|--------|
| Create invite | ✅ | ✅ | ❌ | ❌ |
| Read invites | ✅ | ✅ | ❌ | ❌ |
| Update invite | ✅ | ✅ | ❌ | ❌ |

### Dashboard

| Action | Owner | Ops Lead | Section Lead | Member |
|--------|-------|----------|--------------|--------|
| Read dashboard | ✅ (full) | ✅ (full) | ✅ (section) | ✅ (limited) |

### Reminder Preferences & Work Submissions

| Action | Owner | Ops Lead | Section Lead | Member | Scope |
|--------|-------|----------|--------------|--------|-------|
| Create reminders | ✅ | ✅ | ✅ | ✅ | self_only |
| Read reminders | ✅ | ✅ | ✅ | ✅ | self_only |
| Create submissions | ✅ | ✅ | ✅ | ✅ | self_only |
| Read submissions | ✅ | ✅ | ✅ | ✅ | global |

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
- Configure Discord integration
- Create and manage onboarding invites

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
- Configure Discord integration
- Create and manage onboarding invites

### Section Lead

Section leads are the point people for their assigned sections.

Can:

- Create, update, and delete tasks in their section
- View availability for members in their section
- Create and update their own availability
- Read live events
- Read special requests in their section
- Update special requests targeted at their section members
- Read coverage assignments
- Read members

Cannot:

- Create or manage live events
- Create or manage assignments
- Create or manage coverage
- Create or manage onboarding invites
- Configure Discord integration
- Manage other members' profiles

### Member

Members can actively participate in and help shape the sections assigned to them.

Can:

- Create, update, and read tasks in their sections
- Add comments on tasks
- Create and update their own availability
- Read live events
- Update their own event assignments
- Create special requests
- Read special requests targeted at them
- Update their own profile (name, handle)
- Create their own work submissions
- Create their own reminder preferences
- Read members

Cannot:

- Delete tasks
- Create or manage live events
- Create or manage assignments
- Create or manage coverage
- Create or manage onboarding invites
- Configure Discord integration
- Update other members' profiles

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

## Permission Enforcement

All API routes use `requirePermission()` to enforce permissions. This function:

1. Authenticates the user
2. Checks if the user has the required role for the action
3. Validates scope (section membership or resource ownership)
4. Returns a 403 error if denied

Example usage:

```typescript
import { requirePermission } from "../../src/server/permissions";

export async function POST(request: Request) {
  const access = await requirePermission("tasks:create", { section: "forecasting" });
  if ("response" in access) return access.response;
  
  // User has permission, proceed with the operation
}
```

## Data Shape

A user can have:

- Zero or more global roles
- Zero or more section memberships
- Zero or more section lead roles
- Zero or more temporary coverage roles

This supports the real WTUS structure without special cases.
