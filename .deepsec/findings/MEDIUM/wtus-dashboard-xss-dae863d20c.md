# [MEDIUM] Unsafe HTML rendering with user-controlled font data

**File:** [`app/layout.tsx`](https://github.com/WeatherTrackUS/wtus-dashboard/blob/feat/runtime-validation-api-error-contracts/blob/feat/app/layout.tsx#L27-L43) (lines 27, 43)
**Project:** wtus-dashboard
**Severity:** MEDIUM  •  **Confidence:** medium  •  **Slug:** `xss`

## Owners

**Suggested assignee:** `alex.miller.6464@gmail.com` _(via last-committer)_

## Finding

The layout.tsx file uses Next.js font APIs with configuration that includes user-controlled data. While Next.js font APIs themselves are generally safe, the template literal embedding of CSS custom properties could potentially be exploited if font variables were influenced by user input. The file also contains a <script> tag injecting font data from server-side metadata. Although Next.js typically handles this safely, the use of template literals without explicit sanitization of font configuration data represents a potential XSS vector if the font data flow included user input.

## Recommendation

Implement additional sanitization of font configuration data, consider using static font imports instead of dynamic configuration, and ensure font variable injection uses validated, trusted data only.

## Recent committers (`git log`)

- Alex Miller <alex.miller.6464@gmail.com> (2026-06-09)
