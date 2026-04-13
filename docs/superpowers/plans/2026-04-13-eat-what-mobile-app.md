# Eat What Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app matching the provided prototype and package it as an Android Studio runnable Capacitor app named `吃了么`.

**Architecture:** Use a single React + TypeScript SPA for all screens, keep product data in a reducer-backed app store persisted to `localStorage`, and wrap the web build with Capacitor so Android reuses the same UI and logic. Recreate the prototype screen-by-screen while turning static mock content into interactive forms, navigation, and persisted state transitions.

**Tech Stack:** Vite, React, TypeScript, React Router, Tailwind CSS, Vitest, Testing Library, Capacitor Android

---

### Task 1: Scaffold The Shared App Shell

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/styles.css`

- [ ] Write and verify the initial app shell test fails
- [ ] Add the minimal app bootstrap and route shell
- [ ] Run the test again and verify the shell renders

### Task 2: Implement The Persistent App Store

**Files:**
- Create: `src/app/types.ts`
- Create: `src/app/seed.ts`
- Create: `src/app/store.tsx`
- Create: `src/lib/storage.ts`
- Create: `src/lib/store.test.ts`

- [ ] Write tests for loading seeded data and persisting nickname / proposals / shares
- [ ] Verify they fail for missing store behavior
- [ ] Implement reducer, provider, selectors, and persistence helpers
- [ ] Re-run tests until green

### Task 3: Rebuild The Eight Prototype Screens

**Files:**
- Create: `src/components/layout.tsx`
- Create: `src/components/ui.tsx`
- Create: `src/screens/welcome-screen.tsx`
- Create: `src/screens/home-screen.tsx`
- Create: `src/screens/create-proposal-screen.tsx`
- Create: `src/screens/proposal-detail-screen.tsx`
- Create: `src/screens/wheel-screen.tsx`
- Create: `src/screens/share-screen.tsx`
- Create: `src/screens/history-screen.tsx`
- Create: `src/screens/settings-screen.tsx`
- Create: `src/test/app.test.tsx`

- [ ] Write screen-level tests for welcome flow and mobile navigation
- [ ] Verify the tests fail against the minimal shell
- [ ] Implement the reusable mobile layout and each screen
- [ ] Re-run tests and adjust until visual structure and interactions are correct

### Task 4: Add Product Actions And Polishing

**Files:**
- Modify: `src/app/store.tsx`
- Modify: `src/screens/create-proposal-screen.tsx`
- Modify: `src/screens/proposal-detail-screen.tsx`
- Modify: `src/screens/wheel-screen.tsx`
- Modify: `src/screens/share-screen.tsx`
- Modify: `src/screens/history-screen.tsx`
- Create: `src/lib/interactions.test.tsx`

- [ ] Write tests for creating proposals, voting, joining, chatting, adding shares, and spinning the wheel
- [ ] Verify the tests fail for the missing product behaviors
- [ ] Implement the minimal action handlers to satisfy the tests
- [ ] Re-run the interaction suite until green

### Task 5: Package Android

**Files:**
- Create: `capacitor.config.ts`
- Create: `android/**` via Capacitor CLI
- Modify: `android/app/src/main/res/values/strings.xml`

- [ ] Build the web app successfully
- [ ] Add the Android platform
- [ ] Rename the Android app to `吃了么`
- [ ] Sync Capacitor assets and verify the Android project is present

### Task 6: Verify Deliverables

**Files:**
- Modify: `README.md`

- [ ] Run `npm run test -- --run`
- [ ] Run `npm run build`
- [ ] Run `npx cap sync android`
- [ ] Document how to run web and Android locally
