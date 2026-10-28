/* CompassED teacher portal. */
(function () {
  const $ = CE.$, h = CE.h, D = CE.date, page = $("#page");
  const T = CE.teacher.get();
  if (!T) { location.replace("signin.html?role=teacher"); return; }
  let me = T.me; CE.subjects = me.subjects || [];
  CE.demoBanner();
  $("#meAv").textContent = CE.initials(me.name); $("#meName").textContent = me.name;
  $("#meRole").textContent = me.admin ? "Administrator" : CE.subjName(me.subj) + " teacher";
  $("#signout").onclick = () => CE.signOut("teacher");
  if (CE.cfg.compassDashUrl) $("#cdLink").href = CE.cfg.compassDashUrl;
  CE.shell();
  const S = { home: null, content: null };
  const KIND = { homework: "Homework", assignment: "Assignment", quiz: "Quiz" };
  const card = (title, body, extra) => h("div", { class: "card" }, h("div", { class: "hd" }, h("h3", {}, title), extra || null), body);
  const sel = (opts, val, attrs) => h("select", Object.assign({ class: "in" }, attrs || {}), ...opts.map(([v, l]) => h("option", { value: v, selected: String(v) === String(val) }, l)));
  const classOpts = (all) => (all ? [[0, all]] : []).concat(me.classes.map(c => [c.id, c.name + (c.year ? " (Y" + c.year + ")" : "")]));
  const subjOpts = () => (me.admin ? CE.subjects : CE.subjects.filter(s => s.id === me.subj)).map(s => [s.id, s.name]);
  const field = (label, input, help) => h("label", { class: "f" }, label, input, help ? h("span", { class: "help" }, help) : null);
  const guard = async (fn, args) => { const r = await CE.tapi(fn, args); if (r && r.error === "bad_key") { CE.teacher.clear(); location.replace("signin.html?role=teacher"); throw new Error("bad_key"); } return r; };
  const refreshMe = async () => { const r = await guard("ce_t_me"); if (r.ok) { me = r; CE.teacher.set(T.tok, r); } };

  /* ---------- notifications ---------- */
  async function loadBell() {
    try {
      const r = S.home || await guard("ce_t_home"); if (!r.ok) return; S.home = r;
      const un = r.notifs.filter(n => !n.read).length, bn = $("#bellN"); bn.textContent = un; bn.classList.toggle("hide", !un);
      const g = $("#nGrade"); g.textContent = r.to_grade; g.classList.toggle("hide", !r.to_grade);
      const pop = $("#bellPop"); pop.innerHTML = "";
      pop.append(h("div", { class: "row between", style: { padding: "4px 10px 8px" } }, h("b", {}, "Notifications"), un ? h("button", { class: "btn sm ghost", onclick: async () => { await guard("ce_t_notif_read", { p_id: null }); S.home = null; loadBell(); } }, "Mark all read") : null));
      if (!r.notifs.length) pop.append(h("div", { class: "empty" }, "Nothing yet."));
      r.notifs.slice(0, 12).forEach(n => pop.append(h("a", { class: "item" + (n.read ? "" : " un"), href: n.link || "#/", onclick: async () => { pop.classList.remove("show"); if (!n.read) { await guard("ce_t_notif_read", { p_id: n.id }); S.home = null; loadBell(); } } }, h("div", { class: "ico sm" }, CE.icon("inbox")), h("div", { class: "grow" }, h("div", { class: "t sm" }, n.title), h("div", { class: "s xs" }, D.ago(n.created))))));
    } catch (e) {}
  }
  $("#bell").onclick = e => { e.stopPropagation(); $("#bellPop").classList.toggle("show"); };
  document.addEventListener("click", e => { if (!$("#bellWrap").contains(e.target)) $("#bellPop").classList.remove("show"); });

  /* ---------- dashboard ---------- */
  async function dashboard() {
    CE.title("Dashboard"); CE.loading(page);
    try {
      S.home = null; const r = await guard("ce_t_home"); if (!r.ok) return CE.fail(page, r); S.home = r; loadBell();
      page.innerHTML = "";
      page.append(h("div", { class: "row between" }, h("div", {}, h("h2", { style: { margin: 0 } }, "Hello, " + me.name + "."), h("div", { class: "mut" }, me.admin ? "You can see every class." : "Your " + CE.subjName(me.subj) + " classes: " + (me.classes.map(c => c.name).join(", ") || "none yet"))), h("div", { class: "row" }, h("button", { class: "btn", onclick: () => assignEditor(null) }, "+ Set work"), h("button", { class: "btn ghost", onclick: () => annEditor(null) }, "+ Announce"))));
      page.append(h("div", { class: "grid g4" },
        h("a", { class: "card stat", href: "#/assignments", style: { textDecoration: "none", color: "inherit", borderColor: r.to_grade ? "var(--cyan)" : "" } }, h("span", { class: "n" }, r.to_grade), h("span", { class: "l" }, "To mark")),
        h("div", { class: "card stat" }, h("span", { class: "n" }, r.active), h("span", { class: "l" }, "Students active this week")),
        h("div", { class: "card stat" }, h("span", { class: "n" }, r.assigns.filter(a => a.due && new Date(a.due) > Date.now()).length), h("span", { class: "l" }, "Open assignments")),
        h("div", { class: "card stat" }, h("span", { class: "n" }, me.classes.reduce((n, c) => n + (c.n || 0), 0)), h("span", { class: "l" }, "Students in your classes"))));
      const g = h("div", { class: "grid g2" }); page.append(g);
      g.append(card("Assignments", r.assigns.length ? h("div", { class: "list" }, ...r.assigns.slice(0, 8).map(a => h("a", { class: "item", href: "#/assignment/" + a.id }, h("div", { class: "ico sm" }, CE.icon(a.kind === "quiz" ? "question" : "pencil")), h("div", { class: "grow" }, h("div", { class: "t" }, a.title), h("div", { class: "s" }, a.class + (a.due ? " · " + D.until(a.due) : "")), h("div", { class: "bar", style: { marginTop: "6px", width: "140px" } }, h("i", { style: { width: CE.pct(a.submitted, a.n) + "%" } }))), h("span", { class: "badge" + (a.submitted - a.graded > 0 ? " cyan" : "") }, a.submitted + "/" + a.n + " in" + (a.submitted - a.graded > 0 ? " · " + (a.submitted - a.graded) + " to mark" : ""))))) : h("div", { class: "empty" }, "No assignments yet. Set the first one."), h("a", { class: "btn sm ghost", href: "#/assignments" }, "All")));
      g.append(card("Your classes", me.classes.length ? h("div", { class: "list" }, ...me.classes.map(c => h("a", { class: "item", href: "#/class/" + c.id }, h("div", { class: "ico sm" }, CE.icon("users")), h("div", { class: "grow" }, h("div", { class: "t" }, c.name), h("div", { class: "s" }, (c.n || 0) + " students" + (c.year ? " · Year " + c.year : "") + (c.team ? " · linked to Teams" : ""))), h("span", { class: "badge" }, CE.subjIcon(c.subj), CE.subjName(c.subj))))) : h("div", { class: "empty" }, "No classes for your subject yet. Create classes in the Compass Dash Teacher Panel; they appear here automatically."), h("a", { class: "btn sm ghost", href: "#/classes" }, "Classes")));
      g.append(card("Coming up", r.events.length ? h("div", { class: "list" }, ...r.events.slice(0, 6).map(e => h("a", { class: "item", href: "#/calendar" }, h("div", { class: "ico sm" }, CE.icon({ exam: "exam", trip: "bus" }[e.kind] || "calendar")), h("div", { class: "grow" }, h("div", { class: "t sm" }, e.title), h("div", { class: "s xs" }, D.dt(e.starts)))))) : h("div", { class: "empty" }, "Nothing in the next two weeks."), h("a", { class: "btn sm ghost", href: "#/calendar" }, "Calendar")));
      g.append(card("Recent activity", r.notifs.length ? h("div", { class: "list" }, ...r.notifs.slice(0, 6).map(n => h("a", { class: "item", href: n.link || "#/" }, h("div", { class: "ico sm" }, CE.icon("inbox")), h("div", { class: "grow" }, h("div", { class: "t sm" }, n.title), h("div", { class: "s xs" }, D.ago(n.created)))))) : h("div", { class: "empty" }, "No activity yet.")));
    } catch (e) { CE.fail(page, e); }
  }

  /* ---------- classes ---------- */
  async function classes() {
    CE.title("Classes"); page.innerHTML = "";
    if (!me.classes.length) return page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("users")), h("div", { class: "b" }, "No classes yet"), h("div", { class: "sm" }, "Classes and student codes are managed in the Compass Dash Teacher Panel. Once a class is set to your subject it shows up here.")));
    page.append(h("p", { class: "mut", style: { margin: 0 } }, "Classes and student codes come from Compass Dash. Open a class to see each student's Compass Dash progress next to their CompassED work."));
    page.append(h("div", { class: "grid g3" }, ...me.classes.map(c => h("a", { class: "subj", href: "#/class/" + c.id }, h("div", { class: "row between" }, h("div", { class: "ico" }, CE.subjIcon(c.subj)), c.team ? h("span", { class: "badge cyan" }, "Teams") : null), h("h3", { style: { margin: 0 } }, c.name), h("div", { class: "sm mut" }, (c.n || 0) + " students" + (c.year ? " · Year " + c.year : "") + " · " + CE.subjName(c.subj))))));
  }

  async function classPage(p, tab) {
    const id = +p.id; CE.title("Class"); CE.loading(page);
    try {
      const r = await guard("ce_t_class", { p_class: id }); if (!r.ok) return CE.fail(page, r);
      CE.title(r.class.name); page.innerHTML = "";
      page.append(h("div", { class: "row between" }, h("div", {}, h("a", { class: "sm", href: "#/classes" }, "← Classes"), h("h2", { style: { margin: "4px 0 0" } }, r.class.name), h("div", { class: "sm mut" }, r.students.length + " students · Year " + (r.class.year || "?") + " · " + CE.subjName(r.class.subj))), h("div", { class: "row" }, h("button", { class: "btn", onclick: () => assignEditor(null, id) }, "+ Set work"), h("button", { class: "btn ghost", onclick: () => annEditor(null, id) }, "+ Announce"))));
      const tabs = h("div", { class: "tabs" }, ...[["students", "Students"], ["heatmap", "Class overview heatmap"], ["progress", "Progress monitoring"]].map(([k, l]) => h("button", { class: k === (tab || "students") ? "on" : "", onclick: () => CE.nav("/class/" + id + "/" + k) }, l)));
      page.append(tabs);
      const box = h("div", { class: "stack" }); page.append(box);
      if ((tab || "students") === "students") {
        const tb = h("table", { class: "tb" }, h("thead", {}, h("tr", {}, h("th", {}, "Student"), h("th", {}, "Last seen"), h("th", {}, "Lessons"), h("th", {}, "Quiz avg"), h("th", {}, "Handed in"), h("th", {}, "Grade avg"), h("th", {}, "Compass Dash XP"), h("th", {}, "Mastered"), h("th", {}, ""))), h("tbody", {}));
        r.students.forEach(s => tb.lastChild.append(h("tr", {}, h("td", {}, h("div", { class: "b" }, s.name), h("div", { class: "xs mut" }, "code " + s.code + (s.house ? " · " + s.house : "") + (s.ms ? " · Microsoft linked" : ""))), h("td", { class: "sm" }, D.ago(s.last_seen)), h("td", {}, s.lessons_done), h("td", {}, s.quiz_avg != null ? s.quiz_avg + "%" : "–"), h("td", {}, s.submitted), h("td", {}, s.grade_avg != null ? h("span", { class: "badge " + (s.grade_avg >= 70 ? "ok" : s.grade_avg >= 50 ? "warn" : "bad") }, s.grade_avg + "%") : "–"), h("td", {}, (s.cd.xp || 0).toLocaleString()), h("td", {}, (s.cd.mast || 0) + "/" + (s.cd.tot || 0)), h("td", {}, h("button", { class: "btn sm ghost", onclick: () => studentModal(s, r.class) }, "Detail")))));
        box.append(h("div", { class: "card" }, h("div", { class: "tbw" }, tb), h("p", { class: "xs mut", style: { margin: "10px 0 0" } }, "Compass Dash columns are read-only and refresh each time a student plays. Codes, names and class membership are managed in the Compass Dash Teacher Panel.")));
      } else if (tab === "heatmap") await heatmap(id, box);
      else await progressTab(id, r, box);
    } catch (e) { CE.fail(page, e); }
  }

  function studentModal(s, c) {
    const stages = ["Not started", "Learning", "Practising", "Confident", "Mastered"];
    const tp = Object.entries(s.cd.topics || {});
    CE.modal(h("div", { class: "stack" }, h("h3", {}, s.name), h("div", { class: "sm mut" }, c.name + " · code " + s.code + " · last seen " + D.ago(s.last_seen)),
      h("div", { class: "grid g3" }, h("div", { class: "card flat stat" }, h("span", { class: "n" }, (s.cd.xp || 0).toLocaleString()), h("span", { class: "l" }, "XP")), h("div", { class: "card flat stat" }, h("span", { class: "n" }, CE.pct(s.cd.cor, s.cd.ans) + "%"), h("span", { class: "l" }, "Accuracy · " + (s.cd.ans || 0) + " answered")), h("div", { class: "card flat stat" }, h("span", { class: "n" }, (s.cd.mast || 0)), h("span", { class: "l" }, "Topics mastered"))),
      h("h4", {}, "CompassED"), h("div", { class: "sm" }, s.lessons_done + " lessons completed · quiz average " + (s.quiz_avg != null ? s.quiz_avg + "%" : "–") + " · " + s.submitted + " pieces handed in · grade average " + (s.grade_avg != null ? s.grade_avg + "%" : "–")),
      h("h4", {}, "Compass Dash topic stages (read-only)"), tp.length ? h("div", { class: "pill-row" }, ...stages.map((st, i) => h("span", { class: "badge" + (i === 4 ? " cyan" : "") }, st + ": " + tp.filter(t => t[1] === i).length))) : h("div", { class: "sm mut" }, "Hasn't played Compass Dash yet."),
      h("div", { class: "row" }, h("button", { class: "btn sm", onclick: () => { CE.closeModal(); annEditor(null, c.id, { sids: [s.sid], name: s.name }); } }, "Message this student"))), { wide: true });
  }

  async function heatmap(id, box) {
    box.innerHTML = ""; box.append(h("div", { class: "skel" }));
    const r = await guard("ce_t_heatmap", { p_class: id }); if (!r.ok) return CE.fail(box, r);
    box.innerHTML = "";
    if (!r.units.length) return box.append(h("div", { class: "empty" }, "No units for this class yet. Add some under Lessons & quizzes."));
    let mode = "lessons";
    const render = () => {
      box.innerHTML = "";
      box.append(h("div", { class: "row between" }, h("div", { class: "seg" }, ...[["lessons", "Lessons done"], ["cp", "Checkpoint %"], ["quiz", "Quiz avg %"], ["cd", "Compass Dash mastery"]].map(([k, l]) => h("button", { class: k === mode ? "on" : "", onclick: () => { mode = k; render(); } }, l))), h("div", { class: "xs mut" }, "Darker = better · outlined = checkpoint passed · click a name for detail")));
      const tb = h("table", { class: "heat" }, h("thead", {}, h("tr", {}, h("th", {}), ...r.units.map(u => h("th", { title: u.title }, u.title.length > 22 ? u.title.slice(0, 21) + "…" : u.title)), h("th", {}, "Avg"))), h("tbody", {}));
      r.students.forEach(s => {
        const vals = [];
        const cells = r.units.map(u => {
          const c = s.cells[u.id] || {}; let v = null, label = "·";
          if (mode === "lessons") { v = CE.pct(c.done || 0, u.lessons); label = (c.done || 0) + "/" + u.lessons; }
          else if (mode === "cp") { v = c.cp; label = v == null ? "·" : v + ""; }
          else if (mode === "quiz") { v = c.quiz; label = v == null ? "·" : v + ""; }
          else { const t = Object.entries(s.cd.topics || {}).filter(([k]) => +k.split(".")[0] === u.subj); v = t.length ? Math.round(100 * t.filter(x => x[1] === 4).length / t.length) : null; label = t.length ? t.filter(x => x[1] === 4).length + "/" + t.length : "·"; }
          if (v != null) vals.push(v);
          const lvl = v == null ? 0 : v >= 90 ? 4 : v >= 70 ? 3 : v >= 40 ? 2 : 1;
          return h("td", { class: "h" + lvl + (c.cp != null && c.cp >= 80 ? " cp" : ""), title: s.name + " · " + u.title + ": " + label }, label);
        });
        const a = vals.length ? Math.round(vals.reduce((x, y) => x + y, 0) / vals.length) : null;
        tb.lastChild.append(h("tr", {}, h("th", {}, h("a", { href: "#", onclick: e => { e.preventDefault(); guard("ce_t_class", { p_class: id }).then(x => { const st = x.students.find(y => y.sid === s.sid); if (st) studentModal(st, x.class); }); } }, s.name)), ...cells, h("td", { class: "h" + (a == null ? 0 : a >= 90 ? 4 : a >= 70 ? 3 : a >= 40 ? 2 : 1) }, a == null ? "·" : a + "%")));
      });
      const colAvg = r.units.map(u => { const vs = r.students.map(s => { const c = s.cells[u.id] || {}; return mode === "lessons" ? CE.pct(c.done || 0, u.lessons) : mode === "cp" ? c.cp : mode === "quiz" ? c.quiz : null; }).filter(v => v != null); return vs.length ? Math.round(vs.reduce((x, y) => x + y, 0) / vs.length) : null; });
      tb.lastChild.append(h("tr", {}, h("th", {}, "Class"), ...colAvg.map(a => h("td", { class: "h" + (a == null ? 0 : a >= 90 ? 4 : a >= 70 ? 3 : a >= 40 ? 2 : 1) }, a == null ? "·" : a + "%")), h("td", {})));
      box.append(h("div", { class: "card" }, h("div", { class: "tbw" }, tb)));
      const weakest = colAvg.map((a, i) => ({ a, u: r.units[i] })).filter(x => x.a != null).sort((x, y) => x.a - y.a)[0];
      const strugglers = r.students.filter(s => { const vs = r.units.map(u => { const c = s.cells[u.id] || {}; return mode === "lessons" ? CE.pct(c.done || 0, u.lessons) : mode === "cp" ? c.cp : c.quiz; }).filter(v => v != null); return vs.length && vs.reduce((x, y) => x + y, 0) / vs.length < 40; });
      box.append(h("div", { class: "grid g2" }, h("div", { class: "card tint" }, h("h4", {}, "Weakest unit"), weakest ? h("div", {}, h("b", {}, weakest.u.title), " · class average " + weakest.a + "%", h("div", { class: "row", style: { marginTop: "8px" } }, h("button", { class: "btn sm", onclick: () => playlistEditor(null, { class_id: id, subj: weakest.u.subj, title: "Revisit: " + weakest.u.title }) }, "Make a catch-up playlist"))) : h("div", { class: "mut sm" }, "Not enough data yet.")), h("div", { class: "card tint" }, h("h4", {}, "Students below 40%"), strugglers.length ? h("div", {}, strugglers.map(s => s.name).join(", "), h("div", { class: "row", style: { marginTop: "8px" } }, h("button", { class: "btn sm", onclick: () => annEditor(null, id, { sids: strugglers.map(s => s.sid), name: strugglers.length + " students" }) }, "Message them"))) : h("div", { class: "mut sm" }, "Nobody, on this view."))));
    };
    render();
  }

  async function progressTab(id, r, box) {
    const subs = await guard("ce_t_assigns"); const as = subs.ok ? subs.rows.filter(a => a.class_id === id) : [];
    box.innerHTML = "";
    box.append(h("div", { class: "grid g3" }, h("div", { class: "card stat" }, h("span", { class: "n" }, r.students.filter(s => new Date(s.last_seen) > Date.now() - 7 * 864e5).length + "/" + r.students.length), h("span", { class: "l" }, "Active this week")), h("div", { class: "card stat" }, h("span", { class: "n" }, (() => { const v = r.students.map(s => s.grade_avg).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) + "%" : "–"; })()), h("span", { class: "l" }, "Class grade average")), h("div", { class: "card stat" }, h("span", { class: "n" }, Math.round(r.students.reduce((n, s) => n + (s.cd.xp || 0), 0) / Math.max(1, r.students.length)).toLocaleString()), h("span", { class: "l" }, "Average Compass Dash XP"))));
    box.append(card("Assignment completion", as.length ? h("div", { class: "list" }, ...as.map(a => h("a", { class: "item", href: "#/assignment/" + a.id }, h("div", { class: "ico sm" }, CE.icon(a.kind === "quiz" ? "question" : "pencil")), h("div", { class: "grow" }, h("div", { class: "t sm" }, a.title), h("div", { class: "bar", style: { marginTop: "6px" } }, h("i", { style: { width: CE.pct(a.submitted, a.n) + "%" } }))), h("span", { class: "badge" }, a.submitted + "/" + a.n + " in · " + a.graded + " marked")))) : h("div", { class: "empty" }, "No assignments for this class yet.")));
    const least = r.students.slice().sort((a, b) => new Date(a.last_seen) - new Date(b.last_seen)).slice(0, 5);
    box.append(card("Needs a nudge", h("div", { class: "list" }, ...least.map(s => h("div", { class: "item" }, h("div", { class: "ico sm" }, CE.icon("user")), h("div", { class: "grow" }, h("div", { class: "t sm" }, s.name), h("div", { class: "s xs" }, "Last seen " + D.ago(s.last_seen) + " · " + s.submitted + " handed in")), h("button", { class: "btn sm ghost", onclick: () => annEditor(null, id, { sids: [s.sid], name: s.name }) }, "Message"))))));
  }

  /* ---------- content: units, lessons, quizzes ---------- */
  async function content(p) {
    CE.title("Lessons & quizzes"); CE.loading(page);
    try {
      const r = await guard("ce_t_content"); if (!r.ok) return CE.fail(page, r); S.content = r;
      page.innerHTML = "";
      const subj = p && p.subj != null ? +p.subj : (me.admin ? (r.units[0] ? r.units[0].subj : 0) : me.subj);
      page.append(h("div", { class: "row between" }, h("div", {}, h("h2", { style: { margin: 0 } }, "Lessons & quizzes"), h("div", { class: "sm mut" }, "Units hold lessons and quizzes. A checkpoint quiz marks a unit as mastered when the pass mark is reached.")), h("div", { class: "row" }, me.admin ? sel(subjOpts(), subj, { onchange: e => CE.nav("/content/" + e.target.value), style: { width: "auto" } }) : null, h("button", { class: "btn", onclick: () => unitEditor(null, subj) }, "+ New unit"), h("button", { class: "btn ghost", onclick: () => quizEditor(null, subj) }, "+ New quiz"))));
      const units = r.units.filter(u => u.subj === subj), loose = r.quizzes.filter(q => q.subj === subj && !units.some(u => u.id === q.unit_id));
      if (!units.length) page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("puzzle")), h("div", { class: "b" }, "No units for " + CE.subjName(subj) + " yet"), h("div", { class: "sm" }, "Create a unit, then add lessons and a checkpoint quiz to it.")));
      units.forEach(u => {
        const qs = r.quizzes.filter(q => q.unit_id === u.id);
        const c = h("div", { class: "card" }, h("div", { class: "hd" }, h("div", {}, h("h3", {}, u.title), h("div", { class: "sm mut" }, (u.summary || "") + (u.class_id ? " · " + ((me.classes.find(x => x.id === u.class_id) || {}).name || "one class") : " · all classes") + (u.year ? " · Year " + u.year : ""))), h("div", { class: "row" }, h("button", { class: "btn sm ghost", onclick: () => lessonEditor(null, u) }, "+ Lesson"), h("button", { class: "btn sm ghost", onclick: () => quizEditor(null, u.subj, u.id) }, "+ Quiz"), h("button", { class: "btn sm ghost", onclick: () => unitEditor(u) }, "Edit"))), h("div", { class: "list" }));
        u.lessons.forEach(l => c.lastChild.append(h("div", { class: "item" }, h("div", { class: "ico sm" }, CE.icon("lesson")), h("div", { class: "grow" }, h("div", { class: "t sm" }, l.title + (l.pub ? "" : " (hidden)")), h("div", { class: "s xs" }, l.minutes + " min · " + l.blocks.length + " blocks · updated " + D.ago(l.updated))), h("button", { class: "btn sm ghost", onclick: () => lessonEditor(l, u) }, "Edit"))));
        qs.forEach(q => c.lastChild.append(h("div", { class: "item" }, h("div", { class: "ico sm" }, CE.icon(q.kind === "checkpoint" ? "flag" : "question")), h("div", { class: "grow" }, h("div", { class: "t sm" }, q.title), h("div", { class: "s xs" }, (q.kind === "checkpoint" ? "Checkpoint · pass " + q.threshold + "% · " : "Quiz · ") + q.qs.length + " questions · " + q.tries + " attempts")), h("button", { class: "btn sm ghost", onclick: () => quizEditor(q, q.subj, q.unit_id) }, "Edit"))));
        if (!u.lessons.length && !qs.length) c.lastChild.append(h("div", { class: "empty" }, "Empty unit. Add a lesson or quiz."));
        page.append(c);
      });
      if (loose.length) page.append(card("Quizzes not in a unit", h("div", { class: "list" }, ...loose.map(q => h("div", { class: "item" }, h("div", { class: "ico sm" }, CE.icon("question")), h("div", { class: "grow" }, h("div", { class: "t sm" }, q.title), h("div", { class: "s xs" }, q.qs.length + " questions")), h("button", { class: "btn sm ghost", onclick: () => quizEditor(q, q.subj, q.unit_id) }, "Edit"))))));
    } catch (e) { CE.fail(page, e); }
  }

  function unitEditor(u, subj) {
    u = u || { subj, class_id: null, year: null, title: "", summary: "", ord: (S.content ? S.content.units.filter(x => x.subj === subj).length : 0) + 1 };
    const title = h("input", { class: "in", value: u.title, placeholder: "e.g. Algebra & Equations" }), summary = h("textarea", { class: "in", style: { minHeight: "70px" }, placeholder: "One line on what the unit covers" }, u.summary || "");
    const cl = sel(classOpts("Every class in the subject"), u.class_id || 0), yr = sel([[0, "Any year"], [7, "Year 7"], [8, "Year 8"], [9, "Year 9"]], u.year || 0), ord = h("input", { class: "in", type: "number", value: u.ord, min: 0 });
    const box = CE.modal(h("div", { class: "stack" }, h("h3", {}, u.id ? "Edit unit" : "New unit"), field("Title", title), field("Summary", summary), h("div", { class: "grid g2" }, field("Class", cl, "Leave as every class to share it across the subject"), field("Year group", yr)), field("Order", ord), h("div", { class: "err", id: "uerr" }),
      h("div", { class: "row" }, h("button", { class: "btn cyan", onclick: async () => { const r = await guard("ce_t_unit_save", { p_id: u.id || 0, p_subj: u.subj, p_class: +cl.value, p_year: +yr.value, p_title: title.value, p_summary: summary.value, p_ord: +ord.value }); if (!r.ok) return $("#uerr", box).textContent = CE.errText(r); CE.closeModal(); CE.toast("Unit saved", "ok"); content({ subj: u.subj }); } }, "Save"), u.id ? h("button", { class: "btn bad right", onclick: async () => { if (await CE.confirm("Delete this unit and every lesson in it? Quizzes are kept.", "Delete unit")) { await guard("ce_t_unit_del", { p_id: u.id }); CE.closeModal(); content({ subj: u.subj }); } } }, "Delete") : null)));
  }

  function lessonEditor(l, u) {
    l = l || { unit_id: u.id, title: "", minutes: 20, blocks: [{ t: "text", text: "" }], ord: u.lessons.length + 1, pub: true };
    const blocks = JSON.parse(JSON.stringify(l.blocks));
    const title = h("input", { class: "in", value: l.title, placeholder: "Lesson title" }), mins = h("input", { class: "in", type: "number", value: l.minutes, min: 1 }), ord = h("input", { class: "in", type: "number", value: l.ord }), pub = h("input", { type: "checkbox", checked: l.pub });
    const list = h("div", { class: "blocks" });
    const TYPES = [["text", "Text"], ["heading", "Heading"], ["list", "Bullet list"], ["key", "Key point (becomes a review card)"], ["check", "Quick check (multiple choice)"], ["video", "Video (YouTube/Vimeo embed link)"], ["link", "Link"]];
    const render = () => {
      list.innerHTML = "";
      blocks.forEach((b, i) => {
        const bk = h("div", { class: "bk" }, h("div", { class: "row between" }, h("span", { class: "badge" }, (i + 1) + ". " + TYPES.find(t => t[0] === b.t)[1]), h("div", { class: "row" }, h("button", { class: "ib", title: "Move up", disabled: !i, onclick: () => { [blocks[i - 1], blocks[i]] = [blocks[i], blocks[i - 1]]; render(); } }, "↑"), h("button", { class: "ib", title: "Move down", disabled: i === blocks.length - 1, onclick: () => { [blocks[i + 1], blocks[i]] = [blocks[i], blocks[i + 1]]; render(); } }, "↓"), h("button", { class: "ib", title: "Remove", onclick: () => { blocks.splice(i, 1); render(); } }, "✕"))));
        const bind = (k, el) => { el.oninput = () => b[k] = el.value; return el; };
        if (b.t === "text") bk.append(bind("text", h("textarea", { class: "in", placeholder: "Paragraph. **bold** works. Leave a blank line between paragraphs." }, b.text || "")));
        else if (b.t === "heading") bk.append(bind("text", h("input", { class: "in", value: b.text || "", placeholder: "Heading" })));
        else if (b.t === "list") { const ta = h("textarea", { class: "in", placeholder: "One bullet per line" }, (b.items || []).join("\n")); ta.oninput = () => b.items = ta.value.split("\n").filter(x => x.trim()); bk.append(ta); }
        else if (b.t === "key") bk.append(bind("q", h("input", { class: "in", value: b.q || "", placeholder: "Question the card asks, e.g. What is a coefficient?" })), bind("text", h("textarea", { class: "in", style: { minHeight: "70px" }, placeholder: "The key point (the answer on the back of the card)" }, b.text || "")));
        else if (b.t === "video") bk.append(bind("url", h("input", { class: "in", value: b.url || "", placeholder: "https://www.youtube.com/embed/VIDEO_ID or https://player.vimeo.com/video/ID" })), bind("text", h("input", { class: "in", value: b.text || "", placeholder: "Caption" })));
        else if (b.t === "link") bk.append(bind("url", h("input", { class: "in", value: b.url || "", placeholder: "https://…" })), bind("text", h("input", { class: "in", value: b.text || "", placeholder: "Link text" })));
        else if (b.t === "check") { b.a = b.a && b.a.length === 4 ? b.a : ["", "", "", ""]; b.c = b.c || 0; bk.append(bind("q", h("input", { class: "in", value: b.q || "", placeholder: "Question" })), h("div", { class: "grid g2", style: { gap: "6px" } }, ...b.a.map((o, k) => h("div", { class: "row", style: { gap: "6px" } }, h("input", { type: "radio", name: "c" + i, checked: b.c === k, onchange: () => b.c = k, title: "Correct answer" }), h("input", { class: "in", value: o, placeholder: "Option " + "ABCD"[k], oninput: e => b.a[k] = e.target.value }))))); }
        list.append(bk);
      });
    };
    render();
    const add = sel(TYPES, "text", { style: { width: "auto" } });
    const box = CE.modal(h("div", { class: "stack" }, h("h3", {}, l.id ? "Edit lesson" : "New lesson in " + u.title), h("div", { class: "grid", style: { gridTemplateColumns: "2fr 1fr 1fr" } }, field("Title", title), field("Minutes", mins), field("Order", ord)), h("label", { class: "chk" }, pub, "Visible to students"), h("h4", {}, "Blocks"), list, h("div", { class: "row" }, add, h("button", { class: "btn sm ghost", onclick: () => { blocks.push({ t: add.value }); render(); list.lastChild.scrollIntoView({ block: "nearest" }); } }, "+ Add block")), h("div", { class: "err", id: "lerr" }),
      h("div", { class: "row" }, h("button", { class: "btn cyan", onclick: async () => { const r = await guard("ce_t_lesson_save", { p_id: l.id || 0, p_unit: u.id, p_title: title.value, p_minutes: +mins.value, p_blocks: blocks, p_ord: +ord.value, p_pub: pub.checked }); if (!r.ok) return $("#lerr", box).textContent = CE.errText(r); CE.closeModal(); CE.toast("Lesson saved", "ok"); content({ subj: u.subj }); } }, "Save lesson"), l.id ? h("button", { class: "btn bad right", onclick: async () => { if (await CE.confirm("Delete this lesson? Students' completion records for it are removed too.", "Delete lesson")) { await guard("ce_t_lesson_del", { p_id: l.id }); CE.closeModal(); content({ subj: u.subj }); } } }, "Delete") : null)), { wide: true });
  }

  function quizEditor(q, subj, unitId) {
    q = q || { subj, unit_id: unitId || null, title: "", kind: "quiz", threshold: 80, qs: [{ q: "", a: ["", "", "", ""], c: 0, why: "", topic: "" }] };
    const qs = JSON.parse(JSON.stringify(q.qs));
    const title = h("input", { class: "in", value: q.title, placeholder: "Quiz title" }), kind = sel([["quiz", "Practice quiz"], ["checkpoint", "Mastery checkpoint"]], q.kind), thr = h("input", { class: "in", type: "number", value: q.threshold, min: 1, max: 100});
    const unit = sel([[0, "No unit"]].concat((S.content ? S.content.units.filter(u => u.subj === subj) : []).map(u => [u.id, u.title])), q.unit_id || 0);
    const list = h("div", { class: "blocks" });
    const render = () => { list.innerHTML = ""; qs.forEach((x, i) => { x.a = x.a && x.a.length === 4 ? x.a : ["", "", "", ""]; list.append(h("div", { class: "bk" }, h("div", { class: "row between" }, h("span", { class: "badge" }, "Question " + (i + 1)), h("button", { class: "ib", onclick: () => { qs.splice(i, 1); render(); } }, "✕")), h("input", { class: "in", value: x.q, placeholder: "Question", oninput: e => x.q = e.target.value }), h("div", { class: "grid g2", style: { gap: "6px" } }, ...x.a.map((o, k) => h("div", { class: "row", style: { gap: "6px" } }, h("input", { type: "radio", name: "q" + i, checked: x.c === k, onchange: () => x.c = k, title: "Correct" }), h("input", { class: "in", value: o, placeholder: "Option " + "ABCD"[k], oninput: e => x.a[k] = e.target.value })))), h("div", { class: "grid g2", style: { gap: "6px" } }, h("input", { class: "in", value: x.why || "", placeholder: "Explanation shown after marking", oninput: e => x.why = e.target.value }), h("input", { class: "in", value: x.topic || "", placeholder: "Topic tag (optional)", oninput: e => x.topic = e.target.value })))); }); };
    render();
    const box = CE.modal(h("div", { class: "stack" }, h("h3", {}, q.id ? "Edit quiz" : "New quiz"), field("Title", title), h("div", { class: "grid g3" }, field("Type", kind), field("Pass mark % (checkpoints)", thr), field("Unit", unit)), h("p", { class: "help", style: { margin: 0 } }, "Select the radio button next to the correct option. Wrong answers automatically become review cards for the student."), list, h("div", { class: "row" }, h("button", { class: "btn sm ghost", onclick: () => { qs.push({ q: "", a: ["", "", "", ""], c: 0, why: "", topic: "" }); render(); list.lastChild.scrollIntoView({ block: "nearest" }); } }, "+ Add question")), h("div", { class: "err", id: "qerr" }),
      h("div", { class: "row" }, h("button", { class: "btn cyan", onclick: async () => { const bad = qs.find(x => !x.q.trim() || x.a.some(o => !o.trim())); if (bad) return $("#qerr", box).textContent = "Every question needs text and four options."; const r = await guard("ce_t_quiz_save", { p_id: q.id || 0, p_subj: subj, p_unit: +unit.value, p_title: title.value, p_kind: kind.value, p_threshold: +thr.value, p_qs: qs }); if (!r.ok) return $("#qerr", box).textContent = CE.errText(r); CE.closeModal(); CE.toast("Quiz saved", "ok"); content({ subj }); } }, "Save quiz"), q.id ? h("button", { class: "btn bad right", onclick: async () => { if (await CE.confirm("Delete this quiz and all attempts at it?", "Delete quiz")) { await guard("ce_t_quiz_del", { p_id: q.id }); CE.closeModal(); content({ subj }); } } }, "Delete") : null)), { wide: true });
  }

  /* ---------- playlists ---------- */
  async function playlists() {
    CE.title("Playlists"); CE.loading(page);
    try {
      const r = await guard("ce_t_content"); if (!r.ok) return CE.fail(page, r); S.content = r;
      page.innerHTML = "";
      page.append(h("div", { class: "row between" }, h("div", {}, h("h2", { style: { margin: 0 } }, "Lesson playlists"), h("div", { class: "sm mut" }, "An ordered path of lessons and quizzes for one class. Students see the next step on their dashboard.")), h("button", { class: "btn", onclick: () => playlistEditor(null) }, "+ New playlist")));
      if (!r.playlists.length) page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("play")), h("div", { class: "b" }, "No playlists yet")));
      page.append(h("div", { class: "grid g2" }, ...r.playlists.map(p => h("div", { class: "card" }, h("div", { class: "hd" }, h("div", {}, h("h3", {}, p.title), h("div", { class: "sm mut" }, ((me.classes.find(c => c.id === p.class_id) || {}).name || "class") + " · " + CE.subjName(p.subj))), h("button", { class: "btn sm ghost", onclick: () => playlistEditor(p) }, "Edit")), h("ol", { class: "sm", style: { margin: 0, paddingLeft: "20px" } }, ...p.items.map(it => { const l = it.t === "lesson" ? r.units.flatMap(u => u.lessons).find(x => x.id === it.id) : r.quizzes.find(x => x.id === it.id); return h("li", {}, (l ? l.title : "(deleted)")); }))))));
    } catch (e) { CE.fail(page, e); }
  }

  function playlistEditor(p, preset) {
    const c = S.content; p = p || Object.assign({ class_id: me.classes[0] ? me.classes[0].id : 0, subj: me.admin ? 0 : me.subj, title: "", items: [] }, preset || {});
    const items = JSON.parse(JSON.stringify(p.items));
    const title = h("input", { class: "in", value: p.title, placeholder: "e.g. Week 7: Solving equations" }), cl = sel(classOpts(), p.class_id), sj = sel(subjOpts(), p.subj);
    const list = h("div", { class: "list" }), pick = h("div", { class: "list" });
    const nameOf = it => { const x = it.t === "lesson" ? c.units.flatMap(u => u.lessons).find(y => y.id === it.id) : c.quizzes.find(y => y.id === it.id); return x ? x.title : "(deleted)"; };
    const render = () => {
      list.innerHTML = ""; if (!items.length) list.append(h("div", { class: "empty" }, "Add lessons and quizzes from the right."));
      items.forEach((it, i) => list.append(h("div", { class: "item" }, h("span", { class: "badge" }, i + 1), h("div", { class: "grow t sm row", style: { gap: "6px" } }, CE.icon(it.t === "lesson" ? "lesson" : "question"), nameOf(it)), h("button", { class: "ib", disabled: !i, onclick: () => { [items[i - 1], items[i]] = [items[i], items[i - 1]]; render(); } }, "↑"), h("button", { class: "ib", disabled: i === items.length - 1, onclick: () => { [items[i + 1], items[i]] = [items[i], items[i + 1]]; render(); } }, "↓"), h("button", { class: "ib", onclick: () => { items.splice(i, 1); render(); } }, "✕"))));
      pick.innerHTML = ""; const subj = +sj.value;
      c.units.filter(u => u.subj === subj).forEach(u => { pick.append(h("div", { class: "b sm", style: { marginTop: "6px" } }, u.title)); u.lessons.forEach(l => pick.append(h("button", { class: "item click", style: { textAlign: "left" }, onclick: () => { items.push({ t: "lesson", id: l.id }); render(); } }, CE.icon("lesson"), l.title))); c.quizzes.filter(q => q.unit_id === u.id).forEach(q => pick.append(h("button", { class: "item click", style: { textAlign: "left" }, onclick: () => { items.push({ t: "quiz", id: q.id }); render(); } }, CE.icon(q.kind === "checkpoint" ? "flag" : "question"), q.title))); });
      c.quizzes.filter(q => q.subj === subj && !c.units.some(u => u.id === q.unit_id)).forEach(q => pick.append(h("button", { class: "item click", style: { textAlign: "left" }, onclick: () => { items.push({ t: "quiz", id: q.id }); render(); } }, CE.icon("question"), q.title)));
      if (!pick.children.length) pick.append(h("div", { class: "empty" }, "No content for this subject yet."));
    };
    sj.onchange = render; render();
    const box = CE.modal(h("div", { class: "stack" }, h("h3", {}, p.id ? "Edit playlist" : "New playlist"), field("Title", title), h("div", { class: "grid g2" }, field("Class", cl), field("Subject", sj)), h("div", { class: "grid g2" }, h("div", {}, h("h4", {}, "Playlist order"), list), h("div", {}, h("h4", {}, "Add content"), h("div", { style: { maxHeight: "320px", overflow: "auto" } }, pick))), h("div", { class: "err", id: "perr" }),
      h("div", { class: "row" }, h("button", { class: "btn cyan", onclick: async () => { const r = await guard("ce_t_playlist_save", { p_id: p.id || 0, p_class: +cl.value, p_subj: +sj.value, p_title: title.value, p_items: items }); if (!r.ok) return $("#perr", box).textContent = CE.errText(r); CE.closeModal(); CE.toast("Playlist saved" + (p.id ? "" : " and the class notified"), "ok"); playlists(); } }, "Save playlist"), p.id ? h("button", { class: "btn bad right", onclick: async () => { if (await CE.confirm("Delete this playlist?", "Delete")) { await guard("ce_t_playlist_del", { p_id: p.id }); CE.closeModal(); playlists(); } } }, "Delete") : null)), { wide: true });
  }

  /* ---------- rubrics ---------- */
  async function rubrics() {
    CE.title("Rubrics"); CE.loading(page);
    try {
      const r = await guard("ce_t_content"); if (!r.ok) return CE.fail(page, r); S.content = r;
      page.innerHTML = "";
      page.append(h("div", { class: "row between" }, h("div", {}, h("h2", { style: { margin: 0 } }, "Rubric builder"), h("div", { class: "sm mut" }, "A marking grid of criteria and levels. Attach one to an assignment and mark by clicking the level each piece reaches.")), h("button", { class: "btn", onclick: () => rubricEditor(null) }, "+ New rubric")));
      if (!r.rubrics.length) page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("ruler")), h("div", { class: "b" }, "No rubrics yet")));
      r.rubrics.forEach(b => { const tb = h("table", { class: "rub" }, h("thead", {}, h("tr", {}, h("th", {}, "Criterion"), ...b.criteria[0].levels.map(l => h("th", {}, l.label + " (" + l.pts + ")")))), h("tbody", {}, ...b.criteria.map(c => h("tr", {}, h("th", {}, c.name), ...c.levels.map(l => h("td", {}, l.desc)))))); page.append(h("div", { class: "card" }, h("div", { class: "hd" }, h("h3", {}, b.title), h("button", { class: "btn sm ghost", onclick: () => rubricEditor(b) }, "Edit")), h("div", { class: "tbw" }, tb))); });
    } catch (e) { CE.fail(page, e); }
  }

  function rubricEditor(b) {
    b = b || { title: "", criteria: [{ name: "Understanding", levels: [{ label: "Emerging", pts: 1, desc: "" }, { label: "Secure", pts: 2, desc: "" }, { label: "Excellent", pts: 3, desc: "" }] }] };
    const cr = JSON.parse(JSON.stringify(b.criteria)); const title = h("input", { class: "in", value: b.title, placeholder: "e.g. Written explanation" });
    const grid = h("div", { class: "tbw" });
    const render = () => {
      const n = cr[0].levels.length;
      const tb = h("table", { class: "rub" }, h("thead", {}, h("tr", {}, h("th", {}, "Criterion"), ...cr[0].levels.map((l, li) => h("th", {}, h("input", { class: "in", value: l.label, placeholder: "Level", oninput: e => cr.forEach(c => c.levels[li].label = e.target.value) }), h("input", { class: "in", type: "number", value: l.pts, style: { marginTop: "4px" }, oninput: e => cr.forEach(c => c.levels[li].pts = +e.target.value) }))), h("th", {}, h("button", { class: "btn sm ghost", onclick: () => { cr.forEach(c => c.levels.push({ label: "Level " + (n + 1), pts: n + 1, desc: "" })); render(); } }, "+ Level"), n > 2 ? h("button", { class: "btn sm ghost", onclick: () => { cr.forEach(c => c.levels.pop()); render(); } }, "− Level") : null))),
        h("tbody", {}, ...cr.map((c, ci) => h("tr", {}, h("th", {}, h("input", { class: "in", value: c.name, placeholder: "Criterion", oninput: e => c.name = e.target.value })), ...c.levels.map(l => h("td", {}, h("textarea", { class: "in", style: { minHeight: "60px" }, placeholder: "What this level looks like", oninput: e => l.desc = e.target.value }, l.desc))), h("td", {}, h("button", { class: "ib", disabled: cr.length < 2, onclick: () => { cr.splice(ci, 1); render(); } }, "✕"))))));
      grid.innerHTML = ""; grid.append(tb);
    };
    render();
    const box = CE.modal(h("div", { class: "stack" }, h("h3", {}, b.id ? "Edit rubric" : "New rubric"), field("Title", title), grid, h("div", { class: "row" }, h("button", { class: "btn sm ghost", onclick: () => { cr.push({ name: "", levels: cr[0].levels.map(l => ({ label: l.label, pts: l.pts, desc: "" })) }); render(); } }, "+ Criterion")), h("div", { class: "err", id: "rerr" }),
      h("div", { class: "row" }, h("button", { class: "btn cyan", onclick: async () => { if (cr.some(c => !c.name.trim())) return $("#rerr", box).textContent = "Every criterion needs a name."; const r = await guard("ce_t_rubric_save", { p_id: b.id || 0, p_title: title.value, p_criteria: cr }); if (!r.ok) return $("#rerr", box).textContent = CE.errText(r); CE.closeModal(); CE.toast("Rubric saved", "ok"); rubrics(); } }, "Save rubric"), b.id ? h("button", { class: "btn bad right", onclick: async () => { if (await CE.confirm("Delete this rubric? Assignments using it keep their marks but lose the grid.", "Delete")) { await guard("ce_t_rubric_del", { p_id: b.id }); CE.closeModal(); rubrics(); } } }, "Delete") : null)), { wide: true });
  }

  /* ---------- assignments ---------- */
  async function assignments() {
    CE.title("Assignments"); CE.loading(page);
    try {
      const r = await guard("ce_t_assigns"); if (!r.ok) return CE.fail(page, r);
      page.innerHTML = "";
      page.append(h("div", { class: "row between" }, h("div", {}, h("h2", { style: { margin: 0 } }, "Assignments"), h("div", { class: "sm mut" }, "Homework, longer assignments and auto-marked quizzes.")), h("button", { class: "btn", onclick: () => assignEditor(null) }, "+ Set work")));
      if (!r.rows.length) page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("pencil")), h("div", { class: "b" }, "Nothing set yet")));
      const open = r.rows.filter(a => !a.due || new Date(a.due) > Date.now()), past = r.rows.filter(a => a.due && new Date(a.due) <= Date.now());
      [["Open", open], ["Past due", past]].forEach(([t, rows]) => { if (!rows.length) return; page.append(card(t + " (" + rows.length + ")", h("div", { class: "list" }, ...rows.map(a => h("a", { class: "item", href: "#/assignment/" + a.id }, h("div", { class: "ico" }, CE.icon(a.kind === "quiz" ? "question" : "pencil")), h("div", { class: "grow" }, h("div", { class: "t" }, a.title), h("div", { class: "s" }, a.class + " · " + KIND[a.kind] + " · " + a.points + " pts" + (a.due ? " · due " + D.dt(a.due) : "") + (a.teams_id ? " · in Teams" : ""))), h("div", { style: { textAlign: "right" } }, h("span", { class: "badge" + (a.submitted - a.graded > 0 ? " cyan" : a.submitted === a.n && a.n ? " ok" : "") }, a.submitted + "/" + a.n + " handed in"), h("div", { class: "xs mut", style: { marginTop: "4px" } }, a.graded + " marked"))))))); });
    } catch (e) { CE.fail(page, e); }
  }

  function assignEditor(a, classId) {
    const go = async () => {
      if (!S.content) { const c = await guard("ce_t_content"); if (c.ok) S.content = c; }
      a = a || { class_id: classId || (me.classes[0] ? me.classes[0].id : 0), subj: me.admin ? ((me.classes.find(c => c.id === (classId || (me.classes[0] || {}).id)) || {}).subj || 0) : me.subj, kind: "homework", title: "", instr: "", due: null, points: 10, quiz_id: null, rubric_id: null };
      const title = h("input", { class: "in", value: a.title, placeholder: "e.g. Equations worksheet (Q1–10)" }), instr = h("textarea", { class: "in", placeholder: "What to do, how to hand in, how it will be marked. **bold** and links work." }, a.instr || "");
      const cl = sel(classOpts(), a.class_id), kind = sel([["homework", "Homework"], ["assignment", "Assignment (longer, rubric-marked)"], ["quiz", "Quiz (auto-marked)"]], a.kind), due = h("input", { class: "in", type: "datetime-local", value: a.due ? D.local(a.due) : "" }), pts = h("input", { class: "in", type: "number", value: a.points, min: 0 });
      const quiz = sel([[0, "Choose a quiz"]].concat(S.content.quizzes.filter(q => me.admin || q.subj === me.subj).map(q => [q.id, q.title + " (" + q.qs.length + " q)"])), a.quiz_id || 0), rub = sel([[0, "No rubric"]].concat(S.content.rubrics.map(b => [b.id, b.title])), a.rubric_id || 0);
      const qf = field("Quiz", quiz), rf = field("Rubric", rub);
      const upd = () => { qf.classList.toggle("hide", kind.value !== "quiz"); rf.classList.toggle("hide", kind.value === "quiz"); }; kind.onchange = upd; upd();
      const box = CE.modal(h("div", { class: "stack" }, h("h3", {}, a.id ? "Edit assignment" : "Set work"), field("Title", title), h("div", { class: "grid g2" }, field("Class", cl), field("Type", kind)), qf, field("Instructions", instr), h("div", { class: "grid g3" }, field("Due", due, "Leave empty for no deadline"), field("Points", pts), rf), h("div", { class: "err", id: "aerr" }),
        h("div", { class: "row" }, h("button", { class: "btn cyan", onclick: async () => { if (kind.value === "quiz" && !+quiz.value) return $("#aerr", box).textContent = "Choose the quiz."; const c = me.classes.find(x => x.id === +cl.value); const r = await guard("ce_t_assign_save", { p_id: a.id || 0, p_class: +cl.value, p_subj: c && c.subj != null ? c.subj : a.subj, p_kind: kind.value, p_title: title.value, p_instr: instr.value, p_due: due.value ? new Date(due.value).toISOString() : null, p_points: +pts.value, p_quiz: kind.value === "quiz" ? +quiz.value : 0, p_rubric: kind.value !== "quiz" ? +rub.value : 0 }); if (!r.ok) return $("#aerr", box).textContent = CE.errText(r); CE.closeModal(); CE.toast(a.id ? "Saved" : "Work set and the class notified", "ok"); S.home = null; loadBell(); CE.nav("/assignment/" + r.id); if (location.hash === "#/assignment/" + r.id) assignmentPage({ id: r.id }); } }, a.id ? "Save" : "Set work"), a.id ? h("button", { class: "btn bad right", onclick: async () => { if (await CE.confirm("Delete this assignment and every submission to it?", "Delete")) { await guard("ce_t_assign_del", { p_id: a.id }); CE.closeModal(); CE.nav("/assignments"); } } }, "Delete") : null)), { wide: true });
    };
    go();
  }

  async function assignmentPage(p) {
    CE.title("Assignment"); CE.loading(page);
    try {
      const r = await guard("ce_t_subs", { p_assign: +p.id }); if (!r.ok) return CE.fail(page, r);
      const a = r.assign; CE.title(a.title); page.innerHTML = "";
      const cls = me.classes.find(c => c.id === a.class_id) || {};
      page.append(h("div", { class: "row between" }, h("div", {}, h("a", { class: "sm", href: "#/assignments" }, "← Assignments"), h("h2", { style: { margin: "4px 0 0" } }, a.title), h("div", { class: "sm mut" }, (cls.name || "") + " · " + KIND[a.kind] + " · " + a.points + " pts" + (a.due ? " · due " + D.dt(a.due) : "") + (a.rubric ? " · rubric: " + a.rubric.title : ""))), h("div", { class: "row" }, h("button", { class: "btn ghost", onclick: () => { guard("ce_t_assigns").then(x => { const full = x.rows.find(y => y.id === a.id); assignEditor(full); }); } }, "Edit"), teamsButton(a, r.rows))));
      const sub = r.rows.filter(x => x.sub && x.sub.status !== "draft"), graded = r.rows.filter(x => x.sub && x.sub.status === "returned"), scores = graded.map(x => x.sub.score).filter(x => x != null);
      page.append(h("div", { class: "grid g4" }, h("div", { class: "card stat" }, h("span", { class: "n" }, sub.length + "/" + r.rows.length), h("span", { class: "l" }, "Handed in")), h("div", { class: "card stat" }, h("span", { class: "n" }, sub.length - graded.length), h("span", { class: "l" }, "To mark")), h("div", { class: "card stat" }, h("span", { class: "n" }, scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) + "%" : "–"), h("span", { class: "l" }, "Average")), h("div", { class: "card stat" }, h("span", { class: "n" }, r.rows.filter(x => !x.sub || x.sub.status === "draft").length), h("span", { class: "l" }, "Not handed in"))));
      if (a.instr) page.append(card("Instructions", h("div", { html: CE.rich(a.instr) })));
      const tb = h("table", { class: "tb" }, h("thead", {}, h("tr", {}, h("th", {}, "Student"), h("th", {}, "Status"), h("th", {}, "Handed in"), h("th", {}, "Versions"), h("th", {}, "Score"), h("th", {}, ""))), h("tbody", {}));
      r.rows.forEach(x => { const s = x.sub; tb.lastChild.append(h("tr", {}, h("td", { class: "b" }, x.name), h("td", {}, !s || s.status === "draft" ? h("span", { class: "badge" + (a.due && new Date(a.due) < Date.now() ? " bad" : "") }, s ? "Draft" : "Not started") : s.status === "submitted" ? h("span", { class: "badge cyan" }, "To mark") : h("span", { class: "badge ok" }, "Returned" + (s.teams_ok ? " · Teams" : ""))), h("td", { class: "sm" }, s && s.sub_at ? D.dt(s.sub_at) : "–"), h("td", {}, s ? s.ver : "–"), h("td", {}, s && s.score != null ? s.score + "%" : "–"), h("td", {}, s ? h("button", { class: "btn sm" + (s.status === "submitted" ? " cyan" : " ghost"), onclick: () => gradeModal(a, x, () => assignmentPage(p)) }, s.status === "submitted" ? "Mark" : "Open") : h("button", { class: "btn sm ghost", onclick: () => annEditor(null, a.class_id, { sids: [x.sid], name: x.name, title: "Reminder: " + a.title }) }, "Remind")))); });
      page.append(h("div", { class: "card" }, h("div", { class: "tbw" }, tb)));
    } catch (e) { CE.fail(page, e); }
  }

  function gradeModal(a, x, done) {
    const s = x.sub; let ver = s.versions[0] ? s.versions[0].ver : s.ver; const rub = s.rub ? s.rub.slice() : (a.rubric ? a.rubric.criteria.map(() => null) : null);
    const score = h("input", { class: "in", type: "number", min: 0, max: 100, value: s.score != null ? s.score : "" }), fb = h("textarea", { class: "in", placeholder: "Feedback for the student" }, s.feedback || "");
    const body = h("div", { class: "card flat pre", style: { maxHeight: "300px", overflow: "auto" } }), vers = h("div", { class: "ver" }), rubBox = h("div", {});
    const render = () => {
      const v = s.versions.find(y => y.ver === ver) || { body: s.body, links: s.links };
      body.innerHTML = ""; body.append(v.body || h("span", { class: "mut" }, "(empty)")); (v.links || []).forEach(l => body.append(h("div", {}, h("a", { href: l, target: "_blank", rel: "noopener" }, CE.icon("link"), " " + l))));
      vers.innerHTML = ""; s.versions.forEach(y => vers.append(h("button", { class: y.ver === ver ? "on" : "", onclick: () => { ver = y.ver; render(); } }, "v" + y.ver + " · " + D.dt(y.at))));
      if (a.rubric) { const tb = h("table", { class: "rub" }, h("thead", {}, h("tr", {}, h("th", {}, "Criterion"), ...a.rubric.criteria[0].levels.map(l => h("th", {}, l.label + " (" + l.pts + ")")))), h("tbody", {}, ...a.rubric.criteria.map((c, ci) => h("tr", {}, h("th", {}, c.name), ...c.levels.map((l, li) => h("td", { class: "pick" + (rub[ci] === li ? " on" : ""), onclick: () => { rub[ci] = li; const max = a.rubric.criteria.reduce((n, cc) => n + Math.max(...cc.levels.map(z => z.pts)), 0), got = a.rubric.criteria.reduce((n, cc, i) => n + (rub[i] != null ? cc.levels[rub[i]].pts : 0), 0); if (rub.every(z => z != null)) score.value = Math.round(100 * got / max); render(); } }, l.desc)))))); rubBox.innerHTML = ""; rubBox.append(h("div", { class: "tbw" }, tb), h("div", { class: "xs mut" }, "Click a cell for each criterion; the score fills in from the points.")); }
    };
    render();
    const box = CE.modal(h("div", { class: "stack" }, h("div", { class: "row between" }, h("h3", { style: { margin: 0 } }, x.name + " · " + a.title), h("span", { class: "badge " + (s.status === "returned" ? "ok" : "cyan") }, s.status)), h("div", { class: "sm mut" }, (s.sub_at ? "Handed in " + D.dt(s.sub_at) : "Not handed in yet") + " · " + s.versions.length + " version" + (s.versions.length !== 1 ? "s" : "")), vers, body, rubBox, h("div", { class: "grid", style: { gridTemplateColumns: "120px 1fr" } }, field("Score %", score), field("Feedback", fb)), h("div", { class: "err", id: "gerr" }),
      h("div", { class: "row" }, h("button", { class: "btn cyan", onclick: async () => { if (score.value === "") return $("#gerr", box).textContent = "Give a score."; const r = await guard("ce_t_grade", { p_sub: s.id, p_score: +score.value, p_rub: rub, p_feedback: fb.value }); if (!r.ok) return $("#gerr", box).textContent = CE.errText(r); CE.closeModal(); CE.toast("Returned to " + x.name, "ok"); S.home = null; loadBell(); done(); } }, s.status === "returned" ? "Update mark" : "Return with mark"), h("button", { class: "btn ghost", onclick: CE.closeModal }, "Close"))), { wide: true });
  }

  /* ---------- announcements ---------- */
  async function announcements() {
    CE.title("Announcements"); CE.loading(page);
    try {
      const r = await guard("ce_t_anns"); if (!r.ok) return CE.fail(page, r);
      page.innerHTML = "";
      page.append(h("div", { class: "row between" }, h("div", {}, h("h2", { style: { margin: 0 } }, "Announcements"), h("div", { class: "sm mut" }, "Send to a class, a year group, named students or the whole school, and see who has read it.")), h("button", { class: "btn", onclick: () => annEditor(null) }, "+ New announcement")));
      if (!r.rows.length) page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("megaphone")), h("div", { class: "b" }, "Nothing posted yet")));
      r.rows.forEach(a => { const tg = a.class_id ? a.class : a.targets.year ? "Year " + a.targets.year : a.targets.sids ? a.targets.sids.length + " named student" + (a.targets.sids.length > 1 ? "s" : "") : "Whole school"; const live = new Date(a.ends) > Date.now();
        page.append(h("div", { class: "card" + (live ? "" : " flat") }, h("div", { class: "hd" }, h("div", { class: "row" }, a.pinned ? h("span", { class: "badge ink" }, CE.icon("pin"), "Pinned") : null, h("span", { class: "badge cyan" }, tg), live ? null : h("span", { class: "badge" }, "Expired")), h("div", { class: "row" }, h("button", { class: "btn sm ghost", onclick: () => receipts(a) }, CE.icon("eye"), a.reads + "/" + a.reach + " read"), h("button", { class: "btn sm ghost", onclick: () => annEditor(a) }, "Edit"))), h("h3", {}, a.title), h("div", { html: CE.rich(a.body) }), h("div", { class: "bar ink", style: { width: "180px", marginTop: "6px" } }, h("i", { style: { width: CE.pct(a.reads, a.reach) + "%" } })), h("div", { class: "xs mut", style: { marginTop: "6px" } }, "Posted " + D.ago(a.created) + " · shows until " + D.short(a.ends)))); });
    } catch (e) { CE.fail(page, e); }
  }
  function receipts(a) { CE.modal(h("div", { class: "stack" }, h("h3", {}, "Read receipts"), h("div", { class: "sm mut" }, a.title + " · " + a.reads + " of " + a.reach + " have read it"), a.readers.length ? h("div", { class: "list" }, ...a.readers.map(x => h("div", { class: "item" }, h("div", { class: "ico sm" }, CE.icon("checkcircle")), h("div", { class: "grow" }, h("div", { class: "t sm" }, x.name), h("div", { class: "s xs" }, D.dt(x.at)))))) : h("div", { class: "empty" }, "Nobody has opened it yet."))); }

  function annEditor(a, classId, preset) {
    preset = preset || {};
    a = a || { class_id: classId || 0, targets: preset.sids ? { sids: preset.sids } : {}, title: preset.title || "", body: "", pinned: false };
    const mode = a.class_id ? "class" : a.targets.year ? "year" : a.targets.sids ? "sids" : "school";
    const title = h("input", { class: "in", value: a.title, placeholder: "Title" }), body = h("textarea", { class: "in", placeholder: "Message. **bold** and links work." }, a.body), pin = h("input", { type: "checkbox", checked: a.pinned }), days = h("input", { class: "in", type: "number", value: 14, min: 1, max: 90 });
    const to = sel([["class", "A class"], ["year", "A year group"], ["sids", "Named students"], ["school", "Whole school"]], preset.sids ? "sids" : mode), cl = sel(classOpts(), a.class_id || (me.classes[0] || {}).id), yr = sel([[7, "Year 7"], [8, "Year 8"], [9, "Year 9"]], a.targets.year || 7);
    const who = h("div", { class: "sm mut" }, preset.name ? "To: " + preset.name : a.targets.sids ? "To: " + a.targets.sids.length + " students (chosen from a class page)" : "Pick students from a class page (Message this student).");
    const fc = field("Class", cl), fy = field("Year", yr);
    const upd = () => { fc.classList.toggle("hide", to.value !== "class"); fy.classList.toggle("hide", to.value !== "year"); who.classList.toggle("hide", to.value !== "sids"); }; to.onchange = upd; upd();
    const box = CE.modal(h("div", { class: "stack" }, h("h3", {}, a.id ? "Edit announcement" : "New announcement"), field("Send to", to), fc, fy, who, field("Title", title), field("Message", body), h("div", { class: "grid g2" }, field("Show for (days)", days), h("label", { class: "chk", style: { alignSelf: "end" } }, pin, "Pin to the top")), h("div", { class: "err", id: "nerr" }),
      h("div", { class: "row" }, h("button", { class: "btn cyan", onclick: async () => { const t = to.value; const targets = t === "year" ? { year: +yr.value } : t === "sids" ? { sids: (a.targets.sids || preset.sids || []) } : {}; if (t === "sids" && !targets.sids.length) return $("#nerr", box).textContent = "No students chosen."; const r = await guard("ce_t_ann_save", { p_id: a.id || 0, p_class: t === "class" ? +cl.value : 0, p_targets: targets, p_title: title.value, p_body: body.value, p_pinned: pin.checked, p_days: +days.value }); if (!r.ok) return $("#nerr", box).textContent = CE.errText(r); CE.closeModal(); CE.toast(a.id ? "Saved" : "Posted and students notified", "ok"); if (location.hash.startsWith("#/announcements")) announcements(); } }, a.id ? "Save" : "Post"), a.id ? h("button", { class: "btn bad right", onclick: async () => { if (await CE.confirm("Delete this announcement?", "Delete")) { await guard("ce_t_ann_del", { p_id: a.id }); CE.closeModal(); announcements(); } } }, "Delete") : null)));
  }

  /* ---------- calendar ---------- */
  async function calendar() {
    CE.title("Calendar"); page.innerHTML = "";
    let d = new Date(); d.setDate(1);
    const head = h("div", { class: "row between" }), grid = h("div", { class: "cal" }), list = h("div", { class: "list" });
    page.append(h("div", { class: "card" }, head, grid), card("This month", list));
    const render = async () => {
      head.innerHTML = ""; head.append(h("div", { class: "row" }, h("button", { class: "ib", onclick: () => { d.setMonth(d.getMonth() - 1); render(); } }, "‹"), h("h3", { style: { margin: 0 } }, d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })), h("button", { class: "ib", onclick: () => { d.setMonth(d.getMonth() + 1); render(); } }, "›")), h("div", { class: "row" }, h("button", { class: "btn sm ghost", id: "ics" }, CE.icon("phone"), "Export .ics"), h("button", { class: "btn sm", onclick: () => eventEditor(null, render) }, "+ Add event")));
      const from = new Date(d.getFullYear(), d.getMonth(), -7), to = new Date(d.getFullYear(), d.getMonth() + 1, 7);
      const r = await guard("ce_t_events", { p_from: D.ymd(from), p_to: D.ymd(to) }); if (!r.ok) return CE.fail(page, r);
      const open = e => e.assign_id ? CE.nav("/assignment/" + e.assign_id) : eventEditor(e, render);
      CE.calendar(grid, d.getFullYear(), d.getMonth(), r.rows, open);
      const month = r.rows.filter(e => new Date(e.starts).getMonth() === d.getMonth()); list.innerHTML = ""; if (!month.length) list.append(h("div", { class: "empty" }, "Nothing this month."));
      month.forEach(e => list.append(h("div", { class: "item click", onclick: () => open(e) }, h("div", { class: "ico sm" }, CE.icon({ exam: "exam", trip: "bus", due: "alarm" }[e.kind] || "calendar")), h("div", { class: "grow" }, h("div", { class: "t sm" }, (e.kind === "due" ? "Due: " : "") + e.title), h("div", { class: "s xs" }, D.dt(e.starts) + " · " + (e.class || "Whole school") + (e.place ? " · " + e.place : ""))))));
      $("#ics").onclick = () => CE.ics(r.rows, "CompassED " + d.toLocaleDateString("en-GB", { month: "long" }));
    };
    render();
  }
  function eventEditor(e, done) {
    e = e || { class_id: 0, kind: "event", title: "", starts: null, ends: null, place: "" };
    const title = h("input", { class: "in", value: e.title, placeholder: "e.g. End-of-unit test" }), kind = sel([["event", "Event"], ["exam", "Exam / test"], ["deadline", "Deadline"], ["trip", "Trip"]], e.kind), cl = sel(classOpts("Whole school"), e.class_id || 0), st = h("input", { class: "in", type: "datetime-local", value: e.starts ? D.local(e.starts) : "" }), en = h("input", { class: "in", type: "datetime-local", value: e.ends ? D.local(e.ends) : "" }), pl = h("input", { class: "in", value: e.place, placeholder: "Room or place" });
    const box = CE.modal(h("div", { class: "stack" }, h("h3", {}, e.event_id ? "Edit event" : "New event"), field("Title", title), h("div", { class: "grid g2" }, field("Type", kind), field("For", cl)), h("div", { class: "grid g2" }, field("Starts", st), field("Ends", en)), field("Place", pl), h("div", { class: "err", id: "eerr" }),
      h("div", { class: "row" }, h("button", { class: "btn cyan", onclick: async () => { if (!st.value) return $("#eerr", box).textContent = "Set a start time."; const r = await guard("ce_t_event_save", { p_id: e.event_id || 0, p_class: +cl.value, p_kind: kind.value, p_title: title.value, p_starts: new Date(st.value).toISOString(), p_ends: en.value ? new Date(en.value).toISOString() : null, p_place: pl.value }); if (!r.ok) return $("#eerr", box).textContent = CE.errText(r); CE.closeModal(); CE.toast("Saved", "ok"); done(); } }, "Save"), e.event_id ? h("button", { class: "btn bad right", onclick: async () => { if (await CE.confirm("Delete this event?", "Delete")) { await guard("ce_t_event_del", { p_id: e.event_id }); CE.closeModal(); done(); } } }, "Delete") : null)));
  }

  /* ---------- Microsoft Teams ---------- */
  function teamsButton(a, rows) {
    if (!CE.MS.enabled()) return null;
    const linked = me.classes.find(c => c.id === a.class_id && c.team);
    if (!linked) return null;
    return a.teams_id ? h("button", { class: "btn ghost", onclick: () => pushGrades(a, rows) }, CE.icon("teams"), "Sync grades to Teams") : h("button", { class: "btn ghost", onclick: () => pushAssignment(a) }, CE.icon("teams"), "Post to Teams");
  }
  async function msReady() { if (!CE.MS.token()) { if (await CE.confirm("You need to sign in to Microsoft with Teams permissions first. Go there now?", "Sign in to Microsoft")) CE.MS.signIn("teacher"); return false; } return true; }
  async function pushAssignment(a) { if (!await msReady()) return; CE.toast("Creating the Teams assignment…"); const r = await CE.MS.fn("push_assign", { assign_id: a.id }); if (r.ok) { CE.toast("Posted to Teams ✓", "ok"); assignmentPage({ id: a.id }); } else CE.toast(CE.errText(r), "bad"); }
  async function pushGrades(a, rows) { if (!await msReady()) return; const todo = rows.filter(x => x.sub && x.sub.status === "returned" && !x.sub.teams_ok); if (!todo.length) return CE.toast("Every returned mark is already in Teams."); CE.toast("Sending " + todo.length + " grades…"); const r = await CE.MS.fn("push_grades", { assign_id: a.id }); if (r.ok) { CE.toast((r.sent || 0) + " grades sent to Teams ✓", "ok"); assignmentPage({ id: a.id }); } else CE.toast(CE.errText(r), "bad"); }

  async function teams() {
    CE.title("Microsoft Teams"); page.innerHTML = "";
    const steps = h("div", { class: "card" }, h("h3", {}, "What the connection does"), h("div", { class: "grid g2" },
      h("div", { class: "feat" }, h("div", { class: "ico" }, CE.icon("lock")), h("h4", {}, "Sign in with Microsoft"), h("p", { class: "sm mut" }, "Students and teachers link their school account once, then sign in with one click.")),
      h("div", { class: "feat" }, h("div", { class: "ico" }, CE.icon("users")), h("h4", {}, "Class and roster import"), h("p", { class: "sm mut" }, "Link a CompassED class to a class Team. Members are matched to Compass Dash usernames; unmatched names are listed for you.")),
      h("div", { class: "feat" }, h("div", { class: "ico" }, CE.icon("bell")), h("h4", {}, "Teams notifications"), h("p", { class: "sm mut" }, "Post new work, deadlines and announcements into the class Team's General channel.")),
      h("div", { class: "feat" }, h("div", { class: "ico" }, CE.icon("pencil")), h("h4", {}, "Assignment and grade sync"), h("p", { class: "sm mut" }, "Create the matching Teams assignment and send returned marks to it, so grades show in Teams too."))));
    page.append(steps);
    if (!CE.MS.enabled()) {
      page.append(h("div", { class: "card tint" }, h("h3", {}, CE.demo ? "Switched off in preview mode" : "Not connected yet"), h("p", { class: "sm" }, "The connection needs the school's Microsoft 365 administrator to register CompassED in Entra ID and approve its permissions, and the ce-teams edge function to be deployed with the app's secret. Nothing here can work until then. The exact steps are in the README under Microsoft Teams."),
        h("ul", { class: "sm" }, h("li", {}, "Entra ID app registration (single-page application) with this site's address as a redirect URI"), h("li", {}, "Admin consent for: User.Read, Team.ReadBasic.All, EduRoster.ReadBasic, EduAssignments.ReadWrite, ChannelMessage.Send, Chat.Create, ChatMessage.Send"), h("li", {}, "Client ID and tenant ID pasted into assets/config.js; client secret stored only in Supabase edge function secrets"))));
      return;
    }
    const tok = CE.MS.token();
    const r = await CE.MS.finish(); if (r && !r.ok) CE.toast(CE.errText(r), "bad");
    const box = h("div", { class: "card" }); page.append(box);
    const render = async () => {
      box.innerHTML = ""; const t = CE.MS.token();
      box.append(h("div", { class: "hd" }, h("h3", {}, "Connection"), t ? h("span", { class: "badge ok" }, "Signed in to Microsoft") : h("button", { class: "btn", onclick: () => CE.MS.signIn("teacher") }, h("span", { class: "ms" }, h("i"), h("i"), h("i"), h("i")), " Sign in to Microsoft")));
      if (!t) return box.append(h("p", { class: "sm mut" }, "Sign in with your school Microsoft account to list your class Teams."));
      box.append(h("div", { class: "skel" }));
      const list = await CE.MS.fn("teams"); box.lastChild.remove();
      if (!list.ok) return box.append(h("div", { class: "err" }, CE.errText(list)));
      const tb = h("table", { class: "tb" }, h("thead", {}, h("tr", {}, h("th", {}, "CompassED class"), h("th", {}, "Class Team"), h("th", {}, "Roster"), h("th", {}, ""))), h("tbody", {}));
      me.classes.forEach(c => { const s = sel([["", "Not linked"]].concat(list.teams.map(x => [x.id, x.name])), c.team || "", { style: { minWidth: "200px" } }); tb.lastChild.append(h("tr", {}, h("td", { class: "b" }, c.name), h("td", {}, s), h("td", { class: "sm mut" }, c.team ? "Linked" : "–"), h("td", {}, h("div", { class: "row" }, h("button", { class: "btn sm", onclick: async () => { const team = list.teams.find(x => x.id === s.value); const y = await CE.MS.fn("link_class", { class_id: c.id, team_id: s.value, team_name: team ? team.name : "" }); if (y.ok) { CE.toast("Saved", "ok"); await refreshMe(); render(); } else CE.toast(CE.errText(y), "bad"); } }, "Save"), c.team ? h("button", { class: "btn sm ghost", onclick: async () => { CE.toast("Importing roster…"); const y = await CE.MS.fn("roster", { class_id: c.id }); if (!y.ok) return CE.toast(CE.errText(y), "bad"); CE.modal(h("div", { class: "stack" }, h("h3", {}, "Roster import"), h("p", {}, y.matched + " members matched to Compass Dash accounts."), y.unmatched.length ? h("div", {}, h("b", {}, "Not matched (no Compass Dash username with that name):"), h("ul", {}, ...y.unmatched.map(u => h("li", {}, u.name + (u.email ? " · " + u.email : ""))))) : null, h("p", { class: "sm mut" }, "Unmatched students can link their own account from Settings after signing in to CompassED."))); } }, "Import roster") : null, c.team ? h("button", { class: "btn sm ghost", onclick: async () => { const y = await CE.MS.fn("notify", { class_id: c.id, text: "CompassED is connected to this Team. New work and deadlines will be posted here." }); CE.toast(y.ok ? "Posted to the General channel ✓" : CE.errText(y), y.ok ? "ok" : "bad"); } }, "Test post") : null)))); });
      box.append(h("div", { class: "tbw" }, tb));
    };
    render();
  }

  async function settings() {
    CE.title("Settings"); page.innerHTML = "";
    page.append(card("My account", h("div", { class: "stack" }, h("div", {}, h("b", {}, me.name), " · ", me.username), h("div", { class: "sm mut" }, me.admin ? "Administrator (admin key)" : CE.subjName(me.subj) + " teacher · " + me.classes.length + " class" + (me.classes.length !== 1 ? "es" : "")), h("p", { class: "sm mut", style: { margin: 0 } }, "Your account, password and classes are managed in the Compass Dash Teacher Panel. The portal locks after 20 minutes without use."), h("div", { class: "row" }, h("a", { class: "btn ghost", href: CE.cfg.compassDashUrl, target: "_blank", rel: "noopener" }, "Compass Dash Teacher Panel ↗"), h("button", { class: "btn ghost", onclick: () => CE.signOut("teacher") }, "Sign out")))));
    const msBox = h("div", { class: "stack" });
    if (!CE.MS.enabled()) msBox.append(h("p", { class: "sm mut", style: { margin: 0 } }, CE.demo ? "Microsoft sign-in is off in preview mode." : "Not switched on for this school yet (see the Microsoft Teams page)."));
    else { msBox.append(h("p", { class: "sm mut", style: { margin: 0 } }, "Link your school Microsoft account to sign in with one click."), h("button", { class: "btn ghost", onclick: () => CE.MS.signIn("link") }, h("span", { class: "ms" }, h("i"), h("i"), h("i"), h("i")), " Link Microsoft account")); CE.MS.finish().then(r => { if (r && r.ok) CE.toast("Microsoft account linked ✓", "ok"); else if (r) CE.toast(CE.errText(r), "bad"); }); }
    page.append(card("Microsoft 365", msBox));
  }

  CE.router([
    { path: "/", handler: dashboard }, { path: "/classes", handler: classes }, { path: "/class/:id", handler: p => classPage(p) }, { path: "/class/:id/:tab", handler: p => classPage(p, p.tab) },
    { path: "/content", handler: content }, { path: "/content/:subj", handler: content }, { path: "/playlists", handler: playlists }, { path: "/rubrics", handler: rubrics },
    { path: "/assignments", handler: assignments }, { path: "/assignment/:id", handler: assignmentPage },
    { path: "/announcements", handler: announcements }, { path: "/calendar", handler: calendar }, { path: "/teams", handler: teams }, { path: "/settings", handler: settings }
  ]);
  loadBell();
})();
