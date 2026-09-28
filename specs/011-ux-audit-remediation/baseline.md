# Baseline test results

T001, 2026-09-27, before any 011 change (run on a copy of the pre-change files).

Command: `node --test tests/*.test.js`. On Node v24, `node --test tests/` fails with MODULE_NOT_FOUND, so pass the glob instead. Do NOT add a `tests/index.js` shim: it silently limits the run to the files it requires.

- Tests: 389
- Pass: 371
- Fail: 18 (pre-existing, not caused by feature 011)

Pre-existing failures (all in the mortgage-rate / floating-houses tests from features 004/006):
- `ultimaRevisionEn` (3 tests) and "respuesta pública … ultimaRevisionEn" (2)
- "casas …" (9 tests)
- `estadoCasa` (2), `marcaDeAlerta` (1), "textoCasa con contexto" (1)

Acceptance rule for 011: the same 18 names fail, nothing else fails, and all new tests pass.

After US1 (T003-T014): 425 tests, 407 pass, 18 fail. The failing names are identical to the baseline.
