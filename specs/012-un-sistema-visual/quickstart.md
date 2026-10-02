# Quickstart: Validating One Visual System

Run the section that matches each change before its commit. Details live in the contracts; this file only says how to check.

## Prerequisites
- Node (for `node --test tests/`), Microsoft Edge (installed at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`), and NVDA or VoiceOver.
- Screenshots go to the session scratchpad or another folder **outside the repo**. `images/` and the root are published.

## §0 Before-screenshots (once, before any change)

For each of the 18 root pages, in PowerShell:

```powershell
& "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=6000 --window-size=1440,3600 --screenshot="<out>\<page>-antes.png" "file:///C:/Users/drcor/Desktop/MyWeb/<page>.html"
```

After each change, repeat with `-despues` and compare the pairs side by side. Every difference must be one the change intended; list them in the commit message. Headless Edge does not render true phone widths (research R9), so phone checks below are manual.

**Phone check (manual)**: Edge DevTools → device toolbar → 375×812 and a custom 320px width. Scroll the whole page; there must be no sideways scroll.

## §1 C1: markup accessibility
1. agendar, formar-negocio, listar-negocio: Tab from the page top to the footer. Focus never disappears into an invisible field.
2. cuenta (signed in): with NVDA on, Tab to each toggle and hear "Alertas por correo, toggle button, not pressed" (or the browser's equivalent). Press Space and hear "Guardado".
3. On a phone, open contacto and listar-negocio: the email field shows the @ keyboard and the phone field the number pad; the browser offers to autofill name and email.
4. **After deploy**: submit each of the 3 business forms once with test data and confirm the entries in Netlify → Forms, then delete them.
5. `node --test tests/`: §H of the new test is green, and everything else that was green before is still green.

## §2 C2: role tokens
1. `node --test tests/`: §A green.
2. Tab through contacto, login (including the country picker and phone field), herramientas and comprar-casa (FHA calculator): a clear ring on every stop, dark teal on light areas and light aqua on dark areas.
3. Admin-override check: in DevTools, run `document.documentElement.style.setProperty('--gold','#FFFF00')` and `…('--gold-light','#FFFF00')`. Focus rings and field borders must not turn yellow.

## §3 C3: leftovers and buttons
1. `node --test tests/`: §B, §C and §D green. Review `color-mapping-log.md` for "left as is" entries.
2. Screenshots vs §0: only colors, button corners and label case changed. Check login (main button), Zyron (open the assistant: header is solid dark teal), comprar-casa and contrato-auto.
3. At 375px: no button label wraps to 3 lines.

## §4 C4: type scale and components
1. `node --test tests/`: §E and §F green.
2. After each file's step: screenshot pair for that page. Only size changes, each listed.
3. At 200% browser zoom on credito and comprar-casa: no clipped or overlapping text.
4. At 320px on the 5 heavy pages: no sideways scroll; headings wrap cleanly.
5. index.html after the cleanup: screenshot identical to §0 except intended items.

## §5 C5: credito paper hero (trial)
1. At 1440px: dark hero with the sheet on the right, one white primary button, "Aprender los fundamentos" as a link, and the analyzer on a light background with a lavender stripe.
2. At 768, 375 and 320px: copy, then button, then sample; no sideways scroll; hero ≤ about 1.2 screens tall at 375×812.
3. Turn on reduced motion (Windows: Settings → Accessibility → Visual effects → Animation effects off) and reload: the highlight is already drawn.
4. Open `index.html` and click the credit report card: it lands on the analyzer (`#analizar-reporte`).
5. Compare the `data-umami-event` values on credito.html and index.html before and after (`Select-String -Pattern 'data-umami-event="[^"]+"' credito.html, index.html`): identical lists.
6. `node --test tests/`: §G green.
7. **Show the owner. Push only on approval.**

## §6 C6: Auto Coach
1. herramientas → Auto Coach: go through every step with the keyboard; the ring is visible on each control.
2. DevTools → select the iframe's document → Computed: the font is Bricolage Grotesque or Literata.
3. At 375px: the iframe grows with each step, with nothing cut off at the bottom and no inner sideways scroll.
4. Enter the same 3 input sets recorded before the change; results are identical.

## §7 C7 and finish
1. `node --test tests/`: all green.
2. Mortgage calculator: force a save error (offline) and see an inline message, not an alert box.
3. `graphify update .`
4. Owner approval, then `git push origin master:main`.
