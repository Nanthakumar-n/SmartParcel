---
name: automated-ui-verification
description: Automated verification protocol using the browser sub-agent to capture screenshots and recordings of UI features. Use when verifying completed frontend features, dashboard pages, or UI responsiveness before marking a task complete.
---
# Automated Verification via Artifacts

## Core Rule
Every frontend feature or dashboard page must be visually verified using the browser sub-agent before marking the task complete. Do not rely solely on code review — capture evidence.

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

2. **Spin up the browser sub-agent** using the `browser_subagent` tool with the following task:
   - Navigate to the target page URL (e.g., `http://localhost:3000/dashboard`).
   - Capture a **desktop screenshot** at viewport `1440 x 900`.
   - Resize to **mobile viewport** `375 x 812` and capture another screenshot.
   - Interact with key UI elements (open forms, click buttons, trigger validation).
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

### Example Browser Sub-Agent Task Template
```
Navigate to http://localhost:3000/<page>.
1. Capture a screenshot at desktop viewport 1440x900.
2. Resize to mobile viewport 375x812 and capture another screenshot.
3. Click the primary CTA button and capture the result.
4. Record the full session.
Return: screenshots, recording path, and any layout issues observed.
```
