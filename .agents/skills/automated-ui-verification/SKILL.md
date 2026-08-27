---
name: automated-ui-verification
description: Automated verification protocol using the browser sub-agent to capture screenshots and recordings of UI features. Use when verifying completed frontend features, dashboard pages, or UI responsiveness before marking a task complete.
---
# Automated Verification via Artifacts

## Core Rule
Every frontend feature or dashboard page must be visually verified using the browser sub-agent before marking the task complete. Do not rely solely on code review — capture evidence.

---

## 🧹 Dev Server Lifecycle & Cache Conflict Prevention (Critical)

In Next.js, running `npm run build` overwrites the `.next/` directory with production chunk manifests. Running `npm run dev` concurrently or immediately afterwards without a clean cache reset causes webpack hot-reloading chunk collisions, leading to **404 errors on development stylesheets** (`_next/static/css/app/layout.css`) and unstyled HTML.

### Safe Dev Server Launch Protocol:
1. **Ensure Port 3000 is Dedicated**:
   ```bash
   kill -9 $(lsof -ti :3000) 2>/dev/null || true
   ```
2. **Flush Build Cache (if `npm run build` was run earlier)**:
   ```bash
   rm -rf .next
   ```
3. **Start Dev Server in Background**:
   ```bash
   npm run dev
   ```
4. **Health Check Before Browser Navigation**:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
   # Ensure it returns 200 OK
   ```

### Immediate Auto-Remediation on Broken/Unstyled UI:
If the browser sub-agent captures unstyled HTML or encounters a `404` for `layout.css`:
- **Stop**: Do not attempt repetitive form submissions.
- **Remediate**: Kill node on port 3000 → `rm -rf .next` → restart `npm run dev`.
- **Rerun**: Re-execute the browser verification pass.

---

## ⚠️ Anti-Looping & Error Handling Protocol (Critical)

To prevent the browser subagent from getting stuck in repetitive retry loops when an error occurs:

1. **Max 2 Retries Rule**:
   - If an action (e.g. form submission, page load, button click) fails or displays a validation/server error, the browser subagent may retry the action **at most 2 times**.
   - **Never loop repeatedly** on failing submissions or missing elements.

2. **Immediate Escalation on Failure**:
   - If the operation still fails after the 2nd attempt, the browser subagent **must stop immediately**.
   - Capture a screenshot of the error state and read the browser console logs / page error message.
   - Return the exact error details and screenshot path to the parent agent.

3. **Parent Agent Resolution**:
   - The parent agent reviews the returned error, inspects backend logs/code, fixes the root cause, and only then initiates a fresh verification pass.

---

## 🚫 Sub-Agent Tool & Sandbox Boundaries (Strict Rule)

The browser subagent runs inside an isolated browser sandbox with restricted tool capabilities:

1. **Browser Tools ONLY**:
   - Use exclusively: `open_browser_url`, `click_browser_pixel`, `type_browser_text`, `browser_get_dom`, `capture_browser_screenshot`, `browser_press_key`, and `wait`.
2. **NO Filesystem Tools**:
   - Never invoke `view_file`, `replace_file_content`, `write_to_file`, or attempt to create/read scratchpads (`scratchpad.md`, `scratchpad.json`). Filesystem operations outside the browser sandbox will fail and trigger error cascades.
3. **Linear, Single-Pass Instructions**:
   - Keep task descriptions linear and step-by-step.
   - Explicitly instruct the subagent: *"Do not attempt to read local files. Perform the browser action, capture the screenshot, and terminate immediately."*

---

## Instructions

### When to Trigger
Activate this skill after completing any of the following:
- A new dashboard page or route.
- A form component (e.g., Lorry Receipt creation, vehicle input).
- A data table or list view.
- Any layout or responsive design change.

### Verification Steps

1. **Prepare the dev server** following the *Safe Dev Server Launch Protocol* above.

2. **Spin up the browser sub-agent** using the `browser_subagent` tool with clear, finite instructions:
   - Navigate to the target page URL (e.g., `http://localhost:3000/dashboard`).
   - **Verify CSS integrity**: Confirm styles, colors, and layout are rendered (not unstyled HTML).
   - **Include sandbox boundaries**: Instruct the subagent to use only browser interaction tools and avoid filesystem tools.
   - Capture a **desktop screenshot** at viewport `1440 x 900`.
   - Resize to **mobile viewport** `375 x 812` and capture another screenshot.
   - Interact with key UI elements (open forms, fill fields, submit).
   - **Enforce the 2-attempt rule**: If submission fails twice, stop immediately and return the error message and screenshot.
   - Record the session as a `.webp` video artifact.

3. **Embed artifacts** into the task walkthrough:
   - Desktop screenshot.
   - Mobile screenshot.
   - Session recording (if interactions were performed).

4. **Verify the following checklist** from the screenshots/recording:

   #### Style & CSS Integrity
   - [ ] Tailwind CSS loaded cleanly (no unstyled plain HTML, no 404 on `layout.css`).
   - [ ] Typography, badges, card borders, and brand colors render with correct visual hierarchy.

   #### Layout & Responsiveness
   - [ ] No horizontal scroll on mobile (`375px` width).
   - [ ] Navigation/sidebar collapses correctly on mobile.
   - [ ] Tables reflow or scroll horizontally on small screens.
   - [ ] Text is legible (no overflow or clipping).

   #### Form Validation (if applicable)
   - [ ] Invalid Indian phone numbers are rejected.
   - [ ] Invalid vehicle numbers are rejected.
   - [ ] Empty required fields show error states.
   - [ ] INR amounts display with correct `₹` symbol and Indian comma format.

   #### Multi-Tenant Isolation (if applicable)
   - [ ] Data shown belongs to the authenticated tenant only.
   - [ ] No cross-tenant data leakage visible in lists or tables.

5. **Only mark the task complete** after all checklist items pass and artifacts are embedded in the walkthrough.

---

### Standard Browser Sub-Agent Task Prompt Template
```
Navigate to http://localhost:3000/<page>.
1. Verify CSS & styling: Ensure the page is styled with Tailwind CSS (not raw unstyled HTML).
2. Tool constraint: Use ONLY browser tools (open_browser_url, click_browser_pixel, type_browser_text, browser_get_dom, capture_browser_screenshot). NEVER attempt filesystem operations or scratchpad files.
3. Viewport: Set to desktop 1440x900 and capture screenshot.
4. Viewport: Set to mobile 375x812 and capture screenshot.
5. Perform the requested interaction (e.g. fill form and submit).
6. FAIL-FAST RULE: If any error message appears or submission fails, retry at most 2 times. If it fails on the 2nd try, stop immediately, take a screenshot of the error, and return the error text. Do not continue trying.
7. On success: capture screenshot and finish immediately.
```
