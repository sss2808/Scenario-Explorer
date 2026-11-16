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

## Excel-to-radial visualization binding (visual lock)

The workbook importer is part of the **original D3 radial network** in `explorer.html`, not the shelved table application. The original portfolio CSS and all four original illustrative image assets remain unchanged. No uploaded workbook is sent to a server.

1. Open the existing explorer. Open the existing **Refine** filter popover, then select **Import Excel**. The import control stays hidden until Refine opens, preserving the unchanged initial portfolio toolbar.
2. Choose a fictional `.xlsx` authoring workbook (or an exported, versioned `.json` file).
3. Review sheet/row/column errors and dataset counts. Select **Apply to radial explorer** to reload the same D3 renderer using the imported domains, stable signal IDs, domain/signal relationships, STEEP/time/type options and scenario narratives/focus sets.
4. Use **Export JSON** for a deterministic local reimport, or **Restore portfolio** to restore the original illustrative 8-domain radial dataset.

The import accepts the following worksheets: `Project`, `Domains`, `Signals`, `Links`, `Scenarios`, `Checkpoints`. The optional Instructions sheet explains fields. The first filled fictional example uses 5 domains, 12 signals, 11 typed links, 3 future scenarios and 3 windows; this intentionally differs from the original 8-domain/four-future portfolio. The blank and filled Excel artifacts were created in the owner conversation and remain available for authoring/testing.

**Important:** The importer is local, synthetic-only and denies unknown references and restricted distribution. It deliberately does not authorize actual GSA publication, real participant/source data or external model access. Import previews do not automatically publish anything. Workbook parser uses browser-native ZIP decompression; browsers without `DecompressionStream('deflate-raw')` need a separately approved compatibility update. No package manager, remote API or backend is introduced.

**Visual fidelity check:** original `<style>` bytes, four original portfolio JPEG data URLs, D3 vendor and SVG positioning/styling logic remain unchanged. The data-only branch points are explicitly isolated in `assets/workbook-model.js`, `assets/workbook-import.js`, and narrow `explorer.html` reads. Measured browser screenshot parity and keyboard/mobile acceptance remain distinct review evidence and must not be inferred from a source diff.

**No merge/deploy/CI** without independent exact-HEAD acceptance and separate owner release permission.
