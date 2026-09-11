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
tank.js       The aquarium title screen (self-contained, swappable)
styles.css    Styling
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

## The aquarium

`tank.js` is fully self-contained. Its only contract is: render something into
`<canvas id="tank-canvas">` inside `#tank-screen`. It doesn't read from `app.js` or
`data.js`, and nothing reads from it.

To swap in a different fish tank, replace that one file.

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

Then open `http://localhost:8000`. Opening `index.html` directly works too.

## Notes

- Grades, what-if selections and the prior-GPA record save to `localStorage` —
  per browser, not synced. The course data itself always comes from `data.js`.
- Unit counts for Summer 2026 and the Summer 2027 candidates weren't in the source
  brief and are marked with an asterisk. Confirm them in DegreeWorks.
- Data current as of September 2026 (SMCCD DegreeWorks).
