/* ============================================================
   Transfer Requirements Dashboard — source of truth
   Edit this file to update the dashboard. Nothing else needs
   to change; app.js renders entirely from what's here.
   Data current as of September 2026 (SMCCD DegreeWorks).
   ============================================================ */

const DATA = {

  meta: {
    student: "Valentino Larios",
    college: "Skyline College — San Bruno, CA",
    path: "Accelerated one-year transfer · Summer 2026 → Spring 2027",
    targetTerm: "Fall 2027 transfer admission",
    cumulativeGPA: 3.88,
    asOf: "September 2026",
    gpaSource: "SMCCD DegreeWorks"
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

  /* ---------- The framing discovery ---------- */
  premise: {
    headline: "The plan is built around the Associate's degree, not around USC.",
    body: "Competitive applications to UCLA and Berkeley require the full AA-T/AS-T plus Cal-GETC certification — not a cherry-picked, USC-optimized course list. So the course plan follows Skyline's official DegreeWorks Ed Plan (Cal-GETC), and USC's GE requirements get checked for overlap after the fact."
  },

  /* ---------- AP credit (the #1 source of error) ---------- */
  apCredit: [
    {
      id: "ap-ush",
      name: "AP US History",
      calgetc: ["3B"],
      calgetcLabel: "Cal-GETC Area 3B",
      usc: [],
      uscWouldBe: "B",
      note: "Satisfies Cal-GETC 3B. Does NOT satisfy USC GE-B — USC GE-B is still fully open."
    },
    {
      id: "ap-phys",
      name: "AP Physics 1",
      calgetc: ["5A", "5LAB"],
      calgetcLabel: "Cal-GETC Area 5A + lab",
      usc: [],
      uscWouldBe: "E",
      note: "Satisfies Cal-GETC 5A and the lab requirement. Does NOT satisfy USC GE-E — USC GE-E is still fully open with no course planned."
    }
  ],

  apRule: "Cal-GETC accepts AP exam scores for some areas. USC does not. At USC, AP credit is elective-only and never satisfies a GE-A–H category.",

  /* ---------- Terms & courses ----------
     status: completed | in-progress | planned | candidate
     calgetc: Cal-GETC slot ids   usc: USC GE letters
     uscUnconfirmed: true  → shown as "likely, needs USC confirmation"
  */
  terms: [
    {
      id: "su26",
      name: "Summer 2026",
      status: "completed",
      statusLabel: "Completed",
      unitsNote: "Unit counts not stated in the source brief — confirm in DegreeWorks.",
      courses: [
        {
          id: "math251", code: "MATH 251", title: "Calculus I", units: 5, unitsAssumed: true,
          status: "completed", grade: "B",
          calgetc: ["2"], usc: ["F"], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Completes Cal-GETC Area 2 and satisfies USC GE-F."
        },
        {
          id: "econ102", code: "ECON 102", title: "Economics", units: 3, unitsAssumed: true,
          status: "completed", grade: "A",
          calgetc: ["4"], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Counts toward Cal-GETC Area 4 alongside SOCI C1000."
        }
      ]
    },
    {
      id: "fa26",
      name: "Fall 2026",
      status: "in-progress",
      statusLabel: "In progress",
      verified: "Verified via SMCCD DegreeWorks",
      courses: [
        {
          id: "actg131", code: "ACTG 131", title: "Managerial Accounting", units: 4,
          status: "in-progress", grade: null,
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Major prep."
        },
        {
          id: "anth180", code: "ANTH 180", title: "Magic, Witchcraft & Religion", units: 3,
          status: "in-progress", grade: null,
          calgetc: [], usc: [], majorPrep: [],
          flag: "elective",
          note: "Pure elective — fulfills no Cal-GETC area and no USC GE category. Kept only because already registered. Area 4 is covered by ECON 102 + SOCI C1000, so this course is not needed there."
        },
        {
          id: "bus201", code: "BUS. 201", title: "Business Law", units: 3,
          status: "in-progress", grade: null,
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Major prep."
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
          calgetc: ["2"], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Listed against Cal-GETC Area 2, which Calc I already completed — its real value here is major prep."
        }
      ]
    },
    {
      id: "sp27",
      name: "Spring 2027",
      status: "planned",
      statusLabel: "Confirmed / registered",
      verified: "Verified via SMCCD DegreeWorks",
      courses: [
        {
          id: "englc1002", code: "ENGL C1002", title: "Critical Thinking & Composition", units: 3,
          status: "planned", grade: null,
          calgetc: ["1B"], usc: [], majorPrep: [],
          uscWriting: true, uscUnconfirmed: true,
          note: "Cal-GETC 1B + likely satisfies USC's Writing Requirement (WRIT 150 equivalent) — not confirmed with USC."
        },
        {
          id: "commc1000", code: "COMM C1000", title: "Oral Communication", units: 3,
          status: "planned", grade: null,
          calgetc: ["1C"], usc: [], majorPrep: [],
          note: "Cal-GETC 1C only — no USC GE overlap."
        },
        {
          id: "film100", code: "FILM 100", title: "Introduction to Film", units: 3,
          status: "planned", grade: null,
          calgetc: ["3A"], usc: ["A"], majorPrep: [],
          note: "Cal-GETC 3A + USC GE-A. Double-counts."
        },
        {
          id: "envs100", code: "ENVS 100", title: "Environmental Science", units: 3,
          status: "planned", grade: null,
          calgetc: ["5B"], usc: ["D"], majorPrep: [],
          uscUnconfirmed: true,
          note: "Cal-GETC 5B (Biological Science) + likely USC GE-D — unconfirmed with USC directly."
        },
        {
          id: "ethn101", code: "ETHN 101", title: "Introduction to Ethnic Studies", units: 3,
          status: "planned", grade: null,
          calgetc: ["6"], usc: ["C"], majorPrep: [],
          note: "Cal-GETC Area 6 + USC GE-C (2 of 2). Double-counts."
        },
        {
          id: "bus100", code: "BUS. 100", title: "Introduction to Business", units: 3,
          status: "planned", grade: null,
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          berkeleyPrereq: true,
          note: "Major prep + Berkeley Haas prerequisite."
        },
        {
          id: "statc1000", code: "STAT C1000", title: "Introduction to Statistics", units: 4,
          status: "planned", grade: null,
          calgetc: [], usc: [], majorPrep: ["usc", "ucla", "berkeley"],
          note: "Major prep."
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
          calgetc: ["3B"], usc: ["B"], majorPrep: [],
          note: "Would close USC GE-B (1st course) + Cal-GETC 3B. Paired with HIST 106 it fully closes GE-B in one term."
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

  /* ---------- Cal-GETC structure ---------- */
  calgetc: {
    label: "Cal-GETC",
    sublabel: "Required for the Associate's degree (AA-T/AS-T) and UC eligibility",
    areas: [
      {
        id: "1", name: "English Communication",
        slots: [
          { id: "1A", name: "1A — Written Communication" },
          { id: "1B", name: "1B — Critical Thinking / Composition" },
          { id: "1C", name: "1C — Oral Communication" }
        ]
      },
      {
        id: "2", name: "Mathematics / Quantitative Reasoning",
        slots: [{ id: "2", name: "Quantitative Reasoning" }]
      },
      {
        id: "3", name: "Arts & Humanities",
        slots: [
          { id: "3A", name: "3A — Arts" },
          { id: "3B", name: "3B — Humanities" }
        ]
      },
      {
        id: "4", name: "Social & Behavioral Sciences",
        slots: [{ id: "4", name: "Social & Behavioral Sciences", needs: 2 }]
      },
      {
        id: "5", name: "Physical & Biological Sciences",
        slots: [
          { id: "5A", name: "5A — Physical Science" },
          { id: "5B", name: "5B — Biological Science" },
          { id: "5LAB", name: "Laboratory requirement" }
        ]
      },
      {
        id: "6", name: "Ethnic Studies",
        slots: [{ id: "6", name: "Ethnic Studies" }]
      }
    ]
  },

  /* ---------- USC GE structure ---------- */
  uscge: {
    label: "USC General Education",
    sublabel: "Tracked separately from Cal-GETC — AP credit does not apply here",
    residencyNote: "USC requires only 2 of the 10 GE courses to be completed in residence. Leaving some categories open at transfer is normal and expected — not a problem to solve before Feb 2027.",
    categories: [
      { id: "A", name: "Arts", needs: 1 },
      { id: "B", name: "Humanistic Inquiry", needs: 2 },
      { id: "C", name: "Social Analysis", needs: 2 },
      { id: "D", name: "Life Sciences", needs: 1 },
      { id: "E", name: "Physical Sciences", needs: 1 },
      { id: "F", name: "Quantitative Reasoning", needs: 1 },
      { id: "G", name: "Citizenship in a Global Era", needs: 1 },
      { id: "H", name: "Traditions & Historical Foundations", needs: 1 }
    ]
  },

  /* ---------- Major prep ---------- */
  majorPrepNote: "Built from the courses tagged as major prep in the project brief. Reconcile against each school's official ASSIST / major-prep sheet before the application goes in — the brief does not enumerate every required course.",

  majorPrepSchoolNotes: {
    usc: [
      { text: "2 recommendation letters from professors or supervisors", status: "todo" },
      { text: "Application deadline Feb 15, 2027", status: "deadline" },
      { text: "Confirm full major-prep list with Lucy Jordan or busadm@marshall.usc.edu", status: "todo" }
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

  /* ---------- Contacts ---------- */
  contacts: [
    { name: "Lucy Jordan", role: "USC territory counselor", email: "lucyjord@usc.edu", phone: "(213) 764-4558" },
    { name: "USC Marshall Admissions", role: "Marshall admissions office", email: "busadm@marshall.usc.edu", phone: null },
    { name: "Tram Nguyen", role: "UCLA counselor", email: "tnguyen@admission.ucla.edu", phone: null },
    { name: "Barry Beach", role: "Independent counselor (referred by Wendy Morrison)", email: null, phone: null }
  ]
};

window.DATA = DATA;
