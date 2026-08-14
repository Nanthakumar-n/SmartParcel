---
name: automated-ui-verification
description: Automated verification protocol using the browser sub-agent to capture screenshots and recordings of UI features. Use when verifying completed frontend features, dashboard pages, or UI responsiveness before marking a task complete.
---
# Automated Verification via Artifacts

## Core Rule
Every frontend feature or dashboard page must be visually verified using the browser sub-agent before marking the task complete. Do not rely solely on code review — capture evidence.

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

## Instructions

### When to Trigger
Activate this skill after completing any of the following:
- A new dashboard page or route.
- A form component (e.g., Lorry Receipt creation, vehicle input).
- A data table or list view.
- Any layout or responsive design change.

### Verification Steps

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Spin up the browser sub-agent** using the `browser_subagent` tool with clear, finite instructions:
   - Navigate to the target page URL (e.g., `http://localhost:3000/dashboard`).
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
1. Viewport: Set to desktop 1440x900 and capture screenshot.
2. Viewport: Set to mobile 375x812 and capture screenshot.
3. Perform the requested interaction (e.g. fill form and submit).
4. FAIL-FAST RULE: If any error message appears or submission fails, retry at most 2 times. If it fails on the 2nd try, stop immediately, take a screenshot of the error, and return the error text. Do not continue trying.
5. On success: verify expected destination page elements and return confirmation.
```
