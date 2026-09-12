# Transfer Requirements Dashboard

Transfer tracker for Valentino Larios — Skyline College → Fall 2027 transfer
(USC Marshall / UCLA / UC Berkeley).

Static site. No backend, no build step. Deploys straight to GitHub Pages.

## What it does

The point of the dashboard is to make one thing impossible to get wrong:

> **Cal-GETC accepts AP exam scores. USC does not.**

At USC, AP credit is elective-only and never satisfies a GE-A–H category. Two
Cal-GETC areas currently read "complete" via AP while the matching USC categories
are still fully open. Anywhere that happens, the dashboard marks it
**Complete — via AP only** in amber with a striped background, and the Still Open
section explains the consequence in plain language.

Sections:

| Section | What's in it |
|---|---|
| Overview | Target schools, the Associate's-degree premise, the AP rule |
| Still Open | Action items derived live from the trackers — not hand-maintained |
| Schedule | Every term, every course, tagged with what it actually fulfills |
| Cal-GETC | Areas 1–6 with per-subarea status and its source |
| USC GE | A–H, tracked separately, AP deliberately excluded as a source |
| Major Prep | Per-school course list + application checklist |
| GPA | Per-term and cumulative, recalculates as grades are entered |
| What-If | Toggle Summer 2027 candidates and see live requirement deltas |
| Contacts | Counselors, admissions, days-to-deadline counter |

## Files

```
index.html    Page structure only — all content is rendered from data.js
data.js       ← EDIT THIS. Every course, requirement and contact lives here.
app.js        Rendering + the requirement-resolution engine
styles.css    Styling
tank/         Vendored build of tinoxo/fish-tank — see tank/SOURCE.md
```

## Editing the data

Everything the dashboard shows comes from `data.js`. Nothing else needs to change.

**Adding a course** — add it to the right term's `courses` array:

```js
{
  id: "hist106",                 // unique, lowercase, no spaces
  code: "HIST 106",
  title: "History",
  units: 3,
  status: "planned",             // completed | in-progress | planned | candidate
  grade: null,                   // "A", "B+", … or null
  calgetc: ["3B"],               // Cal-GETC slot ids it satisfies
  usc: ["B", "H"],               // USC GE letters it satisfies
  majorPrep: ["usc", "berkeley"],// school ids it's major prep for
  note: "Closes GE-B and double-counts for GE-H."
}
```

Useful flags:

- `uscUnconfirmed: true` — renders as "Likely — unconfirmed" instead of a
  confirmed satisfaction. Use it until USC confirms in writing.
- `unitsAssumed: true` — marks the unit count with an asterisk and a footnote.
- `flag: "elective"` — marks a course as fulfilling nothing (like ANTH 180).

Status flows through automatically: the Cal-GETC and USC trackers, the Still Open
list, the GPA tracker and the What-If deltas all recompute from these fields.

**Marking something complete** — change `status` to `"completed"` and set `grade`.
The GPA tracker picks it up on the next load.

### How requirement status is decided

For each requirement slot, the engine collects every source that satisfies it,
ranks them (`completed` = `AP` > `in-progress` > `planned` > `candidate`), takes
the strongest N it needs, and reports the *weakest* of those. So a category needing
two courses where one is done and one is planned reads "will be satisfied", not
"satisfied".

AP credit is registered as a source for Cal-GETC slots and **never** for USC
categories — that exclusion is what makes the USC tracker honest.

## The fish tank

The title screen is [tinoxo/fish-tank](https://github.com/tinoxo/fish-tank) — a
Three.js voxel reef tank — built and vendored into `tank/`, embedded in an iframe.

**Why an iframe and not a direct include.** The tank sets
`html, body { overflow: hidden }` and appends its DEX, camera and ANGLE controls
straight onto its own `document.body` at fixed and absolute positions. Dropped
into this page directly, the overflow rule would stop the dashboard scrolling and
those controls would drift away from the canvas as the page moved. The frame
boundary contains all of it, with no changes to the tank's source.

**Why the embedded tank is inert.** `#tank-frame` is permanently
`pointer-events: none`, and that is load-bearing. Chromium routes wheel and touch
to an iframe in the compositor, so with a live frame filling the title screen the
page will not scroll over it at all. Measured, in that order:

| Attempt | Result |
|---|---|
| Transparent DOM overlay stacked above the frame | parent received zero wheel events |
| `pointer-events: none`, toggled back on when activated | scrolls — until first activation |
| …then `display` toggle to break the latch | still trapped |
| …then `visibility` toggle | still trapped |
| …then detach and reattach the node | still trapped |

Once that frame has been an interaction target, the page never gets scrolling back
over it. So the embedded copy is never interactive. It loses nothing visually: the
tank auto-orbits with no input at all (`freeCamera.shouldAutoRotate()` is true
while nothing is being dragged), so it stays alive as a backdrop.

The full interactive tank — dex, photo mode, free-fly camera — is one click away
via **Open the tank**, which opens `tank/index.html` in its own tab where nothing
has to share scroll with it. Because the embedded controls can't be clicked,
`app.js` injects a stylesheet into the frame to hide them rather than leave dead
buttons floating over the title.

Deep links skip the title screen entirely — opening `…/#open` to check an action
item lands on the dashboard, not on a WebGL scene.

To update the tank, follow `tank/SOURCE.md`. Model attribution lives in
`tank/CREDITS.md` and travels with the build.

## Deploying to GitHub Pages

The site is plain HTML/CSS/JS at the repo root, so no build or workflow is needed:

1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: **`/ (root)`**
4. Save

Live at `https://tinoxo.github.io/transferaquarium/` a minute or two later.

## Local preview

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Use a server, not `file://` — the tank's bundle is an ES module served with
`crossorigin`, which a `file://` origin blocks. The dashboard itself works fine
either way; only the tank needs the server.

## Notes

- Grades, what-if selections and the prior-GPA record save to `localStorage` —
  per browser, not synced. The course data itself always comes from `data.js`.
- Unit counts for Summer 2026 and the Summer 2027 candidates weren't in the source
  brief and are marked with an asterisk. Confirm them in DegreeWorks.
- Data current as of September 2026 (SMCCD DegreeWorks).
- `tank/CREDITS.md` carries the model attribution from the fish-tank repo,
  including entries whose licensing is marked unconfirmed there. Publishing this
  repo republishes those models, so that uncertainty applies here too — worth
  resolving before the site is shared widely.
