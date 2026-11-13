/* Mad Max admin: add, edit, sort and remove designs; manage collections.
   window.MM_DEMO = true runs it against an in-memory store (no server). */
(function () {
  "use strict";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var app = $("#admin");
  var state = { pieces: [], collections: [], bladeTypes: [], statuses: [], maxPhotos: 4, email: "" };

  // ---------- data layer ----------
  var demoPhotos = {}; // photoId -> object URL
  function thumbURL(id) { return window.MM_DEMO ? demoPhotos[id] : "/photos/" + id + "-th.jpg"; }

  var api = window.MM_DEMO ? demoApi() : {
    load: function () { return req("GET", "/api/admin/pieces"); },
    save: function (id, fd) { return req("POST", "/api/admin/pieces" + (id ? "/" + id : ""), fd); },
    remove: function (id) { return req("DELETE", "/api/admin/pieces/" + id); },
    order: function (ids) { return req("POST", "/api/admin/order", JSON.stringify({ ids: ids }), true); },
    collections: function (list) { return req("POST", "/api/admin/collections", JSON.stringify({ collections: list }), true); },
  };
  function req(method, url, body, isJson) {
    return fetch(url, { method: method, body: body, credentials: "same-origin",
      headers: isJson ? { "Content-Type": "application/json" } : undefined })
      .then(function (r) {
        if (r.status === 401) { location.reload(); throw new Error("Please sign in again."); }
        return r.json().catch(function () { return { ok: false }; });
      })
      .then(function (j) { if (!j.ok) throw new Error(j.error || "Something went wrong. Please try again."); return j; });
  }
  function demoApi() {
    var uid = function () { return Math.random().toString(36).slice(2, 12); };
    var db = { pieces: [], collections: [{ id: uid(), name: "Patriotic" }, { id: uid(), name: "Outdoors" }] };
    var ok = function (x) { return new Promise(function (r) { setTimeout(function () { r(Object.assign({ ok: true }, x)); }, 250); }); };
    var fail = function (m) { return Promise.reject(new Error(m)); };
    function fields(fd) {
      return { name: (fd.get("name") || "").trim(), collection: fd.get("collection") || "", blade: fd.get("blade") || "",
        material: (fd.get("material") || "").trim() || "Paper micarta", price: (fd.get("price") || "").trim(),
        status: fd.get("status") || "Showcase", featured: fd.get("featured") === "on", desc: (fd.get("desc") || "").trim() };
    }
    function photos(fd) { return fd.getAll("thumb").map(function (b) { var id = uid(); demoPhotos[id] = URL.createObjectURL(b); return id; }); }
    return {
      load: function () { return ok({ email: "madmaxcustomknifehandles@gmail.com", pieces: db.pieces.slice(), collections: db.collections.slice(),
        bladeTypes: ["Fixed blade", "Folding", "Kitchen", "Hunting / skinning", "Other"], statuses: ["Showcase", "Available", "Sold"], maxPhotos: 4 }); },
      save: function (id, fd) {
        var f = fields(fd); if (!f.name) return fail("Give the design a name.");
        if (!id) { var p = photos(fd); if (!p.length) return fail("Add at least one photo.");
          var piece = Object.assign({ id: uid(), photos: p }, f); db.pieces.unshift(piece); return ok({ piece: piece }); }
        var i = db.pieces.findIndex(function (x) { return x.id === id; });
        var fresh = photos(fd), all = (fd.get("order") || "").split(",").map(function (t) { return t.slice(0, 2) === "n:" ? fresh[+t.slice(2)] : t.slice(2); }).filter(Boolean);
        if (!all.length) return fail("A design needs at least one photo.");
        db.pieces[i] = Object.assign({}, db.pieces[i], f, { photos: all }); return ok({ piece: db.pieces[i] });
      },
      remove: function (id) { db.pieces = db.pieces.filter(function (x) { return x.id !== id; }); return ok({}); },
      order: function (ids) { db.pieces.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); }); return ok({}); },
      collections: function (list) {
        var seen = {}; db.collections = list.filter(function (c) { var n = (c.name || "").trim(); if (!n || seen[n.toLowerCase()]) return false; seen[n.toLowerCase()] = 1; c.name = n; return true; })
          .map(function (c) { return { id: c.id || uid(), name: c.name }; });
        var ids = db.collections.map(function (c) { return c.id; });
        db.pieces.forEach(function (p) { if (p.collection && ids.indexOf(p.collection) < 0) p.collection = ""; });
        return ok({ collections: db.collections.slice() });
      },
    };
  }

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function colName(id) { var c = state.collections.find(function (x) { return x.id === id; }); return c ? c.name : "Uncategorized"; }
  var toastT;
  function toast(msg, bad) {
    var t = $("#toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : "");
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = "toast"; }, 3200);
  }
  function busy(btn, on, label) { btn.disabled = on; if (on) { btn.dataset.l = btn.innerHTML; btn.textContent = label || "Saving…"; } else if (btn.dataset.l) btn.innerHTML = btn.dataset.l; }

  function shrink(file, max, q) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); b ? resolve(b) : reject(); }, "image/jpeg", q);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("That photo couldn't be opened. Try a JPG or PNG.")); };
      img.src = url;
    });
  }

  // ---------- views ----------
  var tab = "designs";
  function render() {
    app.innerHTML =
      '<div class="tabs" role="tablist">' +
      '<button role="tab" aria-selected="' + (tab === "designs") + '" data-tab="designs">Designs <span>' + state.pieces.length + '</span></button>' +
      '<button role="tab" aria-selected="' + (tab === "collections") + '" data-tab="collections">Collections <span>' + state.collections.length + "</span></button></div>" +
      (tab === "designs" ? designsView() : collectionsView());
    app.querySelectorAll("[data-tab]").forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; render(); }; });
    if (tab === "designs") bindDesigns(); else bindCollections();
  }

  function designsView() {
    var rows = state.pieces.map(function (p, i) {
      return '<li class="row" data-id="' + p.id + '">' +
        '<img src="' + thumbURL(p.photos[0]) + '" alt="">' +
        '<div class="row-main"><b>' + esc(p.name) + "</b><small>" + esc(colName(p.collection)) +
        (p.status !== "Showcase" ? " · " + esc(p.status) : "") + (p.price ? " · " + esc(p.price) : "") + (p.featured ? ' · <em>On home page</em>' : "") + "</small></div>" +
        '<div class="row-act"><button class="mini" data-move="-1" aria-label="Move up"' + (i === 0 ? " disabled" : "") + '>&uarr;</button>' +
        '<button class="mini" data-move="1" aria-label="Move down"' + (i === state.pieces.length - 1 ? " disabled" : "") + '>&darr;</button>' +
        '<button class="btn btn-sm" data-edit>Edit</button></div></li>';
    }).join("");
    return '<button class="btn btn-red big" id="add">+ Add a new design</button>' +
      (state.pieces.length ? '<p class="hint">Designs show on the site in this order. Use the arrows to move one up or down.</p><ul class="rows">' + rows + "</ul>"
        : '<div class="empty"><p><b>No designs yet.</b></p><p>Tap &ldquo;Add a new design&rdquo; and upload a photo of a handle. It shows on The Work page as soon as you save.</p></div>');
  }
  function bindDesigns() {
    $("#add").onclick = function () { editor(null); };
    app.querySelectorAll(".row").forEach(function (r) {
      var id = r.dataset.id;
      r.querySelector("[data-edit]").onclick = function () { editor(state.pieces.find(function (p) { return p.id === id; })); };
      r.querySelectorAll("[data-move]").forEach(function (b) {
        b.onclick = function () {
          var i = state.pieces.findIndex(function (p) { return p.id === id; }), j = i + Number(b.dataset.move);
          var p = state.pieces.splice(i, 1)[0]; state.pieces.splice(j, 0, p); render();
          api.order(state.pieces.map(function (x) { return x.id; })).catch(function (e) { toast(e.message, true); });
        };
      });
    });
  }

  function collectionsView() {
    var rows = state.collections.map(function (c, i) {
      var n = state.pieces.filter(function (p) { return p.collection === c.id; }).length;
      return '<li class="row col" data-i="' + i + '"><input value="' + esc(c.name) + '" maxlength="40" aria-label="Collection name">' +
        '<small>' + n + " design" + (n === 1 ? "" : "s") + "</small>" +
        '<div class="row-act"><button class="mini" data-move="-1" aria-label="Move up"' + (i === 0 ? " disabled" : "") + '>&uarr;</button>' +
        '<button class="mini" data-move="1" aria-label="Move down"' + (i === state.collections.length - 1 ? " disabled" : "") + '>&darr;</button>' +
        '<button class="mini x" data-del aria-label="Remove collection">&times;</button></div></li>';
    }).join("");
    return '<p class="hint">Collections are the filter buttons on The Work page, like Patriotic or Outdoors. Rename one by typing over it. Removing a collection keeps its designs; they move to Uncategorized.</p>' +
      '<ul class="rows">' + rows + "</ul>" +
      '<div class="add-col"><input id="new-col" maxlength="40" placeholder="New collection name"><button class="btn btn-sm" id="add-col">Add</button></div>' +
      '<button class="btn btn-red big" id="save-cols">Save collections</button>';
  }
  function bindCollections() {
    var draft = state.collections.map(function (c) { return { id: c.id, name: c.name }; });
    function sync() { app.querySelectorAll(".col input").forEach(function (inp, i) { draft[i].name = inp.value; }); }
    app.querySelectorAll(".col").forEach(function (r) {
      var i = Number(r.dataset.i);
      r.querySelector("[data-del]").onclick = function () {
        sync(); var n = state.pieces.filter(function (p) { return p.collection === draft[i].id; }).length;
        if (n && !confirmBox(r, "Remove “" + draft[i].name + "”? Its " + n + " design" + (n === 1 ? "" : "s") + " will move to Uncategorized.", function () { draft.splice(i, 1); state.collections = draft; render(); })) return;
        if (!n) { draft.splice(i, 1); state.collections = draft; render(); }
      };
      r.querySelectorAll("[data-move]").forEach(function (b) {
        b.onclick = function () { sync(); var j = i + Number(b.dataset.move); var c = draft.splice(i, 1)[0]; draft.splice(j, 0, c); state.collections = draft; render(); };
      });
    });
    function addCol() {
      var v = $("#new-col").value.trim(); if (!v) return;
      sync(); draft.push({ name: v }); state.collections = draft; render(); $("#new-col").focus();
    }
    $("#add-col").onclick = addCol;
    $("#new-col").onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); addCol(); } };
    $("#save-cols").onclick = function () {
      sync(); var b = this; busy(b, true);
      api.collections(draft).then(function (j) {
        state.collections = j.collections; return api.load();
      }).then(function (j) { state.pieces = j.pieces; render(); toast("Collections saved. The site is updated."); })
        .catch(function (e) { busy(b, false); toast(e.message, true); });
    };
  }

  // inline confirm (alert/confirm dialogs are avoided on purpose)
  function confirmBox(anchor, text, yes) {
    var old = app.querySelector(".confirm"); if (old) old.remove();
    var d = document.createElement("div"); d.className = "confirm";
    d.innerHTML = "<p>" + esc(text) + '</p><div><button class="btn btn-sm btn-red" data-y>Yes, remove</button><button class="btn btn-sm" data-n>Cancel</button></div>';
    anchor.after(d);
    d.querySelector("[data-y]").onclick = yes; d.querySelector("[data-n]").onclick = function () { d.remove(); };
    return false;
  }

  // ---------- editor ----------
  function editor(p) {
    var isNew = !p;
    p = p || { name: "", collection: "", blade: "", material: "Paper micarta", price: "", status: "Showcase", featured: false, desc: "", photos: [] };
    var items = p.photos.map(function (id) { return { k: id, url: thumbURL(id) }; }); // existing {k} or new {full, thumb, url}
    var opt = function (list, val, blank) {
      return (blank ? '<option value="">' + blank + "</option>" : "") + list.map(function (x) {
        var v = typeof x === "string" ? x : x.id, n = typeof x === "string" ? x : x.name;
        return '<option value="' + esc(v) + '"' + (v === val ? " selected" : "") + ">" + esc(n) + "</option>";
      }).join("");
    };
    app.innerHTML =
      '<button class="back" id="back">&larr; All designs</button>' +
      '<form class="panel editor" id="ed" novalidate><h2>' + (isNew ? "Add a new design" : "Edit design") + "</h2>" +
      '<label>Photos <span class="opt">(first photo is the cover, up to ' + state.maxPhotos + ")</span></label>" +
      '<div class="photo-grid" id="pg"></div>' +
      '<label for="e-name">Name <span class="req">*</span></label><input id="e-name" name="name" maxlength="80" required value="' + esc(p.name) + '" placeholder="e.g. Old Glory Bowie">' +
      '<div class="two"><div><label for="e-col">Collection</label><select id="e-col" name="collection">' + opt(state.collections, p.collection, "Uncategorized") + "</select></div>" +
      '<div><label for="e-blade">Blade type</label><select id="e-blade" name="blade">' + opt(state.bladeTypes, p.blade, "Not listed") + "</select></div></div>" +
      '<div class="two"><div><label for="e-mat">Material</label><input id="e-mat" name="material" maxlength="60" value="' + esc(p.material) + '"></div>' +
      '<div><label for="e-price">Price <span class="opt">(optional)</span></label><input id="e-price" name="price" maxlength="30" value="' + esc(p.price) + '" placeholder="e.g. $85"></div></div>' +
      "<label>Status</label><div class=\"seg\">" + state.statuses.map(function (s) {
        var help = { Showcase: "Past work", Available: "For sale now", Sold: "Shows a Sold tag" }[s] || "";
        return '<label><input type="radio" name="status" value="' + s + '"' + (p.status === s ? " checked" : "") + "><span>" + s + "<small>" + help + "</small></span></label>";
      }).join("") + "</div>" +
      '<label class="check"><input type="checkbox" name="featured"' + (p.featured ? " checked" : "") + "> Show on the home page</label>" +
      '<label for="e-desc">Description <span class="opt">(optional)</span></label><textarea id="e-desc" name="desc" maxlength="1200" placeholder="Colors, size, what it was made for…">' + esc(p.desc) + "</textarea>" +
      '<div class="ed-foot"><button class="btn btn-red" type="submit">' + (isNew ? "Add to the site" : "Save changes") + "</button>" +
      '<button class="btn" type="button" id="cancel">Cancel</button>' + (isNew ? "" : '<button class="btn danger" type="button" id="del">Delete design</button>') + "</div></form>";
    window.scrollTo(0, 0);

    var pg = $("#pg");
    function drawPhotos() {
      pg.innerHTML = items.map(function (it, n) {
        return '<figure' + (n === 0 ? ' class="cover"' : "") + '><img src="' + it.url + '" alt="">' + (n === 0 ? "<figcaption>Cover</figcaption>" : "") +
          '<button type="button" class="rm" aria-label="Remove photo" data-n="' + n + '">&times;</button>' +
          (n > 0 ? '<button type="button" class="mk" data-n="' + n + '">Make cover</button>' : "") + "</figure>";
      }).join("") + (items.length < state.maxPhotos ? '<label class="add-photo"><input type="file" accept="image/*" multiple id="pick"><span>+</span>Add photo</label>' : "");
      pg.querySelectorAll(".rm").forEach(function (b) { b.onclick = function () { items.splice(Number(b.dataset.n), 1); drawPhotos(); }; });
      pg.querySelectorAll(".mk").forEach(function (b) { b.onclick = function () { items.unshift(items.splice(Number(b.dataset.n), 1)[0]); drawPhotos(); }; });
      var pick = $("#pick");
      if (pick) pick.onchange = function () {
        var files = Array.prototype.slice.call(pick.files, 0, state.maxPhotos - items.length);
        pg.classList.add("loading");
        Promise.all(files.map(function (f) {
          return Promise.all([shrink(f, 1600, 0.85), shrink(f, 640, 0.8)]).then(function (b) { return { full: b[0], thumb: b[1], url: URL.createObjectURL(b[1]) }; });
        })).then(function (list) { items = items.concat(list); drawPhotos(); })
          .catch(function (e) { toast(e.message || "That photo couldn't be opened.", true); })
          .then(function () { pg.classList.remove("loading"); });
      };
    }
    drawPhotos();

    $("#back").onclick = $("#cancel").onclick = function () { render(); };
    if (!isNew) $("#del").onclick = function () {
      var b = this;
      confirmBox(b.parentNode, "Delete “" + p.name + "” from the site? This can't be undone.", function () {
        busy(b, true, "Deleting…");
        api.remove(p.id).then(function () { state.pieces = state.pieces.filter(function (x) { return x.id !== p.id; }); render(); toast("Design deleted."); })
          .catch(function (e) { busy(b, false); toast(e.message, true); });
      });
    };
    $("#ed").onsubmit = function (e) {
      e.preventDefault();
      var f = e.target, b = f.querySelector("[type=submit]");
      if (!f.elements["name"].value.trim()) { toast("Give the design a name.", true); f.elements["name"].focus(); return; }
      if (!items.length) { toast("Add at least one photo.", true); return; }
      var fd = new FormData(f), n = 0;
      fd.set("order", items.map(function (it) {
        if (it.k) return "k:" + it.k;
        fd.append("photo", it.full, "photo" + n + ".jpg"); fd.append("thumb", it.thumb, "thumb" + n + ".jpg");
        return "n:" + n++;
      }).join(","));
      busy(b, true);
      api.save(isNew ? null : p.id, fd).then(function (j) {
        if (isNew) state.pieces.unshift(j.piece);
        else state.pieces = state.pieces.map(function (x) { return x.id === p.id ? j.piece : x; });
        render(); toast(isNew ? "Added. It's live on the site now." : "Saved. The site is updated.");
      }).catch(function (err) { busy(b, false); toast(err.message, true); });
    };
  }

  // ---------- start ----------
  api.load().then(function (j) {
    state = j; $("#who").textContent = j.email || ""; render();
  }).catch(function (e) { app.innerHTML = '<div class="empty"><p><b>Couldn\'t load your designs.</b></p><p>' + esc(e.message) + "</p></div>"; });
})();
