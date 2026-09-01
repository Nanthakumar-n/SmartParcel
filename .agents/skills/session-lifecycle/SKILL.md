---
name: session-lifecycle
description: Protocols for starting and winding down a development session. Use when beginning a coding session to prepare the environment and services, or when ending a session to run quality checks, update PROGRESS.md, commit code, and stop background services.
---
# Session Lifecycle Protocol (Start & Wind Down)

This skill defines the standard procedure for opening and closing a SmartParcel development session. Follow these instructions methodically to ensure consistency, clean git history, and reliable service management.

---

## ☀️ Part 1: Start of Session (Kickoff)

Execute these steps at the beginning of every session before writing any feature code:

### 1. Context & Scope Alignment
- [ ] Read `CONTEXT.md` in the workspace root (architecture, domain, v1 MVP constraints).
- [ ] Read `.agents/AGENTS.md` (mandatory rules, versions, skills).
- [ ] Read `PROGRESS.md` to identify current status, recent achievements, and the next build queue items.

### 2. Environment Verification
- [ ] Verify Node.js version:
  ```bash
  node -v # Must be v20.x LTS (never v22 or v23)
  ```
- [ ] Verify Docker engine is running:
  ```bash
  docker info > /dev/null 2>&1 || open /Applications/Docker.app
  ```

### 3. Service Initialization & Cache Hygiene
- [ ] Start Supabase local development stack:
  ```bash
  supabase start
  ```
  *(Verifies Postgres, GoTrue Auth, PostgREST, and Storage containers are running).*
- [ ] Verify `.env.local` contains valid local Supabase credentials (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- [ ] **Cache Hygiene & Stale Chunk Recovery**: If Next.js throws chunk resolution errors (e.g. `MODULE_NOT_FOUND` in `.next/server/vendor-chunks/`), purge `.next` before starting dev server:
  ```bash
  rm -rf .next
  ```
- [ ] Start Next.js development server (in background):
  ```bash
  npm run dev
  ```
  *(Verify response at `http://localhost:3000`).*

### 4. Development Database Seeding
- [ ] Prepare test data and ensure demo records & logins exist:
  ```bash
  npm run db:seed:append # Appends fresh demo records while preserving existing database state
  ```
  *(Use `npm run db:seed` for a full clean reset, or `npm run db:seed:ops` for operational queues only).*

### 5. Git Alignment
- [ ] Check repository status:
  ```bash
  git status
  ```
  *(Ensure working tree is clean and on branch `main`).*

---

## 🌙 Part 2: End of Session (Wind Down)

Execute these steps at the end of every session before closing down:

### 1. Code Quality & Build Verification Gate
Run all 3 verification checks — all must pass with **0 errors**:
- [ ] **Lint Check**:
  ```bash
  npm run lint
  ```
  *(Must exit with 0 errors and 0 warnings).*
- [ ] **TypeScript Compilation**:
  ```bash
  npx tsc --noEmit
  ```
  *(Must compile with 0 type errors).*
- [ ] **Next.js Production Build**:
  ```bash
  npm run build
  ```
  *(Must build optimized production bundle successfully).*

### 2. Git Commit
- [ ] Stage all modified and new files:
  ```bash
  git add .
  ```
- [ ] Commit using Conventional Commits format (`type(scope): description`):
  ```bash
  git commit -m "feat(scope): descriptive summary of changes"
  ```

### 3. Update Documentation & Handoff (`PROGRESS.md`)
- [ ] Update `PROGRESS.md` with:
  - Check off all completed items under the current phase.
  - Summarize newly completed features under the session's date.
  - Update `## Current Status` with the exact state (e.g. 🟢 Foundation & Auth Complete).
  - Update `## 🔲 Up Next — Session N Build Queue` with prioritized next steps.
  - Update `## How to Start Next Session` with a clean, copy-pasteable prompt for the next agent.
- [ ] Commit the updated `PROGRESS.md`:
  ```bash
  git add PROGRESS.md && git commit -m "docs: update progress and session handoff"
  ```

### 4. Clean Service Shutdown
Stop all background processes to free RAM, CPU, and preserve battery:
- [ ] Stop Next.js dev server background task(s).
- [ ] Stop local Supabase containers (safely persists all database data and schemas):
  ```bash
  supabase stop
  ```
- [ ] Verify working tree is clean:
  ```bash
  git status
  ```
- [ ] Present a concise, structured handoff summary to the user.
