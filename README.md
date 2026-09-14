# Transfer Requirements Dashboard

Transfer tracker for Valentino Larios — Skyline College → Fall 2027 transfer
(USC Marshall / UCLA / UC Berkeley).

Static site. No backend, no build step. Deploys straight to GitHub Pages.

## What it does

Mirrors the shape of the Skyline DegreeWorks audit — progress ring, requirement
blocks with COMPLETE / IN-PROGRESS / INCOMPLETE pills, per-course rows, and
"Still needed" lines naming the courses that would close each gap — and adds the
things the audit can't do: USC's own GE categories tracked alongside Cal-GETC, a
running GPA, and a what-if mode for unscheduled courses.

Sections:

| Section | What's in it |
|---|---|
| Overview | Target schools and the Associate's-degree premise |
| Degree | The audit header — progress ring, units, degree GPA, top-level requirements |
| Still Open | Action items derived live from the trackers — not hand-maintained |
| Schedule | Every term, every course, tagged with what it actually fulfills |
| Cal-GETC | Areas 1–6, each subarea with its satisfying course or its options |
| USC GE | A–H, tracked separately from Cal-GETC |
| Major Prep | The AS-T core block, plus a per-school checklist |
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

Exam credit (AP and similar) appears as an ordinary completed course, because
that is how it lands on the record — `HIST 201` and `PHYS 210`, graded `CRE`,
with a `viaExam` label. `CRE` carries units but no grade points, so it counts
toward requirements without moving the GPA.

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
- `viaExam: "AP US History"` — notes that the credit came from an exam.
- `options: [...]` on a Cal-GETC slot — the courses the audit lists as satisfying
  it, shown under "Still needed" while the slot is open.
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

A course counts toward a USC GE category only if its `usc` array names that
category. The exam-credit courses have an empty `usc` array, so Cal-GETC areas
they cover read as complete while the USC categories stay open — which is what
the plan actually looks like.

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
- Summer 2027 candidate unit counts are assumed and marked with an asterisk.
- The audit counts 7 in-progress Fall 2026 classes totalling 22 units; the 6 in
  `data.js` account for 21. One 1-unit class is unidentified.
- Data current as of the DegreeWorks audit dated 09/14/2026.
- `tank/CREDITS.md` carries the model attribution from the fish-tank repo,
  including entries whose licensing is marked unconfirmed there. Publishing this
  repo republishes those models, so that uncertainty applies here too — worth
  resolving before the site is shared widely.
