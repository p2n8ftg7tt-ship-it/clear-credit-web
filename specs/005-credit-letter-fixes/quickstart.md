# Quickstart: Verify the three fixes

**Spec**: [spec.md](./spec.md) | **Contract**: [contracts/letters-module.md](./contracts/letters-module.md) | **Data model**: [data-model.md](./data-model.md)

Goal: prove, in under 10 minutes, that each bug (B1, B2, B3) is gone. Nothing here needs keys, a server or an account.

## Prerequisites

- Node 18+ (checked with v24.21.0). Repo root: `C:\Users\drcor\Desktop\MyWeb`.
- A browser. Serve the folder locally, for example `npx serve .` or open `credito.html` directly (the letters run fully in the browser, so `file://` also works).
- A sample credit report to analyze, with a personal-information block listing **3 names, 2 addresses and 3 phones**. A plain `.txt`/`.docx`/`.pdf` in the same layout the analyzer already reads is enough; for example:

```text
Personal Information
Name: Maria Elena Garcia Lopez
Also known as: Maria E Garcia; Maria Lopez
Address: 742 Evergreen Terrace, Roanoke, VA 24016
Address: 12 Oak St Apt 3, Roanoke, VA 24011
Phone: (540) 555-0142
Phone: 540.555.0000
Phone: 540 555 1111
```

## 1. Automated checks (run first)

```bash
node --test tests/*.test.js
```

Expected: all suites pass (baseline before this work: 245 tests, 0 failures) plus the new tests for AC-1.x, AC-2.x and AC-3.x, and the existing letter/detection tests passing **unchanged in intent**. If a test fails, report it as is; do not edit it to make it pass.

> Note: `node --test tests/` (directory form) fails on Node 24 before any test runs — a pre-existing issue, see research R7.

## 2. Bug 1 — phone with hyphens (AC-1.x)

1. Open `credito.html`, analyze the sample report, open any «Solucionar este problema» / «Disputar esta información» / «Exigir validación» form.
2. In «Número de teléfono actual» type `5405550142` slowly. **Expect** `5`, `54`, `540`, `540-5` … `540-555-0142`. Click between `540` and `555` and type a digit: the caret stays where you are.
3. Clear it and paste each of `(540) 555-0142`, `540.555.0142`, `+1 540 555 0142`. **Expect** `540-555-0142` every time. Type a letter: nothing appears.
4. Type `54055` and press «Preparar …». **Expect** no letter, the message «Escribe un teléfono de 10 dígitos, como 540-555-0142.», and focus on the phone field.
5. In the identity form's «Datos personales detectados», **expect** phones as `Teléfono: 540-555-0142` (no parentheses).
6. Prepare a letter of each type. **Expect** every phone in both columns and in the copied English text to be `540-555-0142`.

## 3. Bug 2 — address not repeated (AC-2.x)

1. Open an identity form, fill: `Maria Elena` / `Garcia` / `Lopez`, phone `540-555-0142`, street `742 Evergreen Terrace`, city `Roanoke`, state `VA`, ZIP `24016`. Tick one detected value. Press «Preparar solicitud de corrección».
2. In both columns find the block «MI INFORMACIÓN CORRECTA» / «MY CORRECT INFORMATION». **Expect** 7 lines: title, legal name, given names, first surname, second surname, **one** current-address line, current phone.
3. **Expect none** of `Calle y número`, `Ciudad`, `Estado`, `Código postal` (left) or `Street and number`, `City`, `State`, `ZIP code` (right).
4. Press «Copiar carta en inglés» and paste into a text editor: the same single address line, and `742 Evergreen Terrace` appears twice in total (sender block + correct-information block).
5. Repeat with each of the four identity cards if the report offers them, and with the bureau-dispute and debt-validation letters (**expect** them unchanged except the phone format).

## 4. Bug 3 — many names, addresses and phones (AC-3.x)

1. With the 3 + 2 + 3 sample, open an identity card. **Expect** three groups in this order: «Nombres (3)», «Direcciones (2)», «Teléfonos (3)», 8 boxes in total, none ticked.
2. Press «Marcar todos» in «Teléfonos»: only the 3 phone boxes are ticked. Press «Quitar todos»: they clear. Other groups did not change.
3. Tick one address, then one name, then one phone (in that order). Press «Preparar solicitud de corrección». **Expect** in «INFORMACIÓN QUE DISPUTO / INFORMATION I AM DISPUTING» exactly 3 lines in the order name → address → phone, and no other detected value anywhere in the letter.
4. Untick everything and press the button. **Expect** the existing message asking to tick at least one value; no letter.
5. Change the sample to **2 names, 1 address, 1 phone**. **Expect** an identity card that lists all 4 values (the address is now reachable). Change it to **1 of each**. **Expect** no identity card and «Información personal consistente».
6. Resize the window to 360 px wide with a sample of 20+ values: no horizontal scroll; the «Preparar» button remains reachable.
7. In the browser's network panel while doing steps 1–4: **expect** no request carrying a name, address or phone, and no analytics call with counts or values (only the `carta-generada` event with its type).

## 5. Finish

- [ ] Steps 1–4 pass; nothing else on the credit page changed (score, cards, PDF print).
- [ ] `git diff --stat` shows only the expected files and no whole-file line-ending changes (LF).
- [ ] `graphify update .` run after the code change (project rule; note that the `graphify` command currently fails on this machine because its Python path is missing — report it instead of skipping silently).
- [ ] Open questions Q1 and Q2 in the spec answered or accepted with their defaults.
