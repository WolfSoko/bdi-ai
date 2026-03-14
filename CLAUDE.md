# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BDI (Belief-Desire-Intention) Rational Agent Framework powered by Claude. A TypeScript monorepo implementing the classic BDI agent model where Claude LLM handles three core reasoning tasks: belief revision, goal deliberation, and plan selection.

## Commands

```bash
npm install                          # Install all workspace dependencies
npm run build                        # Build all packages (nx run-many -t build)
npm run test                         # Run all tests (nx run-many -t test)
npm run dev                          # Run examples (nx run @bdi-ai/examples:dev)
npx nx run @bdi-ai/components:test   # Run tests for a single package
npx vitest run path/to/test.ts       # Run a single test file
```

Tests use **vitest**. Build orchestration uses **Nx** with caching enabled.

## Architecture

### Package Dependency Graph

```
@bdi-ai/examples → @bdi-ai/agent → @bdi-ai/components → @bdi-ai/persistence
                                  → @bdi-ai/llm           ↓
                                                      @bdi-ai/models (shared types)
```

### Package Responsibilities

- **models** — Pure TypeScript interfaces: `Belief`, `Goal`, `Plan`, `PlanStep`, `Intention`, `ActionResult`, `Perception`. No runtime dependencies.
- **persistence** — SQLite storage layer (`node:sqlite`). Repositories for beliefs, goals, plans, intentions. DB file: `bdi_state.db`.
- **components** — Core BDI runtime classes: `BeliefBase`, `GoalManager`, `PlanLibrary`, `IntentionManager`, `Executor`. Each accepts `persist: boolean` to toggle SQLite backing.
- **llm** — Claude integration via `@anthropic-ai/sdk`. Three functions that call Claude and parse JSON responses:
  - `BeliefRevisionFunction` — perceptions → belief updates
  - `DeliberationEngine` — beliefs + goals → which goals to commit to
  - `PlanSelector` — goal + applicable plans → selected/generated plan
- **agent** — Orchestration layer. `BDIAgent` wires everything together. `ReasoningLoop` runs the perceive→revise→deliberate→plan→execute cycle. UI components (`Dashboard`, `EventLog`) for terminal output.
- **examples** — `simpleAgent.ts` (basic demo), `taskAgent.ts` (realistic scenario with custom tools and plan library JSON).

### BDI Reasoning Cycle (ReasoningLoop.runCycle)

1. **Perceive** — receive perception string from environment
2. **Belief Revision** — Claude analyzes perception against current beliefs, returns add/update/remove operations with confidence scores
3. **Confidence Decay** — inference beliefs lose 0.01 confidence per cycle
4. **Goal Evaluation** — check success conditions (substring match against beliefs) and deadlines
5. **Deliberation** — Claude selects 2-3 goals to commit to this cycle based on priority, deadlines, and current intentions
6. **Plan Selection** — for each committed goal, Claude picks from applicable library plans (matched by `goalPattern` regex) or generates a new plan (3-7 steps)
7. **Execution** — execute one step per active intention. Step types: `tool_call`, `llm_reason`, `wait`. Failure policies: `abort`, `retry`, `continue`.

### Key Patterns

- **LLM calls** use `completeJSON()` helper that appends "Respond with valid JSON only" to system prompts and strips markdown fences. Default model: `claude-sonnet-4-6`, max tokens: 2048.
- **Event system**: ReasoningLoop emits events (`cycle:start`, `belief:revised`, `deliberation:done`, `intention:formed`, `step:executing`, `step:success`, `step:failed`, `cycle:end`). `BDIAgent.onEvent()` subscribes listeners.
- **Graceful LLM fallbacks**: belief revision → empty updates; deliberation → highest-priority goal; plan selection → lowest-cost plan or emergency fallback.
- **Tool registry**: `Executor` holds a `Map<string, ToolFn>`. Built-in tools: `wait`, `logMessage`, `noop`. Custom tools registered via `agent.registerTool(name, fn)`. Tools receive `(params, context)` where context includes beliefs and goal.
- **Plan library JSON**: Plans can be loaded from JSON files in `plans/` via `PlanLibrary.loadFromJSON()`.

## Configuration

Requires `ANTHROPIC_API_KEY` or `ANTHROPIC_AUTH_TOKEN` in `.env` (see `.env.example`). Model is configurable via `BDIAgentConfig.model`.

## Workspace Setup

- ESM-only (`"type": "module"`)
- TypeScript target: ES2022, module resolution: bundler
- Path aliases: `@bdi-ai/*` mapped in `tsconfig.base.json`
- Nx workspace with npm workspaces (`packages/*`)
