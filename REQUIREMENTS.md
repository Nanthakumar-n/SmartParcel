# SmartParcel — Requirements & Environment Setup

## Overview
This file documents the exact tool versions required to build and run SmartParcel.
Run the installation scripts in order. Every agent working on this project should verify these requirements before generating setup commands.

---

## 1. Required Tool Versions

### Core (v1 — Web Admin)

| Tool | Minimum Version | Recommended Version | Notes |
|---|---|---|---|
| **Node.js** | 20.0.0 | **20.20.2 LTS** ✅ | Installed via nvm. Pin: `.nvmrc` = `20` |
| **npm** | 10.0.0 | 10.8.2 ✅ | Comes with Node v20 |
| **nvm** | 0.40.0 | 0.40.1 ✅ | Manages Node versions |
| **Git** | 2.39.0 | 2.39.5 ✅ | System install |
| **Homebrew** | 4.0.0 | 6.0.17 ✅ | System install |
| **Supabase CLI** | 2.0.0 | **2.114.0** ✅ | Binary at `~/.local/bin/supabase` — Homebrew blocked by Xcode version |
| **Docker Desktop** | 4.0.0 | **Latest** ✅ | Installed at `/Applications/Docker.app` — **must be opened and started before `supabase start`** |
| **Vercel CLI** | 37.0.0 | **58.10.0** ✅ | Installed via npm globally |

### Next.js Project Dependencies

| Package | Version | Notes |
|---|---|---|
| `next` | `14.2.x` | App Router — do NOT use v15 yet |
| `react` | `18.3.x` | Peer dep of Next 14 |
| `react-dom` | `18.3.x` | |
| `typescript` | `5.x` | Strict mode enabled |
| `@supabase/supabase-js` | `2.x` | Main Supabase client |
| `@supabase/ssr` | `0.5.x` | Next.js SSR Supabase client |
| `@supabase/auth-helpers-nextjs` | ❌ | **Deprecated** — use `@supabase/ssr` instead |
| `zod` | `3.x` | Runtime validation |
| `react-hook-form` | `7.x` | Form state management |
| `@hookform/resolvers` | `3.x` | Connects zod to react-hook-form |
| `tailwindcss` | `3.x` | Do NOT use v4 — shadcn/ui not compatible yet |
| `@shadcn/ui` | Via CLI | Install components individually via `npx shadcn@latest add` |
| `lucide-react` | `0.x` | Icons |
| `@react-pdf/renderer` | `3.x` | PDF generation for LR |
| `@sentry/nextjs` | `8.x` | Error monitoring |
| `sonner` | `1.x` | Toast notifications |

### Supabase Project Dependencies (Dev)

| Tool | Version | Notes |
|---|---|---|
| `supabase` (CLI) | Latest | Schema migrations, type generation |
| Docker Desktop | Latest | Runs local Supabase stack |

### Mobile (v2 — Flutter App)

| Tool | Minimum Version | Recommended Version | Notes |
|---|---|---|---|
| **Flutter** | 3.27.x | **Latest stable** | 3.27.2 installed ✅ — run `flutter upgrade` before v2 work |
| **Dart** | 3.6.x | 3.6.1 | 3.6.1 installed ✅ — comes with Flutter |
| **Xcode** | 16.x | 16.2 | 16.2 installed ✅ |
| **CocoaPods** | 1.15.x | 1.16.2 | 1.16.2 installed ✅ |
| **Android Studio** | Latest | Latest | ❌ Not installed — defer to v2 |
| **Android SDK** | API 33+ | API 35 | ❌ Not installed — defer to v2 |
| **Java / JDK** | 17 | **17 LTS** | ❌ Not installed — defer to v2 |

### Flutter Pub Dependencies (v2)

| Package | Version | Notes |
|---|---|---|
| `supabase_flutter` | `2.x` | Supabase client for Flutter |
| `flutter_riverpod` | `2.x` | State management |
| `hive` | `2.x` | Offline local storage |
| `hive_flutter` | `1.x` | Hive Flutter adapter |
| `hive_generator` | `2.x` | Code generation for Hive models |
| `build_runner` | `2.x` | Code generation runner |
| `geolocator` | `13.x` | GPS location |
| `connectivity_plus` | `6.x` | Network state detection |
| `mobile_scanner` | `5.x` | QR code scanning |
| `path_provider` | `2.x` | File paths |

---

## 2. Installation Scripts

### Step 1 — Install nvm + Node.js v20 LTS

```bash
# Install nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Reload shell
source ~/.zshrc

# Install and use Node.js v20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version   # should print v20.x.x
npm --version    # should print 10.x.x
```

> ⚠️ Your machine currently has Node v23.11.0. After installing nvm and switching to v20, your shell will use v20. v23 remains installed but inactive.

---

### Step 2 — Install Docker Desktop

```bash
# Download Docker Desktop for Mac (Apple Silicon)
# Visit: https://docs.docker.com/desktop/install/mac-install/
# Or install via Homebrew:
brew install --cask docker

# After installing, open Docker Desktop from Applications and start it.
# Verify:
docker --version
docker ps  # should return empty list (not an error)
```

> Docker Desktop must be **running** before you can use `supabase start`.

---

### Step 3 — Install Supabase CLI

```bash
# Install via Homebrew (recommended on macOS)
brew install supabase/tap/supabase

# Verify
supabase --version   # should print 2.x.x

# Login to Supabase (requires Supabase account)
supabase login
```

---

### Step 4 — Install Vercel CLI

```bash
npm install -g vercel@latest

# Verify
vercel --version

# Login (requires Vercel account)
vercel login
```

---

### Step 5 — Create a .nvmrc for the Project

```bash
# In the SmartParcel project root, lock Node version:
echo "20" > /Users/nantha/Documents/Projects/SmartParcel/.nvmrc
```

Any agent or developer running `nvm use` in the project directory will automatically switch to v20.

---

### Step 6 — Flutter Upgrade (Before v2 Work)

```bash
flutter upgrade
flutter doctor  # verify all green for iOS
```

---

### Step 7 — Android Setup (Before v2 Work Only)

```bash
# 1. Download Android Studio from https://developer.android.com/studio
brew install --cask android-studio

# 2. Open Android Studio → Install SDK → API 35

# 3. Install Java 17 LTS
brew install openjdk@17
sudo ln -sfn /opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

# 4. Set JAVA_HOME in ~/.zshrc
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
source ~/.zshrc

# 5. Accept Android licenses
flutter doctor --android-licenses

# 6. Verify
flutter doctor  # all green
```

---

## 3. Verification Checklist

Run this before starting any coding session:

```bash
node --version          # v20.x.x
npm --version           # 10.x.x
supabase --version      # 2.x.x
docker --version        # 4.x.x or 5.x.x
docker ps               # running (no error)
vercel --version        # 37.x.x or higher
git --version           # 2.39.x
flutter --version       # 3.27.x (stable)
```

---

## 4. Agent Rules (Do Not Violate)

The following rules are locked for all agents generating setup commands for SmartParcel:

1. **Always use Node v20 LTS** — not v22 or v23. If a command requires specifying a Node version, use `20`.
2. **Always use Next.js 14.2.x** — not Next.js 15 (shadcn/ui + Supabase SSR compatibility not confirmed on v15).
3. **Always use `@supabase/ssr`** — never `@supabase/auth-helpers-nextjs` (deprecated).
4. **Always use Tailwind CSS v3.x** — not v4 (shadcn/ui does not support v4 yet).
5. **Never run `supabase start` without Docker running** — it will fail silently.
6. **Never install `@shadcn/ui` as a package** — use `npx shadcn@latest init` and `npx shadcn@latest add <component>`.
7. **Never generate Android/Java/Kotlin code in v1** — Flutter app is deferred to v2.
8. **Always pin Supabase CLI to Homebrew tap** (`brew install supabase/tap/supabase`) — not npm global.
