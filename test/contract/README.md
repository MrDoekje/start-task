# Behavioral contract suite (north-star)

These tests are an **executable specification** of how `start-task` behaves. They
exist to pin functionality that must stay constant even when the implementation
underneath changes — including a change of UI toolkit, rendering layer, or host
platform.

## The rules

1. **Do not modify these tests to make a refactor pass.** If a refactor breaks a
   test here, the refactor changed observable behavior — fix the code, not the
   test. The only legitimate reason to edit a file in this directory is a
   *deliberate, reviewed* behavior change, and that edit should be as visible in
   review as a spec change.

2. **Framework-agnostic — no UI imports, ever.** Nothing in this directory may
   import React, Ink, Vue, Tauri, a DOM, a renderer, or any other
   presentation-layer dependency. Every assertion runs against plain JavaScript
   modules. That is what lets the suite keep passing when the UI is
   re-implemented in a different toolkit: the rendering changes, the behavior
   does not.

3. **Platform-independent.** No assertion may depend on the current OS, shell,
   terminal emulator, `$HOME`, real network access, or the contents of a real
   git repo / config file. Anything environmental is injected as an argument or
   stubbed. The suite must pass identically on any machine and any platform.

4. **Pure logic only.** These tests cover decision logic, data transformation,
   parsing, and state transitions. They intentionally do **not** assert on
   colors, glyphs, layout, key-event plumbing, or anything a UI owns. Where
   logic was previously embedded in a UI component, it has been extracted into a
   plain module (e.g. `lib/tui-ink/*Model.js`, `lib/tui-ink/*Buffer.js`,
   `lib/tui-ink/listNav.js`) precisely so the contract can be expressed here.

## What "the UI re-implements only rendering" means

The editor buffers (`singleLineBuffer`, `multilineBuffer`), the list navigation
primitives (`listNav`), and the menu/wizard/flow/preview models are pure
functions over plain state. A future UI — in any framework — is expected to call
these same functions and render their output. If it does, this suite verifies
the user-visible behavior (cursor motion, word deletion, tab/hotkey assignment,
step skipping, option cascade, etc.) is preserved. The UI is then responsible
only for drawing state and forwarding input.

## Relationship to `test/` (the unit suite)

The broader `test/` directory already contains framework-agnostic unit tests for
providers, the option cascade (`resolveOptions`), branch-name handling,
validation, prompt building, and the step pipeline. Those are part of the same
behavioral baseline and are held to the same bar: **do not weaken them to make a
change pass.** This `contract/` directory adds the behaviors that were not yet
covered and the ones most exposed by a UI/platform migration, and gathers them
under the explicit do-not-modify rule above.

## Running

```bash
npm test                       # whole suite, including test/contract
npx vitest run test/contract   # contract suite only
```
