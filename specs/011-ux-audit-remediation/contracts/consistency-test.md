# Contract: `tests/cabecera-pie.test.js`

It runs with `node --test tests/` and uses no dependencies (only `node:fs`, `node:path`, `node:assert`).

## Inputs
- Reference: `index.html`.
- Targets: every `*.html` in the repo root except `admin.html`.

## Normalization
1. Extract the `<header>…</header>` and `<footer>…</footer>` blocks.
2. Remove `class="active"` / `aria-current="page"` and `is-active` markers (per-page highlight is allowed).
3. Remove the whole `<div class="wrap revision-legal">…</div>` block from footers.
4. Collapse whitespace runs to one space.

## Assertions
- The normalized header equals the reference header, for every target.
- The normalized footer equals the reference footer, for every target.
- Every target includes `styles.css`, `nav.js` and `empresa.js`.
- No target includes `zyron-brain.js` or `zyron-leyes.js` as a static `<script>` (they are lazy-loaded).
- `cuenta.html` and `login.html` contain `<meta name="robots" content="noindex">`.

## Failure output
Name the page and the first differing 80 characters, so the fix is obvious.
