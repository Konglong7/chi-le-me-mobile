# Multiplayer Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real multi-user backend with database persistence and realtime sync while keeping the existing React and Capacitor client.

**Architecture:** Add a `server/` Fastify service backed by PostgreSQL via Drizzle, expose REST endpoints for session, bootstrap, proposal, share, and history operations, then attach Socket.IO rooms for lobby and proposal detail updates. Refactor the frontend store so local reducer state becomes a cache over server truth, while preserving a local-only fallback for test and offline development.

**Tech Stack:** Fastify, Socket.IO, PostgreSQL, Drizzle ORM, pg, pg-mem, React, Vite, Vitest

---

### Task 1: Backend Workspace And Session Bootstrap

**Files:**
- Create: `server/src/app.ts`
- Create: `server/src/server.ts`
- Create: `server/src/env.ts`
- Create: `server/src/db/schema.ts`
- Create: `server/src/db/client.ts`
- Create: `server/src/db/bootstrap.ts`
- Create: `server/src/modules/session.ts`
- Create: `server/src/routes/session-routes.ts`
- Create: `server/src/routes/bootstrap-routes.ts`
- Test: `server/src/routes/session-routes.test.ts`

- [ ] **Step 1: Write failing session/bootstrap tests**
- [ ] **Step 2: Run tests to verify HTTP routes fail**
- [ ] **Step 3: Implement schema, DB bootstrap, and session identify logic**
- [ ] **Step 4: Re-run tests until session/bootstrap pass**
- [ ] **Step 5: Commit**

### Task 2: Proposal CRUD And Domain Rules

**Files:**
- Create: `server/src/modules/proposal.ts`
- Create: `server/src/routes/proposal-routes.ts`
- Test: `server/src/routes/proposal-routes.test.ts`

- [ ] **Step 1: Write failing tests for create proposal and load proposal detail**
- [ ] **Step 2: Run tests to verify create/detail endpoints fail**
- [ ] **Step 3: Implement proposal, option, participant persistence and mapping**
- [ ] **Step 4: Re-run tests until proposal endpoints pass**
- [ ] **Step 5: Commit**

### Task 3: Vote, Participation, Message, Share, History

**Files:**
- Create: `server/src/modules/share.ts`
- Create: `server/src/routes/share-routes.ts`
- Create: `server/src/routes/history-routes.ts`
- Modify: `server/src/modules/proposal.ts`
- Test: `server/src/routes/realtime-domain.test.ts`

- [ ] **Step 1: Write failing tests for vote uniqueness, participation toggle, message create, share create, and history list**
- [ ] **Step 2: Run tests to verify domain endpoints fail**
- [ ] **Step 3: Implement the missing write rules and read models**
- [ ] **Step 4: Re-run tests until domain endpoints pass**
- [ ] **Step 5: Commit**

### Task 4: Realtime Socket Rooms

**Files:**
- Create: `server/src/socket.ts`
- Modify: `server/src/app.ts`
- Test: `server/src/socket.test.ts`

- [ ] **Step 1: Write failing tests for lobby broadcast and proposal-room broadcast**
- [ ] **Step 2: Run tests to verify realtime flow fails**
- [ ] **Step 3: Implement Socket.IO auth, room join/leave, and server broadcasts**
- [ ] **Step 4: Re-run tests until realtime tests pass**
- [ ] **Step 5: Commit**

### Task 5: Frontend API, Session, And Bootstrap

**Files:**
- Create: `src/lib/device.ts`
- Create: `src/lib/api.ts`
- Create: `src/lib/realtime.ts`
- Modify: `src/app/types.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/app/store.tsx`
- Test: `src/lib/remote-store.test.tsx`

- [ ] **Step 1: Write failing tests for remote identify/bootstrap flow with mocked fetch**
- [ ] **Step 2: Run tests to verify frontend store still works only locally**
- [ ] **Step 3: Implement device id, session token persistence, remote bootstrap, and fallback local mode**
- [ ] **Step 4: Re-run tests until remote bootstrap tests pass**
- [ ] **Step 5: Commit**

### Task 6: Frontend Mutation Wiring And Realtime Updates

**Files:**
- Modify: `src/app/store.tsx`
- Modify: `src/screens/create-proposal-screen.tsx`
- Modify: `src/screens/proposal-detail-screen.tsx`
- Modify: `src/screens/share-screen.tsx`
- Modify: `src/screens/history-screen.tsx`
- Test: `src/lib/multiplayer-actions.test.tsx`

- [ ] **Step 1: Write failing tests for proposal create, vote, participation, chat, share publish, and socket event application**
- [ ] **Step 2: Run tests to verify remote mutations are not wired**
- [ ] **Step 3: Replace local-only mutations with API calls plus server-push cache updates**
- [ ] **Step 4: Re-run tests until all UI mutation tests pass**
- [ ] **Step 5: Commit**

### Task 7: Tooling, Scripts, And Deployment Notes

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`
- Create: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add scripts for running frontend and backend together**
- [ ] **Step 2: Add Drizzle configuration and environment docs**
- [ ] **Step 3: Document local development, DB setup, and Android/web run flow**
- [ ] **Step 4: Re-run project verification**
- [ ] **Step 5: Commit**
