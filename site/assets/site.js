(function () {
  // Mobile menu (one per page; in the preview there is one per view)
  document.querySelectorAll(".menu-btn").forEach(function (b) {
    var nav = b.parentNode.querySelector(".nav");
    b.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      b.setAttribute("aria-expanded", open);
    });
    nav.addEventListener("click", function (e) { if (e.target.tagName === "A") { nav.classList.remove("open"); b.setAttribute("aria-expanded", false); } });
  });

  // Gallery: designs added through /admin
  var workGrid = document.getElementById("work-grid"), colGrid = document.getElementById("collections-grid");
  var modal = document.getElementById("piece-modal"), pieces = [], cols = {};
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(v) { v = String(v || "").trim(); return /^\d/.test(v) ? "$" + v : v; } // "35.00" -> "$35.00"
  function card(p) {
    var tags = [cols[p.collection], p.material].filter(Boolean).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
    var badge = p.status === "Sold" ? '<span class="badge sold">Sold</span>' : p.status === "Available" ? '<span class="badge">Available' + (p.price ? " &middot; " + esc(money(p.price)) : "") + "</span>" : "";
    return '<article class="piece live" data-col="' + esc(p.collection || "none") + '"><button type="button" class="ph" data-id="' + p.id + '" aria-label="View ' + esc(p.name) + '">' +
      '<img src="/photos/' + p.photos[0] + '-th.jpg" alt="' + esc(p.name) + '" loading="lazy">' + badge + "</button>" +
      '<div class="meta"><h3>' + esc(p.name) + '</h3><div class="tags">' + tags + "</div></div></article>";
  }
  function bindCards(root) { root.querySelectorAll("button.ph").forEach(function (b) { b.onclick = function () { openPiece(b.dataset.id); }; }); }
  function openPiece(id) {
    var p = pieces.find(function (x) { return x.id === id; }); if (!p || !modal) return;
    var body = modal.querySelector(".pm-body");
    var meta = [cols[p.collection], p.material].filter(Boolean).map(esc).join(" &middot; ");
    var status = p.status === "Sold" ? "Sold" : p.status === "Available" ? "Available" + (p.price ? " &middot; " + esc(money(p.price)) : "") : (p.price ? esc(money(p.price)) : "");
    body.innerHTML = '<div class="pm-photo"><img id="pm-img" src="/photos/' + p.photos[0] + '.jpg" alt="' + esc(p.name) + '"></div>' +
      (p.photos.length > 1 ? '<div class="pm-thumbs">' + p.photos.map(function (ph, i) { return '<button type="button" data-ph="' + ph + '"' + (i ? "" : ' aria-current="true"') + '><img src="/photos/' + ph + '-th.jpg" alt="Photo ' + (i + 1) + '"></button>'; }).join("") + "</div>" : "") +
      '<div class="pm-text"><p class="kicker">' + meta + '</p><h2 id="pm-title">' + esc(p.name) + "</h2>" + (status ? '<p class="pm-status">' + status + "</p>" : "") +
      (p.desc ? "<p>" + esc(p.desc).replace(/\n/g, "<br>") + "</p>" : "") +
      '<a class="btn btn-red" href="/contact?design=' + encodeURIComponent(p.name) + '">' + (p.status === "Available" ? "Ask about buying this one" : "Request one like this") + " &rarr;</a></div>";
    body.querySelectorAll("[data-ph]").forEach(function (b) {
      b.onclick = function () { document.getElementById("pm-img").src = "/photos/" + b.dataset.ph + ".jpg"; body.querySelectorAll("[data-ph]").forEach(function (x) { x.removeAttribute("aria-current"); }); b.setAttribute("aria-current", "true"); };
    });
    modal.hidden = false; document.body.style.overflow = "hidden"; modal.querySelector(".modal-x").focus();
  }
  function closePiece() { if (modal) { modal.hidden = true; document.body.style.overflow = ""; } }
  if (modal) {
    modal.addEventListener("click", function (e) { if (e.target === modal || e.target.closest(".modal-x")) closePiece(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closePiece(); });
  }
  if ((workGrid || colGrid) && !window.MM_PREVIEW) {
    fetch("/api/pieces").then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok || !j.pieces.length) return; // keep the "coming soon" cards
      pieces = j.pieces; j.collections.forEach(function (c) { cols[c.id] = c.name; });
      if (colGrid) { // home: one tile per collection that has designs (cover = its first design)
        var tiles = j.collections.map(function (c) {
          var mine = pieces.filter(function (p) { return p.collection === c.id; });
          return mine.length ? '<a class="piece coll" href="/work?collection=' + encodeURIComponent(c.id) + '"><div class="ph"><img src="/photos/' + mine[0].photos[0] + '-th.jpg" alt="" loading="lazy"></div>' +
            '<div class="meta"><h3>' + esc(c.name) + '</h3><span class="count">' + mine.length + " design" + (mine.length === 1 ? "" : "s") + " &rarr;</span></div></a>" : "";
        }).join("");
        if (tiles) { colGrid.innerHTML = tiles; colGrid.classList.add("live"); }
      }
      if (workGrid) {
        workGrid.innerHTML = pieces.map(card).join(""); bindCards(workGrid);
        var used = j.collections.filter(function (c) { return pieces.some(function (p) { return p.collection === c.id; }); });
        if (pieces.some(function (p) { return !cols[p.collection]; }) && used.length) used.push({ id: "none", name: "More" });
        var filters = document.getElementById("filters");
        if (used.length > 1 || (used.length === 1 && used[0].id !== "none")) {
          filters.innerHTML = '<button class="chip" type="button" data-filter="all" aria-pressed="true">All</button>' +
            used.map(function (c) { return '<button class="chip" type="button" data-filter="' + esc(c.id) + '" aria-pressed="false">' + esc(c.name) + "</button>"; }).join("");
          filters.hidden = false;
          filters.querySelectorAll(".chip").forEach(function (c) {
            c.onclick = function () {
              var f = c.dataset.filter;
              filters.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
              workGrid.querySelectorAll(".piece").forEach(function (el) { var col = cols[el.dataset.col] ? el.dataset.col : "none"; el.hidden = f !== "all" && col !== f; });
            };
          });
          var want = new URLSearchParams(location.search).get("collection");
          var chip = want && filters.querySelector('.chip[data-filter="' + want.replace(/[^a-z0-9]/g, "") + '"]');
          if (chip) chip.click();
        }
      }
    }).catch(function () {});
  }

  // "Request one like this" arrives as /contact?design=Name
  var design = new URLSearchParams(location.search).get("design");
  var msgBox = document.getElementById("f-msg");
  if (design && msgBox && !msgBox.value) msgBox.value = "I'm interested in a handle like “" + design.slice(0, 80) + "” from your work page.\n\n";

  // Request form
  var form = document.getElementById("req-form");
  if (!form) return;
  var MAX = 5, photos = [];
  var input = document.getElementById("f-photos"), drop = document.getElementById("drop"),
      thumbs = document.getElementById("thumbs"), msg = document.getElementById("form-msg"),
      okBox = document.getElementById("form-success"), btn = form.querySelector("button[type=submit]");

  function shrink(file) { // resize to max 1600px JPEG so uploads stay small
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); resolve(b ? { blob: b, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" } : null); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file.size < 8e6 ? { blob: file, name: file.name } : null); };
      img.src = url;
    });
  }
  function render() {
    thumbs.innerHTML = "";
    photos.forEach(function (p, i) {
      var f = document.createElement("figure"), im = document.createElement("img"), x = document.createElement("button");
      im.src = URL.createObjectURL(p.blob); im.alt = p.name;
      x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Remove " + p.name);
      x.onclick = function () { photos.splice(i, 1); render(); };
      f.appendChild(im); f.appendChild(x); thumbs.appendChild(f);
    });
  }
  function add(files) {
    msg.textContent = "";
    var list = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name); });
    if (photos.length + list.length > MAX) msg.textContent = "Up to " + MAX + " photos. Extra photos were left off.";
    list = list.slice(0, MAX - photos.length);
    Promise.all(list.map(shrink)).then(function (r) { r.forEach(function (p) { if (p) photos.push(p); }); render(); });
  }
  drop.addEventListener("click", function (e) { if (e.target !== input) input.click(); });
  input.addEventListener("change", function () { add(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { add(e.dataTransfer.files); });

  var rid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
  var FAIL = "We couldn't send your request. Please call 717-916-0074 or email madmaxcustomknifehandles@gmail.com.";

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.textContent = "";
    var el = form.elements, name = el["name"].value.trim(), email = el["email"].value.trim(), text = el["message"].value.trim();
    if (!name || !text || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = !name ? "Please enter your name." : !text ? "Please tell us a little about your blade." : "Please enter a valid email so we can reply.";
      return;
    }
    if (window.MM_PREVIEW) return done("MM-PREVIEW", true);

    var fd = new FormData(form);
    fd.append("requestId", rid);
    photos.forEach(function (p) { fd.append("photos", p.blob, p.name); });
    btn.disabled = true; btn.textContent = "Sending…";
    fetch("/api/request", { method: "POST", body: fd })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) { if (j.ok) done(j.ref); else msg.textContent = j.error || FAIL; })
      .catch(function () { msg.textContent = FAIL; })
      .finally(function () { btn.disabled = false; btn.innerHTML = "Send request &rarr;"; });
  });

  function done(ref, demo) {
    form.hidden = true; okBox.hidden = false;
    document.getElementById("success-ref").textContent = "Reference " + ref;
    document.getElementById("demo-flag").hidden = !demo;
    okBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  document.getElementById("send-another").addEventListener("click", function (e) {
    e.preventDefault(); form.reset(); photos = []; render();
    rid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
    okBox.hidden = true; form.hidden = false;
  });
})();
