/* ============================================================
   app.js — renders the dashboard from data.js
   Independent of the tank in /tank.
   ============================================================ */

(function () {
  "use strict";

  const D = window.DATA;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------------- state ---------------- */

  const LS = "vt-dashboard-v2";
  const state = { whatIf: {}, custom: [], grades: {} };

  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(LS) || "{}");
      Object.assign(state, {
        whatIf: o.whatIf || {},
        custom: Array.isArray(o.custom) ? o.custom : [],
        grades: o.grades || {}
      });
    } catch (e) { /* storage blocked — run with defaults */ }
  }
  function save() {
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) { /* no-op */ }
  }

  /* ---------------- courses ---------------- */

  const RANK = { completed: 4, "in-progress": 3, planned: 2, candidate: 1 };
  const ORDER = { open: 0, whatif: 1, planned: 2, "in-progress": 3, complete: 4 };

  const withTerm = (t) => t.courses.map((c) => Object.assign({ termId: t.id, termName: t.name }, c));
  const CONFIRMED = D.terms.filter((t) => t.status !== "candidate").reduce((a, t) => a.concat(withTerm(t)), []);
  const CANDIDATES = D.terms.filter((t) => t.status === "candidate").reduce((a, t) => a.concat(withTerm(t)), []);
  const byId = {};
  CONFIRMED.concat(CANDIDATES).forEach((c) => { byId[c.id] = c; });

  function activeCourses(scenario) {
    let list = CONFIRMED.slice();
    if (scenario) {
      list = list.concat(CANDIDATES.filter((c) => state.whatIf[c.id]));
      list = list.concat(state.custom.map((c) => Object.assign({}, c, { status: "candidate", termName: "Hypothetical" })));
    }
    return list;
  }

  /* ---------------- requirement engine ---------------- */

  function resolveSlot(sources, needs) {
    needs = needs || 1;
    const sorted = sources.slice().sort((a, b) => RANK[b.rank] - RANK[a.rank]);
    const counted = sorted.slice(0, needs);
    if (counted.length < needs) {
      return { status: "open", unconfirmed: false, counted: counted, have: counted.length, needs: needs };
    }
    let min = 5;
    counted.forEach((s) => { min = Math.min(min, RANK[s.rank]); });
    return {
      status: min === 4 ? "complete" : min === 3 ? "in-progress" : min === 2 ? "planned" : "whatif",
      unconfirmed: counted.some((s) => s.unconfirmed),
      counted: counted,
      have: counted.length,
      needs: needs
    };
  }

  function srcOf(c, key) {
    return { course: c, rank: c.status, unconfirmed: key === "usc" && !!c.uscUnconfirmed,
             scenario: c.status === "candidate" };
  }

  function computeCalGETC(scenario) {
    const courses = activeCourses(scenario);
    const slots = {}, areas = {};
    D.calgetc.areas.forEach((area) => {
      area.slots.forEach((slot) => {
        const src = courses.filter((c) => (c.calgetc || []).indexOf(slot.id) !== -1).map((c) => srcOf(c, "cg"));
        slots[slot.id] = resolveSlot(src, slot.needs || 1);
      });
      let worst = "complete", units = 0;
      const seen = {};
      area.slots.forEach((slot) => {
        const r = slots[slot.id];
        if (ORDER[r.status] < ORDER[worst]) worst = r.status;
        r.counted.forEach((s) => {
          if (!seen[s.course.id]) { seen[s.course.id] = 1; units += s.course.units || 0; }
        });
      });
      areas[area.id] = { status: worst, units: units };
    });
    return { slots: slots, areas: areas };
  }

  function computeUSC(scenario) {
    const courses = activeCourses(scenario);
    const out = {};
    D.uscge.categories.forEach((cat) => {
      const src = courses.filter((c) => (c.usc || []).indexOf(cat.id) !== -1).map((c) => srcOf(c, "usc"));
      out[cat.id] = resolveSlot(src, cat.needs || 1);
    });
    return out;
  }

  /* ---------------- shared bits ---------------- */

  const ICON = {
    complete:     '<span class="ico ico-done" aria-hidden="true">&#10003;</span>',
    "in-progress":'<span class="ico ico-prog" aria-hidden="true">&#9680;</span>',
    planned:      '<span class="ico ico-plan" aria-hidden="true">&#9675;</span>',
    whatif:       '<span class="ico ico-what" aria-hidden="true">&#9675;</span>',
    open:         '<span class="ico ico-open" aria-hidden="true">&#9675;</span>'
  };
  const PILL = {
    complete:     '<span class="pill p-done">COMPLETE</span>',
    "in-progress":'<span class="pill p-prog">IN-PROGRESS</span>',
    planned:      '<span class="pill p-plan">REGISTERED</span>',
    whatif:       '<span class="pill p-what">SCENARIO</span>',
    open:         '<span class="pill p-open">INCOMPLETE</span>'
  };
  const label = (r, kind) => {
    if (r.status === "complete") return "Complete";
    if (r.status === "in-progress") return "In progress";
    if (r.status === "planned") return r.unconfirmed ? "Likely — unconfirmed" : (kind === "usc" ? "Will be satisfied" : "Registered");
    if (r.status === "whatif") return "Would be satisfied";
    return r.have > 0 ? "Incomplete — " + r.have + " of " + r.needs : "Incomplete";
  };

  // One row of the audit-style course table
  function courseRow(c, opts) {
    opts = opts || {};
    const g = gradeOf(c);
    return '<div class="crow' + (opts.sub ? " sub" : "") + '">' +
      '<div class="c-icon">' + (ICON[c.status === "completed" ? "complete" : c.status] || ICON.open) + "</div>" +
      '<div class="c-req">' + esc(opts.reqName || "") + "</div>" +
      '<div class="c-code">' + esc(c.code) + "</div>" +
      '<div class="c-title">' + esc(c.title) +
        (c.viaExam ? '<span class="via">via ' + esc(c.viaExam) + "</span>" : "") + "</div>" +
      '<div class="c-grade">' + (g ? esc(g) : c.status === "completed" ? "—" : "") + "</div>" +
      '<div class="c-units">' + (c.status === "completed" ? c.units : "(" + c.units + ")") +
        (c.unitsAssumed ? "*" : "") + "</div>" +
      '<div class="c-term">' + esc(c.termName || "") + "</div>" +
    "</div>";
  }

  function stillNeeded(text, options) {
    return '<div class="needed">' +
      '<span class="n-lab">Still needed:</span>' +
      '<span class="n-body">' + text +
        (options && options.length
          ? '<span class="opts">' + options.map((o) => '<code>' + esc(o) + "</code>").join('<i>or</i>') + "</span>"
          : "") +
      "</span></div>";
  }

  /* ---------------- title screen stats ---------------- */

  function renderTankStats() {
    const usc = computeUSC(false);
    const open = D.uscge.categories.filter((c) => usc[c.id].status === "open").length;
    const stats = [
      ["Degree GPA", D.meta.degreeGPA.toFixed(2)],
      ["Units applied", D.meta.unitsApplied + " of " + D.meta.unitsRequired],
      ["USC GE open", open + " of " + D.uscge.categories.length],
      ["USC deadline", "Feb 15, 2027"]
    ];
    const w = $("#tank-stats");
    w.innerHTML = "";
    stats.forEach(([k, v]) => w.appendChild(el("div", "tank-stat", esc(k) + " <b>" + esc(v) + "</b>")));
  }

  /* ---------------- degree summary ---------------- */

  function renderDegree() {
    const m = D.meta;
    const pct = m.progressPercent;
    const R = 52, C = 2 * Math.PI * R;

    $("#degree-block").innerHTML =
      '<div class="card audit-head">' +
        '<div class="ring-wrap">' +
          '<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="Degree progress ' + pct + ' percent">' +
            '<circle class="ring-bg" cx="60" cy="60" r="' + R + '"></circle>' +
            '<circle class="ring-fg" cx="60" cy="60" r="' + R + '" ' +
              'stroke-dasharray="' + C.toFixed(1) + '" ' +
              'stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"></circle>' +
            '<text class="ring-num" x="60" y="66">' + pct + "%</text>" +
          "</svg>" +
          '<div class="ring-cap">Requirements</div>' +
        "</div>" +

        '<div class="audit-meta">' +
          "<h3>" + esc(m.degree) + " — Skyline " + PILL.open + "</h3>" +
          '<div class="audit-facts">' +
            "<span>Units required <b>" + m.unitsRequired + "</b></span>" +
            "<span>Units applied <b>" + m.unitsApplied + "</b></span>" +
            "<span>Catalog year <b>" + esc(m.catalogYear) + "</b></span>" +
            "<span>Degree GPA <b>" + m.degreeGPA.toFixed(2) + "</b></span>" +
          "</div>" +
          '<div class="audit-date">Audit date ' + esc(m.auditDate) + " · " + esc(m.source) + "</div>" +
        "</div>" +
      "</div>" +

      '<div class="card" style="margin-top:14px">' +
        D.degreeReqs.map((r) =>
          '<div class="dreq">' +
            '<div class="c-icon">' + ICON[r.status] + "</div>" +
            '<div class="dreq-name">' + esc(r.name) + "</div>" +
            '<div class="dreq-need">' + (r.needed
              ? (r.link ? '<a href="' + r.link + '">' + esc(r.needed) + "</a>" : esc(r.needed))
              : "") + "</div>" +
          "</div>").join("") +
      "</div>";
  }

  /* ---------------- overview ---------------- */

  function renderOverview() {
    $("#ov-sub").textContent =
      D.meta.student + " · " + D.meta.college + " · " + D.meta.path +
      " · targeting " + D.meta.targetTerm + ".";

    $("#ov-premise").innerHTML =
      '<div class="alert info"><div class="a-ico">&#127919;</div><div>' +
      "<h3>" + esc(D.premise.headline) + "</h3><p>" + esc(D.premise.body) + "</p></div></div>";

    const w = $("#ov-schools");
    w.innerHTML = "";
    D.schools.forEach((s) => {
      w.appendChild(el("div", "card school-card",
        '<div class="sc-top">' + (s.logo ? '<span class="sc-logo">' + s.logo + "</span>" : "") +
        "<div><h3>" + esc(s.name) + "</h3>" +
        '<div class="sc-major">' + esc(s.major) + "</div></div>" +
        '<span class="sc-tier tier-' + s.tier + '">' + esc(s.tierLabel) + "</span></div>" +
        '<div class="sc-dl">&#9201; ' + esc(s.deadline ? "Deadline " + s.deadlineLabel : s.deadlineLabel) + "</div>" +
        "<ul>" + s.notes.map((n) => "<li>" + esc(n) + "</li>").join("") + "</ul>"));
    });
  }

  /* ---------------- still open ---------------- */

  function renderOpen() {
    const cg = computeCalGETC(false), usc = computeUSC(false);
    const items = [];

    D.calgetc.areas.forEach((area) => {
      area.slots.forEach((slot) => {
        const r = cg.slots[slot.id];
        if (r.status !== "open") return;
        items.push({
          sev: "high",
          title: "Cal-GETC " + slot.name + " is unsatisfied",
          body: "Required for the Associate's degree and UC eligibility.",
          fix: slot.options ? "Any of: " + slot.options.slice(0, 6).join(", ") +
               (slot.options.length > 6 ? " (+" + (slot.options.length - 6) + " more)" : "") : ""
        });
      });
    });

    D.uscge.categories.forEach((cat) => {
      const r = usc[cat.id];
      if (r.status !== "open") return;
      const cands = CANDIDATES.filter((c) => (c.usc || []).indexOf(cat.id) !== -1);
      items.push({
        sev: "high",
        title: "USC GE-" + cat.id + " (" + cat.name + ") is open" +
               (cat.needs > 1 ? " — needs " + cat.needs + ", has " + r.have : ""),
        body: "No course on the plan is assigned to this category yet.",
        fix: cands.length
          ? "Candidate" + (cands.length > 1 ? "s" : "") + ": " + cands.map((c) => c.code).join(" + ") + " (Summer 2027, unscheduled)"
          : "No course identified yet."
      });
    });

    if (D.major.stillNeeded) {
      items.push({ sev: "high", title: "Major units short of the minimum",
        body: D.major.unitsApplied + " of " + D.major.unitsRange + " units applied. " + D.major.stillNeeded,
        fix: "Spring 2027 adds BUS. 100 (3) and STAT C1000 (4)." });
    }

    const su27 = D.terms.filter((t) => t.status === "candidate")[0];
    if (su27) items.push({ sev: "med", title: "Summer 2027 is undecided", body: su27.verified,
      fix: "Candidates: " + su27.courses.map((c) => c.code).join(", ") + ". Use What-If to see what each closes." });

    CONFIRMED.filter((c) => c.uscUnconfirmed).forEach((c) => {
      items.push({ sev: "med",
        title: c.code + " → " + ((c.usc || []).length ? "USC GE-" + c.usc.join("/") : "the USC Writing Requirement") + " is unconfirmed",
        body: c.note,
        fix: "Confirm with Lucy Jordan (lucyjord@usc.edu) or busadm@marshall.usc.edu." });
    });

    (D.majorPrepSchoolNotes.usc || []).filter((n) => n.status === "todo").forEach((n) =>
      items.push({ sev: "med", title: n.text, body: "USC Marshall application requirement.", fix: "" }));

    const fa = D.terms.filter((t) => t.id === "fa26")[0];
    if (fa) items.push({ sev: "low", title: "One Fall 2026 class is unaccounted for",
      body: fa.verified, fix: "Check the in-progress block in DegreeWorks." });

    CONFIRMED.filter((c) => c.flag === "elective").forEach((c) =>
      items.push({ sev: "low", title: c.code + " (" + c.units + " units) fulfills nothing",
        body: c.note, fix: "No action — already registered." }));

    const w = $("#open-list");
    w.innerHTML = "";
    const ord = { high: 0, med: 1, low: 2 };
    items.sort((a, b) => ord[a.sev] - ord[b.sev]);
    const count = $("#open-count");
    if (count) {
      count.textContent = items.length;
      count.classList.toggle("none", items.length === 0);
    }

    const mark = { high: "&#9679;", med: "&#9681;", low: "&#9675;" };
    items.forEach((it) => w.appendChild(el("div", "open-item sev-" + it.sev,
      '<span class="oi-mark">' + mark[it.sev] + "</span><div>" +
      "<h4>" + esc(it.title) + "</h4><p>" + esc(it.body) + "</p>" +
      (it.fix ? '<div class="oi-fix">&rarr; ' + esc(it.fix) + "</div>" : "") + "</div>")));
  }

  /* ---------------- schedule ---------------- */

  function badges(c) {
    const out = [];
    (c.calgetc || []).forEach((s) => out.push('<span class="badge b-cg">Cal-GETC ' + esc(s) + "</span>"));
    (c.usc || []).forEach((u) => out.push('<span class="badge ' + (c.uscUnconfirmed ? "b-unconf" : "b-usc") +
      '">USC GE-' + esc(u) + (c.uscUnconfirmed ? " ?" : "") + "</span>"));
    if (c.uscWriting) out.push('<span class="badge b-unconf">USC Writing ?</span>');
    if ((c.majorPrep || []).length) out.push('<span class="badge b-major">Major core</span>');
    if (c.berkeleyPrereq) out.push('<span class="badge b-major">Haas prereq</span>');
    if (c.viaExam) out.push('<span class="badge b-exam">' + esc(c.viaExam) + "</span>");
    if (c.flag === "elective") out.push('<span class="badge b-none">Elective only</span>');
    if (c.status === "candidate") out.push('<span class="badge b-what">Candidate</span>');
    if (!out.length) out.push('<span class="badge b-none">No requirement credit</span>');
    return out.join("");
  }

  function renderTerms() {
    const w = $("#terms-list");
    w.innerHTML = "";
    D.terms.forEach((t) => {
      const units = t.courses.reduce((a, c) => a + (c.units || 0), 0);
      const card = el("div", "card block" + (t.scratchpad ? " scratch" : ""));
      const st = t.status === "completed" ? "complete" : t.status === "candidate" ? "whatif" : t.status;
      card.appendChild(el("div", "block-head",
        "<h3>" + esc(t.name) + "</h3>" + PILL[st] +
        '<span class="block-units">Units applied: ' + units + (t.courses.some((c) => c.unitsAssumed) ? " *" : "") + "</span>"));

      t.courses.forEach((c) => {
        card.appendChild(el("div", "course" + (c.flag === "elective" ? " elective" : ""),
          '<div class="c-icon">' + (ICON[c.status === "completed" ? "complete" : c.status] || ICON.open) + "</div>" +
          '<div class="course-main">' +
            '<div class="course-code">' + esc(c.code) + ' <span class="course-title">' + esc(c.title) + "</span></div>" +
            (c.note ? '<div class="course-note">' + esc(c.note) + "</div>" : "") +
            '<div class="course-badges">' + badges(c) + "</div>" +
          "</div>" +
          '<div class="course-right">' +
            (gradeOf(c) ? '<span class="cg-grade">' + esc(gradeOf(c)) + "</span>" : "") +
            '<span class="cg-units">' + (c.units || 0) + (c.unitsAssumed ? "*" : "") + " u</span>" +
          "</div>"));
      });

      if (t.verified) card.appendChild(el("p", "block-note", esc(t.verified)));
      w.appendChild(card);
    });
  }

  /* ---------------- Cal-GETC ---------------- */

  function renderCalGETC() {
    $("#cg-title").textContent = D.calgetc.label;
    $("#cg-sub").textContent = D.calgetc.sublabel + ".";

    const cg = computeCalGETC(false);
    const w = $("#cg-list");
    w.innerHTML = "";

    D.calgetc.areas.forEach((area) => {
      const a = cg.areas[area.id];
      const card = el("div", "card block");
      card.appendChild(el("div", "block-head",
        "<h3>Area " + esc(area.id) + " — " + esc(area.name) + "</h3>" + PILL[a.status] +
        '<span class="block-units">Units applied: ' + a.units + "</span>"));
      if (area.rule) card.appendChild(el("p", "block-rule", esc(area.rule)));

      area.slots.forEach((slot) => {
        const r = cg.slots[slot.id];
        const row = el("div", "slot s-" + r.status);
        let html =
          '<div class="slot-head">' +
            '<div class="c-icon">' + ICON[r.status] + "</div>" +
            '<div class="slot-name">' + esc(slot.name) +
              (r.needs > 1 ? ' <span class="slot-n">(' + r.needs + " courses)</span>" : "") + "</div>" +
            '<span class="slot-state">' + esc(label(r, "cg")) + "</span>" +
          "</div>";
        if (r.counted.length) {
          html += r.counted.map((s) => courseRow(s.course)).join("");
        }
        if (r.status === "open") {
          html += stillNeeded(r.needs > 1 ? (r.needs - r.have) + " more course(s)" : "1 course", slot.options);
        }
        row.innerHTML = html;
        card.appendChild(row);
      });

      w.appendChild(card);
    });
  }

  /* ---------------- USC GE ---------------- */

  function renderUSC() {
    $("#usc-title").textContent = D.uscge.label;
    $("#usc-sub").textContent = D.uscge.sublabel + ".";

    $("#usc-residency").innerHTML =
      '<div class="alert info"><div class="a-ico">&#8505;</div><div>' +
      "<h3>Open categories at transfer are normal</h3><p>" + esc(D.uscge.residencyNote) + "</p></div></div>";

    const usc = computeUSC(false);
    const w = $("#usc-list");
    w.innerHTML = "";

    D.uscge.categories.forEach((cat) => {
      const r = usc[cat.id];
      const row = el("div", "slot usc-cat s-" + r.status);
      let html =
        '<div class="slot-head">' +
          '<span class="usc-letter">' + esc(cat.id) + "</span>" +
          '<div class="slot-name">' + esc(cat.name) +
            (cat.needs > 1 ? ' <span class="slot-n">(' + cat.needs + " courses)</span>" : "") + "</div>" +
          '<span class="slot-state">' + esc(label(r, "usc")) + "</span>" +
        "</div>";
      if (r.counted.length) html += r.counted.map((s) => courseRow(s.course)).join("");
      if (r.status === "open") {
        const cands = CANDIDATES.filter((c) => (c.usc || []).indexOf(cat.id) !== -1);
        html += stillNeeded((cat.needs - r.have) + " course" + (cat.needs - r.have > 1 ? "s" : ""),
                            cands.map((c) => c.code));
      }
      row.innerHTML = html;
      w.appendChild(row);
    });

    const done = D.uscge.categories.filter((c) => usc[c.id].status !== "open").length;
    w.appendChild(el("div", "", '<div class="prog-cap">' + done + " of " + D.uscge.categories.length +
      " categories covered or on track by Spring 2027.</div>" +
      '<div class="progress-line"><i style="width:' + Math.round(done / D.uscge.categories.length * 100) + '%"></i></div>'));
  }

  /* ---------------- major ---------------- */

  function renderMajor() {
    $("#mp-sub").textContent = D.majorPrepNote;

    const m = D.major;
    const core = $("#mp-core");
    const card = el("div", "card block");
    card.appendChild(el("div", "block-head",
      "<h3>" + esc(m.name) + "</h3>" + PILL.open +
      '<span class="block-units">Units applied: ' + m.unitsApplied + " of " + esc(m.unitsRange) + "</span>"));
    card.appendChild(el("div", "needed-top",
      '<span class="n-lab">Still needed:</span> <span class="n-body">' + esc(m.stillNeeded) + "</span>"));

    m.core.forEach((req) => {
      const c = byId[req.courseId];
      if (!c) return;
      const done = c.status === "completed";
      const row = el("div", "slot s-" + (done ? "complete" : c.status === "in-progress" ? "in-progress" : "planned"));
      let html =
        '<div class="slot-head">' +
          '<div class="c-icon">' + ICON[done ? "complete" : c.status] + "</div>" +
          '<div class="slot-name">' + esc(req.name) + "</div>" +
          '<span class="slot-state">' + (done ? "Complete" : c.status === "in-progress" ? "In progress" : "Registered") + "</span>" +
        "</div>" + courseRow(c);
      if (!done && req.options) {
        html += '<div class="needed"><span class="n-lab neutral">Satisfied by:</span><span class="n-body">' +
          '<span class="opts">' + req.options.map((o) => "<code>" + esc(o) + "</code>").join("<i>or</i>") + "</span></span></div>";
      }
      row.innerHTML = html;
      card.appendChild(row);
    });
    core.innerHTML = "";
    core.appendChild(card);

    const MARK = { done: "&#10003;", todo: "&#9675;", blocked: "&#10005;", info: "&#8505;", deadline: "&#9201;" };
    const w = $("#mp-list");
    w.innerHTML = "";
    D.schools.forEach((s) => {
      const courses = CONFIRMED.filter((c) => (c.majorPrep || []).indexOf(s.id) !== -1);
      const units = courses.reduce((a, c) => a + (c.units || 0), 0);
      const notes = D.majorPrepSchoolNotes[s.id] || [];
      w.appendChild(el("div", "card school-card",
        '<div class="sc-top">' + (s.logo ? '<span class="sc-logo">' + s.logo + "</span>" : "") +
        "<div><h3>" + esc(s.name) + "</h3>" +
        '<div class="sc-major">' + esc(s.major) + "</div></div>" +
        '<span class="sc-tier tier-' + s.tier + '">' + esc(s.tierLabel) + "</span></div>" +
        '<div class="sc-sub">Major-prep courses on the plan · ' + units + " units</div>" +
        courses.map((c) =>
          '<div class="mini">' + ICON[c.status === "completed" ? "complete" : c.status] +
          "<span><b>" + esc(c.code) + "</b> " + esc(c.title) +
          "<br><small>" + esc(c.termName) + " · " + c.units + " units" +
          (gradeOf(c) ? " · grade " + esc(gradeOf(c)) : "") + "</small></span></div>").join("") +
        '<ul class="prep-check">' + notes.map((n) =>
          '<li class="pc-' + n.status + '"><span class="pc-mark">' + (MARK[n.status] || "&#9675;") +
          "</span><span>" + esc(n.text) + "</span></li>").join("") + "</ul>"));
    });
  }

  /* ---------------- GPA ---------------- */

  const GRADES = [["", null], ["A", 4.0], ["A-", 3.7], ["B+", 3.3], ["B", 3.0], ["B-", 2.7],
    ["C+", 2.3], ["C", 2.0], ["C-", 1.7], ["D+", 1.3], ["D", 1.0], ["D-", 0.7], ["F", 0.0], ["CRE", null]];
  const points = (g) => { const h = GRADES.filter((x) => x[0] === g)[0]; return h ? h[1] : null; };
  function gradeOf(c) { return state.grades[c.id] !== undefined ? state.grades[c.id] : (c.grade || ""); }

  function gpaFor(courses) {
    let pts = 0, units = 0;
    courses.forEach((c) => {
      const p = points(gradeOf(c));
      if (p === null || !c.units) return;
      pts += p * c.units; units += c.units;
    });
    return { pts: pts, units: units, gpa: units ? pts / units : null };
  }

  function renderGPA() {
    const all = gpaFor(CONFIRMED);
    const planUnits = CONFIRMED.reduce((a, c) => a + (c.units || 0), 0);

    $("#gpa-tiles").innerHTML =
      '<div class="card gpa-tile"><div class="num">' + D.meta.degreeGPA.toFixed(2) + "</div>" +
      '<div class="lbl">DEGREE GPA ON RECORD</div><div class="sub">' + esc(D.meta.source) + " · " + esc(D.meta.auditDate) + "</div></div>" +

      '<div class="card gpa-tile"><div class="num' + (all.gpa === null ? " muted" : "") + '">' +
      (all.gpa === null ? "—" : all.gpa.toFixed(2)) + "</div>" +
      '<div class="lbl">COMPUTED FROM GRADES</div><div class="sub">' + all.units + " graded units</div></div>" +

      '<div class="card gpa-tile"><div class="num">' + all.units + "</div>" +
      '<div class="lbl">GRADED UNITS</div><div class="sub">of ' + planUnits + " on the plan</div></div>";

    const w = $("#gpa-terms");
    w.innerHTML = "";
    D.terms.filter((t) => t.status !== "candidate").forEach((t) => {
      const tg = gpaFor(t.courses);
      const box = el("div", "gpa-term");
      box.appendChild(el("h4", "", esc(t.name) +
        '<span class="tgpa' + (tg.gpa === null ? " none" : "") + '">' +
        (tg.gpa === null ? "no graded units" : "term GPA " + tg.gpa.toFixed(2)) + "</span>"));

      t.courses.forEach((c) => {
        const row = el("div", "gpa-row",
          '<div class="gr-code"><b>' + esc(c.code) + "</b><small>" + esc(c.title) + "</small></div>" +
          '<div class="gr-units">' + (c.units || 0) + " u</div>");
        const sel = el("select");
        sel.setAttribute("aria-label", "Grade for " + c.code);
        GRADES.forEach(([g]) => {
          const o = el("option"); o.value = g; o.textContent = g === "" ? "—" : g; sel.appendChild(o);
        });
        sel.value = gradeOf(c);
        sel.addEventListener("change", function () {
          state.grades[c.id] = sel.value; save(); renderGPA(); renderTerms(); renderMajor();
        });
        row.appendChild(sel);
        box.appendChild(row);
      });
      w.appendChild(box);
    });

    w.appendChild(el("p", "block-note",
      "CRE (credit) grades carry units but no grade points, so they don't move the GPA."));
  }

  /* ---------------- what-if ---------------- */

  function renderWhatIf() {
    const base = { cg: computeCalGETC(false), usc: computeUSC(false) };
    const scen = { cg: computeCalGETC(true), usc: computeUSC(true) };
    const n = CANDIDATES.filter((c) => state.whatIf[c.id]).length + state.custom.length;

    $("#wi-banner").innerHTML = "<p>" + (n
      ? "<b>Scenario active</b> — " + n + " hypothetical course" + (n > 1 ? "s" : "") +
        " applied. The trackers above still show the <b>confirmed</b> plan only."
      : "<b>No scenario active.</b> Toggle a candidate below to see its effect.") + "</p>";

    const tw = $("#wi-toggles");
    tw.innerHTML = "";
    CANDIDATES.forEach((c) => {
      const on = !!state.whatIf[c.id];
      const row = el("label", "toggle-row" + (on ? " on" : ""),
        '<input type="checkbox"' + (on ? " checked" : "") + ">" +
        '<div style="flex:1"><div class="tr-code">' + esc(c.code) + " · " + esc(c.title) + "</div>" +
        '<div class="tr-note">' + esc(c.note) + "</div>" +
        '<div class="tr-badges">' + badges(c) + "</div></div>");
      row.querySelector("input").addEventListener("change", function (e) {
        state.whatIf[c.id] = e.target.checked; save(); renderWhatIf();
      });
      tw.appendChild(row);
    });

    const cl = $("#cc-list");
    cl.innerHTML = "";
    state.custom.forEach((c) => {
      const item = el("div", "custom-item",
        "<b>" + esc(c.code) + "</b> <span class='dim'>" + c.units + " u</span>" +
        '<span class="ci-badges">' +
        (c.calgetc || []).map((x) => '<span class="badge b-what">Cal-GETC ' + esc(x) + "</span>").join("") +
        (c.usc || []).map((x) => '<span class="badge b-what">USC GE-' + esc(x) + "</span>").join("") + "</span>" +
        '<button class="ci-x" type="button" aria-label="Remove ' + esc(c.code) + '">&times;</button>');
      item.querySelector(".ci-x").addEventListener("click", function () {
        state.custom = state.custom.filter((x) => x.id !== c.id); save(); renderWhatIf();
      });
      cl.appendChild(item);
    });

    const deltas = [];
    D.calgetc.areas.forEach((area) => area.slots.forEach((slot) => {
      const b = base.cg.slots[slot.id], s = scen.cg.slots[slot.id];
      if (label(b, "cg") !== label(s, "cg")) deltas.push({ what: "Cal-GETC " + slot.name, from: label(b, "cg"), to: label(s, "cg") });
    }));
    D.uscge.categories.forEach((cat) => {
      const b = base.usc[cat.id], s = scen.usc[cat.id];
      if (label(b, "usc") !== label(s, "usc")) deltas.push({ what: "USC GE-" + cat.id + " (" + cat.name + ")", from: label(b, "usc"), to: label(s, "usc") });
    });

    const dw = $("#wi-deltas");
    dw.innerHTML = "";
    if (!deltas.length) {
      dw.innerHTML = '<p class="delta-empty">' + (n ? "No requirement status changes from this scenario." : "Nothing selected.") + "</p>";
    } else {
      deltas.forEach((d) => dw.appendChild(el("div", "delta",
        '<span class="d-arrow">&rarr;</span><div><b>' + esc(d.what) + "</b><br>" +
        '<span class="d-from">' + esc(d.from) + '</span> &rarr; <span class="d-to">' + esc(d.to) + "</span></div>")));
      const ob = D.uscge.categories.filter((c) => base.usc[c.id].status === "open").length;
      const oa = D.uscge.categories.filter((c) => scen.usc[c.id].status === "open").length;
      if (ob !== oa) dw.appendChild(el("div", "delta",
        '<span class="d-arrow">&Sigma;</span><div><b>USC GE categories still open</b><br>' +
        '<span class="d-from">' + ob + '</span> &rarr; <span class="d-to">' + oa + "</span></div>"));
    }
  }

  function initWhatIf() {
    const cgw = $("#cc-calgetc"), uw = $("#cc-usc");
    D.calgetc.areas.forEach((a) => a.slots.forEach((s) =>
      cgw.appendChild(el("label", "", '<input type="checkbox" value="' + s.id + '">' + esc(s.id)))));
    D.uscge.categories.forEach((c) =>
      uw.appendChild(el("label", "", '<input type="checkbox" value="' + c.id + '">' + esc(c.id))));

    $("#cc-add").addEventListener("click", function () {
      const code = $("#cc-code").value.trim();
      if (!code) { $("#cc-code").focus(); return; }
      state.custom.push({
        id: "custom-" + Date.now(), code: code, title: "Hypothetical",
        units: Number($("#cc-units").value) || 0,
        calgetc: Array.prototype.slice.call(cgw.querySelectorAll("input:checked")).map((i) => i.value),
        usc: Array.prototype.slice.call(uw.querySelectorAll("input:checked")).map((i) => i.value),
        majorPrep: []
      });
      save();
      $("#cc-code").value = "";
      cgw.querySelectorAll("input:checked").forEach((i) => { i.checked = false; });
      uw.querySelectorAll("input:checked").forEach((i) => { i.checked = false; });
      renderWhatIf();
    });
    $("#cc-code").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); $("#cc-add").click(); }
    });
    $("#wi-reset").addEventListener("click", function () {
      state.whatIf = {}; state.custom = []; save(); renderWhatIf();
    });
    $("#wi-all").addEventListener("click", function () {
      CANDIDATES.forEach((c) => { state.whatIf[c.id] = true; }); save(); renderWhatIf();
    });
  }

  /* ---------------- contacts ---------------- */

  function renderContacts() {
    const usc = D.schools.filter((s) => s.id === "usc")[0];
    const days = Math.ceil((new Date(usc.deadline + "T23:59:59") - new Date()) / 86400000);
    $("#deadline-strip").innerHTML =
      '<div class="deadline-strip"><div class="dl-num">' + (days > 0 ? days : "—") + "</div>" +
      '<div class="dl-txt"><h3>' + (days > 0 ? "days until the USC Marshall deadline" : "USC Marshall deadline has passed") + "</h3>" +
      "<p>" + esc(usc.deadlineLabel) + " · " + esc(usc.name) + ", " + esc(usc.major) + " · 2 recommendation letters required</p></div></div>";

    const w = $("#contact-list");
    w.innerHTML = "";
    D.contacts.forEach((c) => w.appendChild(el("div", "contact",
      '<span class="c-name">' + esc(c.name) + "</span>" +
      (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + "</a>" : "") +
      (c.phone ? '<a href="tel:' + esc(c.phone.replace(/[^0-9+]/g, "")) + '">' + esc(c.phone) + "</a>" : "") +
      '<span class="c-role">' + esc(c.role) + "</span>")));

    $("#foot-meta").textContent =
      D.meta.student + " · " + D.meta.source + " audit " + D.meta.auditDate;
  }

  /* ---------------- nav + title screen ---------------- */

  function initCollapse() {
    const btn = $("#open-toggle"), body = $("#open-list");
    if (!btn || !body) return;
    const KEY = LS + ":open-collapsed";
    let collapsed = false;
    try { collapsed = localStorage.getItem(KEY) === "1"; } catch (e) { /* storage blocked */ }

    const apply = function () {
      body.hidden = collapsed;
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    };
    apply();

    btn.addEventListener("click", function () {
      collapsed = !collapsed;
      apply();
      try { localStorage.setItem(KEY, collapsed ? "1" : "0"); } catch (e) { /* storage blocked */ }
    });
  }

  function initNav() {
    const links = Array.prototype.slice.call(document.querySelectorAll(".nav-inner a"));
    const secs = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
        });
      }, { rootMargin: "-58px 0px -65% 0px", threshold: 0 });
      secs.forEach((s) => io.observe(s));
    }
    $("#enter-btn").addEventListener("click", function () {
      document.getElementById("overview").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function initTank() {
    const frame = $("#tank-frame"), ph = $("#tank-placeholder");
    if (frame && ph) {
      const hide = function () { ph.style.opacity = "0"; setTimeout(function () { ph.hidden = true; }, 500); };
      ph.style.transition = "opacity .5s ease";
      frame.addEventListener("load", hide);
      setTimeout(hide, 12000);
    }

    // The embedded tank is inert (pointer-events:none keeps the page scrollable),
    // so its DEX / camera / ANGLE buttons can't be clicked here. Hide them rather
    // than float dead controls over the title. Same-origin, so a stylesheet
    // injection does it without touching the vendored build.
    if (frame) {
      const hideChrome = function () {
        try {
          const doc = frame.contentDocument;
          if (!doc || doc.getElementById("embed-chrome")) return;
          const st = doc.createElement("style");
          st.id = "embed-chrome";
          st.textContent = "body > button { display: none !important; }";
          (doc.head || doc.documentElement).appendChild(st);
        } catch (err) { /* cross-origin: they stay, harmlessly inert */ }
      };
      frame.addEventListener("load", hideChrome);
      hideChrome();
    }

    // Deep links skip the title screen: opening …/#open to check an action item
    // should land on the dashboard, not on a WebGL scene.
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const target = document.querySelector(hash);
      if (target) requestAnimationFrame(function () {
        setTimeout(function () { target.scrollIntoView({ behavior: "auto", block: "start" }); }, 60);
      });
    }
  }

  /* ---------------- boot ---------------- */

  load();
  renderTankStats();
  renderDegree();
  renderOverview();
  renderOpen();
  renderTerms();
  renderCalGETC();
  renderUSC();
  renderMajor();
  renderGPA();
  initWhatIf();
  renderWhatIf();
  renderContacts();
  initCollapse();
  initNav();
  initTank();
})();
