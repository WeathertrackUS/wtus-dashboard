# [MEDIUM] postMessage handler lacks origin validation; outbound messages use wildcard target origin

**File:** [`public/hub/tweaks-panel.jsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/public/hub/tweaks-panel.jsx#L171-L231) (lines 171, 222, 224, 225, 231)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `other-postmessage-missing-origin-check`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The TweaksPanel component at line 222-226 registers a window 'message' event listener that processes inbound postMessage events without checking `e.origin`. Any page, iframe, or script that holds a reference to this window can send `{ type: '__activate_edit_mode' }` or `{ type: '__deactivate_edit_mode' }` messages to toggle the panel's visibility. Additionally, all three outbound postMessage calls (lines 171, 225, 231) use `'*'` as the target origin, meaning tweak data (edits object containing accent colors, layout booleans) is sent to any parent frame regardless of origin. If this page is embedded as an iframe in a third-party context, the wildcard target origin leaks the edits payload to that parent. While the current data is non-sensitive UI preferences (accent color, density toggle, command-hint toggle), the pattern is dangerous — any future reuse of this protocol with sensitive data (auth state, user identity) would immediately become a HIGH credential/data leak. Inbound: an attacker page holding a reference to the iframe can send postMessage to open/close the panel and display the TweaksPanel chrome over the app.

## Recommendation

1) Add origin validation to the inbound message handler: check `e.origin` against an allowlist (e.g., `if (e.origin !== 'https://expected-editor-origin.com') return;`) before processing the message. 2) Replace the wildcard `'*'` target origin on all three `window.parent.postMessage(...)` calls with an explicit origin (e.g., `window.parent.postMessage({...}, 'https://expected-editor-origin.com')`). 3) Document the expected embedding context so future maintainers don't reuse this protocol unsafely.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
