/* CompassED preview backend. Implements the same ce_* functions as supabase/compassed-v1.0.sql over a sample school
   kept in localStorage, so every page can be tried without a database. Only loaded when CE.demo is true. */
(function () {
  const KEY = "ce_demo_db";
  const now = () => new Date().toISOString();
  const day = n => { const d = new Date(); d.setHours(16, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString(); };
  const dayAt = (n, h) => { const d = new Date(); d.setHours(h, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString(); };
  const today = () => new Date().toISOString().slice(0, 10);
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
  const err = e => ({ ok: false, error: e });
  const SUBJ = [["Maths","maths"],["English","english"],["Science","science"],["Geography","geography"],["French","french"],["Computing","computing"],["Art & Design","art"],["Music","music"],["History","history"],["Spanish","spanish"],["Arabic","arabic"]];

  function seed() {
    const mcq = (q, a, c, why, topic) => ({ q, a, c, why, topic });
    const db = {
      subjects: SUBJ.map((s, i) => ({ id: i, name: s[0], icon: s[1], color: i % 2 ? "#111111" : "#4cc4cf" })),
      classes: [{ id: 1, name: "7A Maths", year: 7, subj: 0 }, { id: 2, name: "8B Science", year: 8, subj: 2 }],
      teachers: [{ id: 1, subj: 0, name: "Ms Khan", username: "ms_khan", pw: "teach1234" }, { id: 2, subj: 2, name: "Mr Ode", username: "mr_ode", pw: "teach1234" }],
      students: [
        { sid: 101, code: "1234", username: "alice_j", house: "N", year: 7, class_id: 1, last_seen: day(0), stats: { xp: 2140, mast: 6, tot: 42, ans: 410, cor: 352, st: "4432210000", sa: [120, 60, 30, 20, 0, 40, 0, 0, 10, 0, 0] }, tp: { "0.0": { a: 24, c: 21, t: true }, "0.1": { a: 14, c: 12, t: true }, "1.0": { a: 9, c: 7 } } },
        { sid: 102, code: "2345", username: "ben_k", house: "E", year: 7, class_id: 1, last_seen: day(-1), stats: { xp: 860, mast: 1, tot: 42, ans: 150, cor: 98, st: "2110000000", sa: [50, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0] }, tp: { "0.0": { a: 12, c: 6 }, "0.1": { a: 3, c: 2 } } },
        { sid: 103, code: "3456", username: "cara_m", house: "S", year: 7, class_id: 1, last_seen: day(-3), stats: { xp: 3310, mast: 9, tot: 42, ans: 620, cor: 560, st: "4443321100", sa: [200, 80, 90, 30, 10, 60, 0, 0, 20, 0, 0] }, tp: { "0.0": { a: 30, c: 28, t: true }, "0.1": { a: 20, c: 18, t: true } } },
        { sid: 104, code: "4567", username: "dev_p", house: "W", year: 7, class_id: 1, last_seen: day(-9), stats: { xp: 120, mast: 0, tot: 42, ans: 20, cor: 9, st: "1000000000", sa: [10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, tp: { "0.0": { a: 2, c: 1 } } },
        { sid: 105, code: "5678", username: "ella_r", house: "N", year: 7, class_id: 1, last_seen: day(0), stats: { xp: 1780, mast: 4, tot: 42, ans: 300, cor: 240, st: "3321100000", sa: [90, 40, 20, 10, 0, 20, 0, 0, 0, 0, 0] }, tp: { "0.0": { a: 18, c: 14 }, "0.1": { a: 10, c: 8 } } },
        { sid: 201, code: "6789", username: "finn_s", house: "E", year: 8, class_id: 2, last_seen: day(-2), stats: { xp: 990, mast: 2, tot: 42, ans: 200, cor: 150, st: "0022110000", sa: [0, 0, 80, 0, 0, 0, 0, 0, 0, 0, 0] }, tp: { "2.0": { a: 15, c: 12 } } }
      ],
      units: [
        { id: 1, subj: 0, class_id: null, year: 7, title: "Algebra & Equations", summary: "Using letters for unknown numbers, simplifying expressions and solving linear equations.", ord: 1, tid: 1 },
        { id: 2, subj: 0, class_id: null, year: 7, title: "Powers, Roots & Indices", summary: "Square numbers, cube numbers, roots and the index laws.", ord: 2, tid: 1 },
        { id: 3, subj: 0, class_id: null, year: 7, title: "Fractions, Decimals & Percentages", summary: "Converting between the three and finding percentages of amounts.", ord: 3, tid: 1 },
        { id: 4, subj: 2, class_id: null, year: 8, title: "Acids & Alkalis", summary: "The pH scale, indicators and neutralisation.", ord: 1, tid: 2 }
      ],
      lessons: [
        { id: 1, unit_id: 1, title: "What is an expression?", minutes: 15, ord: 1, pub: true, updated: now(), blocks: [
          { t: "text", text: "Algebra uses letters to stand for numbers we do not know yet. An **expression** is a collection of terms with no equals sign, like 3x + 2." },
          { t: "heading", text: "Terms and coefficients" },
          { t: "list", items: ["A term is one part of an expression: 3x, 2 and −5y are all terms.", "The coefficient is the number in front of the letter: in 3x it is 3.", "Like terms have the same letter: 3x and 5x are like terms, 3x and 3y are not."] },
          { t: "key", q: "What is a coefficient?", text: "The number in front of a letter in a term. In 7y the coefficient is 7; in x it is 1." },
          { t: "check", q: "Which of these is NOT a like term with 4a?", a: ["7a", "a", "4b", "−2a"], c: 2 },
          { t: "text", text: "Collecting like terms makes an expression simpler: 3x + 5x − 2 = 8x − 2." }
        ] },
        { id: 2, unit_id: 1, title: "Solving one-step equations", minutes: 20, ord: 2, pub: true, updated: now(), blocks: [
          { t: "text", text: "An **equation** has an equals sign. To solve it, find the value of the letter that makes both sides equal." },
          { t: "key", q: "What is the golden rule for solving equations?", text: "Whatever you do to one side, do to the other. The equation stays balanced." },
          { t: "list", items: ["x + 7 = 12 → subtract 7 from both sides → x = 5", "4x = 20 → divide both sides by 4 → x = 5", "x ÷ 3 = 6 → multiply both sides by 3 → x = 18"] },
          { t: "check", q: "Solve 5x = 35", a: ["x = 5", "x = 7", "x = 30", "x = 40"], c: 1 },
          { t: "video", url: "https://www.youtube.com/embed/Qyd_v3DGzTM", text: "Watch: one-step equations (3 min)" }
        ] },
        { id: 3, unit_id: 1, title: "Two-step equations", minutes: 25, ord: 3, pub: true, updated: now(), blocks: [
          { t: "text", text: "For 5x − 7 = 2x + 8, get the letters on one side first: subtract 2x from both sides to get 3x − 7 = 8. Then add 7: 3x = 15. Then divide by 3: x = 5." },
          { t: "key", q: "In which order do you undo operations?", text: "Undo addition or subtraction first, then multiplication or division. It is the reverse of the order of operations." },
          { t: "check", q: "Solve 2x + 3 = 11", a: ["x = 3", "x = 4", "x = 7", "x = 14"], c: 1 }
        ] },
        { id: 4, unit_id: 2, title: "Square and cube numbers", minutes: 15, ord: 1, pub: true, updated: now(), blocks: [
          { t: "text", text: "A square number is a whole number multiplied by itself: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144. A cube number is a number multiplied by itself twice: 1, 8, 27, 64, 125." },
          { t: "key", q: "What is 13²?", text: "169. It is worth knowing squares up to 15² = 225." },
          { t: "check", q: "Which is both a square number and a cube number?", a: ["16", "27", "64", "100"], c: 2 }
        ] },
        { id: 5, unit_id: 2, title: "The index laws", minutes: 20, ord: 2, pub: true, updated: now(), blocks: [
          { t: "text", text: "When multiplying powers of the same base, add the indices: a³ × a⁴ = a⁷. When dividing, subtract: a⁷ ÷ a² = a⁵. A power of a power multiplies: (a²)³ = a⁶." },
          { t: "key", q: "What is a⁰?", text: "1, for any non-zero a." },
          { t: "check", q: "Simplify x⁵ × x²", a: ["x³", "x⁷", "x¹⁰", "2x⁷"], c: 1 }
        ] },
        { id: 6, unit_id: 3, title: "Converting fractions, decimals and percentages", minutes: 20, ord: 1, pub: true, updated: now(), blocks: [
          { t: "text", text: "A percentage is a fraction out of 100. 45% = 45/100 = 0.45. To turn a fraction into a decimal, divide the top by the bottom." },
          { t: "key", q: "How do you write 3/8 as a percentage?", text: "3 ÷ 8 = 0.375, so 37.5%." },
          { t: "check", q: "Which is the largest?", a: ["0.6", "55%", "5/8", "3/5"], c: 2 }
        ] },
        { id: 7, unit_id: 4, title: "The pH scale", minutes: 20, ord: 1, pub: true, updated: now(), blocks: [
          { t: "text", text: "The pH scale runs from 0 to 14. Acids are below 7, alkalis above 7 and pure water is neutral at 7." },
          { t: "key", q: "What colour does universal indicator turn in a strong acid?", text: "Red. It turns purple in a strong alkali and green when neutral." },
          { t: "check", q: "Which pH is a weak alkali?", a: ["2", "7", "9", "14"], c: 2 }
        ] }
      ],
      quizzes: [
        { id: 1, subj: 0, unit_id: 1, title: "Expressions practice", kind: "quiz", threshold: 80, tid: 1, updated: now(), qs: [
          mcq("Simplify 3x + 4x", ["7x", "12x", "7x²", "x⁷"], 0, "Add the coefficients of like terms.", "like terms"),
          mcq("What is the coefficient of y in 9y − 2?", ["−2", "9", "y", "7"], 1, "The coefficient is the number in front of the letter.", "coefficients"),
          mcq("Simplify 5a + 2b − 3a", ["2a + 2b", "4ab", "8a − 2b", "2a − 2b"], 0, "Only 5a and −3a are like terms.", "like terms"),
          mcq("Which is an expression, not an equation?", ["2x = 10", "x + 3", "x − 1 = 4", "3 = y"], 1, "Expressions have no equals sign.", "expressions"),
          mcq("Simplify 4m × 3", ["7m", "12m", "43m", "12"], 1, "Multiply the number by the coefficient.", "multiplying terms")
        ] },
        { id: 2, subj: 0, unit_id: 1, title: "Mastery checkpoint: Algebra & Equations", kind: "checkpoint", threshold: 80, tid: 1, updated: now(), qs: [
          mcq("Solve x + 9 = 15", ["x = 24", "x = 6", "x = −6", "x = 9"], 1, "Subtract 9 from both sides.", "one-step"),
          mcq("Solve 3x = 27", ["x = 9", "x = 24", "x = 81", "x = 3"], 0, "Divide both sides by 3.", "one-step"),
          mcq("Solve 2x + 5 = 17", ["x = 11", "x = 6", "x = 5", "x = 12"], 1, "Subtract 5 then divide by 2.", "two-step"),
          mcq("Solve 4x − 3 = 2x + 7", ["x = 2", "x = 5", "x = 10", "x = 4"], 1, "Subtract 2x, add 3, divide by 2.", "both sides"),
          mcq("Simplify 6p − 2p + p", ["5p", "4p", "9p", "3p"], 0, "6 − 2 + 1 = 5.", "like terms"),
          mcq("What is the value of 3n + 2 when n = 4?", ["9", "14", "12", "24"], 1, "3 × 4 + 2 = 14.", "substitution"),
          mcq("Expand 3(x + 4)", ["3x + 4", "3x + 12", "x + 12", "7x"], 1, "Multiply both terms inside the bracket by 3.", "expanding"),
          mcq("Solve x/5 = 4", ["x = 20", "x = 0.8", "x = 9", "x = 1"], 0, "Multiply both sides by 5.", "one-step")
        ] },
        { id: 3, subj: 0, unit_id: 2, title: "Powers and roots quick check", kind: "quiz", threshold: 80, tid: 1, updated: now(), qs: [
          mcq("What is 7²?", ["14", "49", "72", "27"], 1, "7 × 7 = 49.", "squares"),
          mcq("What is √81?", ["8", "9", "40.5", "81"], 1, "9 × 9 = 81.", "roots"),
          mcq("What is 2⁵?", ["10", "25", "32", "64"], 2, "2 × 2 × 2 × 2 × 2 = 32.", "powers"),
          mcq("Simplify y⁸ ÷ y³", ["y⁵", "y¹¹", "y²⁴", "y"], 0, "Subtract the indices when dividing.", "index laws")
        ] },
        { id: 4, subj: 0, unit_id: 2, title: "Mastery checkpoint: Powers, Roots & Indices", kind: "checkpoint", threshold: 80, tid: 1, updated: now(), qs: [
          mcq("What is 12²?", ["24", "122", "144", "112"], 2, "12 × 12 = 144.", "squares"),
          mcq("What is ³√27?", ["3", "9", "13.5", "81"], 0, "3 × 3 × 3 = 27.", "roots"),
          mcq("Simplify (x³)²", ["x⁵", "x⁶", "x⁹", "2x³"], 1, "Multiply the indices.", "index laws"),
          mcq("Simplify a⁴ × a", ["a⁴", "a⁵", "a", "2a⁴"], 1, "a is a¹; add the indices.", "index laws"),
          mcq("Which is NOT a square number?", ["36", "49", "50", "64"], 2, "50 is between 7² and 8².", "squares")
        ] },
        { id: 5, subj: 2, unit_id: 4, title: "pH quick check", kind: "quiz", threshold: 80, tid: 2, updated: now(), qs: [
          mcq("Pure water has a pH of…", ["0", "7", "10", "14"], 1, "7 is neutral.", "pH"),
          mcq("Lemon juice is…", ["an acid", "an alkali", "neutral", "a salt"], 0, "Lemon juice has a pH of about 2.", "pH"),
          mcq("Acid + alkali →", ["salt + water", "salt + hydrogen", "water only", "carbon dioxide"], 0, "Neutralisation makes a salt and water.", "neutralisation")
        ] }
      ],
      playlists: [
        { id: 1, class_id: 1, subj: 0, title: "Week 7: Solving equations", items: [{ t: "lesson", id: 1 }, { t: "lesson", id: 2 }, { t: "quiz", id: 1 }, { t: "lesson", id: 3 }, { t: "quiz", id: 2 }], tid: 1, updated: day(-6) },
        { id: 2, class_id: 1, subj: 0, title: "Catch-up: Powers and roots", items: [{ t: "lesson", id: 4 }, { t: "quiz", id: 3 }, { t: "lesson", id: 5 }, { t: "quiz", id: 4 }], tid: 1, updated: day(-2) }
      ],
      rubrics: [{ id: 1, tid: 1, title: "Maths written explanation", updated: now(), criteria: [
        { name: "Method", levels: [{ label: "Emerging", pts: 1, desc: "Method unclear or missing steps." }, { label: "Secure", pts: 2, desc: "Correct method with most steps shown." }, { label: "Excellent", pts: 3, desc: "Clear, efficient method with every step shown." }] },
        { name: "Accuracy", levels: [{ label: "Emerging", pts: 1, desc: "Several errors." }, { label: "Secure", pts: 2, desc: "Mostly accurate, minor slips." }, { label: "Excellent", pts: 3, desc: "Fully accurate." }] },
        { name: "Explanation", levels: [{ label: "Emerging", pts: 1, desc: "Little or no explanation." }, { label: "Secure", pts: 2, desc: "Explains what was done." }, { label: "Excellent", pts: 3, desc: "Explains what and why, using correct vocabulary." }] }
      ] }],
      assigns: [
        { id: 1, class_id: 1, subj: 0, kind: "homework", title: "Equations worksheet (Q1–10)", instr: "Solve all ten equations from the sheet. Show every step. You can type your working or add a link to a photo of your book.", due: day(2), points: 10, quiz_id: null, rubric_id: 1, tid: 1, teams_id: null, created: day(-5) },
        { id: 2, class_id: 1, subj: 0, kind: "quiz", title: "Expressions practice quiz", instr: "Complete the quiz. You can retry as many times as you like before the due date; your best score counts.", due: day(1), points: 5, quiz_id: 1, rubric_id: null, tid: 1, teams_id: null, created: day(-4) },
        { id: 3, class_id: 1, subj: 0, kind: "assignment", title: "Explain it: why do we balance equations?", instr: "Write a short explanation (100–150 words) for a Year 6 pupil of why we must do the same thing to both sides of an equation. Include one worked example.", due: day(7), points: 20, quiz_id: null, rubric_id: 1, tid: 1, teams_id: null, created: day(-2) },
        { id: 4, class_id: 1, subj: 0, kind: "homework", title: "Times tables speed test", instr: "Practise your 7 and 8 times tables for 10 minutes.", due: day(-3), points: 5, quiz_id: null, rubric_id: null, tid: 1, teams_id: null, created: day(-10) },
        { id: 5, class_id: 2, subj: 2, kind: "quiz", title: "pH quick check", instr: "Complete before Friday's practical.", due: day(3), points: 5, quiz_id: 5, rubric_id: null, tid: 2, teams_id: null, created: day(-1) }
      ],
      subs: [
        { id: 1, assign_id: 4, sid: 101, status: "returned", ver: 1, body: "Practised with the app for 10 minutes. 7s all correct, 8s 2 wrong.", links: [], sub_at: day(-4), score: 90, rub: null, feedback: "Well done Alice. Keep going with the 8s.", graded_at: day(-3), teams_ok: false },
        { id: 2, assign_id: 4, sid: 103, status: "returned", ver: 2, body: "Did both tables, all correct second time.", links: [], sub_at: day(-4), score: 100, rub: null, feedback: "Excellent.", graded_at: day(-3), teams_ok: false },
        { id: 3, assign_id: 4, sid: 105, status: "submitted", ver: 1, body: "Done.", links: [], sub_at: day(-2), score: null, rub: null, feedback: null, graded_at: null, teams_ok: false },
        { id: 4, assign_id: 1, sid: 103, status: "submitted", ver: 3, body: "1) x = 5\n2) x = 7\n3) x = 12\n4) y = 3\n5) a = 9\n6) x = 4\n7) x = 6\n8) m = 11\n9) x = 2.5\n10) x = 8\nWorking is in the photo.", links: ["https://example.com/photo-of-book"], sub_at: day(-1), score: null, rub: null, feedback: null, graded_at: null, teams_ok: false },
        { id: 5, assign_id: 1, sid: 101, status: "draft", ver: 1, body: "1) x = 5\n2) x = 7\n3) ...", links: [], sub_at: null, score: null, rub: null, feedback: null, graded_at: null, teams_ok: false }
      ],
      sub_vers: [
        { sub_id: 1, ver: 1, body: "Practised with the app for 10 minutes. 7s all correct, 8s 2 wrong.", links: [], at: day(-4) },
        { sub_id: 2, ver: 1, body: "Did the 7s.", links: [], at: day(-5) }, { sub_id: 2, ver: 2, body: "Did both tables, all correct second time.", links: [], at: day(-4) },
        { sub_id: 3, ver: 1, body: "Done.", links: [], at: day(-2) },
        { sub_id: 4, ver: 1, body: "1) x = 5\n2) x = 7", links: [], at: day(-3) }, { sub_id: 4, ver: 2, body: "1) x = 5\n2) x = 7\n3) x = 12\n4) y = 3\n5) a = 9", links: [], at: day(-2) },
        { sub_id: 4, ver: 3, body: "1) x = 5\n2) x = 7\n3) x = 12\n4) y = 3\n5) a = 9\n6) x = 4\n7) x = 6\n8) m = 11\n9) x = 2.5\n10) x = 8\nWorking is in the photo.", links: ["https://example.com/photo-of-book"], at: day(-1) },
        { sub_id: 5, ver: 1, body: "1) x = 5\n2) x = 7\n3) ...", links: [], at: day(-1) }
      ],
      lesson_done: [{ lesson_id: 1, sid: 101, at: day(-5) }, { lesson_id: 2, sid: 101, at: day(-4) }, { lesson_id: 1, sid: 103, at: day(-6) }, { lesson_id: 2, sid: 103, at: day(-5) }, { lesson_id: 3, sid: 103, at: day(-3) }, { lesson_id: 4, sid: 103, at: day(-2) }, { lesson_id: 1, sid: 105, at: day(-4) }, { lesson_id: 1, sid: 102, at: day(-1) }],
      quiz_res: [
        { id: 1, quiz_id: 1, sid: 101, score: 3, out_of: 5, answers: [0, 1, 2, 1, 0], at: day(-3) }, { id: 2, quiz_id: 1, sid: 101, score: 5, out_of: 5, answers: [0, 1, 0, 1, 1], at: day(-2) },
        { id: 3, quiz_id: 1, sid: 103, score: 5, out_of: 5, answers: [0, 1, 0, 1, 1], at: day(-4) }, { id: 4, quiz_id: 2, sid: 103, score: 7, out_of: 8, answers: [1, 0, 1, 1, 0, 1, 1, 2], at: day(-3) },
        { id: 5, quiz_id: 3, sid: 103, score: 4, out_of: 4, answers: [1, 1, 2, 0], at: day(-1) }, { id: 6, quiz_id: 1, sid: 105, score: 2, out_of: 5, answers: [1, 1, 1, 1, 1], at: day(-2) },
        { id: 7, quiz_id: 1, sid: 102, score: 1, out_of: 5, answers: [1, 0, 1, 0, 0], at: day(-1) }
      ],
      review: [
        { id: 1, sid: 101, subj: 0, key: "q:1:2", front: "Simplify 5a + 2b − 3a", back: "2a + 2b\nOnly 5a and −3a are like terms.", ease: 2.5, ivl: 0, reps: 0, due: today() },
        { id: 2, sid: 101, subj: 0, key: "l:1:1", front: "What is a coefficient?", back: "The number in front of a letter in a term. In 7y the coefficient is 7; in x it is 1.", ease: 2.5, ivl: 1, reps: 1, due: today() },
        { id: 3, sid: 101, subj: 0, key: "l:2:1", front: "What is the golden rule for solving equations?", back: "Whatever you do to one side, do to the other. The equation stays balanced.", ease: 2.6, ivl: 3, reps: 2, due: today() },
        { id: 4, sid: 101, subj: 0, key: "q:1:4", front: "Simplify 4m × 3", back: "12m\nMultiply the number by the coefficient.", ease: 2.5, ivl: 6, reps: 3, due: day(4).slice(0, 10) }
      ],
      events: [
        { id: 1, class_id: null, kind: "event", title: "Year 7 parents' evening", starts: dayAt(5, 16), ends: dayAt(5, 19), place: "Main hall", tid: 1 },
        { id: 2, class_id: 1, kind: "exam", title: "Algebra end-of-unit test", starts: dayAt(9, 9), ends: dayAt(9, 10), place: "Room M4", tid: 1 },
        { id: 3, class_id: null, kind: "trip", title: "Science museum trip (Year 8)", starts: dayAt(12, 8), ends: dayAt(12, 16), place: "Coach from front gate", tid: 2 },
        { id: 4, class_id: null, kind: "event", title: "Inset day: school closed", starts: dayAt(19, 0), ends: null, place: "", tid: 1 },
        { id: 5, class_id: 2, kind: "exam", title: "Acids & alkalis practical assessment", starts: dayAt(6, 11), ends: dayAt(6, 12), place: "Lab 2", tid: 2 }
      ],
      anns: [
        { id: 1, class_id: null, targets: {}, title: "Welcome to CompassED", body: "Your homework, lessons and quizzes now live here. Your Compass Dash XP and mastery still count and show on your Progress page.\n\nIf anything looks wrong, tell your teacher.", pinned: true, tid: 1, created: day(-7), ends: day(60) },
        { id: 2, class_id: 1, targets: {}, title: "Bring calculators on Thursday", body: "We start the indices unit this week. Please bring a scientific calculator to every lesson from Thursday.", pinned: false, tid: 1, created: day(-2), ends: day(12) },
        { id: 3, class_id: null, targets: { year: 7 }, title: "Year 7 parents' evening booking open", body: "Bookings for parents' evening are open on the school website until Monday.", pinned: false, tid: 1, created: day(-1), ends: day(5) }
      ],
      ann_read: [{ ann_id: 1, sid: 101, at: day(-6) }, { ann_id: 1, sid: 103, at: day(-6) }, { ann_id: 1, sid: 105, at: day(-5) }, { ann_id: 2, sid: 103, at: day(-1) }, { ann_id: 2, sid: 101, at: day(-1) }],
      notifs: [
        { id: 1, sid: 101, tid: null, kind: "grade", title: '"Times tables speed test" has been marked', body: "Well done Alice. Keep going with the 8s.", link: "#/assignment/4", created: day(-3), read_at: null },
        { id: 2, sid: 101, tid: null, kind: "assign", title: "New assignment: Explain it: why do we balance equations?", body: "Due in 7 days", link: "#/assignment/3", created: day(-2), read_at: null },
        { id: 3, sid: 101, tid: null, kind: "announce", title: "Bring calculators on Thursday", body: "We start the indices unit this week.", link: "#/announcements", created: day(-2), read_at: day(-1) },
        { id: 4, sid: null, tid: 1, kind: "submission", title: 'cara_m handed in "Equations worksheet (Q1–10)"', body: "", link: "#/assignment/1", created: day(-1), read_at: null },
        { id: 5, sid: null, tid: 1, kind: "submission", title: 'ella_r handed in "Times tables speed test"', body: "", link: "#/assignment/4", created: day(-2), read_at: null }
      ],
      ms_users: [], ms_classes: [], tsess: {}, seq: 1000
    };
    return db;
  }

  let db;
  const load = () => { try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) {} if (!db || !db.students) { db = seed(); save(); } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} };
  const nid = () => ++db.seq;
  load();

  /* ----- identity ----- */
  const student = a => { const code = String(a.p_code || "").replace(/\D/g, ""), u = String(a.p_user || "").toLowerCase(); return db.students.find(s => s.code === code && s.username.toLowerCase() === u) || null; };
  const teacher = a => {
    const k = a.p_key || "";
    if (k === "demo-admin") return { ok: true, admin: true, tid: null, subj: null, name: "Admin", classes: db.classes.map(c => c.id) };
    const tid = db.tsess[k]; const t = tid && db.teachers.find(x => x.id === tid);
    if (!t) return err("bad_key");
    return { ok: true, admin: false, tid: t.id, subj: t.subj, name: t.name, username: t.username, classes: db.classes.filter(c => c.subj === t.subj).map(c => c.id) };
  };
  const canClass = (t, c) => t.admin || t.classes.includes(+c);
  const canSubj = (t, s) => t.admin || t.subj === +s;
  const cls = id => db.classes.find(c => c.id === +id);
  const stage = v => { const a = +v.a || 0, c = +v.c || 0, p = a ? c / a : 0; return v.t && p >= .8 && a >= 10 ? 4 : a >= 8 && p >= .75 ? 3 : a >= 3 ? 2 : (a > 0 || v.r) ? 1 : 0; };
  const cdSummary = s => ({ xp: s.stats.xp, mast: s.stats.mast, tot: s.stats.tot, ans: s.stats.ans, cor: s.stats.cor, st: s.stats.st, sa: s.stats.sa, last_seen: s.last_seen, topics: Object.fromEntries(Object.entries(s.tp || {}).map(([k, v]) => [k, stage(v)])) });
  const annFor = (a, r) => (a.class_id != null && a.class_id === r.class_id) || (a.class_id == null && (!Object.keys(a.targets || {}).length || (a.targets.year != null && a.targets.year === r.year) || (a.targets.sids && a.targets.sids.includes(r.sid))));
  const notifyClass = (c, kind, title, body, link) => db.students.filter(s => s.class_id === +c).forEach(s => db.notifs.push({ id: nid(), sid: s.sid, tid: null, kind, title, body, link, created: now(), read_at: null }));
  const classStudents = c => db.students.filter(s => s.class_id === +c).sort((a, b) => a.username.localeCompare(b.username));
  const unitFor = (u, r) => (u.class_id == null || u.class_id === r.class_id) && (u.year == null || u.year === r.year);
  const best = (qid, sid) => { const rs = db.quiz_res.filter(x => x.quiz_id === qid && x.sid === sid); return rs.length ? Math.max(...rs.map(x => pct(x.score, x.out_of))) : null; };
  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const lessonsOf = u => db.lessons.filter(l => l.unit_id === u.id && l.pub).sort((a, b) => a.ord - b.ord || a.id - b.id);
  const subsOf = (aid) => db.subs.filter(s => s.assign_id === aid);
  const versions = s => db.sub_vers.filter(v => v.sub_id === s.id).sort((a, b) => b.ver - a.ver);

  const F = {
    /* Compass Dash functions CompassED calls */
    cd_t_login(a) { const t = db.teachers.find(x => x.username.toLowerCase() === String(a.p_user || "").trim().toLowerCase()); if (!t || t.pw !== a.p_pw) return err("no_match"); const tok = "t:" + Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, "0")).join(""); db.tsess[tok] = t.id; return { ok: true, tok, t: { id: t.id, subj: t.subj, seat: 1, name: t.name, username: t.username } }; },
    cd_t_logout(a) { delete db.tsess[a.p_key]; return { ok: true }; },

    /* ----- student ----- */
    ce_s_login(a) { const r = student(a); if (!r) return err("no_match"); r.last_seen = now(); const c = cls(r.class_id); return { ok: true, sid: r.sid, code: r.code, username: r.username, house: r.house, year: r.year, class: c ? { id: c.id, name: c.name, year: c.year, subj: c.subj } : null, subjects: db.subjects }; },
    ce_s_home(a) {
      const r = student(a); if (!r) return err("no_match");
      const cut = Date.now() - 30 * 864e5;
      return { ok: true,
        assigns: db.assigns.filter(x => x.class_id === r.class_id && (!x.due || new Date(x.due) > cut)).map(x => { const s = db.subs.find(y => y.assign_id === x.id && y.sid === r.sid); return { id: x.id, title: x.title, kind: x.kind, subj: x.subj, due: x.due, points: x.points, quiz_id: x.quiz_id, status: s ? s.status : "todo", score: s ? s.score : null, sub_at: s ? s.sub_at : null }; }).sort((p, q) => (p.due || "9") < (q.due || "9") ? -1 : 1),
        playlists: db.playlists.filter(p => p.class_id === r.class_id).map(p => ({ id: p.id, title: p.title, subj: p.subj, n: p.items.length, done: p.items.filter(i => i.t === "lesson" ? db.lesson_done.some(d => d.sid === r.sid && d.lesson_id === i.id) : db.quiz_res.some(q => q.sid === r.sid && q.quiz_id === i.id)).length })),
        events: db.events.filter(e => (e.class_id == null || e.class_id === r.class_id) && new Date(e.starts) > Date.now() && new Date(e.starts) < Date.now() + 14 * 864e5).sort((p, q) => p.starts < q.starts ? -1 : 1).map(e => ({ id: e.id, kind: e.kind, title: e.title, starts: e.starts, place: e.place })),
        review_due: db.review.filter(v => v.sid === r.sid && v.due <= today()).length,
        unread_anns: db.anns.filter(x => new Date(x.ends) > Date.now() && annFor(x, r) && !db.ann_read.some(y => y.ann_id === x.id && y.sid === r.sid)).length,
        notifs: db.notifs.filter(n => n.sid === r.sid).sort((p, q) => p.created < q.created ? 1 : -1).slice(0, 20).map(n => ({ id: n.id, kind: n.kind, title: n.title, body: n.body, link: n.link, created: n.created, read: !!n.read_at })),
        cd: cdSummary(r) };
    },
    ce_s_subjects(a) {
      const r = student(a); if (!r) return err("no_match");
      return { ok: true, units: db.units.filter(u => unitFor(u, r)).sort((p, q) => p.subj - q.subj || p.ord - q.ord).map(u => ({ id: u.id, subj: u.subj, title: u.title, summary: u.summary, ord: u.ord,
          lessons: lessonsOf(u).map(l => ({ id: l.id, title: l.title, minutes: l.minutes, ord: l.ord, done: db.lesson_done.some(d => d.lesson_id === l.id && d.sid === r.sid) })),
          quizzes: db.quizzes.filter(q => q.unit_id === u.id).sort((p, q) => (p.kind < q.kind ? 1 : p.kind > q.kind ? -1 : p.id - q.id)).map(q => ({ id: q.id, title: q.title, kind: q.kind, threshold: q.threshold, n: q.qs.length, best: best(q.id, r.sid), tries: db.quiz_res.filter(x => x.quiz_id === q.id && x.sid === r.sid).length })) })),
        playlists: db.playlists.filter(p => p.class_id === r.class_id).map(p => ({ id: p.id, title: p.title, subj: p.subj, items: p.items })), cd: cdSummary(r) };
    },
    ce_s_lesson(a) {
      const r = student(a); if (!r) return err("no_match"); const l = db.lessons.find(x => x.id === +a.p_id && x.pub); if (!l) return err("not_found"); const u = db.units.find(x => x.id === l.unit_id); if (!unitFor(u, r)) return err("not_found");
      const ls = lessonsOf(u), i = ls.findIndex(x => x.id === l.id), nx = ls[i + 1];
      return { ok: true, id: l.id, title: l.title, minutes: l.minutes, blocks: l.blocks, unit: { id: u.id, title: u.title, subj: u.subj }, done: db.lesson_done.some(d => d.lesson_id === l.id && d.sid === r.sid), next: nx ? { id: nx.id, title: nx.title } : null };
    },
    ce_s_lesson_done(a) {
      const r = student(a); if (!r) return err("no_match"); const l = db.lessons.find(x => x.id === +a.p_id); if (!l) return err("not_found");
      if (!db.lesson_done.some(d => d.lesson_id === l.id && d.sid === r.sid)) db.lesson_done.push({ lesson_id: l.id, sid: r.sid, at: now() });
      const u = db.units.find(x => x.id === l.unit_id); let n = 0;
      l.blocks.filter(b => b.t === "key").forEach(b => { n++; const key = "l:" + l.id + ":" + n; if (!db.review.some(v => v.sid === r.sid && v.key === key)) db.review.push({ id: nid(), sid: r.sid, subj: u.subj, key, front: b.q || l.title + ": key point " + n, back: b.text, ease: 2.5, ivl: 0, reps: 0, due: today() }); });
      return { ok: true };
    },
    ce_s_quiz(a) { const r = student(a); if (!r) return err("no_match"); const q = db.quizzes.find(x => x.id === +a.p_id); if (!q) return err("not_found"); return { ok: true, id: q.id, title: q.title, kind: q.kind, threshold: q.threshold, subj: q.subj, qs: q.qs.map(x => ({ q: x.q, a: x.a, topic: x.topic })), tries: db.quiz_res.filter(x => x.quiz_id === q.id && x.sid === r.sid).length }; },
    ce_s_quiz_done(a) {
      const r = student(a); if (!r) return err("no_match"); const q = db.quizzes.find(x => x.id === +a.p_id); if (!q) return err("not_found");
      const ans = a.p_answers; if (!Array.isArray(ans) || ans.length !== q.qs.length) return err("bad_answers");
      let sc = 0; const res = q.qs.map((x, i) => { const ok = +ans[i] === x.c; if (ok) sc++; else { const key = "q:" + q.id + ":" + i, ex = db.review.find(v => v.sid === r.sid && v.key === key); const back = x.a[x.c] + (x.why ? "\n" + x.why : ""); if (ex) { ex.due = today(); ex.ivl = 0; } else db.review.push({ id: nid(), sid: r.sid, subj: q.subj, key, front: x.q, back, ease: 2.5, ivl: 0, reps: 0, due: today() }); } return { i, ans: ans[i], c: x.c, why: x.why }; });
      db.quiz_res.push({ id: nid(), quiz_id: q.id, sid: r.sid, score: sc, out_of: q.qs.length, answers: ans, at: now() });
      if (a.p_assign) { const as = db.assigns.find(x => x.id === +a.p_assign && x.quiz_id === q.id && x.class_id === r.class_id); if (as) { let s = db.subs.find(y => y.assign_id === as.id && y.sid === r.sid); const p = pct(sc, q.qs.length); if (!s) { s = { id: nid(), assign_id: as.id, sid: r.sid, status: "submitted", ver: 1, body: "", links: [], sub_at: now(), score: p, rub: null, feedback: null, graded_at: null, teams_ok: false }; db.subs.push(s); } s.status = "submitted"; s.sub_at = now(); s.score = Math.max(s.score || 0, p); s.body = "Quiz: " + sc + "/" + q.qs.length; } }
      return { ok: true, score: sc, out_of: q.qs.length, pct: pct(sc, q.qs.length), passed: q.kind !== "checkpoint" || 100 * sc >= q.threshold * q.qs.length, results: res };
    },
    ce_s_assigns(a) {
      const r = student(a); if (!r) return err("no_match");
      return { ok: true, rows: db.assigns.filter(x => x.class_id === r.class_id).sort((p, q) => (p.due || "9") < (q.due || "9") ? -1 : 1).map(x => { const s = db.subs.find(y => y.assign_id === x.id && y.sid === r.sid), b = db.rubrics.find(y => y.id === x.rubric_id);
        return { id: x.id, title: x.title, kind: x.kind, subj: x.subj, instr: x.instr, due: x.due, points: x.points, quiz_id: x.quiz_id, created: x.created, rubric: b ? { title: b.title, criteria: b.criteria } : null,
          sub: s ? { id: s.id, status: s.status, ver: s.ver, body: s.body, links: s.links, sub_at: s.sub_at, score: s.score, rub: s.rub, feedback: s.feedback, graded_at: s.graded_at, versions: versions(s).map(v => ({ ver: v.ver, at: v.at, len: v.body.length })) } : null }; }) };
    },
    ce_s_submit(a) {
      const r = student(a); if (!r) return err("no_match"); const as = db.assigns.find(x => x.id === +a.p_assign && x.class_id === r.class_id); if (!as) return err("not_found");
      const body = a.p_body || "", links = a.p_links || []; if (body.length > 20000) return err("too_big");
      if (a.p_final && !body.trim() && !links.length) return err("empty");
      let s = db.subs.find(y => y.assign_id === as.id && y.sid === r.sid); if (!s) { s = { id: nid(), assign_id: as.id, sid: r.sid, status: "draft", ver: 0, body: "", links: [], sub_at: null, score: null, rub: null, feedback: null, graded_at: null, teams_ok: false }; db.subs.push(s); }
      if (s.status === "returned" && !a.p_final) return err("graded");
      s.ver++; db.sub_vers.push({ sub_id: s.id, ver: s.ver, body, links, at: now() }); s.body = body; s.links = links;
      if (a.p_final) { s.status = "submitted"; s.sub_at = now(); if (as.tid) db.notifs.push({ id: nid(), sid: null, tid: as.tid, kind: "submission", title: r.username + ' handed in "' + as.title + '"', body: "", link: "#/assignment/" + as.id, created: now(), read_at: null }); }
      return { ok: true, ver: s.ver, status: s.status };
    },
    ce_s_review(a) { const r = student(a); if (!r) return err("no_match"); const mine = db.review.filter(v => v.sid === r.sid); const due = mine.filter(v => v.due <= today()).sort((p, q) => p.due < q.due ? -1 : p.id - q.id).slice(0, 40); const nxt = mine.filter(v => v.due > today()).map(v => v.due).sort()[0]; return { ok: true, due: due.map(v => ({ id: v.id, subj: v.subj, front: v.front, back: v.back, reps: v.reps })), total: mine.length, next: nxt || null }; },
    ce_s_review_done(a) {
      const r = student(a); if (!r) return err("no_match"); const v = db.review.find(x => x.id === +a.p_id && x.sid === r.sid); if (!v) return err("not_found"); const g = Math.min(3, Math.max(0, +a.p_grade || 0)); let iv, e;
      if (g === 0) { iv = 0; e = Math.max(1.3, v.ease - .2); } else { e = Math.max(1.3, v.ease + (g === 1 ? -.15 : g === 2 ? 0 : .15)); iv = v.reps === 0 ? 1 : v.reps === 1 ? 3 : Math.round(Math.max(v.ivl, 1) * e); if (g === 1) iv = Math.max(1, Math.floor(iv / 2)); }
      const days = Math.max(iv, g === 0 ? 0 : 1); const d = new Date(); d.setDate(d.getDate() + days); v.ease = e; v.ivl = iv; v.reps = g === 0 ? 0 : v.reps + 1; v.due = d.toISOString().slice(0, 10);
      return { ok: true, due_in: days };
    },
    ce_s_progress(a) {
      const r = student(a); if (!r) return err("no_match");
      return { ok: true, subjects: db.subjects.map(s => { const us = db.units.filter(u => u.subj === s.id && unitFor(u, r)); const ls = us.flatMap(lessonsOf); const cps = db.quizzes.filter(q => q.subj === s.id && q.kind === "checkpoint" && us.some(u => u.id === q.unit_id)); const qr = db.quiz_res.filter(x => x.sid === r.sid && db.quizzes.find(q => q.id === x.quiz_id && q.subj === s.id)); const as = db.assigns.filter(x => x.subj === s.id && x.class_id === r.class_id); const sb = as.map(x => db.subs.find(y => y.assign_id === x.id && y.sid === r.sid)).filter(Boolean);
        return { id: s.id, name: s.name, icon: s.icon, lessons: ls.length, lessons_done: ls.filter(l => db.lesson_done.some(d => d.lesson_id === l.id && d.sid === r.sid)).length, checkpoints: cps.length, checkpoints_passed: cps.filter(q => db.quiz_res.some(x => x.quiz_id === q.id && x.sid === r.sid && 100 * x.score >= q.threshold * x.out_of)).length, quiz_avg: avg(qr.map(x => pct(x.score, x.out_of))), assigns: as.length, assigns_done: sb.filter(x => x.status !== "draft").length, grade_avg: avg(sb.filter(x => x.score != null).map(x => x.score)) }; }),
        recent: db.quiz_res.filter(x => x.sid === r.sid).sort((p, q) => p.at < q.at ? 1 : -1).slice(0, 12).map(x => { const q = db.quizzes.find(y => y.id === x.quiz_id); return { title: q.title, kind: q.kind, subj: q.subj, score: x.score, out_of: x.out_of, at: x.at }; }), cd: cdSummary(r) };
    },
    ce_s_calendar(a) { const r = student(a); if (!r) return err("no_match"); const f = a.p_from, t = a.p_to, inR = d => d && d.slice(0, 10) >= f && d.slice(0, 10) <= t;
      const rows = db.events.filter(e => (e.class_id == null || e.class_id === r.class_id) && inR(e.starts)).map(e => ({ id: "e" + e.id, kind: e.kind, title: e.title, starts: e.starts, ends: e.ends, place: e.place, assign_id: null, class: e.class_id ? cls(e.class_id).name : null }))
        .concat(db.assigns.filter(x => x.class_id === r.class_id && inR(x.due)).map(x => ({ id: "a" + x.id, kind: "due", title: x.title, starts: x.due, ends: null, place: SUBJ[x.subj][0], assign_id: x.id, class: null })));
      return { ok: true, rows: rows.sort((p, q) => p.starts < q.starts ? -1 : 1) }; },
    ce_s_anns(a) { const r = student(a); if (!r) return err("no_match"); return { ok: true, rows: db.anns.filter(x => new Date(x.ends) > Date.now() && annFor(x, r)).sort((p, q) => (q.pinned - p.pinned) || (p.created < q.created ? 1 : -1)).map(x => { const t = db.teachers.find(y => y.id === x.tid); return { id: x.id, title: x.title, body: x.body, pinned: x.pinned, created: x.created, from: t ? t.name : null, class: x.class_id ? cls(x.class_id).name : null, read: db.ann_read.some(y => y.ann_id === x.id && y.sid === r.sid) }; }) }; },
    ce_s_ann_read(a) { const r = student(a); if (!r) return err("no_match"); if (!db.ann_read.some(y => y.ann_id === +a.p_id && y.sid === r.sid)) db.ann_read.push({ ann_id: +a.p_id, sid: r.sid, at: now() }); return { ok: true }; },
    ce_s_notif_read(a) { const r = student(a); if (!r) return err("no_match"); db.notifs.filter(n => n.sid === r.sid && !n.read_at && (a.p_id == null || n.id === +a.p_id)).forEach(n => n.read_at = now()); return { ok: true }; },

    /* ----- teacher ----- */
    ce_t_me(a) { const t = teacher(a); if (!t.ok) return t; return Object.assign({}, t, { classes: db.classes.filter(c => canClass(t, c.id)).map(c => ({ id: c.id, name: c.name, year: c.year, subj: c.subj, n: classStudents(c.id).length, team: (db.ms_classes.find(m => m.class_id === c.id) || {}).team_id || null })), subjects: db.subjects }); },
    ce_t_home(a) { const t = teacher(a); if (!t.ok) return t; const cut = Date.now() - 7 * 864e5;
      return { ok: true, to_grade: db.subs.filter(s => s.status === "submitted" && canClass(t, db.assigns.find(x => x.id === s.assign_id).class_id)).length,
        assigns: db.assigns.filter(x => canClass(t, x.class_id) && (!x.due || new Date(x.due) > cut)).sort((p, q) => (p.due || "9") < (q.due || "9") ? -1 : 1).map(x => ({ id: x.id, title: x.title, kind: x.kind, due: x.due, class_id: x.class_id, class: cls(x.class_id).name, n: classStudents(x.class_id).length, submitted: subsOf(x.id).filter(s => s.status !== "draft").length, graded: subsOf(x.id).filter(s => s.status === "returned").length })),
        events: db.events.filter(e => (e.class_id == null || canClass(t, e.class_id)) && new Date(e.starts) > Date.now() && new Date(e.starts) < Date.now() + 14 * 864e5).sort((p, q) => p.starts < q.starts ? -1 : 1).map(e => ({ id: e.id, kind: e.kind, title: e.title, starts: e.starts })),
        notifs: db.notifs.filter(n => n.tid === t.tid).sort((p, q) => p.created < q.created ? 1 : -1).slice(0, 20).map(n => ({ id: n.id, kind: n.kind, title: n.title, link: n.link, created: n.created, read: !!n.read_at })),
        active: db.students.filter(s => canClass(t, s.class_id) && new Date(s.last_seen) > cut).length }; },
    ce_t_class(a) { const t = teacher(a); if (!t.ok) return t; if (!canClass(t, a.p_class)) return err("forbidden"); const c = cls(a.p_class);
      return { ok: true, class: { id: c.id, name: c.name, year: c.year, subj: c.subj }, students: classStudents(c.id).map(x => { const sb = db.subs.filter(s => s.sid === x.sid && db.assigns.find(y => y.id === s.assign_id).class_id === c.id); const qr = db.quiz_res.filter(q => q.sid === x.sid);
        return { sid: x.sid, name: x.username, code: x.code, house: x.house, year: x.year, last_seen: x.last_seen, cd: cdSummary(x), lessons_done: db.lesson_done.filter(d => d.sid === x.sid).length, submitted: sb.filter(s => s.status !== "draft").length, grade_avg: avg(sb.filter(s => s.score != null).map(s => s.score)), quiz_avg: avg(qr.map(q => pct(q.score, q.out_of))), ms: db.ms_users.some(m => m.sid === x.sid) }; }) }; },
    ce_t_heatmap(a) { const t = teacher(a); if (!t.ok) return t; if (!canClass(t, a.p_class)) return err("forbidden"); const c = cls(a.p_class); const us = db.units.filter(u => (u.class_id == null || u.class_id === c.id) && (u.year == null || u.year === c.year) && (c.subj == null || u.subj === c.subj)).sort((p, q) => p.subj - q.subj || p.ord - q.ord);
      return { ok: true, units: us.map(u => ({ id: u.id, title: u.title, subj: u.subj, lessons: lessonsOf(u).length, checkpoint: (db.quizzes.find(q => q.unit_id === u.id && q.kind === "checkpoint") || {}).id || null })),
        students: classStudents(c.id).map(x => ({ sid: x.sid, name: x.username, cd: cdSummary(x), cells: Object.fromEntries(us.map(u => { const qs = db.quizzes.filter(q => q.unit_id === u.id); const rs = db.quiz_res.filter(r => r.sid === x.sid && qs.some(q => q.id === r.quiz_id)); const cps = rs.filter(r => qs.find(q => q.id === r.quiz_id).kind === "checkpoint");
          return [u.id, { done: db.lesson_done.filter(d => d.sid === x.sid && lessonsOf(u).some(l => l.id === d.lesson_id)).length, cp: cps.length ? Math.max(...cps.map(r => pct(r.score, r.out_of))) : null, quiz: avg(rs.map(r => pct(r.score, r.out_of))) }]; })) })) }; },
    ce_t_content(a) { const t = teacher(a); if (!t.ok) return t;
      return { ok: true, units: db.units.filter(u => canSubj(t, u.subj)).sort((p, q) => p.subj - q.subj || p.ord - q.ord).map(u => ({ id: u.id, subj: u.subj, class_id: u.class_id, year: u.year, title: u.title, summary: u.summary, ord: u.ord, lessons: db.lessons.filter(l => l.unit_id === u.id).sort((p, q) => p.ord - q.ord || p.id - q.id).map(l => ({ id: l.id, title: l.title, minutes: l.minutes, ord: l.ord, pub: l.pub, blocks: l.blocks, updated: l.updated })) })),
        quizzes: db.quizzes.filter(q => canSubj(t, q.subj)).map(q => ({ id: q.id, subj: q.subj, unit_id: q.unit_id, title: q.title, kind: q.kind, threshold: q.threshold, qs: q.qs, updated: q.updated, tries: db.quiz_res.filter(r => r.quiz_id === q.id).length })),
        playlists: db.playlists.filter(p => canClass(t, p.class_id)).map(p => ({ id: p.id, class_id: p.class_id, subj: p.subj, title: p.title, items: p.items })),
        rubrics: db.rubrics.filter(b => t.admin || b.tid === t.tid).map(b => ({ id: b.id, title: b.title, criteria: b.criteria, updated: b.updated })) }; },
    ce_t_unit_save(a) { const t = teacher(a); if (!t.ok) return t; if (!canSubj(t, a.p_subj) || (a.p_class && !canClass(t, a.p_class))) return err("forbidden"); if (!a.p_title || !a.p_title.trim()) return err("bad_text");
      let u = a.p_id ? db.units.find(x => x.id === +a.p_id) : null; if (a.p_id && !u) return err("not_found"); if (!u) { u = { id: nid(), tid: t.tid, created: now() }; db.units.push(u); }
      Object.assign(u, { subj: +a.p_subj, class_id: a.p_class ? +a.p_class : null, year: a.p_year ? +a.p_year : null, title: a.p_title.trim(), summary: (a.p_summary || "").slice(0, 400), ord: +a.p_ord || 0 }); return { ok: true, id: u.id }; },
    ce_t_unit_del(a) { const t = teacher(a); if (!t.ok) return t; const i = db.units.findIndex(u => u.id === +a.p_id && canSubj(t, u.subj)); if (i < 0) return { ok: false }; const u = db.units[i]; db.units.splice(i, 1); db.lessons = db.lessons.filter(l => l.unit_id !== u.id); db.quizzes.forEach(q => { if (q.unit_id === u.id) q.unit_id = null; }); return { ok: true }; },
    ce_t_lesson_save(a) { const t = teacher(a); if (!t.ok) return t; const u = db.units.find(x => x.id === +a.p_unit); if (!u || !canSubj(t, u.subj)) return err("forbidden"); if (!a.p_title || !a.p_title.trim()) return err("bad_text"); if (!Array.isArray(a.p_blocks)) return err("too_big");
      let l = a.p_id ? db.lessons.find(x => x.id === +a.p_id) : null; if (a.p_id && !l) return err("not_found"); if (!l) { l = { id: nid() }; db.lessons.push(l); }
      Object.assign(l, { unit_id: u.id, title: a.p_title.trim(), minutes: Math.min(300, Math.max(1, +a.p_minutes || 20)), blocks: a.p_blocks, ord: +a.p_ord || 0, pub: a.p_pub !== false, updated: now() }); return { ok: true, id: l.id }; },
    ce_t_lesson_del(a) { const t = teacher(a); if (!t.ok) return t; const i = db.lessons.findIndex(l => l.id === +a.p_id && canSubj(t, db.units.find(u => u.id === l.unit_id).subj)); if (i < 0) return { ok: false }; db.lessons.splice(i, 1); return { ok: true }; },
    ce_t_quiz_save(a) { const t = teacher(a); if (!t.ok) return t; if (!canSubj(t, a.p_subj)) return err("forbidden"); if (!a.p_title || !a.p_title.trim()) return err("bad_text"); if (!Array.isArray(a.p_qs) || !a.p_qs.length) return err("bad_quiz");
      let q = a.p_id ? db.quizzes.find(x => x.id === +a.p_id) : null; if (a.p_id && !q) return err("not_found"); if (!q) { q = { id: nid(), tid: t.tid }; db.quizzes.push(q); }
      Object.assign(q, { subj: +a.p_subj, unit_id: a.p_unit ? +a.p_unit : null, title: a.p_title.trim(), kind: a.p_kind || "quiz", threshold: Math.min(100, Math.max(1, +a.p_threshold || 80)), qs: a.p_qs, updated: now() }); return { ok: true, id: q.id }; },
    ce_t_quiz_del(a) { const t = teacher(a); if (!t.ok) return t; const i = db.quizzes.findIndex(q => q.id === +a.p_id && canSubj(t, q.subj)); if (i < 0) return { ok: false }; db.quizzes.splice(i, 1); return { ok: true }; },
    ce_t_playlist_save(a) { const t = teacher(a); if (!t.ok) return t; if (!canClass(t, a.p_class)) return err("forbidden"); if (!a.p_title || !a.p_title.trim()) return err("bad_text"); if (!Array.isArray(a.p_items)) return err("bad_items");
      let p = a.p_id ? db.playlists.find(x => x.id === +a.p_id) : null; if (a.p_id && !p) return err("not_found"); const isNew = !p; if (!p) { p = { id: nid(), tid: t.tid }; db.playlists.push(p); }
      Object.assign(p, { class_id: +a.p_class, subj: +a.p_subj, title: a.p_title.trim(), items: a.p_items, updated: now() }); if (isNew) notifyClass(p.class_id, "playlist", "New playlist: " + p.title, "", "#/subjects"); return { ok: true, id: p.id }; },
    ce_t_playlist_del(a) { const t = teacher(a); if (!t.ok) return t; const i = db.playlists.findIndex(p => p.id === +a.p_id && canClass(t, p.class_id)); if (i < 0) return { ok: false }; db.playlists.splice(i, 1); return { ok: true }; },
    ce_t_rubric_save(a) { const t = teacher(a); if (!t.ok) return t; if (!a.p_title || !a.p_title.trim()) return err("bad_text"); if (!Array.isArray(a.p_criteria) || !a.p_criteria.length) return err("bad_rubric");
      let b = a.p_id ? db.rubrics.find(x => x.id === +a.p_id && (t.admin || x.tid === t.tid)) : null; if (a.p_id && !b) return err("not_found"); if (!b) { b = { id: nid(), tid: t.tid }; db.rubrics.push(b); }
      Object.assign(b, { title: a.p_title.trim(), criteria: a.p_criteria, updated: now() }); return { ok: true, id: b.id }; },
    ce_t_rubric_del(a) { const t = teacher(a); if (!t.ok) return t; const i = db.rubrics.findIndex(b => b.id === +a.p_id && (t.admin || b.tid === t.tid)); if (i < 0) return { ok: false }; db.rubrics.splice(i, 1); db.assigns.forEach(x => { if (x.rubric_id === +a.p_id) x.rubric_id = null; }); return { ok: true }; },
    ce_t_assigns(a) { const t = teacher(a); if (!t.ok) return t; return { ok: true, rows: db.assigns.filter(x => canClass(t, x.class_id)).sort((p, q) => (q.due || "9") < (p.due || "9") ? -1 : 1).map(x => ({ id: x.id, class_id: x.class_id, subj: x.subj, kind: x.kind, title: x.title, instr: x.instr, due: x.due, points: x.points, quiz_id: x.quiz_id, rubric_id: x.rubric_id, teams_id: x.teams_id, created: x.created, class: cls(x.class_id).name, n: classStudents(x.class_id).length, submitted: subsOf(x.id).filter(s => s.status !== "draft").length, graded: subsOf(x.id).filter(s => s.status === "returned").length })) }; },
    ce_t_assign_save(a) { const t = teacher(a); if (!t.ok) return t; if (!canClass(t, a.p_class)) return err("forbidden"); if (!a.p_title || !a.p_title.trim()) return err("bad_text");
      let x = a.p_id ? db.assigns.find(y => y.id === +a.p_id) : null; if (a.p_id && !x) return err("not_found"); const isNew = !x; if (!x) { x = { id: nid(), tid: t.tid, teams_id: null, created: now() }; db.assigns.push(x); }
      Object.assign(x, { class_id: +a.p_class, subj: +a.p_subj, kind: a.p_kind || "homework", title: a.p_title.trim(), instr: a.p_instr || "", due: a.p_due || null, points: Math.min(1000, Math.max(0, +a.p_points || 0)), quiz_id: a.p_quiz ? +a.p_quiz : null, rubric_id: a.p_rubric ? +a.p_rubric : null });
      if (isNew) notifyClass(x.class_id, "assign", "New " + x.kind + ": " + x.title, x.due ? "Due " + new Date(x.due).toDateString() : "", "#/assignment/" + x.id); return { ok: true, id: x.id }; },
    ce_t_assign_del(a) { const t = teacher(a); if (!t.ok) return t; const i = db.assigns.findIndex(x => x.id === +a.p_id && canClass(t, x.class_id)); if (i < 0) return { ok: false }; db.assigns.splice(i, 1); db.subs = db.subs.filter(s => s.assign_id !== +a.p_id); return { ok: true }; },
    ce_t_subs(a) { const t = teacher(a); if (!t.ok) return t; const x = db.assigns.find(y => y.id === +a.p_assign); if (!x || !canClass(t, x.class_id)) return err("forbidden"); const b = db.rubrics.find(y => y.id === x.rubric_id);
      return { ok: true, assign: { id: x.id, title: x.title, kind: x.kind, instr: x.instr, due: x.due, points: x.points, class_id: x.class_id, quiz_id: x.quiz_id, teams_id: x.teams_id, rubric: b ? { id: b.id, title: b.title, criteria: b.criteria } : null },
        rows: classStudents(x.class_id).map(st => { const s = db.subs.find(y => y.assign_id === x.id && y.sid === st.sid); return { sid: st.sid, name: st.username, ms: db.ms_users.some(m => m.sid === st.sid), sub: s ? { id: s.id, status: s.status, ver: s.ver, body: s.body, links: s.links, sub_at: s.sub_at, score: s.score, rub: s.rub, feedback: s.feedback, graded_at: s.graded_at, teams_ok: s.teams_ok, versions: versions(s).map(v => ({ ver: v.ver, at: v.at, body: v.body, links: v.links })) } : null }; }) }; },
    ce_t_grade(a) { const t = teacher(a); if (!t.ok) return t; const s = db.subs.find(y => y.id === +a.p_sub); if (!s) return err("not_found"); const x = db.assigns.find(y => y.id === s.assign_id); if (!canClass(t, x.class_id)) return err("forbidden");
      Object.assign(s, { status: "returned", score: Math.min(100, Math.max(0, +a.p_score || 0)), rub: a.p_rub || null, feedback: a.p_feedback || "", graded_at: now(), teams_ok: false });
      db.notifs.push({ id: nid(), sid: s.sid, tid: null, kind: "grade", title: '"' + x.title + '" has been marked', body: (a.p_feedback || "").slice(0, 120), link: "#/assignment/" + x.id, created: now(), read_at: null }); return { ok: true }; },
    ce_t_anns(a) { const t = teacher(a); if (!t.ok) return t; return { ok: true, rows: db.anns.filter(x => x.class_id != null ? canClass(t, x.class_id) : (t.admin || x.tid === t.tid)).sort((p, q) => p.created < q.created ? 1 : -1).map(x => { const readers = db.ann_read.filter(r => r.ann_id === x.id).sort((p, q) => p.at < q.at ? 1 : -1); return { id: x.id, class_id: x.class_id, targets: x.targets, title: x.title, body: x.body, pinned: x.pinned, created: x.created, ends: x.ends, class: x.class_id ? cls(x.class_id).name : null, reach: db.students.filter(s => annFor(x, s)).length, reads: readers.length, readers: readers.map(r => ({ name: db.students.find(s => s.sid === r.sid).username, at: r.at })) }; }) }; },
    ce_t_ann_save(a) { const t = teacher(a); if (!t.ok) return t; if (a.p_class && !canClass(t, a.p_class)) return err("forbidden"); if (!a.p_title || !a.p_title.trim() || !a.p_body || !a.p_body.trim()) return err("bad_text");
      let x = a.p_id ? db.anns.find(y => y.id === +a.p_id && (t.admin || y.tid === t.tid)) : null; if (a.p_id && !x) return err("not_found"); const isNew = !x; if (!x) { x = { id: nid(), tid: t.tid, created: now() }; db.anns.push(x); }
      const d = new Date(); d.setDate(d.getDate() + Math.min(90, Math.max(1, +a.p_days || 14)));
      Object.assign(x, { class_id: a.p_class ? +a.p_class : null, targets: a.p_targets || {}, title: a.p_title.trim(), body: a.p_body.trim(), pinned: !!a.p_pinned, ends: d.toISOString() });
      if (isNew) db.students.filter(s => annFor(x, s)).forEach(s => db.notifs.push({ id: nid(), sid: s.sid, tid: null, kind: "announce", title: x.title, body: x.body.slice(0, 140), link: "#/announcements", created: now(), read_at: null })); return { ok: true, id: x.id }; },
    ce_t_ann_del(a) { const t = teacher(a); if (!t.ok) return t; const i = db.anns.findIndex(x => x.id === +a.p_id && (t.admin || x.tid === t.tid)); if (i < 0) return { ok: false }; db.anns.splice(i, 1); return { ok: true }; },
    ce_t_events(a) { const t = teacher(a); if (!t.ok) return t; const inR = d => d && d.slice(0, 10) >= a.p_from && d.slice(0, 10) <= a.p_to;
      const rows = db.events.filter(e => (e.class_id == null || canClass(t, e.class_id)) && inR(e.starts)).map(e => ({ id: "e" + e.id, event_id: e.id, kind: e.kind, title: e.title, starts: e.starts, ends: e.ends, place: e.place, class_id: e.class_id, class: e.class_id ? cls(e.class_id).name : null, assign_id: null }))
        .concat(db.assigns.filter(x => canClass(t, x.class_id) && inR(x.due)).map(x => ({ id: "a" + x.id, event_id: null, kind: "due", title: x.title, starts: x.due, ends: null, place: cls(x.class_id).name, class_id: x.class_id, class: cls(x.class_id).name, assign_id: x.id })));
      return { ok: true, rows: rows.sort((p, q) => p.starts < q.starts ? -1 : 1) }; },
    ce_t_event_save(a) { const t = teacher(a); if (!t.ok) return t; if (a.p_class && !canClass(t, a.p_class)) return err("forbidden"); if (!a.p_title || !a.p_title.trim() || !a.p_starts) return err("bad_text");
      let e = a.p_id ? db.events.find(y => y.id === +a.p_id && (t.admin || y.tid === t.tid)) : null; if (a.p_id && !e) return err("not_found"); const isNew = !e; if (!e) { e = { id: nid(), tid: t.tid }; db.events.push(e); }
      Object.assign(e, { class_id: a.p_class ? +a.p_class : null, kind: a.p_kind || "event", title: a.p_title.trim(), starts: new Date(a.p_starts).toISOString(), ends: a.p_ends ? new Date(a.p_ends).toISOString() : null, place: (a.p_place || "").slice(0, 120) });
      if (isNew && e.class_id) notifyClass(e.class_id, "event", e.kind + ": " + e.title, new Date(e.starts).toLocaleString("en-GB"), "#/calendar"); return { ok: true, id: e.id }; },
    ce_t_event_del(a) { const t = teacher(a); if (!t.ok) return t; const i = db.events.findIndex(e => e.id === +a.p_id && (t.admin || e.tid === t.tid)); if (i < 0) return { ok: false }; db.events.splice(i, 1); return { ok: true }; },
    ce_t_notif_read(a) { const t = teacher(a); if (!t.ok) return t; db.notifs.filter(n => n.tid === t.tid && !n.read_at && (a.p_id == null || n.id === +a.p_id)).forEach(n => n.read_at = now()); return { ok: true }; },

    /* ----- Microsoft (in preview these pretend the edge function ran) ----- */
    ce_ms_class_link(a) { const t = teacher(a); if (!t.ok) return t; if (!canClass(t, a.p_class)) return err("forbidden"); db.ms_classes = db.ms_classes.filter(m => m.class_id !== +a.p_class); if (a.p_team) db.ms_classes.push({ class_id: +a.p_class, team_id: a.p_team, name: a.p_name, synced: now() }); return { ok: true }; },
    ce_ms_roster(a) { const t = teacher(a); if (!t.ok) return t; if (!canClass(t, a.p_class)) return err("forbidden"); let matched = 0; const un = []; (a.p_members || []).forEach(m => { const key = (m.name || "").replace(/[^A-Za-z0-9_]/g, "").toLowerCase(); const s = db.students.find(x => x.class_id === +a.p_class && x.username.toLowerCase() === key); if (s) { matched++; if (!db.ms_users.some(u => u.oid === m.oid)) db.ms_users.push({ oid: m.oid, tenant: m.tenant || "", email: m.email, name: m.name, sid: s.sid, tid: null, linked: now() }); } else un.push({ name: m.name, email: m.email }); }); return { ok: true, matched, unmatched: un }; },
    ce_ms_mark(a) { const t = teacher(a); if (!t.ok) return t; if (a.p_assign) { const x = db.assigns.find(y => y.id === +a.p_assign); if (x) x.teams_id = a.p_teams_id; } if (a.p_sub) { const s = db.subs.find(y => y.id === +a.p_sub); if (s) s.teams_ok = a.p_ok !== false; } return { ok: true }; }
  };

  window.CE_DEMO = {
    async call(fn, args) { await new Promise(r => setTimeout(r, 120 + Math.random() * 180)); if (!F[fn]) throw new Error("HTTP 404"); const out = F[fn](args || {}); save(); return JSON.parse(JSON.stringify(out)); },
    reset() { try { localStorage.removeItem(KEY); } catch (e) {} db = seed(); save(); },
    accounts: { students: [["1234", "alice_j"], ["2345", "ben_k"], ["3456", "cara_m"], ["6789", "finn_s"]], teachers: [["ms_khan", "teach1234"], ["mr_ode", "teach1234"]] }
  };
})();
