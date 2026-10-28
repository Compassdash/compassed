/* Public pages: menu toggle, year, and a "you're signed in" shortcut. */
(function () {
  const b = document.querySelector("[data-burger]"), n = document.getElementById("pubnav");
  if (b && n) b.addEventListener("click", () => n.classList.toggle("open"));
  const y = document.getElementById("yr"); if (y) y.textContent = new Date().getFullYear();
  try {
    const s = JSON.parse(localStorage.getItem("ce_student") || "null"), t = JSON.parse(sessionStorage.getItem("ce_teacher") || "null");
    const cta = document.querySelector(".nav .cta");
    if (cta && (s || t)) {
      cta.innerHTML = "";
      const a = document.createElement("a"); a.className = "btn cyan"; a.href = t ? "teach.html" : "app.html"; a.textContent = t ? "Open teacher portal" : "Open my dashboard"; cta.append(a);
    }
  } catch (e) {}
})();
