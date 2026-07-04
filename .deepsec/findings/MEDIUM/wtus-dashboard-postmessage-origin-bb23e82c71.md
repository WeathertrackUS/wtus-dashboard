# [MEDIUM] postMessage handler lacks origin validation, and all outbound postMessage calls use wildcard target origin

**File:** [`design-export/tweaks-panel.jsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/design-export/tweaks-panel.jsx#L171-L233) (lines 171, 222, 223, 224, 225, 226, 228, 233)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** high  •  **Slug:** `postmessage-origin`

## Finding

The TweaksPanel component registers a window 'message' event listener (line 222) that accepts __activate_edit_mode and __deactivate_edit_mode messages from ANY origin without checking e.origin. Additionally, all three window.parent.postMessage() calls (lines 171, 228, 233) use '*' as the target origin, broadcasting to any parent frame. An attacker who embeds this page in an iframe on a malicious site could: (1) toggle the edit panel open/closed remotely, (2) receive all tweak values (design preferences) via the __edit_mode_set_keys message. While the current data is non-sensitive design preferences (colors, font sizes), the pattern is insecure — if the component is reused in a context with sensitive data in the edits object, it becomes an exfiltration vector. The wildcard target origin also means the __edit_mode_available announcement is sent to any embedding page, revealing the component's capabilities.

## Recommendation

1. Add e.origin validation in the message handler: check that e.origin matches the expected design tool host origin before processing messages. 2. Replace '*' in all postMessage() calls with the specific expected origin of the parent frame (e.g., window.parent.postMessage({...}, 'https://design-tool.example.com')). If the host origin varies, maintain a short allowlist and validate against it. 3. Use a MessageChannel for the parent-child communication channel instead of postMessage with '*', which provides a cryptographically-bound 1:1 channel.
