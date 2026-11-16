# Scenario Explorer

**Primary experience: interactive visual network.** This repository's visual-first working branch restores the owner's existing radial Scenario Explorer from the portfolio. Explore eight system domains, related signals, four alternative futures, and the scenario/STEEP/filter interactions in the network itself. The data and visuals are an illustrative/public portfolio demonstration, not an empirical forecast or approval to export restricted GSA sources.

## Open the visualization

- Open `index.html` in a browser or serve the repository as static files. The landing page fills the screen with the original interactive network.
- For the canonical visual directly, open `explorer.html`.
- `assets/d3.v7.min.js` is a vendored, locally served D3 v7.9.0 dependency. The network itself does not need a Node service; fonts may use Google Fonts when online.

## Source provenance and preservation

- Preserved source: [`sss2808/P/explorer.html`](https://github.com/sss2808/P/blob/main/explorer.html), Git blob `8449a70ce2fda900e01f5fca064ad1f61b566a72`.
- Preserved D3 vendor: [`sss2808/P/assets/d3.v7.min.js`](https://github.com/sss2808/P/blob/main/assets/d3.v7.min.js), Git blob `33bb880268a5403d6aa21a12389470cebd66e512`.
- The portfolio's canonical authoring source and working website have **not been modified**.
- This is a visual-restoration candidate on a separate review branch. No deployment, merge or production release is claimed. The owner can continue enhancing the reusable visual explorer from this source.

## Earlier table-first P1 prototype

The prior `feat/p1-syn-01` branch and its draft PR #2 are **shelved**. They contain potentially useful versioned scenario contract validation, a synthetic fixture and an accessible tabular inspector, but **they are not the primary Scenario Explorer UI**. If reused later, their table/text content must be an optional alternative to the visual network, and their data contract must be explicitly mapped to the existing visual model. Do not replace the original visualization with that prototype.

## Boundaries

The public demo uses only the already published illustrative portfolio explorer. Keep source-rights restrictions, attribution, and synthetic/conditional scenario caveats intact. Do not import restricted GSA records or identify individual research participants. Changes to the visual interaction require focused behavioral and keyboard/responsive testing before acceptance.
