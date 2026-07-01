# Data Model

This is the recommended first schema. It is intentionally small.

## Users

Represents WTUS members.

Fields:

- `id`
- `name`
- `handle`
- `email`
- `avatar_url`
- `discord_user_id`
- `discord_handle`
- `discord_server_verified`
- `onboarding_status`
- `status`
- `created_at`
- `updated_at`

Notes:

- `status` can be `active`, `inactive`, or `invited`.
- Auth-specific fields may live in separate auth tables depending on the auth library.
- Member team preferences should be editable by the member from account settings.
- Lead assignments should stay separate from member team preferences.

## Global Roles

Represents app-wide authority.

Fields:

- `id`
- `key`
- `name`

Initial values:

- `owner`
- `operations_lead`
- `member`

## User Global Roles

Join table between users and global roles.

Fields:

- `user_id`
- `role_id`

## Sections

Represents WTUS operational sections.

Fields:

- `id`
- `key`
- `name`
- `description`
- `created_at`
- `updated_at`

Initial values:

- `finance`
- `forecasting`
- `nowcasting`
- `youtube`
- `graphics`
- `facebook`
- `development`
- `verification`

## Section Memberships

Represents each user's role inside a section.

Fields:

- `id`
- `user_id`
- `section_id`
- `role`
- `created_at`
- `updated_at`

`role` values:

- `lead`
- `member`

## Temporary Role Coverages

Represents short-term role coverage without changing permanent roles.

Fields:

- `id`
- `assignee_user_id`
- `covered_user_id`
- `global_role_id`
- `section_id`
- `live_event_id`
- `coverage_role`
- `reason`
- `starts_at`
- `ends_at`
- `status`
- `created_by_id`
- `created_at`
- `updated_at`

Initial statuses:

- `scheduled`
- `active`
- `ended`
- `cancelled`

Notes:

- Use `covered_user_id` when someone is filling in for a specific person.
- Use `global_role_id`, `section_id`, or `live_event_id` to define the scope.
- Temporary coverage should not mutate permanent global roles or section memberships.
- Permissions from temporary coverage should apply only during the active time window.

## Tasks

Represents operational work.

Fields:

- `id`
- `title`
- `description`
- `section_id`
- `status`
- `priority`
- `assignee_id`
- `created_by_id`
- `due_at`
- `created_at`
- `updated_at`
- `completed_at`

Initial statuses:

- `todo`
- `in_progress`
- `blocked`
- `review`
- `done`

Initial priorities:

- `low`
- `normal`
- `high`
- `urgent`

## Task Comments

Represents discussion and updates on a task.

Fields:

- `id`
- `task_id`
- `user_id`
- `body`
- `created_at`
- `updated_at`

## Availability Windows

Represents when a member is available to help with live event coverage or other operational work.

Fields:

- `id`
- `event_name`
- `user_id`
- `section_id`
- `help_role`
- `starts_at`
- `ends_at`
- `status`
- `notes`
- `created_at`
- `updated_at`

Initial statuses:

- `available`
- `maybe`
- `unavailable`

Notes:

- `event_name` can be blank for general availability.
- `section_id` can be blank if the member can help anywhere.
- `help_role` can describe what the member can do, such as graphics, nowcasting, YouTube support, verification, or general event help.

## Availability Updates

Represents optional notes or changes attached to an availability window.

Fields:

- `id`
- `availability_window_id`
- `user_id`
- `body`
- `created_at`
- `updated_at`

## Live Events

Represents an active or upcoming WTUS coverage event.

Fields:

- `id`
- `name`
- `description`
- `status`
- `starts_at`
- `ends_at`
- `created_by_id`
- `created_at`
- `updated_at`

Initial statuses:

- `planned`
- `active`
- `paused`
- `ended`
- `cancelled`

## Live Event Roles

Represents temporary roles for a specific live event.

Fields:

- `id`
- `live_event_id`
- `name`
- `description`
- `created_at`
- `updated_at`

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

## Live Event Assignments

Represents what a member is doing for one live event.

Fields:

- `id`
- `live_event_id`
- `user_id`
- `live_event_role_id`
- `section_id`
- `region`
- `platform`
- `status`
- `notes`
- `assigned_by_id`
- `created_at`
- `updated_at`

Initial statuses:

- `assigned`
- `active`
- `paused`
- `done`

Notes:

- Event assignments are temporary and do not change permanent section memberships.
- `section_id`, `region`, and `platform` are optional so the event lead can keep assignments lightweight.

## Live Event Tasks

Connects existing tasks to a live event.

Fields:

- `live_event_id`
- `task_id`

## Discord Accounts

Links Discord users to dashboard users.

Fields:

- `id`
- `user_id`
- `discord_user_id`
- `discord_username`
- `created_at`
- `updated_at`

Notes:

- `discord_user_id` should be unique.
- Dashboard users remain the source of truth for roles and permissions.

## Onboarding

Discord server membership verification is the primary onboarding gate. Verified Discord users can complete dashboard onboarding directly after sign-in.

Owner and operations leads can also create optional invite links as a backup path. When an invite token is supplied, it must be open and is consumed atomically on completion.

During onboarding, self-selected teams always receive the **member** section role. Lead promotion is operator-only via member management APIs.

## Onboarding Invites

Optional invite links created by the owner or operations lead.

Fields:

- `id`
- `token`
- `label`
- `created_by_user_id`
- `created_at`
- `status`
- `used_by_user_id`
- `used_at`

Notes:

- Tokens are single-use when supplied during onboarding.
- Disabled or used tokens must not allow onboarding via the invite path.
- Discord server membership verification is required before any onboarding completes.

## Discord Alert Channels

Stores Discord channels used for dashboard alerts.

Fields:

- `id`
- `guild_id`
- `channel_id`
- `section_id`
- `alert_type`
- `created_at`
- `updated_at`

## Future Tables

Add later only when needed:

- Notifications
- Attachments
- Audit log
- Temporary role coverage history
- Discord integration events
- Calendar sync records
