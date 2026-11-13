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

  // Work filters
  var grid = document.getElementById("work-grid");
  document.querySelectorAll(".chip").forEach(function (c) {
    c.addEventListener("click", function () {
      var f = c.dataset.filter;
      document.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", x === c); });
      grid.querySelectorAll(".piece").forEach(function (p) { p.hidden = f !== "all" && p.dataset.cat !== f; });
    });
  });

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
