# Development Process

## Two tracks

**Track A — spec-kit** (`.specify/` present): not used in this repo currently.
```
/speckit.specify   → spec.md
/speckit.clarify   → clarifications
/speckit.plan      → plan.md
/speckit.tasks     → tasks.md
/speckit.analyze   → cross-artifact check
/speckit.implement → runs tasks.md sequentially
/speckit.orchestrate → parallel sub-agents by task ID
```

**Track B — superpowers** (`.specify/` absent — **this repo's default**):
```
brainstorm → plan-in-session → TDD (RED→GREEN→REFACTOR) → review
```

---

## Git Flow

**Structure:**
```
nail-visual/
├── (main — stable baseline, no feature commits here)
└── .worktrees/
    ├── feat-some-feature/
    └── fix-some-bug/
```

**Slug** = branch name, `/` → `-`:
`feat/booking-recurring` → `feat-booking-recurring`

```bash
# create
git worktree add .worktrees/<slug> -b <branch> origin/main
# remove
git worktree remove .worktrees/<slug>
```

**Rule:** worktrees are for isolating bigger/parallel feature work — not mandatory for everything. Small fixes and routine changes can commit directly to `main` (solo project, no protected-branch policy). Use a worktree/branch when: work is large, risky, or needs to run alongside other in-flight work.

Deploy: Vercel, `pnpm build` (Turbopack), `outputDirectory: .next` (vercel.json).

---

## Code Intelligence — tool priority

### Tier 1 — semantic (always first)

| Task | Tool |
|------|------|
| Understand how something works | **graphify** first (no graph built yet — run `graphify` skill to build `graphify-out/`) |
| Find symbol/function | `mcp__serena__find_symbol` |
| All callers of a function (type-aware) | `mcp__serena__find_referencing_symbols` |
| File structure without reading | `mcp__serena__get_symbols_overview` |
| Replace function body | `mcp__serena__replace_symbol_body` |
| Insert before/after symbol | `mcp__serena__insert_before/after_symbol` |
| TS diagnostics | `mcp__serena__get_diagnostics_for_file` |
| Rename symbol | `mcp__serena__rename_symbol` |
| Project notes (persist) | `mcp__serena__write/read/list_memories` |

### Tier 2 — fallback

- `Read` — full file (non-code / yaml / md / json / known path)
- `Grep` — search strings/comments
- `Glob` — file discovery when Serena can't

**Rule:** "how does X work / what touches Y" → graphify FIRST, before Read/Grep/Serena.

---

## Graphify

Persistent code graph at `graphify-out/graph.json`. Not yet built for this repo — first use runs onboarding.

```bash
graphify query "how does booking creation work"
graphify query "where is auth session validated"
```

Single repo here (no multi-repo merge needed, unlike simplx).

---

## Stack

Next.js 15.5.14 (App Router, Turbopack) · React 19 · TypeScript · drizzle-orm + postgres · next-auth v4 · next-intl (i18n) · uploadthing (file uploads) · tanstack-query · posthog-js (analytics) · konsta (mobile UI) · tailwind v4 · zod v4 · react-hook-form.

---

## Plugins

| Plugin | Provides |
|--------|---------|
| `superpowers@5.1.0` | brainstorming, TDD, git-worktrees, code-review, verification, parallel-agents |
| `ecc@2.0.0` | ~150+ agents/skills: react, security, e2e, performance, etc. |
| `caveman@latest` | caveman mode + cavecrew-builder/investigator/reviewer |
| `frontend-design@official` | UI/UX — frontend-design, tailwind, shadcn |
| `code-review@official` | `/code-review` diff review (low/medium/high) |
| `github@official` | GitHub ops |

---

## Key agents

### Research
- `Explore` — fast read-only search, files and symbols
- `caveman:cavecrew-investigator` — same, compressed output (~60% fewer tokens)
- `code-explorer` — deep analysis: execution paths, architecture layers

### React / TypeScript
- `react-build-resolver` / `ecc:react-build-resolver` — fixes build
- `react-reviewer` / `ecc:react-reviewer` — React review
- `typescript-reviewer` / `ecc:typescript-reviewer` — TS review
- `build-error-resolver` — build/type errors

### Small edits
- `caveman:cavecrew-builder` — surgical 1-2 file edits, refuses 3+ file scope

### Planning
- `code-architect` — feature architecture from repo patterns
- `Plan` — implementation plan with trade-offs

### Quality
- `ecc:security-reviewer` / `security-review` skill — security check after edits
- `code-reviewer` / `ecc:code-reviewer` — review after any change
- `silent-failure-hunter` — swallowed errors, bad fallbacks
- `pr-test-analyzer` — test coverage review on PRs

---

## Testing

- `tests/e2e-reference-offer.spec.ts` — Playwright e2e (only test file present — coverage is thin, expand before relying on it as a gate).
- No CI config found under `.github/workflows` at last check — verify before assuming tests run on PR.

---

## Hooks (automation, machine-wide via dotclaude)

| Hook | Event | Does |
|------|-------|------|
| `flow-gate.sh` | PreToolUse | Blocks Grep/Read before graphify (block mode only — currently `off` for this machine) |
| `graphify-first-reminder.sh` | PreToolUse(Read/Grep) | Reminds graphify first |
| `pre-commit-branch-guard.sh` | PreToolUse | Blocks direct commits to main |
| `pre-push-guard.sh` | PreToolUse | Blocks push to protected branches |
| `post-merge-graphify.sh` | PostToolUse | Rebuilds graph after merge |
| `telemetry-log.sh` | Pre/PostToolUse | Logs to `~/.claude/logs/tool-usage/YYYY-MM-DD.jsonl` |
| `instinct-distill.sh` | Stop/SessionEnd | Distills instincts from session |
| `reap-orphans.sh` | SessionStart | Kills orphaned MCP processes |
| `session-context.sh` | SessionStart | Injects cwd/branch/date into context |

Check current flow gate mode: `dotclaude flow status` (`~/.config/dotclaude/flow.conf`).

---

## MCP servers available

serena (LSP), playwright (browser), chrome-devtools, ssh-mcp, mem0, context7 (docs), shadcn (UI components), sequential-thinking.

---

## Memory

### mem0 (persistent)
- Metadata: `{"project": "nail-visual", "type": "decision|bug|pattern|context|feedback", "date": "YYYY-MM-DD"}`
- Searched at session start, saved at session end.

### File memory
- `~/.claude/projects/-Users-al-nail-visual/memory/MEMORY.md` — index
- Individual `.md` files per topic (architecture, perf findings, security findings, etc.)

---

## Caveman Mode

Levels: `lite` / `full` / `ultra`
```
/caveman lite|full|ultra   — switch level
stop caveman               — disable
normal mode                — disable
```

---

## Typical task flow

```
1. graphify query "how the task's area works" (build graph first time)
2. serena: find_symbol / find_referencing_symbols to navigate
3. (optional, for large/risky/parallel work) git worktree add .worktrees/<slug> -b <branch> origin/main
4. Implement:
   - small → cavecrew-builder
   - large → Plan → subagent-driven-development / TDD
5. code-reviewer + react-reviewer + typescript-reviewer after edits
6. Run: pnpm lint, pnpm build, existing e2e test
7. git commit -m "fix(scope): message" (direct to main OK for routine work; PR only for the worktree case above)
```
