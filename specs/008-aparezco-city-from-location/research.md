# Research: "¿Aparezco?" fills in my city from my location

**Feature**: 008-aparezco-city-from-location · **Date**: 2026-09-23

## R1 — Where the approximate location comes from

- **Decision**: A new Netlify Function written in the **modern syntax** (`export default async (req, context)`) that reads `context.geo` (city, `subdivision.code`, `country.code`) and returns only city + state for US visitors.
- **Rationale**: Netlify documents `context.geo` for modern-syntax functions ([Functions API reference](https://docs.netlify.com/build/functions/api/)). It is derived from the request IP by Netlify itself: no permission prompt (spec FR-002), no third-party call, no per-lookup cost. The existing functions use the legacy `exports.handler` form, for which Netlify does not document geo data, so this one function uses the modern form.
- **Alternatives considered**:
  - Browser geolocation + reverse geocoding — rejected by clarification (prompt, paid lookup, site blocks `geolocation`).
  - A third-party IP-geolocation API from the browser — sends the visitor's IP to another company and needs a CSP change; rejected (constitution II).
  - An Edge Function — also has `context.geo`, but adds a second runtime to the project for no benefit here.

## R2 — Caching and privacy of the response

- **Decision**: Response headers `Cache-Control: private, no-store`; the function logs nothing about the request; the body contains only `{ ciudad, estado }` (or `{ ciudad: null }`).
- **Rationale**: A cached geo response on the CDN would show one visitor's city to the next (spec FR-009/SC-005). Latitude, longitude, postal code and timezone are never returned (minimum data, constitution II).
- **Alternatives considered**: Returning the whole `geo` object and trimming in the browser — sends more personal data than needed; rejected.

## R3 — One place for the "is this a usable US city?" rules

- **Decision**: A small browser/Node module `ciudad-sugerida.js` (UMD-style like `auth-helpers.js`) holds: format `"Ciudad, ST"`, accept only the 50 states + DC, reject state-only values, parse a saved profile (`city` + `state_zip`, where `state_zip` may be "VA 24011", "VA" or "Virginia 24011"), and choose the source (profile over detected). The function only passes through raw `city` and `subdivision.code` when `country.code === "US"`.
- **Rationale**: Constitution IV (one source, tested). The browser module is testable with `node --test` like `auth-helpers.js`.
- **Alternatives considered**: Validating in the function — then the profile path would need a second copy of the state list.

## R4 — Never overwrite what the visitor typed

- **Decision**: The page fills the field only if, at arrival time, the field is still empty **and** the visitor has not typed in it during this visit (tracked with an `input` flag). A 2-second timeout (`AbortController`) stops waiting. After "Buscar otro negocio" the last used value stays in the field (already current behavior, since the form is not reset).
- **Rationale**: Spec FR-004, SC-004, edge case "slow detection".

## R5 — Empty city on search

- **Decision**: The page blocks the search with a friendly message and focuses the city field, the same way the name field is validated today. The server keeps its current fallback for API callers, but the page never sends an empty city.
- **Rationale**: Spec FR-007 / SC-003; avoids "cerca de mí" resolving near the server.

## R6 — Analytics

- **Decision**: Add a categorical property `ciudad` with values `perfil | detectada | editada | escrita | vacia` to the existing `aparezco-empezar` event. No city text.
- **Rationale**: Spec FR-009 / SC-002; constitution II.

## R7 — Local development

- **Decision**: Under `netlify dev`, `context.geo` may be empty or a placeholder; the page then behaves as today (FR-008). The quickstart documents how to test with a mocked response.
