# Scenario Explorer

P1-SYN-01 is an **unmerged, synthetic-only prototype**. All scenarios, actors, drivers, milestones and signposts are imaginary. This public repository must never contain actual GSA data, study excerpts, private identifiers or external provider access.

## Features

- Separate dated reference state versus alternative future Baseline.
- Configurable four-path GSA-shaped demo profile with +3, +5 and +10 year assessment windows.
- All 12 selectable cells, including one deliberately empty Collapse +5 cell.
- Same-window two-scenario comparison, common evidence/assumption inspector, separate epistemic/model-review/rights labels.
- Keyboard-operated HTML table and narrow-screen stacked cards with structured text alternative.
- JSON Schema draft 2020-12, independent semantic and SHA-256 digest checks of bundled fixture.

## Commands

Requires Node.js 22+ and dependencies installed in an approved isolated environment.

```sh
npm install
npm run typecheck
npm test
npm run build
```

Only the contract tests are designed to run without installing app dependencies: `node --test tests/contracts/*.test.mjs`.

**Important:** Dependency installation, web build, keyboard testing and independent PR review are not established by the existence of these commands. Actual execution evidence must be separately recorded. No CI, merge or deployment is authorized by this prototype. No arbitrary imports, telemetry, GSA/M-Journey bridges, authentication or real research release.

Owner authorization: [AgentOps #318](https://github.com/sss2808/AgentOps/issues/318). Accepted v0.2 contract: [AgentOps #316](https://github.com/sss2808/AgentOps/issues/316#issuecomment-6902671871).
