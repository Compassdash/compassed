/* CompassED student portal. */
(function () {
  const $ = CE.$, h = CE.h, D = CE.date, page = $("#page");
  const me = CE.student.get();
  if (!me) { location.replace("signin.html?next=" + encodeURIComponent(location.hash.replace(/^#/, ""))); return; }
  CE.subjects = me.subjects || [];
  CE.demoBanner();
  $("#meAv").textContent = CE.initials(me.username); $("#meName").textContent = me.username;
  $("#meClass").textContent = (me.class ? me.class.name : "No class yet") + (me.year ? " · Year " + me.year : "");
  $("#signout").onclick = () => CE.signOut("student");
  if (CE.cfg.compassDashUrl) $("#cdLink").href = CE.cfg.compassDashUrl;
  if (CE.teacher.get()) $("#portalSwitch").lastElementChild.href = "teach.html";
  CE.shell();

  const S = { home: null };
  const subjName = id => CE.subjName(id), subjIcon = id => CE.subjIcon(id);
  const statusBadge = a => a.status === "returned" ? h("span", { class: "badge ok" }, "Returned" + (a.score != null ? " · " + a.score + "%" : "")) : a.status === "submitted" ? h("span", { class: "badge cyan" }, "Handed in") : a.status === "draft" ? h("span", { class: "badge warn" }, "Draft saved") : a.due && new Date(a.due) < Date.now() ? h("span", { class: "badge bad" }, "Overdue") : h("span", { class: "badge" }, D.until(a.due) || "No due date");
  const card = (title, body, extra) => h("div", { class: "card" }, h("div", { class: "hd" }, h("h3", {}, title), extra || null), body);

  /* ---------- notifications ---------- */
  async function loadBell() {
    try {
      const r = S.home || await CE.sapi("ce_s_home"); if (!r.ok) return;
      const un = r.notifs.filter(n => !n.read).length, bn = $("#bellN"); bn.textContent = un; bn.classList.toggle("hide", !un);
      const pop = $("#bellPop"); pop.innerHTML = "";
      pop.append(h("div", { class: "row between", style: { padding: "4px 10px 8px" } }, h("b", {}, "Notifications"), un ? h("button", { class: "btn sm ghost", onclick: async () => { await CE.sapi("ce_s_notif_read", { p_id: null }); S.home = null; loadBell(); } }, "Mark all read") : null));
      if (!r.notifs.length) pop.append(h("div", { class: "empty" }, "Nothing yet."));
      r.notifs.slice(0, 12).forEach(n => pop.append(h("a", { class: "item" + (n.read ? "" : " un"), href: n.link || "#/", onclick: async () => { pop.classList.remove("show"); if (!n.read) { await CE.sapi("ce_s_notif_read", { p_id: n.id }); S.home = null; loadBell(); } } },
        h("div", { class: "ico sm" }, CE.icon({ grade: "checkcircle", assign: "pencil", announce: "megaphone", event: "calendar", playlist: "book" }[n.kind] || "bell")), h("div", { class: "grow" }, h("div", { class: "t sm" }, n.title), h("div", { class: "s xs" }, n.body ? n.body + " · " : "", D.ago(n.created))))));
      const due = r.assigns.filter(a => a.status === "todo" || a.status === "draft").length; $("#nDue").textContent = due; $("#nDue").classList.toggle("hide", !due);
      $("#nRev").textContent = r.review_due; $("#nRev").classList.toggle("hide", !r.review_due);
      $("#nAnn").textContent = r.unread_anns; $("#nAnn").classList.toggle("hide", !r.unread_anns);
    } catch (e) {}
  }
  $("#bell").onclick = e => { e.stopPropagation(); $("#bellPop").classList.toggle("show"); };
  document.addEventListener("click", e => { if (!$("#bellWrap").contains(e.target)) $("#bellPop").classList.remove("show"); });

  /* ---------- What to do next ---------- */
  function whatNext(home, subj) {
    const todo = home.assigns.filter(a => a.status === "todo" || a.status === "draft").sort((p, q) => (p.due || "9") < (q.due || "9") ? -1 : 1);
    const soon = todo.find(a => a.due && new Date(a.due) - Date.now() < 48 * 3600000);
    if (soon) return { icon: "alarm", kicker: new Date(soon.due) < Date.now() ? "Overdue" : "Due soon", title: (soon.status === "draft" ? "Finish and hand in: " : "Do: ") + soon.title, sub: subjName(soon.subj) + " · " + D.until(soon.due), href: "#/assignment/" + soon.id, cta: soon.status === "draft" ? "Continue" : "Start" };
    if (home.review_due >= 5) return { icon: "repeat", kicker: "Keep it in memory", title: "Review " + home.review_due + " cards", sub: "About " + Math.ceil(home.review_due / 4) + " minutes", href: "#/review", cta: "Review" };
    if (subj) for (const p of subj.playlists) {
      for (const it of p.items) {
        if (it.t === "lesson") { const l = subj.units.flatMap(u => u.lessons).find(x => x.id === it.id); if (l && !l.done) return { icon: "book", kicker: "Next in " + p.title, title: l.title, sub: subjName(p.subj) + " · " + l.minutes + " min lesson", href: "#/lesson/" + l.id, cta: "Open lesson" }; }
        else { const q = subj.units.flatMap(u => u.quizzes).find(x => x.id === it.id); if (q && (q.best == null || (q.kind === "checkpoint" && q.best < q.threshold))) return { icon: q.kind === "checkpoint" ? "flag" : "question", kicker: "Next in " + p.title, title: q.title, sub: subjName(p.subj) + " · " + q.n + " questions" + (q.best != null ? " · best " + q.best + "%" : ""), href: "#/quiz/" + q.id, cta: q.kind === "checkpoint" ? "Take checkpoint" : "Take quiz" }; }
      }
    }
    if (todo.length) return { icon: "pencil", kicker: "On your list", title: todo[0].title, sub: subjName(todo[0].subj) + (todo[0].due ? " · " + D.until(todo[0].due) : ""), href: "#/assignment/" + todo[0].id, cta: "Open" };
    if (home.review_due) return { icon: "repeat", kicker: "Quick win", title: "Review " + home.review_due + " card" + (home.review_due > 1 ? "s" : ""), sub: "Two minutes, then you're done", href: "#/review", cta: "Review" };
    return { icon: "spark", kicker: "All caught up", title: "Nothing is waiting for you", sub: "Explore a subject or earn XP on Compass Dash", href: "#/subjects", cta: "Browse subjects" };
  }

  /* ---------- pages ---------- */
  async function dashboard() {
    CE.title("Dashboard"); CE.loading(page);
    try {
      const [home, subj] = await Promise.all([CE.sapi("ce_s_home"), CE.sapi("ce_s_subjects")]);
      if (!home.ok) return CE.fail(page, home); S.home = home; loadBell();
      const nx = whatNext(home, subj.ok ? subj : null);
      const hour = new Date().getHours(), greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      const todo = home.assigns.filter(a => a.status === "todo" || a.status === "draft");
      const week = home.assigns.filter(a => a.due && (a.status === "todo" || a.status === "draft") && new Date(a.due) - Date.now() < 7 * 864e5);
      page.innerHTML = "";
      page.append(h("div", {}, h("h2", {}, greet + ", " + me.username + "."), h("p", { class: "mut", style: { margin: 0 } }, todo.length ? todo.length + " thing" + (todo.length > 1 ? "s" : "") + " on your list" + (week.length ? ", " + week.length + " due this week" : "") + "." : "Your list is clear.")));
      page.append(h("a", { class: "card tint next", href: nx.href, style: { textDecoration: "none", color: "inherit" } }, h("div", { class: "big" }, CE.icon(nx.icon)), h("div", {}, h("div", { class: "xs cy b", style: { letterSpacing: ".08em", textTransform: "uppercase" } }, "What to do next · " + nx.kicker), h("div", { class: "b", style: { fontSize: "18px" } }, nx.title), h("div", { class: "sm mut" }, nx.sub)), h("span", { class: "btn" }, nx.cta)));
      const cd = home.cd || {};
      page.append(h("div", { class: "grid g4" },
        h("div", { class: "card stat" }, h("span", { class: "n" }, week.length), h("span", { class: "l" }, "Due this week")),
        h("div", { class: "card stat" }, h("span", { class: "n" }, home.review_due), h("span", { class: "l" }, "Cards to review")),
        h("div", { class: "card stat" }, h("span", { class: "n" }, (cd.xp || 0).toLocaleString()), h("span", { class: "l" }, "Compass Dash XP")),
        h("div", { class: "card stat" }, h("span", { class: "n" }, (cd.mast || 0) + "/" + (cd.tot || 0)), h("span", { class: "l" }, "Topics mastered"))));
      const g = h("div", { class: "grid g2" }); page.append(g);
      g.append(card("Up next", home.assigns.filter(a => a.status !== "returned").length ? h("div", { class: "list" }, ...home.assigns.filter(a => a.status !== "returned").slice(0, 6).map(a => h("a", { class: "item", href: "#/assignment/" + a.id }, h("div", { class: "ico" }, subjIcon(a.subj)), h("div", { class: "grow" }, h("div", { class: "t" }, a.title), h("div", { class: "s" }, subjName(a.subj) + " · " + { homework: "Homework", assignment: "Assignment", quiz: "Quiz" }[a.kind] + (a.due ? " · " + D.short(a.due) : ""))), statusBadge(a)))) : h("div", { class: "empty" }, "No work set yet."), h("a", { class: "btn sm ghost", href: "#/assignments" }, "All assignments")));
      g.append(card("Playlists", home.playlists.length ? h("div", { class: "list" }, ...home.playlists.map(p => h("a", { class: "item", href: "#/subject/" + p.subj + "?playlist=" + p.id }, h("div", { class: "ico" }, subjIcon(p.subj)), h("div", { class: "grow" }, h("div", { class: "t" }, p.title), h("div", { class: "bar", style: { marginTop: "6px" } }, h("i", { style: { width: CE.pct(p.done, p.n) + "%" } }))), h("span", { class: "badge" + (p.done === p.n ? " ok" : "") }, p.done + "/" + p.n)))) : h("div", { class: "empty" }, "Your teacher hasn't set a playlist yet."), h("a", { class: "btn sm ghost", href: "#/subjects" }, "Subjects")));
      g.append(card("Coming up", home.events.length ? h("div", { class: "list" }, ...home.events.slice(0, 5).map(e => h("a", { class: "item", href: "#/calendar" }, h("div", { class: "ico" }, CE.icon({ exam: "exam", trip: "bus", deadline: "alarm" }[e.kind] || "calendar")), h("div", { class: "grow" }, h("div", { class: "t" }, e.title), h("div", { class: "s" }, D.dt(e.starts) + (e.place ? " · " + e.place : "")))))) : h("div", { class: "empty" }, "Nothing in the next two weeks."), h("a", { class: "btn sm ghost", href: "#/calendar" }, "Calendar")));
      g.append(card("Compass Dash", h("div", { class: "stack" }, h("div", { class: "row" }, h("div", { class: "ring", style: { "--p": CE.pct(cd.cor || 0, cd.ans || 0) } }, h("span", {}, CE.pct(cd.cor || 0, cd.ans || 0) + "%")), h("div", {}, h("div", { class: "b" }, (cd.ans || 0).toLocaleString() + " questions answered"), h("div", { class: "sm mut" }, "Accuracy across every game and quiz · last played " + D.ago(cd.last_seen)))), h("p", { class: "sm mut", style: { margin: 0 } }, "Read-only from Compass Dash. Play there to earn XP; it shows up here automatically.")), h("a", { class: "btn sm ghost", href: "#/progress" }, "Progress")));
    } catch (e) { CE.fail(page, e); }
  }

  async function subjects() {
    CE.title("Subjects"); CE.loading(page);
    try {
      const r = await CE.sapi("ce_s_subjects"); if (!r.ok) return CE.fail(page, r);
      page.innerHTML = ""; const st = (r.cd && r.cd.st) || "";
      page.append(h("p", { class: "mut", style: { margin: 0 } }, "Subjects with lessons and quizzes set for your class appear first. Compass Dash mastery shows for every subject you've played."));
      const grid = h("div", { class: "grid g3" }); page.append(grid);
      const order = CE.subjects.slice().sort((a, b) => (r.units.some(u => u.subj === b.id) - r.units.some(u => u.subj === a.id)) || a.id - b.id);
      order.forEach(s => {
        const us = r.units.filter(u => u.subj === s.id), ls = us.flatMap(u => u.lessons), done = ls.filter(l => l.done).length, cps = us.flatMap(u => u.quizzes).filter(q => q.kind === "checkpoint"), passed = cps.filter(q => q.best != null && q.best >= q.threshold).length;
        const sa = (r.cd.sa || [])[s.id] || 0;
        grid.append(h("a", { class: "subj" + (us.length ? "" : " off"), href: "#/subject/" + s.id }, h("div", { class: "row between" }, h("div", { class: "ico" }, CE.icon(CE.subjKey(s.id))), us.length ? h("span", { class: "badge cyan" }, us.length + " unit" + (us.length > 1 ? "s" : "")) : h("span", { class: "badge" }, "No units yet")),
          h("h3", { style: { margin: 0 } }, s.name), ls.length ? h("div", {}, h("div", { class: "row between sm" }, h("span", {}, done + "/" + ls.length + " lessons"), h("span", { class: "mut" }, passed + "/" + cps.length + " checkpoints")), h("div", { class: "bar", style: { marginTop: "6px" } }, h("i", { style: { width: CE.pct(done, ls.length) + "%" } }))) : null,
          h("div", { class: "xs mut" }, "Compass Dash: " + sa.toLocaleString() + " questions played")));
      });
    } catch (e) { CE.fail(page, e); }
  }

  async function subject(p) {
    const id = +p.id, s = CE.subj(id); CE.title(s.name); CE.loading(page);
    try {
      const r = await CE.sapi("ce_s_subjects"); if (!r.ok) return CE.fail(page, r);
      const units = r.units.filter(u => u.subj === id), pls = r.playlists.filter(x => x.subj === id);
      const want = +(new URLSearchParams(location.hash.split("?")[1] || "").get("playlist") || 0);
      page.innerHTML = "";
      page.append(h("div", { class: "row" }, h("div", { class: "ico lg" }, CE.icon(CE.subjKey(s.id))), h("div", {}, h("h2", { style: { margin: 0 } }, s.name), h("div", { class: "sm mut" }, units.length + " unit" + (units.length !== 1 ? "s" : "") + " · " + units.flatMap(u => u.lessons).length + " lessons"))));
      if (pls.length) {
        const c = card("Lesson playlists", h("div", { class: "stack" })); page.append(c);
        pls.forEach(pl => {
          const items = pl.items.map(it => it.t === "lesson" ? { it, l: units.flatMap(u => u.lessons).find(x => x.id === it.id) || r.units.flatMap(u => u.lessons).find(x => x.id === it.id) } : { it, q: r.units.flatMap(u => u.quizzes).find(x => x.id === it.id) }).filter(x => x.l || x.q);
          const done = items.filter(x => x.l ? x.l.done : (x.q.best != null && (x.q.kind !== "checkpoint" || x.q.best >= x.q.threshold))).length;
          const box = h("div", { class: "card flat", id: "pl" + pl.id, style: want === pl.id ? { borderColor: "var(--cyan)" } : null }, h("div", { class: "hd" }, h("h4", { style: { margin: 0 }, class: "row" }, CE.icon("play"), pl.title), h("span", { class: "badge" + (done === items.length ? " ok" : " cyan") }, done + "/" + items.length)), h("div", { class: "bar", style: { marginBottom: "10px" } }, h("i", { style: { width: CE.pct(done, items.length) + "%" } })), h("div", { class: "list" }));
          let unlockedNext = true;
          items.forEach((x, i) => {
            const ok = x.l ? x.l.done : (x.q.best != null && (x.q.kind !== "checkpoint" || x.q.best >= x.q.threshold)); const cur = !ok && unlockedNext; if (!ok) unlockedNext = false;
            box.lastChild.append(h("a", { class: "item", href: x.l ? "#/lesson/" + x.l.id : "#/quiz/" + x.q.id, style: cur ? { borderColor: "var(--cyan)" } : null }, h("div", { class: "ico sm" }, CE.icon(ok ? "checkcircle" : x.l ? "lesson" : x.q.kind === "checkpoint" ? "flag" : "question")), h("div", { class: "grow" }, h("div", { class: "t" }, (i + 1) + ". " + (x.l ? x.l.title : x.q.title)), h("div", { class: "s" }, x.l ? x.l.minutes + " min lesson" : x.q.n + " questions" + (x.q.best != null ? " · best " + x.q.best + "%" : "") + (x.q.kind === "checkpoint" ? " · pass mark " + x.q.threshold + "%" : ""))), cur ? h("span", { class: "badge cyan" }, "Next") : null));
          });
          c.lastChild.append(box);
        });
        if (want) setTimeout(() => { const el = $("#pl" + want); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 50);
      }
      if (!units.length) page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon(CE.subjKey(s.id))), h("div", { class: "b" }, "No CompassED units for " + s.name + " yet"), h("div", { class: "sm" }, "You can still revise this subject on Compass Dash.")));
      units.forEach(u => {
        const cps = u.quizzes.filter(q => q.kind === "checkpoint"), passed = cps.some(q => q.best != null && q.best >= q.threshold), done = u.lessons.filter(l => l.done).length;
        const c = h("div", { class: "card" }, h("div", { class: "hd" }, h("div", {}, h("h3", {}, u.title), h("div", { class: "sm mut" }, u.summary)), passed ? h("span", { class: "badge ok" }, CE.icon("flag"), "Mastered") : cps.length ? h("span", { class: "badge" }, "Checkpoint " + (cps[0].best != null ? cps[0].best + "%" : "not taken")) : null),
          h("div", { class: "bar", style: { marginBottom: "12px" } }, h("i", { style: { width: CE.pct(done, u.lessons.length) + "%" } })), h("div", { class: "list" }));
        u.lessons.forEach(l => c.lastChild.append(h("a", { class: "item", href: "#/lesson/" + l.id }, h("div", { class: "ico sm" }, CE.icon(l.done ? "checkcircle" : "lesson")), h("div", { class: "grow" }, h("div", { class: "t" }, l.title), h("div", { class: "s" }, l.minutes + " min")), h("span", { class: "badge" + (l.done ? " ok" : "") }, l.done ? "Done" : "Lesson"))));
        u.quizzes.forEach(q => c.lastChild.append(h("a", { class: "item", href: "#/quiz/" + q.id }, h("div", { class: "ico sm" }, CE.icon(q.kind === "checkpoint" ? "flag" : "question")), h("div", { class: "grow" }, h("div", { class: "t" }, q.title), h("div", { class: "s" }, q.n + " questions · " + (q.tries ? q.tries + " attempt" + (q.tries > 1 ? "s" : "") + " · best " + q.best + "%" : "not tried yet") + (q.kind === "checkpoint" ? " · pass mark " + q.threshold + "%" : ""))), q.kind === "checkpoint" ? h("span", { class: "badge " + (q.best != null && q.best >= q.threshold ? "ok" : q.best != null ? "warn" : "ink") }, q.best != null && q.best >= q.threshold ? "Passed" : q.best != null ? "Try again" : "Checkpoint") : h("span", { class: "badge" + (q.best != null ? " cyan" : "") }, q.best != null ? q.best + "%" : "Quiz"))));
        page.append(c);
      });
    } catch (e) { CE.fail(page, e); }
  }

  async function lesson(p) {
    CE.title("Lesson"); CE.loading(page);
    try {
      const r = await CE.sapi("ce_s_lesson", { p_id: +p.id }); if (!r.ok) return CE.fail(page, r);
      CE.title(r.title); page.innerHTML = "";
      const wrap = h("div", { class: "lesson" }); page.append(wrap);
      wrap.append(h("div", {}, h("a", { class: "sm", href: "#/subject/" + r.unit.subj }, "← " + CE.subjName(r.unit.subj) + " · " + r.unit.title), h("h1", { style: { fontSize: "32px", marginTop: "6px" } }, r.title), h("div", { class: "row sm mut" }, h("span", { class: "row", style: { gap: "4px" } }, CE.icon("clock"), r.minutes + " min"), r.done ? h("span", { class: "badge ok" }, "Completed") : null)));
      let checks = 0, checksOk = 0;
      r.blocks.forEach(b => {
        const el = h("div", { class: "blk" });
        if (b.t === "heading") el.append(h("h3", {}, b.text));
        else if (b.t === "text") el.innerHTML = CE.rich(b.text);
        else if (b.t === "list") el.append(h("ul", {}, ...(b.items || []).map(i => h("li", { html: CE.rich(i).replace(/^<p>|<\/p>$/g, "") }))));
        else if (b.t === "key") el.append(h("div", { class: "key" }, h("b", {}, "Key point" + (b.q ? ": " + b.q : "")), h("div", {}, b.text)));
        else if (b.t === "video") { const u = String(b.url || ""); const ok = /^https:\/\/(www\.youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)/.test(u); el.append(ok ? h("div", { class: "vid" }, h("iframe", { src: u, title: b.text || "Video", allow: "accelerometer; encrypted-media; picture-in-picture", allowfullscreen: true, loading: "lazy" })) : h("a", { class: "item", href: u, target: "_blank", rel: "noopener" }, CE.icon("play"), b.text || u), b.text ? h("div", { class: "sm mut", style: { marginTop: "6px" } }, b.text) : null); }
        else if (b.t === "link") el.append(h("a", { class: "item", href: b.url, target: "_blank", rel: "noopener" }, h("div", { class: "ico sm" }, CE.icon("link")), h("div", { class: "grow" }, h("div", { class: "t" }, b.text || b.url), h("div", { class: "s" }, b.url))));
        else if (b.t === "check") { checks++; const q = h("div", { class: "card flat q" }, h("div", { class: "b" }, "Quick check: " + b.q)); (b.a || []).forEach((opt, i) => q.append(h("button", { class: "opt", onclick: e => { if (q.dataset.done) return; q.dataset.done = 1; CE.$$(".opt", q).forEach((o, j) => o.classList.add(j === b.c ? "ok" : j === i ? "bad" : "x")); if (i === b.c) checksOk++; q.append(h("div", { class: "sm " + (i === b.c ? "cy b" : "mut") }, i === b.c ? "Correct!" : "Not quite. The answer is " + b.a[b.c] + ".")); } }, h("span", { class: "k" }, "ABCD"[i]), opt))); el.append(q); }
        wrap.append(el);
      });
      const done = h("div", { class: "card tint row between" }, h("div", {}, h("div", { class: "b" }, r.done ? "You've completed this lesson." : "Finished reading?"), h("div", { class: "sm mut" }, "Key points go into your review queue so you don't forget them.")),
        h("div", { class: "row" }, r.done ? null : h("button", { class: "btn cyan", onclick: async e => { e.target.disabled = true; const x = await CE.sapi("ce_s_lesson_done", { p_id: r.id }); if (x.ok) { CE.toast("Lesson completed ✓", "ok"); S.home = null; done.firstChild.firstChild.textContent = "You've completed this lesson."; e.target.remove(); loadBell(); } else { CE.toast(CE.errText(x), "bad"); e.target.disabled = false; } } }, "Mark as complete"), r.next ? h("a", { class: "btn ghost", href: "#/lesson/" + r.next.id }, "Next: " + r.next.title + " →") : h("a", { class: "btn ghost", href: "#/subject/" + r.unit.subj }, "Back to unit")));
      wrap.append(done);
    } catch (e) { CE.fail(page, e); }
  }

  async function quiz(p) {
    CE.title("Quiz"); CE.loading(page);
    const assign = +(new URLSearchParams(location.hash.split("?")[1] || "").get("assign") || 0) || null;
    try {
      const r = await CE.sapi("ce_s_quiz", { p_id: +p.id }); if (!r.ok) return CE.fail(page, r);
      CE.title(r.title); page.innerHTML = "";
      const answers = new Array(r.qs.length).fill(null); let i = 0;
      const box = h("div", { class: "card", style: { maxWidth: "760px" } }); page.append(box);
      const render = () => {
        box.innerHTML = ""; const q = r.qs[i];
        box.append(h("div", { class: "row between" }, h("div", {}, h("div", { class: "xs cy b", style: { textTransform: "uppercase", letterSpacing: ".08em" } }, (r.kind === "checkpoint" ? "Mastery checkpoint · pass mark " + r.threshold + "%" : "Quiz") + " · " + CE.subjName(r.subj)), h("h3", { style: { margin: 0 } }, r.title)), h("span", { class: "badge" }, (i + 1) + " / " + r.qs.length)));
        box.append(h("div", { class: "bar", style: { margin: "12px 0 18px" } }, h("i", { style: { width: CE.pct(i, r.qs.length) + "%" } })));
        box.append(h("div", { class: "b", style: { fontSize: "18px", marginBottom: "12px" } }, q.q));
        const opts = h("div", { class: "q" }); box.append(opts);
        q.a.forEach((o, k) => opts.append(h("button", { class: "opt" + (answers[i] === k ? " on" : ""), onclick: () => { answers[i] = k; render(); } }, h("span", { class: "k" }, "ABCD"[k]), o)));
        box.append(h("div", { class: "row between", style: { marginTop: "18px" } }, h("button", { class: "btn ghost", disabled: i === 0, onclick: () => { i--; render(); } }, "← Back"),
          i < r.qs.length - 1 ? h("button", { class: "btn", disabled: answers[i] == null, onclick: () => { i++; render(); } }, "Next →") : h("button", { class: "btn cyan", disabled: answers.some(a => a == null), onclick: submit }, "Finish and mark")));
      };
      const submit = async () => {
        box.innerHTML = ""; box.append(h("div", { class: "skel" }));
        const x = await CE.sapi("ce_s_quiz_done", { p_id: r.id, p_answers: answers, p_assign: assign }); if (!x.ok) return CE.fail(box, x);
        S.home = null; loadBell(); box.innerHTML = "";
        box.append(h("div", { style: { textAlign: "center", padding: "10px 0 18px" } }, h("div", { class: "big xl" }, CE.icon(x.passed ? (x.pct === 100 ? "trophy" : "spark") : "muscle")), h("h2", {}, x.score + " / " + x.out_of + " · " + x.pct + "%"), h("p", { class: "mut" }, r.kind === "checkpoint" ? (x.passed ? "Checkpoint passed. This unit counts as mastered." : "Not yet: you need " + r.threshold + "%. Look at the ones you missed, revisit the lesson and try again.") : (x.pct >= 80 ? "Great work." : "Have a look at the explanations below. Wrong answers are now in your review queue."))));
        x.results.forEach((res, k) => { const q = r.qs[k], ok = res.ans === res.c; box.append(h("div", { class: "card flat", style: { marginBottom: "8px", borderColor: ok ? "var(--ok)" : "var(--bad)" } }, h("div", { class: "b" }, (k + 1) + ". " + q.q), h("div", { class: "sm row", style: { gap: "4px" } }, CE.icon(ok ? "check" : "cross"), ok ? q.a[res.c] : "You chose " + (q.a[res.ans] || "nothing") + " · correct: " + q.a[res.c]), res.why ? h("div", { class: "sm mut" }, res.why) : null)); });
        box.append(h("div", { class: "row", style: { marginTop: "14px" } }, h("button", { class: "btn", onclick: () => { answers.fill(null); i = 0; render(); } }, "Try again"), assign ? h("a", { class: "btn ghost", href: "#/assignment/" + assign }, "Back to assignment") : h("a", { class: "btn ghost", href: "#/subject/" + r.subj }, "Back to " + CE.subjName(r.subj)), x.results.some(z => z.ans !== z.c) ? h("a", { class: "btn soft", href: "#/review" }, "Review queue") : null));
      };
      render();
    } catch (e) { CE.fail(page, e); }
  }

  async function assignments() {
    CE.title("Assignments"); CE.loading(page);
    try {
      const r = await CE.sapi("ce_s_assigns"); if (!r.ok) return CE.fail(page, r);
      page.innerHTML = "";
      const groups = [["To do", a => !a.sub || a.sub.status === "draft"], ["Handed in", a => a.sub && a.sub.status === "submitted"], ["Returned", a => a.sub && a.sub.status === "returned"]];
      let any = false;
      groups.forEach(([t, f]) => { const rows = r.rows.filter(f); if (!rows.length) return; any = true; page.append(card(t + " (" + rows.length + ")", h("div", { class: "list" }, ...rows.map(a => h("a", { class: "item", href: "#/assignment/" + a.id }, h("div", { class: "ico" }, subjIcon(a.subj)), h("div", { class: "grow" }, h("div", { class: "t" }, a.title), h("div", { class: "s" }, subjName(a.subj) + " · " + { homework: "Homework", assignment: "Assignment", quiz: "Quiz" }[a.kind] + " · " + a.points + " pts" + (a.due ? " · due " + D.dt(a.due) : ""))), statusBadge(Object.assign({ status: a.sub ? a.sub.status : "todo", score: a.sub && a.sub.score }, a))))))); });
      if (!any) page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("pencil")), h("div", { class: "b" }, "No assignments yet"), h("div", { class: "sm" }, "When your teacher sets work it will appear here.")));
    } catch (e) { CE.fail(page, e); }
  }

  async function assignment(p) {
    CE.title("Assignment"); CE.loading(page);
    try {
      const r = await CE.sapi("ce_s_assigns"); if (!r.ok) return CE.fail(page, r);
      const a = r.rows.find(x => x.id === +p.id); if (!a) return CE.fail(page, "not_found");
      CE.title(a.title); page.innerHTML = "";
      const st = a.sub ? a.sub.status : "todo";
      page.append(h("div", {}, h("a", { class: "sm", href: "#/assignments" }, "← Assignments"), h("div", { class: "row between", style: { marginTop: "6px" } }, h("div", {}, h("h2", { style: { margin: 0 } }, a.title), h("div", { class: "sm mut" }, subjName(a.subj) + " · " + { homework: "Homework", assignment: "Assignment", quiz: "Quiz" }[a.kind] + " · " + a.points + " points" + (a.due ? " · due " + D.dt(a.due) : ""))), statusBadge(Object.assign({ status: st, score: a.sub && a.sub.score }, a)))));
      const g = h("div", { class: "grid", style: { gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)" } }); page.append(g);
      if (matchMedia("(max-width:900px)").matches) g.style.gridTemplateColumns = "1fr";
      const left = h("div", { class: "stack" }), right = h("div", { class: "stack" }); g.append(left, right);
      left.append(card("Instructions", h("div", { html: CE.rich(a.instr || "No instructions given.") })));
      if (a.kind === "quiz" && a.quiz_id) left.append(h("div", { class: "card tint row between" }, h("div", {}, h("div", { class: "b" }, st === "todo" ? "This is a quiz assignment." : "Best score: " + (a.sub.score != null ? a.sub.score + "%" : "–")), h("div", { class: "sm mut" }, "Your best score counts. You can retake it until the due date.")), h("a", { class: "btn cyan", href: "#/quiz/" + a.quiz_id + "?assign=" + a.id }, st === "todo" ? "Start quiz" : "Retake quiz")));
      else {
        const body = h("textarea", { class: "in", placeholder: "Type your answer, working or notes here. You can save a draft and come back.", style: { minHeight: "220px" } }, a.sub ? a.sub.body : "");
        const links = h("input", { class: "in", placeholder: "Links to files or photos (OneDrive, Google Drive…), separated by spaces", value: a.sub ? (a.sub.links || []).join(" ") : "" });
        const info = h("div", { class: "sm mut" }, a.sub ? "Version " + a.sub.ver + (a.sub.sub_at ? " · handed in " + D.dt(a.sub.sub_at) : " · draft") : "Nothing saved yet.");
        const act = async final => {
          const ls = links.value.split(/\s+/).filter(x => /^https?:\/\//.test(x));
          if (final && !(await CE.confirm("Hand in now? Your teacher will see this version. You can still hand in a newer version later.", "Hand in"))) return;
          const x = await CE.sapi("ce_s_submit", { p_assign: a.id, p_body: body.value, p_links: ls, p_final: !!final });
          if (!x.ok) return CE.toast(CE.errText(x), "bad");
          CE.toast(final ? "Handed in ✓" : "Draft saved", "ok"); S.home = null; assignment(p);
        };
        left.append(card("Your work", h("div", { class: "stack" }, body, links, info, h("div", { class: "row" }, h("button", { class: "btn ghost", onclick: () => act(false), disabled: st === "returned" }, "Save draft"), h("button", { class: "btn cyan", onclick: () => act(true) }, st === "todo" || st === "draft" ? "Hand in" : "Hand in new version")))));
      }
      if (a.sub && a.sub.status === "returned") right.append(h("div", { class: "card", style: { borderColor: "var(--ok)" } }, h("div", { class: "hd" }, h("h3", {}, "Feedback"), h("span", { class: "badge ok" }, (a.sub.score != null ? a.sub.score + "%" : "Marked"))), a.sub.feedback ? h("div", { class: "pre" }, a.sub.feedback) : h("div", { class: "mut sm" }, "No written feedback."), h("div", { class: "xs mut", style: { marginTop: "8px" } }, "Marked " + D.dt(a.sub.graded_at))));
      if (a.rubric) { const rb = h("table", { class: "rub" }, h("thead", {}, h("tr", {}, h("th", {}, "Criterion"), ...a.rubric.criteria[0].levels.map(l => h("th", {}, l.label + " (" + l.pts + ")")))), h("tbody", {})); a.rubric.criteria.forEach((c, ci) => rb.lastChild.append(h("tr", {}, h("th", {}, c.name), ...c.levels.map((l, li) => h("td", { class: a.sub && a.sub.rub && a.sub.rub[ci] === li ? "on" : "" }, l.desc))))); right.append(card("Marking rubric: " + a.rubric.title, h("div", { class: "tbw" }, rb))); }
      if (a.sub && a.sub.versions && a.sub.versions.length) right.append(card("Version history", h("div", { class: "list" }, ...a.sub.versions.map(v => h("div", { class: "item" }, h("div", { class: "ico sm" }, CE.icon("clock")), h("div", { class: "grow" }, h("div", { class: "t sm" }, "Version " + v.ver + (v.ver === a.sub.ver ? " (current)" : "")), h("div", { class: "s xs" }, D.dt(v.at) + " · " + v.len + " characters")))))));
    } catch (e) { CE.fail(page, e); }
  }

  async function review() {
    CE.title("Review queue"); CE.loading(page);
    try {
      const r = await CE.sapi("ce_s_review"); if (!r.ok) return CE.fail(page, r);
      page.innerHTML = "";
      if (!r.due.length) return page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("leaf")), h("div", { class: "b" }, r.total ? "Nothing due today" : "Your review queue is empty"), h("div", { class: "sm" }, r.total ? "You have " + r.total + " cards. The next one is due " + (r.next ? D.short(r.next) : "soon") + "." : "Wrong quiz answers and lesson key points become flashcards here, spaced out so they stick.")));
      let i = 0, flipped = false, done = 0; const q = r.due.slice();
      const box = h("div", { style: { maxWidth: "640px" } }); page.append(box);
      const render = () => {
        box.innerHTML = "";
        if (i >= q.length) { box.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("spark")), h("div", { class: "b" }, "Done for today"), h("div", { class: "sm" }, done + " cards reviewed. Come back tomorrow."), h("a", { class: "btn cyan", href: "#/", style: { marginTop: "12px" } }, "Dashboard"))); S.home = null; loadBell(); return; }
        const c = q[i];
        box.append(h("div", { class: "row between sm mut", style: { marginBottom: "10px" } }, h("span", { class: "row", style: { gap: "6px" } }, CE.subjIcon(c.subj), CE.subjName(c.subj)), h("span", {}, (i + 1) + " / " + q.length)));
        box.append(h("div", { class: "flash" }, h("div", { class: "cardf" + (flipped ? " back" : ""), onclick: () => { flipped = !flipped; render(); } }, flipped ? c.back : c.front)));
        box.append(h("p", { class: "sm mut", style: { textAlign: "center", margin: "10px 0" } }, flipped ? "How well did you know it?" : "Think of the answer, then tap the card to flip it."));
        if (flipped) box.append(h("div", { class: "grid g4" }, ...[["Forgot", 0, "bad"], ["Hard", 1, "warn"], ["Good", 2, ""], ["Easy", 3, "ok"]].map(([l, g, k]) => h("button", { class: "btn " + (k === "" ? "" : k === "ok" ? "cyan" : "ghost"), onclick: async () => { const x = await CE.sapi("ce_s_review_done", { p_id: c.id, p_grade: g }); if (x.ok) { done++; i++; flipped = false; CE.toast(x.due_in ? "Again in " + x.due_in + " day" + (x.due_in > 1 ? "s" : "") : "You'll see it again today"); render(); } else CE.toast(CE.errText(x), "bad"); } }, l))));
        else box.append(h("div", { class: "row", style: { justifyContent: "center" } }, h("button", { class: "btn", onclick: () => { flipped = true; render(); } }, "Show answer")));
      };
      render();
    } catch (e) { CE.fail(page, e); }
  }

  async function progress() {
    CE.title("Progress"); CE.loading(page);
    try {
      const r = await CE.sapi("ce_s_progress"); if (!r.ok) return CE.fail(page, r);
      page.innerHTML = ""; const cd = r.cd || {};
      page.append(h("div", { class: "grid g4" },
        h("div", { class: "card stat" }, h("span", { class: "n" }, (cd.xp || 0).toLocaleString()), h("span", { class: "l" }, "Compass Dash XP")),
        h("div", { class: "card stat" }, h("span", { class: "n" }, (cd.mast || 0) + "/" + (cd.tot || 0)), h("span", { class: "l" }, "Topics mastered")),
        h("div", { class: "card stat" }, h("span", { class: "n" }, CE.pct(cd.cor || 0, cd.ans || 0) + "%"), h("span", { class: "l" }, "Accuracy")),
        h("div", { class: "card stat" }, h("span", { class: "n" }, r.subjects.reduce((n, s) => n + s.checkpoints_passed, 0)), h("span", { class: "l" }, "Checkpoints passed"))));
      const tb = h("table", { class: "tb" }, h("thead", {}, h("tr", {}, h("th", {}, "Subject"), h("th", {}, "Lessons"), h("th", {}, "Checkpoints"), h("th", {}, "Quiz avg"), h("th", {}, "Work handed in"), h("th", {}, "Grade avg"), h("th", {}, "Compass Dash"))), h("tbody", {}));
      const stages = ["Not started", "Learning", "Practising", "Confident", "Mastered"];
      r.subjects.forEach(s => { const tp = Object.entries(cd.topics || {}).filter(([k]) => +k.split(".")[0] === s.id).map(([, v]) => v); const m = tp.filter(v => v === 4).length;
        tb.lastChild.append(h("tr", {}, h("td", { class: "b" }, h("span", { class: "row", style: { gap: "8px", flexWrap: "nowrap" } }, CE.icon(CE.subjKey(s.id)), s.name)), h("td", {}, s.lessons ? h("div", {}, h("div", { class: "sm" }, s.lessons_done + "/" + s.lessons), h("div", { class: "bar", style: { width: "90px" } }, h("i", { style: { width: CE.pct(s.lessons_done, s.lessons) + "%" } }))) : h("span", { class: "mut" }, "–")), h("td", {}, s.checkpoints ? s.checkpoints_passed + "/" + s.checkpoints : h("span", { class: "mut" }, "–")), h("td", {}, s.quiz_avg != null ? s.quiz_avg + "%" : h("span", { class: "mut" }, "–")), h("td", {}, s.assigns ? s.assigns_done + "/" + s.assigns : h("span", { class: "mut" }, "–")), h("td", {}, s.grade_avg != null ? s.grade_avg + "%" : h("span", { class: "mut" }, "–")), h("td", {}, tp.length ? h("span", { class: "badge" + (m ? " cyan" : "") }, m + " mastered · " + tp.length + " played") : h("span", { class: "mut sm" }, ((cd.sa || [])[s.id] || 0) ? (cd.sa[s.id] + " questions") : "not played")))); });
      page.append(card("By subject", h("div", { class: "tbw" }, tb)));
      const g = h("div", { class: "grid g2" }); page.append(g);
      g.append(card("Recent quizzes", r.recent.length ? h("div", { class: "list" }, ...r.recent.map(x => h("div", { class: "item" }, h("div", { class: "ico sm" }, CE.icon(x.kind === "checkpoint" ? "flag" : "question")), h("div", { class: "grow" }, h("div", { class: "t sm" }, x.title), h("div", { class: "s xs" }, CE.subjName(x.subj) + " · " + D.ago(x.at))), h("span", { class: "badge " + (CE.pct(x.score, x.out_of) >= 80 ? "ok" : CE.pct(x.score, x.out_of) >= 50 ? "warn" : "bad") }, x.score + "/" + x.out_of)))) : h("div", { class: "empty" }, "No quizzes taken yet.")));
      const topics = Object.entries(cd.topics || {}).sort((a, b) => b[1] - a[1]);
      g.append(card("Compass Dash topics", topics.length ? h("div", { class: "stack" }, h("div", { class: "pill-row" }, ...stages.map((s, i) => h("span", { class: "badge" + (i === 4 ? " cyan" : "") }, s + ": " + topics.filter(t => t[1] === i).length))), h("p", { class: "sm mut", style: { margin: 0 } }, "Stages come straight from Compass Dash: Mastered means a topic test passed with 80%+ after at least 10 questions.")) : h("div", { class: "empty" }, "Play Compass Dash to see topic mastery here."), h("a", { class: "btn sm ghost", href: CE.cfg.compassDashUrl, target: "_blank", rel: "noopener" }, "Open Compass Dash ↗")));
    } catch (e) { CE.fail(page, e); }
  }

  async function calendar() {
    CE.title("Calendar"); page.innerHTML = "";
    let d = new Date(); d.setDate(1);
    const head = h("div", { class: "row between" }), grid = h("div", { class: "cal" }), list = h("div", { class: "list" });
    page.append(h("div", { class: "card" }, head, grid), card("This month", list));
    const render = async () => {
      head.innerHTML = ""; head.append(h("div", { class: "row" }, h("button", { class: "ib", onclick: () => { d.setMonth(d.getMonth() - 1); render(); } }, "‹"), h("h3", { style: { margin: 0 } }, d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })), h("button", { class: "ib", onclick: () => { d.setMonth(d.getMonth() + 1); render(); } }, "›"), h("button", { class: "btn sm ghost", onclick: () => { d = new Date(); d.setDate(1); render(); } }, "Today")), h("button", { class: "btn sm", id: "ics" }, CE.icon("phone"), "Add to my phone"));
      const from = new Date(d.getFullYear(), d.getMonth(), -7), to = new Date(d.getFullYear(), d.getMonth() + 1, 7);
      const r = await CE.sapi("ce_s_calendar", { p_from: D.ymd(from), p_to: D.ymd(to) }); if (!r.ok) return CE.fail(page, r);
      CE.calendar(grid, d.getFullYear(), d.getMonth(), r.rows, e => { if (e.assign_id) CE.nav("/assignment/" + e.assign_id); else CE.modal(h("div", { class: "stack" }, h("span", { class: "badge " + (e.kind === "exam" ? "bad" : e.kind === "trip" ? "warn" : "cyan") }, e.kind), h("h3", {}, e.title), h("div", { class: "row", style: { gap: "6px" } }, CE.icon("calendar"), D.long(e.starts) + (D.time(e.starts) !== "00:00" ? ", " + D.time(e.starts) + (e.ends ? " to " + D.time(e.ends) : "") : "")), e.place ? h("div", { class: "row", style: { gap: "6px" } }, CE.icon("place"), e.place) : null, e.class ? h("div", { class: "mut sm" }, e.class) : h("div", { class: "mut sm" }, "Whole school"), h("button", { class: "btn sm", onclick: () => CE.ics([e], e.title) }, CE.icon("phone"), "Add this to my calendar"))); });
      const month = r.rows.filter(e => new Date(e.starts).getMonth() === d.getMonth());
      list.innerHTML = ""; if (!month.length) list.append(h("div", { class: "empty" }, "Nothing this month."));
      month.forEach(e => list.append(h("div", { class: "item click", onclick: () => e.assign_id ? CE.nav("/assignment/" + e.assign_id) : null }, h("div", { class: "ico sm" }, CE.icon({ exam: "exam", trip: "bus", due: "alarm" }[e.kind] || "calendar")), h("div", { class: "grow" }, h("div", { class: "t sm" }, (e.kind === "due" ? "Due: " : "") + e.title), h("div", { class: "s xs" }, D.dt(e.starts) + (e.place ? " · " + e.place : ""))))));
      $("#ics").onclick = () => CE.ics(r.rows, "CompassED " + d.toLocaleDateString("en-GB", { month: "long" }));
    };
    render();
  }

  async function announcements() {
    CE.title("Announcements"); CE.loading(page);
    try {
      const r = await CE.sapi("ce_s_anns"); if (!r.ok) return CE.fail(page, r);
      page.innerHTML = "";
      if (!r.rows.length) return page.append(h("div", { class: "empty" }, h("div", { class: "big" }, CE.icon("megaphone")), h("div", { class: "b" }, "No announcements")));
      r.rows.forEach(a => { const c = h("div", { class: "card" + (a.read ? "" : " tint") }, h("div", { class: "hd" }, h("div", { class: "row" }, a.pinned ? h("span", { class: "badge ink" }, CE.icon("pin"), "Pinned") : null, h("span", { class: "badge" }, a.class || "Whole school")), a.read ? h("span", { class: "xs mut" }, "Read") : h("button", { class: "btn sm cyan", onclick: async e => { await CE.sapi("ce_s_ann_read", { p_id: a.id }); c.classList.remove("tint"); e.target.replaceWith(h("span", { class: "xs mut" }, "Read")); S.home = null; loadBell(); } }, "Mark as read")), h("h3", {}, a.title), h("div", { html: CE.rich(a.body) }), h("div", { class: "xs mut" }, (a.from ? a.from + " · " : "") + D.ago(a.created))); page.append(c); });
    } catch (e) { CE.fail(page, e); }
  }

  async function settings() {
    CE.title("Settings"); page.innerHTML = "";
    page.append(card("My account", h("div", { class: "stack" }, h("div", {}, h("b", {}, me.username), " · code ", h("span", { class: "kbd" }, me.code)), h("div", { class: "sm mut" }, "Class: " + (me.class ? me.class.name : "none") + " · Year " + (me.year || "?") + " · House " + ({ N: "North", E: "East", S: "South", W: "West" }[me.house] || "not chosen")), h("p", { class: "sm mut", style: { margin: 0 } }, "Your account comes from Compass Dash. Change your house or year there."), h("div", { class: "row" }, h("button", { class: "btn ghost", onclick: () => CE.signOut("student") }, "Sign out")))));
    const msBox = h("div", { class: "stack" });
    if (!CE.MS.enabled()) msBox.append(h("p", { class: "sm mut", style: { margin: 0 } }, CE.demo ? "Microsoft sign-in is off in preview mode." : "Your school hasn't switched on Microsoft sign-in yet."));
    else { msBox.append(h("p", { class: "sm mut", style: { margin: 0 } }, "Link your school Microsoft account to sign in with one click and get Teams reminders."), h("button", { class: "btn ghost", onclick: () => CE.MS.signIn("link") }, h("span", { class: "ms" }, h("i"), h("i"), h("i"), h("i")), " Link Microsoft account")); CE.MS.finish().then(r => { if (r && r.ok) CE.toast("Microsoft account linked ✓", "ok"); else if (r) CE.toast(CE.errText(r), "bad"); }); }
    page.append(card("Microsoft 365", msBox));
    page.append(card("Compass Dash", h("div", { class: "stack" }, h("p", { class: "sm mut", style: { margin: 0 } }, "CompassED reads your XP, topic mastery and activity from Compass Dash. It never changes anything there."), h("a", { class: "btn", href: CE.cfg.compassDashUrl, target: "_blank", rel: "noopener" }, "Open Compass Dash ↗"))));
  }

  CE.router([
    { path: "/", handler: dashboard }, { path: "/subjects", handler: subjects }, { path: "/subject/:id", handler: subject },
    { path: "/lesson/:id", handler: lesson }, { path: "/quiz/:id", handler: quiz },
    { path: "/assignments", handler: assignments }, { path: "/assignment/:id", handler: assignment },
    { path: "/review", handler: review }, { path: "/progress", handler: progress }, { path: "/calendar", handler: calendar },
    { path: "/announcements", handler: announcements }, { path: "/settings", handler: settings }
  ]);
  loadBell();
})();
