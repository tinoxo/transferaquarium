/* ============================================================
   Transfer Requirements Dashboard — source of truth
   Edit this file to update the dashboard. app.js renders
   entirely from what's here.

   Current as of the Skyline DegreeWorks audit dated 09/14/2026.
   ============================================================ */

const DATA = {

  meta: {
    student: "Valentino Larios",
    college: "Skyline College — San Bruno, CA",
    path: "Accelerated one-year transfer · Summer 2026 → Spring 2027",
    targetTerm: "Fall 2027 transfer admission",

    degree: "Associate in Science — Transfer",
    degreeStatus: "INCOMPLETE",
    major: "Business Administration 2.0 AS-T",
    catalogYear: "Academic Year 2025-2026",
    unitsRequired: 60,
    unitsApplied: 44,
    degreeGPA: 3.66,
    progressPercent: 61,

    auditDate: "09/14/2026",
    source: "Skyline DegreeWorks"
  },

  /* ---------- Target schools ---------- */
  schools: [
    {
      id: "usc",
      name: "USC Marshall",
      major: "Business Administration",
      tier: "primary",
      tierLabel: "Primary target",
      deadline: "2027-02-15",
      deadlineLabel: "Feb 15, 2027",
      notes: [
        "Requires 2 professor / supervisor recommendation letters.",
        "Post-transfer: declare Economics (Dornsife) as a second major — Dornsife allows a second major via elective units with no competitive gate."
      ]
    },
    {
      id: "ucla",
      name: "UCLA",
      major: "Business Economics",
      tier: "reach",
      tierLabel: "Reach",
      deadline: null,
      deadlineLabel: "UC application window",
      notes: [
        "Ineligible for TAP — first-year transfer disqualifies him.",
        "Requires the full Associate's degree + Cal-GETC certification path."
      ]
    },
    {
      id: "berkeley",
      name: "UC Berkeley",
      major: "Haas / Economics",
      tier: "dream",
      tierLabel: "Dream",
      deadline: null,
      deadlineLabel: "UC application window",
      notes: [
        "Haas is not a direct TAP-eligible major — applying as Economics or undeclared.",
        "Requires the full Associate's degree + Cal-GETC certification path."
      ]
    }
  ],

  premise: {
    headline: "The plan is built around the Associate's degree, not around USC.",
    body: "Competitive applications to UCLA and Berkeley require the full AS-T plus Cal-GETC certification — not a cherry-picked, USC-optimized course list. So the course plan follows Skyline's official DegreeWorks Ed Plan, and USC's GE requirements get checked for overlap against it."
  },

  /* ---------- Degree-level requirements (top block of the audit) ---------- */
  degreeReqs: [
    { id: "units60", name: "Minimum 60 Units for AS-T Degree", status: "open",
      needed: "44 units completed or in-progress; 16 more still needed." },
    { id: "gpa20", name: "Minimum 2.0 Degree Applicable GPA", status: "complete", needed: "" },
    { id: "calgetc", name: "Cal-GETC", status: "open", needed: "See the Cal-GETC section.", link: "#calgetc" },
    { id: "residency", name: "Skyline College Residency", status: "in-progress", needed: "" },
    { id: "major", name: "Major Requirements", status: "open",
      needed: "See the Major Prep section.", link: "#majorprep" }
  ],

  /* ---------- Terms & courses ----------
     status: completed | in-progress | planned | candidate
     grade "CRE" = credit, not counted in GPA
     calgetc: Cal-GETC slot ids   usc: USC GE letters
  */
  terms: [
    {
      id: "sp25",
      name: "Spring 2025",
      status: "completed",
      statusLabel: "Credit awarded",
      verified: "Exam credit posted to the record as course equivalents. Graded CRE, so it carries units but no grade points.",
      courses: [
        {
          id: "hist201", code: "HIST 201", title: "United States History I", units: 3,
          status: "completed", grade: "CRE", viaExam: "AP US History",
          calgetc: ["3B"], usc: [], majorPrep: [],
          note: "Covers Cal-GETC Area 3B."
        },
        {
          id: "phys210", code: "PHYS 210", title: "General Physics I", units: 4,
          status: "completed", grade: "CRE", viaExam: "AP Physics 1",
          calgetc: ["5A", "5LAB"], usc: [], majorPrep: [],
          note: "Covers Cal-GETC Area 5A and the laboratory requirement."
        }
      ]
    },
    {
      id: "su26",
      name: "Summer 2026",
      status: "completed",
      statusLabel: "Completed",
      verified: "15 graded units · term GPA 3.67 — the whole of the degree GPA on record.",
      courses: [
        {
          id: "math251", code: "MATH 251", title: "Calculus / Analytic Geometry", units: 5,
          status: "completed", grade: "B",
          calgetc: ["2"], usc: ["F"], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Completes Cal-GETC Area 2, satisfies USC GE-F, and fills the major's math requirement."
        },
        {
          id: "econ100", code: "ECON 100", title: "Principles of Macroeconomics", units: 3,
          status: "completed", grade: "A",
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Major core. Area 4 takes two courses from two different disciplines, so only one ECON counts there — ECON 102 is the one applied."
        },
        {
          id: "econ102", code: "ECON 102", title: "Principles of Microeconomics", units: 3,
          status: "completed", grade: "A",
          calgetc: ["4"], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Major core + Cal-GETC Area 4."
        },
        {
          id: "actg121", code: "ACTG 121", title: "Financial Accounting", units: 4,
          status: "completed", grade: "A",
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Major core."
        }
      ]
    },
    {
      id: "fa26",
      name: "Fall 2026",
      status: "in-progress",
      statusLabel: "In progress",
      verified: "The audit counts 7 in-progress classes totalling 22 units; the 6 below account for 21. One 1-unit class is unidentified — worth confirming in DegreeWorks.",
      courses: [
        {
          id: "actg131", code: "ACTG 131", title: "Managerial Accounting", units: 4,
          status: "in-progress", grade: null,
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Major core."
        },
        {
          id: "anth180", code: "ANTH 180", title: "Magic, Witchcraft & Religion", units: 3,
          status: "in-progress", grade: null,
          calgetc: [], usc: [], majorPrep: [],
          flag: "elective",
          note: "Fulfills no Cal-GETC area, no USC GE category and no major requirement. Kept only because already registered."
        },
        {
          id: "bus201", code: "BUS. 201", title: "Business Law", units: 3,
          status: "in-progress", grade: null,
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Major core."
        },
        {
          id: "englc1000", code: "ENGL C1000", title: "Academic Reading & Writing", units: 3,
          status: "in-progress", grade: null,
          calgetc: ["1A"], usc: [], majorPrep: [],
          note: "Cal-GETC Area 1A."
        },
        {
          id: "socic1000", code: "SOCI C1000", title: "Intro to Sociology", units: 3,
          status: "in-progress", grade: null,
          calgetc: ["4"], usc: ["C"], majorPrep: [],
          note: "Cal-GETC Area 4 + USC GE-C (1 of 2)."
        },
        {
          id: "mathc2220", code: "MATH C2220", title: "Calculus II: Early Transcendentals", units: 5,
          status: "in-progress", grade: null,
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Area 2 and the major's math requirement are already met by MATH 251 — this is depth for the transfer application."
        }
      ]
    },
    {
      id: "sp27",
      name: "Spring 2027",
      status: "planned",
      statusLabel: "Registered",
      verified: "22 units · verified via SMCCD DegreeWorks.",
      courses: [
        {
          id: "englc1002", code: "ENGL C1002", title: "Critical Thinking & Composition", units: 3,
          status: "planned", grade: null,
          calgetc: ["1B"], usc: [], majorPrep: [],
          uscWriting: true, uscUnconfirmed: true,
          note: "Cal-GETC 1B. Likely also satisfies USC's Writing Requirement (WRIT 150 equivalent) — not confirmed with USC."
        },
        {
          id: "commc1000", code: "COMM C1000", title: "Oral Communication", units: 3,
          status: "planned", grade: null,
          calgetc: ["1C"], usc: [], majorPrep: [],
          note: "Cal-GETC 1C. No USC GE overlap."
        },
        {
          id: "film100", code: "FILM 100", title: "Introduction to Film", units: 3,
          status: "planned", grade: null,
          calgetc: ["3A"], usc: ["A"], majorPrep: [],
          note: "Cal-GETC 3A + USC GE-A."
        },
        {
          id: "envs100", code: "ENVS 100", title: "Environmental Science", units: 3,
          status: "planned", grade: null,
          calgetc: ["5B"], usc: ["D"], majorPrep: [],
          uscUnconfirmed: true,
          note: "Cal-GETC 5B, which closes Area 5. Likely USC GE-D — unconfirmed with USC directly."
        },
        {
          id: "ethn101", code: "ETHN 101", title: "Introduction to Ethnic Studies", units: 3,
          status: "planned", grade: null,
          calgetc: ["6"], usc: ["C"], majorPrep: [],
          note: "Cal-GETC Area 6 + USC GE-C (2 of 2)."
        },
        {
          id: "bus100", code: "BUS. 100", title: "Introduction to Business", units: 3,
          status: "planned", grade: null,
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          berkeleyPrereq: true,
          note: "Closes the major's BUS. 100 / BUS. 401 requirement. Also a Berkeley Haas prerequisite."
        },
        {
          id: "statc1000", code: "STAT C1000", title: "Introduction to Statistics", units: 4,
          status: "planned", grade: null,
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Closes the major's statistics requirement."
        }
      ]
    },
    {
      id: "su27",
      name: "Summer 2027",
      status: "candidate",
      statusLabel: "TBD — not scheduled",
      scratchpad: true,
      verified: "Skyline's Summer 2027 schedule isn't published yet. Nothing here is committed.",
      courses: [
        {
          id: "hist106", code: "HIST 106", title: "History", units: 3, unitsAssumed: true,
          status: "candidate", grade: null,
          calgetc: [], usc: ["B", "H"], majorPrep: [],
          note: "Would close USC GE-B (2nd course) and double-count for GE-H."
        },
        {
          id: "phil240", code: "PHIL 240", title: "Ethics", units: 3, unitsAssumed: true,
          status: "candidate", grade: null,
          calgetc: [], usc: ["B"], majorPrep: [],
          note: "Would close USC GE-B (1st course). Paired with HIST 106 it closes GE-B in one term."
        },
        {
          id: "pols130", code: "POLS 130", title: "Political Science", units: 3, unitsAssumed: true,
          status: "candidate", grade: null,
          calgetc: [], usc: ["G"], majorPrep: [],
          note: "Candidate for USC GE-G. Unscheduled."
        }
      ]
    }
  ],

  /* ---------- Cal-GETC ----------
     options: courses the audit lists as satisfying an open slot
  */
  calgetc: {
    label: "Cal-GETC",
    sublabel: "Required for the Associate's degree and UC eligibility",
    areas: [
      {
        id: "1", name: "English Communication",
        rule: "3 courses required; one each from 1A, 1B and 1C.",
        slots: [
          { id: "1A", name: "1A — English Composition" },
          { id: "1B", name: "1B — Critical Thinking and Composition",
            options: ["ENGL C1002", "ENGL C1001", "PHIL 103"] },
          { id: "1C", name: "1C — Oral Communication",
            options: ["COMM C1000"] }
        ]
      },
      {
        id: "2", name: "Mathematical Concepts and Quantitative Reasoning",
        slots: [{ id: "2", name: "Quantitative Reasoning" }]
      },
      {
        id: "3", name: "Arts and Humanities",
        rule: "Two courses required: one from 3A (Arts), one from 3B (Humanities).",
        slots: [
          { id: "3A", name: "3A — Arts",
            options: ["ART 175", "ART 350", "ARTH C1100", "ARTH C1200", "ARTH 105", "ARTH 107",
                      "ARTH 115", "ARTH 120", "ARTH 130", "DANC 100", "DANC 102", "DANC 103",
                      "ETHN 288", "FILM 100", "MUS. 100", "MUS. 115", "MUS. 202", "MUS. 205",
                      "MUS. 206", "MUS. 240", "MUS. 250", "MUS. 275", "MUS. 277"] },
          { id: "3B", name: "3B — Humanities" }
        ]
      },
      {
        id: "4", name: "Social and Behavioral Sciences",
        rule: "Two courses required, chosen from two academic disciplines.",
        slots: [{ id: "4", name: "Social and Behavioral Sciences", needs: 2 }]
      },
      {
        id: "5", name: "Physical and Biological Sciences",
        rule: "One course from 5A and one from 5B; at least one must include a lab, either within the course or as a separate course (5C).",
        slots: [
          { id: "5A", name: "Group A — Physical Science" },
          { id: "5B", name: "Group B — Biological Science",
            options: ["ANTH C1001", "BIOL 101", "BIOL C1000", "BIOL 111", "BIOL 130", "BIOL 140",
                      "BIOL 145", "BIOL 150", "BIOL 170", "BIOL 215", "BIOL 230", "BIOL 240",
                      "BIOL 250", "BIOL 260", "BTEC 170", "ENVS 100", "PSYC 220"] },
          { id: "5LAB", name: "5C — Laboratory Activity" }
        ]
      },
      {
        id: "6", name: "Ethnic Studies",
        slots: [{ id: "6", name: "Ethnic Studies",
          options: ["ETHN 101", "ETHN 103", "ETHN 108", "ETHN 109",
                    "ETHN 120", "ETHN 130", "ETHN 142", "ETHN 265"] }]
      }
    ]
  },

  /* ---------- USC GE ---------- */
  uscge: {
    label: "USC General Education",
    sublabel: "Tracked separately from Cal-GETC — USC applies its own GE rules to transfer work",
    residencyNote: "USC requires only 2 of the 10 GE courses to be completed in residence. Leaving some categories open at transfer is normal and expected — not a problem to solve before Feb 2027.",
    categories: [
      { id: "A", name: "Arts", needs: 1 },
      { id: "B", name: "Humanistic Inquiry", needs: 2 },
      { id: "C", name: "Social Analysis", needs: 2 },
      { id: "D", name: "Life Sciences", needs: 1 },
      { id: "E", name: "Physical Sciences", needs: 1 },
      { id: "F", name: "Quantitative Reasoning", needs: 1 },
      { id: "G", name: "Citizenship in a Global Era", needs: 1 },
      { id: "H", name: "Traditions and Historical Foundations", needs: 1 }
    ]
  },

  /* ---------- Major ---------- */
  major: {
    name: "Business Administration 2.0 AS-T",
    status: "INCOMPLETE",
    unitsRange: "26 – 29",
    unitsApplied: 22,
    stillNeeded: "4 additional units must be completed in the major.",
    core: [
      { name: "Financial Accounting",          courseId: "actg121" },
      { name: "Managerial Accounting",         courseId: "actg131" },
      { name: "Principles of Microeconomics",  courseId: "econ102" },
      { name: "Principles of Macroeconomics",  courseId: "econ100" },
      { name: "Business Law",                  courseId: "bus201" },
      { name: "Introduction to Business",      courseId: "bus100", options: ["BUS. 100", "BUS. 401"] },
      { name: "One math course",               courseId: "math251" },
      { name: "One statistics course",         courseId: "statc1000", options: ["BUS. 123", "STAT C1000"] }
    ]
  },

  majorPrepNote: "Core course list taken from the Business Administration 2.0 AS-T block of the DegreeWorks audit. USC, UCLA and Berkeley each publish their own major-prep sheet — reconcile against ASSIST before the applications go in.",

  majorPrepSchoolNotes: {
    usc: [
      { text: "2 recommendation letters from professors or supervisors", status: "todo" },
      { text: "Application deadline Feb 15, 2027", status: "deadline" },
      { text: "Confirm the full major-prep list with Lucy Jordan or busadm@marshall.usc.edu", status: "todo" }
    ],
    ucla: [
      { text: "TAP ineligible — first-year transfer disqualifies", status: "blocked" },
      { text: "Associate's degree + full Cal-GETC certification required", status: "todo" },
      { text: "Confirm Business Economics major prep on ASSIST", status: "todo" }
    ],
    berkeley: [
      { text: "BUS. 100 confirmed as a Haas prerequisite", status: "done" },
      { text: "Haas not TAP-eligible — apply as Economics or undeclared", status: "info" },
      { text: "Confirm Economics major prep on ASSIST", status: "todo" }
    ]
  },

  contacts: [
    { name: "Lucy Jordan", role: "USC territory counselor", email: "lucyjord@usc.edu", phone: "(213) 764-4558" },
    { name: "USC Marshall Admissions", role: "Marshall admissions office", email: "busadm@marshall.usc.edu", phone: null },
    { name: "Tram Nguyen", role: "UCLA counselor", email: "tnguyen@admission.ucla.edu", phone: null },
    { name: "Barry Beach", role: "Independent counselor (referred by Wendy Morrison)", email: null, phone: null }
  ]
};

window.DATA = DATA;
