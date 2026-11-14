"""Build the Mad Max Custom Knife Handles site.

python3 build.py           -> production pages in site/
python3 build.py --preview -> single-file preview in preview/index.html (hash routing, demo form)

Edit the CONTENT section below (phone, Facebook link, hours, projects) and rebuild.
"""
import sys, pathlib, shutil, base64

ROOT = pathlib.Path(__file__).parent

# ---------------- CONTENT ----------------
OWNERS = [("Joseph James", "Owner"), ("Mandi Jo", "Co-Owner")]
PHONE_DISPLAY = "717-916-0074"
TEL = "tel:+17179160074"
EMAIL = "madmaxcustomknifehandles@gmail.com"
FACEBOOK_URL = "https://www.facebook.com/share/g/1A2Ts37eg6/"
FACEBOOK_LABEL = "Mad Max: Custom Knife Handles Facebook group"
LOCATION = "Dover, Pennsylvania"
HOURS = [("Monday&ndash;Saturday", "9:00 AM &ndash; 5:00 PM"), ("Sunday", "Closed")]
HOURS_NOTE = "Online requests can be sent 24 hours a day."
SITE_URL = "https://madmaxcustomhandles.com"


# "Coming soon" cards shown until the first design is added through /admin: (line-art style)
PLACEHOLDERS = ["drop", "folder", "chef", "bowie", "chef", "folder", "drop", "bowie", "folder"]
# ------------------------------------------

PAGES = [  # slug, nav label, title, description
    ("home", "Home", "Mad Max Custom Knife Handles | Paper micarta handles, Dover, PA",
     "Handcrafted paper micarta knife handles from Dover, Pennsylvania. Custom handles for knife makers, enthusiasts, and collectors."),
    ("work", "The Work", "The Work | Mad Max Custom Knife Handles",
     "Custom paper micarta handles from the bench at Mad Max Custom Knife Handles, Dover, PA."),
    ("contact", "Contact", "Request a Custom Handle | Mad Max Custom Knife Handles",
     "Tell Mad Max Custom Knife Handles about your blade and the handle you want. Dover, PA. Call 717-916-0074."),
]

I = {  # 24px line icons
 "phone": '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
 "mail": '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/>',
 "fb": '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8z"/>',
 "pin": '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
 "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 "user": '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 "upload": '<path d="M12 15V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
 "anvil": '<path d="M3 7h13a5 5 0 0 1-4 5v2h3v3H6v-3h3v-2C6 12 4 10 3 7z"/><path d="M8 3l3 3M11 3 8 6"/>',
 "knife": '<path d="M3 15c5-1 9-3 12-6l1 1-2 4c-3 2-7 2-11 1z"/><path d="M15 9l6-3-1 5-5 3"/>',
 "case": '<rect x="3" y="7" width="18" height="12" rx="1"/><path d="M9 7V5h6v2M3 12h18M7 15.5h7l2-1"/>',
}


def icon(name, cls=""):
    return (f'<svg{f" class={cls}" if cls else ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{I[name]}</svg>')


KNIVES = {  # simple line art for placeholder cards
 "drop": '<path d="M10 52c40-6 90-8 140-8v14c-50 0-100-1-140-6z"/><rect x="148" y="40" width="7" height="22" rx="1"/><path d="M155 44h72c8 0 12 4 12 7s-4 7-12 7h-72z"/><circle cx="180" cy="51" r="2.5"/><circle cx="202" cy="51" r="2.5"/><circle cx="224" cy="51" r="2.5"/>',
 "folder": '<path d="M30 52c30-5 70-7 110-7v13c-40 0-80-1-110-6z"/><path d="M140 43h88c10 0 14 4 14 8s-4 8-14 8h-88z"/><circle cx="153" cy="51" r="4"/><path d="M168 47h50c4 0 4 8 0 8h-50c-4 0-4-8 0-8z"/>',
 "chef": '<path d="M12 58c40-2 80-18 118-24l8-1v25z"/><rect x="138" y="40" width="7" height="22" rx="1"/><path d="M145 44h82c8 0 12 4 12 7s-4 7-12 7h-82z"/><circle cx="172" cy="51" r="2.5"/><circle cx="198" cy="51" r="2.5"/><circle cx="224" cy="51" r="2.5"/>',
 "bowie": '<path d="M8 46c30 10 80 14 140 10V44c-40-2-70-6-92-10l-6 6c-14 2-28 4-42 6z"/><rect x="148" y="38" width="7" height="24" rx="1"/><path d="M155 43h72c8 0 12 4 12 8s-4 8-12 8h-72z"/><circle cx="182" cy="51" r="2.5"/><circle cx="208" cy="51" r="2.5"/>',
}


def knife(kind):
    return (f'<svg viewBox="0 0 250 100" fill="none" stroke="currentColor" stroke-width="1.4" '
            f'stroke-linejoin="round" aria-hidden="true">{KNIVES[kind]}</svg>')


def placeholder(kind):
    return (f'<article class="piece"><div class="ph"><span class="soon">Photo coming soon</span>{knife(kind)}</div>'
            f'<div class="meta"><h3>Coming soon</h3><div class="tags"><span class="tag">Paper micarta</span></div></div></article>')


def head_block(kicker, title, center=True):
    return f'''<div class="section-head{' center' if center else ''}">
      <p class="kicker">{kicker}</p><h2>{title}</h2><hr class="rule"></div>'''


def body_home(asset):
    cards = [("anvil", "Knife Makers", "Handles made to fit your blades and finish your builds."),
             ("knife", "Knife Enthusiasts", "Give a knife you already own a handle that&rsquo;s yours alone."),
             ("case", "Collectors &amp; Others", "One-off pieces, replacements, and everything in between. If it needs a handle, ask.")]
    cards_html = "".join(f'<div class="card">{icon(i)}<h3>{t}</h3><p>{d}</p></div>' for i, t, d in cards)
    featured = "".join(placeholder(k) for k in PLACEHOLDERS[:4])
    return f'''
<section class="hero"><div class="wrap">
  <div class="hero-logo"><img src="{asset}logo-720.webp" alt="Mad Max Custom Knife Handles logo: a bull skull between two curved blades" width="720" height="754"></div>
  <div>
    <p class="kicker">Custom knife handles &middot; Dover, Pennsylvania</p>
    <h1>Handcrafted.<br>Built to be unique.</h1>
    <p class="lead">Custom handles for knife makers, knife enthusiasts, and anyone who needs one done right.</p>
    <div class="btn-row"><a class="btn" href="{{work}}">See the work</a><a class="btn btn-red" href="{{contact}}">Request a custom handle &rarr;</a></div>
    <div class="ticks"><span>Custom</span><span>Durable</span><span>One of a kind</span></div>
  </div>
</div></section>
<section class="band spec"><div class="wrap">
  <div><span class="label">Our specialty</span><h2>Paper Micarta Handles</h2></div>
  <div class="ticks" style="margin:0"><span>Handcrafted</span><span>Custom designs</span><span>Made to order</span></div>
</div></section>
<section class="section"><div class="wrap">
  {head_block("Who we build for", "Every Blade Deserves the Right Handle")}
  <div class="cards3">{cards_html}</div>
</div></section>
<section class="section alt"><div class="wrap">
  {head_block("Our collections", "From the Bench")}
  <div class="grid four" id="collections-grid">{featured}</div>
  <p class="center" style="margin:36px 0 0"><a class="btn btn-sm" href="{{work}}">See all work &rarr;</a></p>
</div></section>
<section class="section"><div class="wrap">
  {head_block("How it works", "Three Steps to a Custom Handle")}
  <div class="steps">
    <div><span class="num">I</span><h3>Tell Us About Your Blade</h3><p>Send the size, the look you&rsquo;re after, and any photos you have.</p></div>
    <div><span class="num">II</span><h3>We Design the Handle</h3><p>Shape, fit, and material are worked out with you before anything is cut.</p></div>
    <div><span class="num">III</span><h3>We Build and Ship It</h3><p>Your handle is made to order and sent back to you.</p></div>
  </div>
</div></section>'''


def body_work(asset):
    return f'''
<section class="page-hero"><div class="wrap">
  <p class="kicker">The work</p><h1>Handles From the Bench</h1><hr class="rule">
  <p class="lead">Custom. Durable. One of a kind. Every handle is built for one blade.</p>
</div></section>
<section class="section"><div class="wrap">
  <div class="filters" id="filters" role="group" aria-label="Filter by collection" hidden></div>
  <div class="grid" id="work-grid">{"".join(placeholder(k) for k in PLACEHOLDERS)}</div>
</div></section>'''


def body_contact(asset):
    hours = "".join(f"<span>{d}</span><span>{h}</span>" for d, h in HOURS)
    return f'''
<section class="page-hero"><div class="wrap">
  <p class="kicker">Contact</p><h1>Request a Custom Handle</h1><hr class="rule">
  <p class="lead">Tell us about your blade and what you want in a handle. We&rsquo;ll get back to you to talk it through.</p>
</div></section>
<section class="section" id="request"><div class="wrap contact-grid">
  <div class="panel">
    <form id="req-form" novalidate>
      <h2>Your Request</h2>
      <p class="sub">The more you tell us, the better the fit. Fields marked <span style="color:var(--red2)">*</span> are required.</p>
      <div class="form-grid">
        <div><label for="f-name">Name <span class="req">*</span></label><input id="f-name" name="name" required maxlength="80" autocomplete="name" placeholder="Your name"></div>
        <div><label for="f-email">Email <span class="req">*</span></label><input id="f-email" name="email" type="email" required maxlength="120" autocomplete="email" placeholder="you@example.com"></div>
        <div><label for="f-phone">Phone <span class="opt">(optional)</span></label><input id="f-phone" name="phone" type="tel" maxlength="20" autocomplete="tel" placeholder="Best number to reach you"></div>
        <div><label for="f-mat">Handle material preference <span class="opt">(optional)</span></label><input id="f-mat" name="material" maxlength="120" placeholder="Tell us what you have in mind"><p class="hint">Paper micarta is our specialty.</p></div>
        <div class="full"><label for="f-msg">Message <span class="req">*</span></label><textarea id="f-msg" name="message" required maxlength="2000" placeholder="Blade size, how you&rsquo;ll use it, the look you&rsquo;re after&hellip;"></textarea></div>
        <div class="full"><span class="label-like"><label for="f-photos">Photos <span class="opt">(optional)</span></label></span>
          <div class="drop" id="drop">{icon("upload")}<div><strong>Upload photos of your blade</strong> or drag them here</div><div class="hint">Up to 5 photos (JPG, PNG, HEIC). Large photos are resized before sending.</div>
          <input id="f-photos" type="file" accept="image/*" multiple></div>
          <div class="thumbs" id="thumbs"></div></div>
        <div class="hp" aria-hidden="true"><label for="f-web">Website</label><input id="f-web" name="website" tabindex="-1" autocomplete="off"></div>
      </div>
      <div class="form-foot"><p class="hint">Prefer to call? <a href="{TEL}">{PHONE_DISPLAY}</a></p>
        <button class="btn btn-red" type="submit">Send request &rarr;</button></div>
      <div id="form-msg" class="form-msg" role="alert"></div>
    </form>
    <div id="form-success" class="success" hidden>
      <div class="check">&#10003;</div>
      <h2>Request received.</h2>
      <p>Thanks for reaching out. We&rsquo;ll get back to you to talk through your handle.</p>
      <p id="success-ref" class="ref"></p>
      <p><a class="btn btn-sm" href="#" id="send-another">Send another request</a></p>
      <p id="demo-flag" class="hint" hidden>Preview only: nothing was sent. On the live site this request is emailed to Mad Max right away.</p>
    </div>
  </div>
  <aside>
    <div class="panel info">
      <h3>Get in Touch</h3>
      <ul>
        <li><span class="ico">{icon("user")}</span><div><small>Contact</small>{"".join(f'<span class="v" style="display:block">{n}, {r}</span>' for n, r in OWNERS)}</div></li>
        <li><span class="ico">{icon("phone")}</span><div><small>Phone</small><a class="v" href="{TEL}">{PHONE_DISPLAY}</a></div></li>
        <li><span class="ico">{icon("mail")}</span><div><small>Email</small><a class="v" href="mailto:{EMAIL}" style="word-break:break-all">{EMAIL}</a></div></li>
        <li><span class="ico">{icon("pin")}</span><div><small>Location</small><span class="v">{LOCATION}</span><p class="muted">Packaged and shipped in-house.</p></div></li>
        <li><span class="ico">{icon("clock")}</span><div><small>Hours</small><div class="hours">{hours}</div><p class="muted">{HOURS_NOTE}</p></div></li>
        <li><span class="ico">{icon("fb")}</span><div><small>Facebook</small><a class="v" href="{FACEBOOK_URL}" target="_blank" rel="noopener">{FACEBOOK_LABEL}</a></div></li>
      </ul>
    </div>
    <p class="tip"><b>Photos help.</b> A shot of the blade with a ruler beside it goes a long way.</p>
  </aside>
</div></section>'''


BODIES = {"home": body_home, "work": body_work, "contact": body_contact}


def cta(slug):
    if slug == "contact":
        return ""
    t, s = (("Got a Blade That Needs a Handle?", "Tell us what you&rsquo;re working with and we&rsquo;ll take it from there.")
            if slug == "home" else ("Have a Design in Mind?", "Send us the details and we&rsquo;ll talk through the handle."))
    return f'''<section class="band cta"><div class="wrap">
  <div><h2>{t}</h2><p>{s}</p></div>
  <a class="btn btn-red" href="{{contact}}">Request a custom handle &rarr;</a>
</div></section>'''


def chrome(slug, inner, links, asset, preview):
    nav = "".join(f'<a href="{links[s]}"{" aria-current=page" if s == slug else ""}>{label}</a>'
                  for s, label, _, _ in PAGES)
    hours = "".join(f"<li>{d}<br><span style='color:var(--white)'>{h}</span></li>" for d, h in HOURS)
    pbar = ('<div style="background:var(--red);color:#fff;text-align:center;font:600 12px/1 var(--cond);letter-spacing:.2em;'
            'text-transform:uppercase;padding:9px">Design preview &middot; Not live &middot; Form sends nothing</div>') if preview else ""
    return f'''{pbar}
<header class="site-header"><div class="wrap">
  <a class="brand" href="{links["home"]}"><img src="{asset}logo-120.webp" alt="" width="46" height="48"><span><b>MAD MAX</b><small>Custom Knife Handles</small></span></a>
  <nav class="nav" id="nav" aria-label="Main">{nav}</nav>
  <a class="btn btn-sm head-cta" href="{links["contact"]}">Request a handle</a>
  <button class="menu-btn" type="button" aria-controls="nav" aria-expanded="false" aria-label="Menu"><span></span></button>
</div></header>
<main id="main">{inner}</main>
<div class="modal" id="piece-modal" hidden><div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="pm-title"><button class="modal-x" type="button" aria-label="Close">&times;</button><div class="pm-body"></div></div></div>
{cta(slug)}
<footer class="site-footer"><div class="wrap">
  <div class="foot">
    <div class="foot-brand"><img src="{asset}logo-360.webp" alt="" width="96" height="100" loading="lazy"><div><b>MAD MAX</b><small>Custom Knife Handles</small>
      <p>Handcrafted. Built to be unique.<br>{LOCATION}<br>{"<br>".join(f"{r}: {n}" for n, r in OWNERS)}</p></div></div>
    <div><h4>Explore</h4><ul>{"".join(f'<li><a href="{links[s]}">{l}</a></li>' for s, l, _, _ in PAGES)}</ul></div>
    <div><h4>Get in touch</h4><ul>
      <li><a class="row" href="{TEL}"><span class="ico">{icon("phone")}</span>{PHONE_DISPLAY}</a></li>
      <li><a class="row" href="mailto:{EMAIL}" style="word-break:break-all"><span class="ico">{icon("mail")}</span>{EMAIL}</a></li>
      <li><a class="row" href="{FACEBOOK_URL}" target="_blank" rel="noopener"><span class="ico">{icon("fb")}</span>{FACEBOOK_LABEL}</a></li>
      <li><span class="row"><span class="ico">{icon("pin")}</span>{LOCATION}</span></li></ul></div>
    <div><h4>Hours</h4><ul>{hours}<li style="font-size:13px">{HOURS_NOTE}</li></ul></div>
  </div>
  <div class="fine"><span>&copy; 2026 Mad Max Custom Knife Handles</span><span>Handcrafted &middot; Custom designs &middot; Made to order</span></div>
</div></footer>'''


HEAD = '''<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title}"><meta property="og:description" content="{desc}">
<meta property="og:type" content="website"><meta property="og:image" content="{site}/assets/og.jpg">
<meta name="theme-color" content="#050505">
<link rel="icon" href="{asset}favicon.png" type="image/png"><link rel="apple-touch-icon" href="{asset}apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=Barlow:wght@400;500&family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
{css}
</head><body>
<a class="skip" href="#main">Skip to content</a>
'''


def fill(s, links):
    return s.replace("{contact}", links["contact"]).replace("{work}", links["work"])


def build_prod():
    links = {"home": "/", "work": "/work", "contact": "/contact"}
    a = "/assets/"
    for slug, _, title, desc in PAGES:
        html = HEAD.format(title=title, desc=desc, site=SITE_URL, asset=a, css=f'<link rel="stylesheet" href="{a}site.css">')
        html += chrome(slug, BODIES[slug](a), links, a, False)
        html += f'\n<script src="{a}site.js" defer></script>\n</body></html>\n'
        out = ROOT / "site" / ("index.html" if slug == "home" else f"{slug}.html")
        out.write_text(fill(html, links))
    (ROOT / "site/admin").mkdir(exist_ok=True)
    (ROOT / "site/admin/index.html").write_text(build_admin())
    print("built site/")


ADMIN = '''<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Manage designs | Mad Max Custom Knife Handles</title>
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#050505">
<link rel="icon" href="{asset}favicon.png" type="image/png"><link rel="apple-touch-icon" href="{asset}apple-touch-icon.png">
<link rel="manifest" href="/admin/admin.webmanifest"><meta name="apple-mobile-web-app-title" content="MM Designs">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600&family=Barlow:wght@400;500&family=Cinzel:wght@600;700&display=swap" rel="stylesheet">
{css}
</head><body class="admin-body">
{pbar}
<header class="site-header"><div class="wrap">
  <a class="brand" href="{home}"><img src="{asset}logo-120.webp" alt="" width="46" height="48"><span><b>MAD MAX</b><small>Manage designs</small></span></a>
  <div class="who"><span id="who"></span><a class="btn btn-sm" href="{home}" target="_blank" rel="noopener">View site</a>{logout}</div>
</div></header>
<main class="wrap admin-main" id="admin"><p class="hint">Loading your designs&hellip;</p></main>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
{js}
</body></html>
'''


def build_admin(preview=False):
    a = "" if preview else "/assets/"
    if preview:
        css = "<style>" + (ROOT / "site/assets/site.css").read_text() + (ROOT / "site/assets/admin.css").read_text() + "</style>"
        js = "<script>window.MM_DEMO=true;</script><script>" + (ROOT / "site/assets/admin.js").read_text() + "</script>"
        pbar = ('<div style="background:var(--red);color:#fff;text-align:center;font:600 12px/1.4 var(--cond);letter-spacing:.16em;'
                'text-transform:uppercase;padding:9px 12px">Demo of the admin page &middot; Try adding a design with any photo &middot; Nothing is saved</div>')
        logout = ""
        home = "#"
    else:
        css = f'<link rel="stylesheet" href="{a}site.css"><link rel="stylesheet" href="{a}admin.css">'
        js = f'<script src="{a}admin.js" defer></script>'
        pbar, home = "", "/"
        logout = '<a class="btn btn-sm" href="/cdn-cgi/access/logout">Sign out</a>'
    return ADMIN.format(asset=a, css=css, js=js, pbar=pbar, home=home, logout=logout)


def build_preview():
    """One self-contained file (images inlined) for client review."""
    links = {s: f"#{s}" for s, *_ in PAGES}
    adir = ROOT / "site/assets"
    css = (adir / "site.css").read_text()
    html = HEAD.format(title="Mad Max Custom Knife Handles | Website preview", desc=PAGES[0][3], site=SITE_URL, asset="",
                       css=f"<style>{css}\n.view{{display:none}}.view.on{{display:block}}</style>")
    for slug, *_ in PAGES:
        html += f'<div class="view" data-view="{slug}">' + chrome(slug, BODIES[slug](""), links, "", True) + "</div>\n"
    html += "<script>window.MM_PREVIEW=true;</script>\n<script>" + (adir / "site.js").read_text() + "</script>\n"
    html += '''<script>(function(){function show(){var h=(location.hash||'#home').slice(1);if(!document.querySelector('[data-view="'+h+'"]'))h='home';
document.querySelectorAll('.view').forEach(function(v){v.classList.toggle('on',v.dataset.view===h)});window.scrollTo(0,0);}
window.addEventListener('hashchange',show);show();})();</script></body></html>'''
    html = fill(html, links)
    for f in sorted(adir.iterdir()):
        if f.suffix in (".webp", ".png", ".jpg"):
            mime = {".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg"}[f.suffix]
            html = html.replace(f'"{f.name}"', f'"data:{mime};base64,{base64.b64encode(f.read_bytes()).decode()}"')
    out = ROOT / "preview"
    out.mkdir(exist_ok=True)
    (out / "index.html").write_text(html)
    adm = build_admin(preview=True)
    for f in sorted(adir.iterdir()):
        if f.suffix in (".webp", ".png"):
            mime = {".webp": "image/webp", ".png": "image/png"}[f.suffix]
            adm = adm.replace(f'"{f.name}"', f'"data:{mime};base64,{base64.b64encode(f.read_bytes()).decode()}"')
    (out / "admin.html").write_text(adm)
    print("built preview/index.html and preview/admin.html")


if __name__ == "__main__":
    build_preview() if "--preview" in sys.argv else build_prod()
