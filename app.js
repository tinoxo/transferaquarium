/* ============================================================
   app.js — renders the dashboard from data.js
   Independent of tank.js.
   ============================================================ */

(function () {
  "use strict";

  const D = window.DATA;
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- state ---------------- */

  const LS = "vt-dashboard-v1";
  const state = {
    whatIf: {},        // courseId -> bool
    custom: [],        // {id, code, units, calgetc:[], usc:[]}
    grades: {},        // courseId -> letter
    priorUnits: 0,
    priorGPA: 0
  };

  function load() {
    try {
      const raw = localStorage.getItem(LS);
      if (!raw) return;
      const o = JSON.parse(raw);
      if (o && typeof o === "object") {
        Object.assign(state, {
          whatIf: o.whatIf || {},
          custom: Array.isArray(o.custom) ? o.custom : [],
          grades: o.grades || {},
          priorUnits: Number(o.priorUnits) || 0,
          priorGPA: Number(o.priorGPA) || 0
        });
      }
    } catch (e) { /* storage blocked — run with defaults */ }
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) { /* no-op */ }
  }

  /* ---------------- course helpers ---------------- */

  const RANK = { completed: 4, ap: 4, "in-progress": 3, planned: 2, candidate: 1 };

  const ALL_TERMS = D.terms;
  const CONFIRMED_COURSES = ALL_TERMS
    .filter((t) => t.status !== "candidate")
    .reduce((a, t) => a.concat(t.courses.map((c) => Object.assign({ termId: t.id, termName: t.name }, c))), []);
  const CANDIDATE_COURSES = ALL_TERMS
    .filter((t) => t.status === "candidate")
    .reduce((a, t) => a.concat(t.courses.map((c) => Object.assign({ termId: t.id, termName: t.name }, c))), []);

  function activeCourses(includeScenario) {
    let list = CONFIRMED_COURSES.slice();
    if (includeScenario) {
      list = list.concat(CANDIDATE_COURSES.filter((c) => state.whatIf[c.id]));
      list = list.concat(state.custom.map((c) => Object.assign({}, c, { status: "candidate", termName: "Hypothetical" })));
    }
    return list;
  }

  /* ---------------- requirement engine ---------------- */

  // Returns { status, viaAP, unconfirmed, sources:[], have, needs }
  function resolveSlot(sources, needs) {
    needs = needs || 1;
    const sorted = sources.slice().sort((a, b) => RANK[b.rank] - RANK[a.rank]);
    const counted = sorted.slice(0, needs);

    if (counted.length < needs) {
      return {
        status: "open", viaAP: false, unconfirmed: false,
        sources: sorted, counted: counted, have: counted.length, needs: needs
      };
    }
    let minRank = 5;
    counted.forEach((s) => { minRank = Math.min(minRank, RANK[s.rank]); });

    let status = minRank === 4 ? "complete"
               : minRank === 3 ? "in-progress"
               : minRank === 2 ? "planned"
               : "whatif";

    return {
      status: status,
      viaAP: counted.some((s) => s.rank === "ap"),
      allAP: counted.every((s) => s.rank === "ap"),
      unconfirmed: counted.some((s) => s.unconfirmed),
      sources: sorted,
      counted: counted,
      have: counted.length,
      needs: needs
    };
  }

  function computeCalGETC(includeScenario) {
    const courses = activeCourses(includeScenario);
    const out = {};

    D.calgetc.areas.forEach((area) => {
      area.slots.forEach((slot) => {
        const sources = [];
        D.apCredit.forEach((ap) => {
          if (ap.calgetc.indexOf(slot.id) !== -1) {
            sources.push({ label: ap.name, rank: "ap", ap: true });
          }
        });
        courses.forEach((c) => {
          if ((c.calgetc || []).indexOf(slot.id) !== -1) {
            sources.push({
              label: c.code, rank: c.status, term: c.termName,
              scenario: c.status === "candidate"
            });
          }
        });
        out[slot.id] = resolveSlot(sources, slot.needs || 1);
      });
    });

    // area rollup = weakest slot
    const areaStatus = {};
    const ORDER = { open: 0, whatif: 1, planned: 2, "in-progress": 3, complete: 4 };
    D.calgetc.areas.forEach((area) => {
      let worst = "complete", anyAP = false;
      area.slots.forEach((slot) => {
        const r = out[slot.id];
        if (ORDER[r.status] < ORDER[worst]) worst = r.status;
        if (r.viaAP) anyAP = true;
      });
      areaStatus[area.id] = { status: worst, viaAP: anyAP };
    });

    return { slots: out, areas: areaStatus };
  }

  function computeUSC(includeScenario) {
    const courses = activeCourses(includeScenario);
    const out = {};
    D.uscge.categories.forEach((cat) => {
      const sources = [];
      // NOTE: AP credit is deliberately never a source here. USC does not accept it for GE.
      courses.forEach((c) => {
        if ((c.usc || []).indexOf(cat.id) !== -1) {
          sources.push({
            label: c.code, rank: c.status, term: c.termName,
            unconfirmed: !!c.uscUnconfirmed,
            scenario: c.status === "candidate"
          });
        }
      });
      out[cat.id] = resolveSlot(sources, cat.needs || 1);
    });
    return out;
  }

  /* ---------------- label helpers ---------------- */

  function cgLabel(r) {
    if (r.status === "complete") return r.allAP ? "Complete — via AP only" : (r.viaAP ? "Complete — partly via AP" : "Complete");
    if (r.status === "in-progress") return "In progress";
    if (r.status === "planned") return "Planned";
    if (r.status === "whatif") return "Would be satisfied";
    return r.have > 0 ? "Incomplete — " + r.have + " of " + r.needs : "Incomplete";
  }
  function uscLabel(r) {
    if (r.status === "complete") return "Satisfied";
    if (r.status === "in-progress") return "In progress";
    if (r.status === "planned") return r.unconfirmed ? "Likely — unconfirmed" : "Will be satisfied";
    if (r.status === "whatif") return "Would be satisfied";
    return r.have > 0 ? "Open — " + r.have + " of " + r.needs : "Open";
  }
  function badgeClass(r) {
    if (r.status === "complete") return r.allAP ? "b-ap" : "b-course";
    if (r.status === "in-progress") return "b-progress";
    if (r.status === "planned") return r.unconfirmed ? "b-unconf" : "b-planned";
    if (r.status === "whatif") return "b-whatif";
    return "b-open";
  }
  function slotClass(r) {
    if (r.status === "open") return "slot s-open";
    if (r.status === "whatif") return "slot s-whatif";
    if (r.status === "complete" && r.allAP) return "slot s-ap";
    return "slot";
  }
  function sourceText(r) {
    if (!r.counted || !r.counted.length) return "Nothing assigned yet";
    return r.counted.map((s) => {
      let txt = "<b>" + esc(s.label) + "</b>";
      if (s.ap) txt += " <span style='color:var(--amber)'>(AP — Cal-GETC only)</span>";
      else if (s.term) txt += " · " + esc(s.term);
      if (s.unconfirmed) txt += " <span style='color:var(--amber)'>(unconfirmed)</span>";
      if (s.scenario) txt += " <span style='color:var(--violet)'>(scenario)</span>";
      return txt;
    }).join(" &nbsp;+&nbsp; ");
  }

  /* ---------------- renderers ---------------- */

  function renderTankStats() {
    const cg = computeCalGETC(false);
    const usc = computeUSC(false);
    const openUSC = D.uscge.categories.filter((c) => usc[c.id].status === "open").length;
    const units = CONFIRMED_COURSES.reduce((a, c) => a + (c.units || 0), 0);

    const stats = [
      ["Cumulative GPA", D.meta.cumulativeGPA.toFixed(2)],
      ["Units in plan", String(units)],
      ["USC GE open", String(openUSC) + " of " + D.uscge.categories.length],
      ["USC deadline", "Feb 15, 2027"]
    ];
    const wrap = $("#tank-stats");
    wrap.innerHTML = "";
    stats.forEach(([k, v]) => {
      wrap.appendChild(el("div", "tank-stat", esc(k) + " <b>" + esc(v) + "</b>"));
    });
  }

  function renderOverview() {
    $("#ov-sub").textContent =
      D.meta.student + " · " + D.meta.college + " · " + D.meta.path +
      " · targeting " + D.meta.targetTerm + ". Data current as of " + D.meta.asOf + ".";

    $("#ov-premise").innerHTML =
      '<div class="alert info"><div class="ico">🎯</div><div>' +
      "<h3>" + esc(D.premise.headline) + "</h3>" +
      "<p>" + esc(D.premise.body) + "</p></div></div>";

    const wrap = $("#ov-schools");
    wrap.innerHTML = "";
    D.schools.forEach((s) => {
      const c = el("div", "card school-card");
      c.innerHTML =
        '<div class="sc-top"><div><h3>' + esc(s.name) + "</h3>" +
        '<div class="sc-major">' + esc(s.major) + "</div></div>" +
        '<span class="sc-tier tier-' + s.tier + '">' + esc(s.tierLabel) + "</span></div>" +
        '<div style="font-size:12.5px;color:var(--ink-faint);margin-top:8px">' +
        (s.deadline ? "⏱ Deadline " + esc(s.deadlineLabel) : "⏱ " + esc(s.deadlineLabel)) + "</div>" +
        "<ul>" + s.notes.map((n) => "<li>" + esc(n) + "</li>").join("") + "</ul>";
      wrap.appendChild(c);
    });

    $("#ov-ap").innerHTML =
      '<div class="alert"><div class="ico">⚠️</div><div style="flex:1">' +
      "<h3>AP credit counts for Cal-GETC. It does not count for USC.</h3>" +
      "<p>" + esc(D.apRule) + "</p>" +
      '<p>This is the single most error-prone part of the plan. Anywhere a requirement is ' +
      'satisfied by AP, it is marked <span class="badge b-ap">via AP</span> — meaning ' +
      "Cal-GETC only, and still open for USC.</p>" +
      '<div class="ap-chip-row">' +
      D.apCredit.map((ap) =>
        '<div class="ap-chip"><b>' + esc(ap.name) + "</b> → " + esc(ap.calgetcLabel) +
        "<span>" + esc(ap.note) + "</span></div>").join("") +
      "</div></div></div>";
  }

  function renderOpen() {
    const cg = computeCalGETC(false);
    const usc = computeUSC(false);
    const items = [];

    D.uscge.categories.forEach((cat) => {
      const r = usc[cat.id];
      if (r.status !== "open") return;
      const blockedByAP = D.apCredit.filter((ap) => ap.uscWouldBe === cat.id);
      const cands = CANDIDATE_COURSES.filter((c) => (c.usc || []).indexOf(cat.id) !== -1);
      items.push({
        sev: "high",
        mark: "●",
        title: "USC GE-" + cat.id + " (" + cat.name + ") is open" +
               (cat.needs > 1 ? " — needs " + cat.needs + " courses, has " + r.have : ""),
        body: blockedByAP.length
          ? blockedByAP[0].name + " satisfies the Cal-GETC equivalent but carries no USC GE credit, so this category is untouched."
          : "No course currently assigned to this category.",
        fix: cands.length
          ? "Candidate" + (cands.length > 1 ? "s" : "") + ": " + cands.map((c) => c.code).join(" + ") + " (Summer 2027, unscheduled)"
          : "No course planned. Needs one identified."
      });
    });

    D.calgetc.areas.forEach((area) => {
      area.slots.forEach((slot) => {
        const r = cg.slots[slot.id];
        if (r.status !== "open") return;
        items.push({
          sev: "high", mark: "●",
          title: "Cal-GETC " + slot.name + " is unsatisfied",
          body: "Required for the Associate's degree and UC eligibility.",
          fix: "No course assigned."
        });
      });
    });

    const su27 = ALL_TERMS.filter((t) => t.status === "candidate")[0];
    if (su27) {
      items.push({
        sev: "med", mark: "◐",
        title: "Summer 2027 is undecided",
        body: su27.verified,
        fix: "Candidates under consideration: " + su27.courses.map((c) => c.code).join(", ") +
             ". Use the What-If section to see what each closes."
      });
    }

    CONFIRMED_COURSES.filter((c) => c.uscUnconfirmed).forEach((c) => {
      const target = (c.usc || []).length ? "USC GE-" + c.usc.join("/") : "the USC Writing Requirement";
      items.push({
        sev: "med", mark: "◐",
        title: c.code + " → " + target + " is unconfirmed",
        body: c.note,
        fix: "Confirm directly with Lucy Jordan (lucyjord@usc.edu) or busadm@marshall.usc.edu."
      });
    });

    (D.majorPrepSchoolNotes.usc || []).filter((n) => n.status === "todo").forEach((n) => {
      items.push({ sev: "med", mark: "◐", title: n.text, body: "USC Marshall application requirement.", fix: "" });
    });

    const elective = CONFIRMED_COURSES.filter((c) => c.flag === "elective");
    elective.forEach((c) => {
      items.push({
        sev: "low", mark: "○",
        title: c.code + " (" + c.units + " units) fulfills nothing",
        body: c.note,
        fix: "No action — already registered. Worth knowing it's " + c.units + " units of pure elective."
      });
    });

    const wrap = $("#open-list");
    wrap.innerHTML = "";
    if (!items.length) {
      wrap.innerHTML = '<p style="margin:0;color:var(--teal)">Nothing open. Everything is assigned.</p>';
      return;
    }
    const order = { high: 0, med: 1, low: 2 };
    items.sort((a, b) => order[a.sev] - order[b.sev]);
    items.forEach((it) => {
      wrap.appendChild(el("div", "open-item sev-" + it.sev,
        '<span class="oi-mark">' + it.mark + "</span><div>" +
        "<h4>" + esc(it.title) + "</h4>" +
        "<p>" + esc(it.body) + "</p>" +
        (it.fix ? '<div class="oi-fix">→ ' + esc(it.fix) + "</div>" : "") +
        "</div>"));
    });
  }

  function courseBadges(c) {
    const out = [];
    (c.calgetc || []).forEach((s) => out.push('<span class="badge b-course">Cal-GETC ' + esc(s) + "</span>"));
    (c.usc || []).forEach((u) => out.push(
      '<span class="badge ' + (c.uscUnconfirmed ? "b-unconf" : "b-course") + '">USC GE-' + esc(u) +
      (c.uscUnconfirmed ? " ?" : "") + "</span>"));
    if (c.uscWriting) out.push('<span class="badge b-unconf">USC Writing ?</span>');
    if ((c.majorPrep || []).length) out.push('<span class="badge b-progress">Major prep</span>');
    if (c.berkeleyPrereq) out.push('<span class="badge b-progress">Haas prereq</span>');
    if (c.flag === "elective") out.push('<span class="badge b-elective">Pure elective</span>');
    if (c.status === "candidate") out.push('<span class="badge b-whatif">Candidate only</span>');
    if (!out.length) out.push('<span class="badge b-elective">No requirement credit</span>');
    return out.join("");
  }

  function renderTerms() {
    const wrap = $("#terms-list");
    wrap.innerHTML = "";
    ALL_TERMS.forEach((term) => {
      const units = term.courses.reduce((a, c) => a + (c.units || 0), 0);
      const card = el("div", "card term" + (term.scratchpad ? " scratch" : ""));

      const badge = term.status === "completed" ? "b-course"
                  : term.status === "in-progress" ? "b-progress"
                  : term.status === "planned" ? "b-planned" : "b-whatif";

      card.appendChild(el("div", "term-head",
        "<h3>" + esc(term.name) + "</h3>" +
        '<span class="badge ' + badge + '">' + esc(term.statusLabel) + "</span>" +
        '<span class="term-units">' + units + " units" +
        (term.courses.some((c) => c.unitsAssumed) ? " *" : "") + "</span>"));

      term.courses.forEach((c) => {
        const row = el("div", "course" + (c.flag === "elective" ? " elective" : ""));
        row.innerHTML =
          '<span class="course-dot ' + c.status + '"></span>' +
          '<div class="course-main">' +
            '<div class="course-code">' + esc(c.code) + "</div>" +
            '<div class="course-title">' + esc(c.title) + "</div>" +
            (c.note ? '<div class="course-note">' + esc(c.note) + "</div>" : "") +
            '<div class="course-badges">' + courseBadges(c) + "</div>" +
          "</div>" +
          '<div class="course-units">' + (c.units || 0) +
            (c.unitsAssumed ? '<span class="assumed" title="Unit count not stated in the source brief — confirm in DegreeWorks">*</span>' : "") +
            " u" +
            (c.grade ? '<div class="course-grade">' + esc(c.grade) + "</div>" : "") +
          "</div>";
        card.appendChild(row);
      });

      if (term.verified) card.appendChild(el("p", "term-note", esc(term.verified)));
      if (term.unitsNote) card.appendChild(el("p", "term-note", "* " + esc(term.unitsNote)));
      wrap.appendChild(card);
    });
  }

  function renderCalGETC() {
    $("#cg-title").textContent = D.calgetc.label;
    $("#cg-sub").textContent = D.calgetc.sublabel + " Areas marked via AP are complete for Cal-GETC only.";

    const cg = computeCalGETC(false);
    const wrap = $("#cg-list");
    wrap.innerHTML = "";

    D.calgetc.areas.forEach((area) => {
      const box = el("div", "req-area");
      const a = cg.areas[area.id];
      const fakeR = { status: a.status, allAP: a.viaAP && a.status === "complete", viaAP: a.viaAP, have: 1, needs: 1 };

      box.appendChild(el("div", "req-area-head",
        "<h4>Area " + esc(area.id) + " — " + esc(area.name) + "</h4>" +
        '<span class="spacer"></span>' +
        '<span class="badge ' + badgeClass(fakeR) + '">' + esc(cgLabel(fakeR)) + "</span>"));

      area.slots.forEach((slot) => {
        const r = cg.slots[slot.id];
        const s = el("div", slotClass(r));
        s.innerHTML =
          '<div class="slot-name">' + esc(slot.name) +
            (r.needs > 1 ? ' <span style="color:var(--ink-faint);font-size:12px">(' + r.needs + " courses)</span>" : "") +
          "</div>" +
          '<span class="badge ' + badgeClass(r) + '">' + esc(cgLabel(r)) + "</span>" +
          '<div class="slot-by">' + sourceText(r) + "</div>";
        box.appendChild(s);
      });

      wrap.appendChild(box);
    });

    wrap.appendChild(el("div", "legend",
      '<span class="badge b-course">Complete via course — counts everywhere</span>' +
      '<span class="badge b-ap">Complete via AP — Cal-GETC only</span>' +
      '<span class="badge b-progress">In progress</span>' +
      '<span class="badge b-planned">Planned</span>' +
      '<span class="badge b-open">Incomplete</span>'));
  }

  function renderUSC() {
    $("#usc-title").textContent = D.uscge.label;
    $("#usc-sub").textContent = D.uscge.sublabel + ".";

    $("#usc-residency").innerHTML =
      '<div class="alert info"><div class="ico">ℹ️</div><div>' +
      "<h3>Open categories at transfer are normal</h3>" +
      "<p>" + esc(D.uscge.residencyNote) + "</p></div></div>";

    const usc = computeUSC(false);
    const wrap = $("#usc-list");
    wrap.innerHTML = "";

    D.uscge.categories.forEach((cat) => {
      const r = usc[cat.id];
      const cls = r.status === "open" ? "open" : (r.status === "whatif" ? "whatif" : "done");
      const box = el("div", slotClass(r) + " usc-cat " + cls);
      box.style.gridTemplateColumns = "auto 1fr auto";
      box.innerHTML =
        '<span class="usc-letter">' + esc(cat.id) + "</span>" +
        '<div class="slot-name">' + esc(cat.name) +
          (cat.needs > 1 ? ' <span style="color:var(--ink-faint);font-size:12px">(' + cat.needs + " courses)</span>" : "") +
        "</div>" +
        '<span class="badge ' + badgeClass(r) + '">' + esc(uscLabel(r)) + "</span>" +
        '<div class="slot-by" style="grid-column:2/4">' + sourceText(r) + "</div>";
      wrap.appendChild(box);
    });

    const done = D.uscge.categories.filter((c) => usc[c.id].status !== "open").length;
    wrap.appendChild(el("div", "", 
      '<div style="margin-top:14px;font-size:13px;color:var(--ink-dim)">' +
      done + " of " + D.uscge.categories.length + " categories covered or on track by Spring 2027." +
      '</div><div class="progress-line partial"><i style="width:' +
      Math.round((done / D.uscge.categories.length) * 100) + '%"></i></div>'));
  }

  function renderMajorPrep() {
    $("#mp-sub").textContent = D.majorPrepNote;
    const wrap = $("#mp-list");
    wrap.innerHTML = "";

    const MARK = { done: "✓", todo: "○", blocked: "✕", info: "ℹ", deadline: "⏱" };

    D.schools.forEach((s) => {
      const courses = CONFIRMED_COURSES.filter((c) => (c.majorPrep || []).indexOf(s.id) !== -1);
      const units = courses.reduce((a, c) => a + (c.units || 0), 0);
      const notes = D.majorPrepSchoolNotes[s.id] || [];

      const card = el("div", "card school-card");
      card.innerHTML =
        '<div class="sc-top"><div><h3>' + esc(s.name) + "</h3>" +
        '<div class="sc-major">' + esc(s.major) + "</div></div>" +
        '<span class="sc-tier tier-' + s.tier + '">' + esc(s.tierLabel) + "</span></div>" +

        '<div style="margin-top:14px;font-size:12px;color:var(--ink-faint);letter-spacing:.06em;text-transform:uppercase">' +
        "Major prep courses · " + units + " units</div>" +

        courses.map((c) =>
          '<div style="display:flex;gap:9px;align-items:baseline;font-size:13px;padding:7px 0;border-bottom:1px solid rgba(29,74,99,.3)">' +
          '<span class="course-dot ' + c.status + '" style="margin-top:5px"></span>' +
          "<span><b>" + esc(c.code) + "</b> <span style='color:var(--ink-faint)'>" + esc(c.title) + "</span>" +
          "<br><span style='color:var(--ink-faint);font-size:11.5px'>" + esc(c.termName) + " · " + c.units + " units" +
          (c.grade ? " · grade " + esc(c.grade) : "") + "</span></span></div>").join("") +

        '<ul class="prep-check">' + notes.map((n) =>
          '<li class="pc-' + n.status + '"><span class="pc-mark">' + (MARK[n.status] || "○") +
          "</span><span>" + esc(n.text) + "</span></li>").join("") + "</ul>";

      wrap.appendChild(card);
    });
  }

  /* ---------------- GPA ---------------- */

  const GRADES = [
    ["", null], ["A", 4.0], ["A-", 3.7], ["B+", 3.3], ["B", 3.0], ["B-", 2.7],
    ["C+", 2.3], ["C", 2.0], ["C-", 1.7], ["D+", 1.3], ["D", 1.0], ["D-", 0.7], ["F", 0.0]
  ];
  const gradePoints = (g) => {
    const hit = GRADES.filter((x) => x[0] === g)[0];
    return hit ? hit[1] : null;
  };
  const gradeOf = (c) => (state.grades[c.id] !== undefined ? state.grades[c.id] : (c.grade || ""));

  function gpaFor(courses) {
    let pts = 0, units = 0;
    courses.forEach((c) => {
      const gp = gradePoints(gradeOf(c));
      if (gp === null || !c.units) return;
      pts += gp * c.units;
      units += c.units;
    });
    return { pts: pts, units: units, gpa: units ? pts / units : null };
  }

  function renderGPA() {
    const graded = gpaFor(CONFIRMED_COURSES);
    const priorPts = state.priorUnits * state.priorGPA;
    const cumUnits = graded.units + state.priorUnits;
    const cumGPA = cumUnits ? (graded.pts + priorPts) / cumUnits : null;
    const planUnits = CONFIRMED_COURSES.reduce((a, c) => a + (c.units || 0), 0);

    $("#gpa-tiles").innerHTML =
      '<div class="card gpa-tile"><div class="num">' + D.meta.cumulativeGPA.toFixed(2) + "</div>" +
      '<div class="lbl">GPA ON RECORD</div><div class="sub">' + esc(D.meta.gpaSource) + " · " + esc(D.meta.asOf) + "</div></div>" +

      '<div class="card gpa-tile"><div class="num' + (cumGPA === null ? " muted" : "") + '">' +
      (cumGPA === null ? "—" : cumGPA.toFixed(2)) + "</div>" +
      '<div class="lbl">COMPUTED CUMULATIVE</div><div class="sub">from ' + cumUnits + " graded units</div></div>" +

      '<div class="card gpa-tile"><div class="num' + (graded.units ? "" : " muted") + '">' +
      graded.units + "</div>" +
      '<div class="lbl">GRADED UNITS</div><div class="sub">of ' + planUnits + " in plan</div></div>";

    const wrap = $("#gpa-terms");
    wrap.innerHTML = "";

    ALL_TERMS.filter((t) => t.status !== "candidate").forEach((term) => {
      const tg = gpaFor(term.courses);
      const box = el("div", "gpa-term");
      box.appendChild(el("h4", "",
        esc(term.name) +
        '<span class="badge ' + (term.status === "completed" ? "b-course" : term.status === "in-progress" ? "b-progress" : "b-planned") +
        '">' + esc(term.statusLabel) + "</span>" +
        '<span class="tgpa' + (tg.gpa === null ? " none" : "") + '">' +
        (tg.gpa === null ? "no grades yet" : "term GPA " + tg.gpa.toFixed(2)) + "</span>"));

      term.courses.forEach((c) => {
        const row = el("div", "gpa-row");
        row.innerHTML =
          '<div class="gr-code"><b>' + esc(c.code) + "</b><small>" + esc(c.title) + "</small></div>" +
          '<div class="gr-units">' + (c.units || 0) + " u</div>";
        const sel = el("select");
        sel.setAttribute("aria-label", "Grade for " + c.code);
        GRADES.forEach(([g]) => {
          const o = el("option");
          o.value = g;
          o.textContent = g === "" ? "—" : g;
          sel.appendChild(o);
        });
        sel.value = gradeOf(c);
        sel.addEventListener("change", function () {
          state.grades[c.id] = sel.value;
          save();
          renderGPA();
        });
        row.appendChild(sel);
        box.appendChild(row);
      });

      wrap.appendChild(box);
    });

    const prior = el("div", "prior-row");
    prior.innerHTML =
      "<div><label for='pu'>Prior graded units</label>" +
      "<input type='number' id='pu' min='0' step='0.5' value='" + state.priorUnits + "' style='width:110px'></div>" +
      "<div><label for='pg'>Prior GPA</label>" +
      "<input type='number' id='pg' min='0' max='4' step='0.01' value='" + state.priorGPA + "' style='width:110px'></div>" +
      "<p style='margin:0;flex:1 1 260px;font-size:12px;color:var(--ink-faint)'>" +
      "The computed cumulative only reflects grades entered above. If DegreeWorks shows " +
      D.meta.cumulativeGPA.toFixed(2) + " over more coursework than is listed here, enter that prior " +
      "record to reconcile the two numbers.</p>";
    wrap.appendChild(prior);

    prior.querySelector("#pu").addEventListener("input", function (e) {
      state.priorUnits = Number(e.target.value) || 0; save(); renderGPA();
    });
    prior.querySelector("#pg").addEventListener("input", function (e) {
      state.priorGPA = Number(e.target.value) || 0; save(); renderGPA();
    });
  }

  /* ---------------- What-If ---------------- */

  function renderWhatIf() {
    const base = { cg: computeCalGETC(false), usc: computeUSC(false) };
    const scen = { cg: computeCalGETC(true), usc: computeUSC(true) };

    const activeCount = CANDIDATE_COURSES.filter((c) => state.whatIf[c.id]).length + state.custom.length;

    $("#wi-banner").innerHTML =
      "<p>" + (activeCount
        ? "<b>Scenario active</b> — " + activeCount + " hypothetical course" + (activeCount > 1 ? "s" : "") +
          " applied. The trackers above still show the <b>confirmed</b> plan only."
        : "<b>No scenario active.</b> Toggle a candidate below to see its effect.") + "</p>";

    // toggles
    const tw = $("#wi-toggles");
    tw.innerHTML = "";
    CANDIDATE_COURSES.forEach((c) => {
      const on = !!state.whatIf[c.id];
      const row = el("label", "toggle-row" + (on ? " on" : ""));
      row.innerHTML =
        '<input type="checkbox"' + (on ? " checked" : "") + ">" +
        '<div style="flex:1"><div class="tr-code">' + esc(c.code) + " · " + esc(c.title) + "</div>" +
        '<div class="tr-note">' + esc(c.note) + "</div>" +
        '<div class="tr-badges">' + courseBadges(c) + "</div></div>";
      row.querySelector("input").addEventListener("change", function (e) {
        state.whatIf[c.id] = e.target.checked;
        save();
        renderWhatIf();
      });
      tw.appendChild(row);
    });

    // custom list
    const cl = $("#cc-list");
    cl.innerHTML = "";
    state.custom.forEach((c) => {
      const item = el("div", "custom-item");
      item.innerHTML =
        "<b>" + esc(c.code) + "</b> <span style='color:var(--ink-faint)'>" + c.units + " u</span>" +
        '<span style="display:flex;gap:5px;flex-wrap:wrap">' +
        (c.calgetc || []).map((x) => '<span class="badge b-whatif">Cal-GETC ' + esc(x) + "</span>").join("") +
        (c.usc || []).map((x) => '<span class="badge b-whatif">USC GE-' + esc(x) + "</span>").join("") +
        "</span>" +
        '<button class="ci-x" type="button" aria-label="Remove ' + esc(c.code) + '">×</button>';
      item.querySelector(".ci-x").addEventListener("click", function () {
        state.custom = state.custom.filter((x) => x.id !== c.id);
        save();
        renderWhatIf();
      });
      cl.appendChild(item);
    });

    // deltas
    const deltas = [];
    D.calgetc.areas.forEach((area) => {
      area.slots.forEach((slot) => {
        const b = base.cg.slots[slot.id], s = scen.cg.slots[slot.id];
        if (cgLabel(b) !== cgLabel(s)) {
          deltas.push({ what: "Cal-GETC " + slot.name, from: cgLabel(b), to: cgLabel(s) });
        }
      });
    });
    D.uscge.categories.forEach((cat) => {
      const b = base.usc[cat.id], s = scen.usc[cat.id];
      if (uscLabel(b) !== uscLabel(s)) {
        deltas.push({ what: "USC GE-" + cat.id + " (" + cat.name + ")", from: uscLabel(b), to: uscLabel(s) });
      }
    });

    const dw = $("#wi-deltas");
    dw.innerHTML = "";
    if (!deltas.length) {
      dw.innerHTML = '<p class="delta-empty">' +
        (activeCount ? "No requirement status changes from this scenario." : "Nothing selected.") + "</p>";
    } else {
      deltas.forEach((d) => {
        dw.appendChild(el("div", "delta",
          '<span class="d-arrow">→</span><div><b>' + esc(d.what) + "</b><br>" +
          '<span class="d-from">' + esc(d.from) + '</span> <span style="color:var(--ink-faint)">→</span> ' +
          '<span class="d-to">' + esc(d.to) + "</span></div>"));
      });
      const openBefore = D.uscge.categories.filter((c) => base.usc[c.id].status === "open").length;
      const openAfter = D.uscge.categories.filter((c) => scen.usc[c.id].status === "open").length;
      if (openBefore !== openAfter) {
        dw.appendChild(el("div", "delta",
          '<span class="d-arrow">Σ</span><div><b>USC GE categories still open</b><br>' +
          '<span class="d-from">' + openBefore + '</span> <span style="color:var(--ink-faint)">→</span> ' +
          '<span class="d-to">' + openAfter + "</span></div>"));
      }
    }
  }

  function initWhatIfControls() {
    // chip pickers
    const cgWrap = $("#cc-calgetc");
    D.calgetc.areas.forEach((area) => {
      area.slots.forEach((slot) => {
        const l = el("label", "", '<input type="checkbox" value="' + slot.id + '">' + esc(slot.id));
        cgWrap.appendChild(l);
      });
    });
    const uWrap = $("#cc-usc");
    D.uscge.categories.forEach((cat) => {
      uWrap.appendChild(el("label", "", '<input type="checkbox" value="' + cat.id + '">' + esc(cat.id)));
    });

    $("#cc-add").addEventListener("click", function () {
      const code = $("#cc-code").value.trim();
      if (!code) { $("#cc-code").focus(); return; }
      const units = Number($("#cc-units").value) || 0;
      const cg = Array.prototype.slice.call(cgWrap.querySelectorAll("input:checked")).map((i) => i.value);
      const us = Array.prototype.slice.call(uWrap.querySelectorAll("input:checked")).map((i) => i.value);
      state.custom.push({
        id: "custom-" + Date.now(),
        code: code, title: "Hypothetical", units: units,
        calgetc: cg, usc: us, majorPrep: []
      });
      save();
      $("#cc-code").value = "";
      cgWrap.querySelectorAll("input:checked").forEach((i) => { i.checked = false; });
      uWrap.querySelectorAll("input:checked").forEach((i) => { i.checked = false; });
      renderWhatIf();
    });

    $("#cc-code").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); $("#cc-add").click(); }
    });

    $("#wi-reset").addEventListener("click", function () {
      state.whatIf = {};
      state.custom = [];
      save();
      renderWhatIf();
    });
    $("#wi-all").addEventListener("click", function () {
      CANDIDATE_COURSES.forEach((c) => { state.whatIf[c.id] = true; });
      save();
      renderWhatIf();
    });
  }

  /* ---------------- contacts ---------------- */

  function renderContacts() {
    const usc = D.schools.filter((s) => s.id === "usc")[0];
    const target = new Date(usc.deadline + "T23:59:59");
    const days = Math.ceil((target - new Date()) / 86400000);

    $("#deadline-strip").innerHTML =
      '<div class="deadline-strip"><div class="dl-num">' +
      (days > 0 ? days : "—") + "</div>" +
      '<div class="dl-txt"><h3>' + (days > 0 ? "days until the USC Marshall deadline" : "USC Marshall deadline has passed") + "</h3>" +
      "<p>" + esc(usc.deadlineLabel) + " · " + esc(usc.name) + ", " + esc(usc.major) +
      " · 2 recommendation letters required</p></div></div>";

    const wrap = $("#contact-list");
    wrap.innerHTML = "";
    D.contacts.forEach((c) => {
      wrap.appendChild(el("div", "contact",
        '<span class="c-name">' + esc(c.name) + "</span>" +
        (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "") +
        (c.phone ? '<a href="tel:' + esc(c.phone.replace(/[^0-9+]/g, "")) + '">' + esc(c.phone) + "</a>" : "") +
        '<span class="c-role">' + esc(c.role) + "</span>"));
    });

    $("#foot-meta").textContent =
      D.meta.student + " · data current as of " + D.meta.asOf + " (" + D.meta.gpaSource + ")";
  }

  /* ---------------- nav ---------------- */

  function initNav() {
    const links = Array.prototype.slice.call(document.querySelectorAll(".nav-inner a"));
    const sections = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
        });
      }, { rootMargin: "-58px 0px -65% 0px", threshold: 0 });
      sections.forEach((s) => io.observe(s));
    }

    $("#enter-btn").addEventListener("click", function () {
      document.getElementById("overview").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---------------- title screen ---------------- */

  function initTank() {
    const frame = $("#tank-frame");
    const ph = $("#tank-placeholder");

    if (frame && ph) {
      const hide = function () { ph.style.opacity = "0"; setTimeout(function () { ph.hidden = true; }, 500); };
      ph.style.transition = "opacity .5s ease";
      if (frame.contentDocument && frame.contentDocument.readyState === "complete") hide();
      frame.addEventListener("load", hide);
      // The tank's own "Filling tank…" screen covers the gap between the
      // iframe firing load and the models actually arriving; don't wait
      // on it forever if the bundle fails outright.
      setTimeout(hide, 12000);
    }

    // The embedded tank is decorative: pointer-events:none keeps the page
    // scrollable (see the #tank-frame comment in styles.css). Its DEX,
    // camera and ANGLE buttons therefore can't be clicked here, so hide
    // them inside the frame rather than float dead controls over the
    // title. The frame is same-origin, so a stylesheet injection does it
    // without modifying the vendored build. The real controls live in the
    // standalone tab that "Open the tank" opens.
    if (frame) {
      const hideFrameChrome = function () {
        try {
          const doc = frame.contentDocument;
          if (!doc || doc.getElementById("embed-chrome")) return;
          const st = doc.createElement("style");
          st.id = "embed-chrome";
          st.textContent = "body > button { display: none !important; }";
          (doc.head || doc.documentElement).appendChild(st);
        } catch (err) { /* cross-origin: the buttons stay, harmlessly inert */ }
      };
      frame.addEventListener("load", hideFrameChrome);
      hideFrameChrome();
    }

    // Deep links skip the title screen entirely. Someone opening
    // …/#open to check an action item shouldn't land on a WebGL scene
    // first — and they shouldn't have to scroll past a frame that
    // swallows drag gestures on a phone.
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const target = document.querySelector(hash);
      if (target) {
        // after layout settles — the iframe resizing can otherwise
        // shift the anchor out from under the initial jump
        requestAnimationFrame(function () {
          setTimeout(function () {
            target.scrollIntoView({ behavior: "auto", block: "start" });
          }, 60);
        });
      }
    }
  }

  /* ---------------- boot ---------------- */

  load();
  renderTankStats();
  renderOverview();
  renderOpen();
  renderTerms();
  renderCalGETC();
  renderUSC();
  renderMajorPrep();
  renderGPA();
  initWhatIfControls();
  renderWhatIf();
  renderContacts();
  initNav();
  initTank();
})();
