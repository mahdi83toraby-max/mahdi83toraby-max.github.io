const CACHE_NAME = "sgm-dashboard-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/css/app.css",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

// --- Jalali -> Gregorian (jalaali-js algorithm) ---
function div(a, b) { return Math.floor(a / b); }
function mod(a, b) { return a - div(a, b) * b; }
var JALALI_BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
function jalCal(jy) {
  var bl = JALALI_BREAKS.length, gy = jy + 621, leapJ = -14, jp = JALALI_BREAKS[0], jm, jump, n;
  for (var i = 1; i < bl; i += 1) {
    jm = JALALI_BREAKS[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4); jp = jm;
  }
  n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  var leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  var march = 20 + leapJ - leapG;
  return { gy: gy, march: march };
}
function gregorianToJDN(Y, M, D) {
  var a = div(14 - M, 12);
  var y = Y + 4800 - a;
  var m = M + 12 * a - 3;
  return D + div(153 * m + 2, 5) + 365 * y + div(y, 4) - div(y, 100) + div(y, 400) - 32045;
}
function jdnToGregorian(J) {
  var a = J + 32044;
  var b = div(4 * a + 3, 146097);
  var c = a - div(146097 * b, 4);
  var d = div(4 * c + 3, 1461);
  var e = c - div(1461 * d, 4);
  var m = div(5 * e + 2, 153);
  var gd = e - div(153 * m + 2, 5) + 1;
  var gm = m + 3 - 12 * div(m, 10);
  var gy = 100 * b + d - 4800 + div(m, 10);
  return { gy: gy, gm: gm, gd: gd };
}
function jalaliToGregorian(jy, jm, jd) {
  var r = jalCal(jy);
  var base = gregorianToJDN(r.gy, 3, r.march);
  var doy = (jm <= 6) ? (jm - 1) * 31 + jd : 186 + (jm - 7) * 30 + jd;
  return jdnToGregorian(base + doy - 1);
}
// --- Rewrite Jalali date filters in Supabase REST URLs ---
function fixSupabaseUrl(rawUrl) {
  var url;
  try { url = new URL(rawUrl); } catch (e) { return null; }
  if (url.hostname !== "ktnixxbkzapziqplrnmo.supabase.co") return null;
  if (url.pathname.indexOf("/rest/v1/") !== 0) return null;
  var changed = false;
  var keys = ["date", "due_date"];
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var vals = url.searchParams.getAll(key);
    if (!vals.length) continue;
    var newVals = vals.map(function (v) {
      var m = /^(eq|gte|lte|gt|lt)\.(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(v);
      if (!m) return v;
      var jy = parseInt(m[2], 10);
      if (jy < 1300 || jy > 1499) return v;
      var g = jalaliToGregorian(jy, parseInt(m[3], 10), parseInt(m[4], 10));
      function p2(x) { return String(x).padStart(2, "0"); }
      changed = true;
      return m[1] + "." + g.gy + "-" + p2(g.gm) + "-" + p2(g.gd);
    });
    if (newVals.join("|") !== vals.join("|")) {
      url.searchParams.delete(key);
      for (var n = 0; n < newVals.length; n++) url.searchParams.append(key, newVals[n]);
    }
  }
  return changed ? url.toString() : null;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // SGM fix: the app sends Jalali dates in some Supabase REST filters
  // (tasks "date", installments "due_date"); the server expects Gregorian.
  // Rewrite those filters in flight; everything else passes through untouched.
  const fixed = fixSupabaseUrl(event.request.url);
  if (fixed) {
    const req = new Request(fixed, { method: "GET", headers: event.request.headers, mode: "cors", credentials: "omit" });
    event.respondWith(fetch(req));
    return;
  }
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/index.html")))
  );
});
