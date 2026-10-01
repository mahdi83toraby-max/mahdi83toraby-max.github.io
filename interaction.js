(function () {
    "use strict";
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var root = document.documentElement;
    var raf = 0;
    var pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    function setPointer(x, y) {
        pointer.x = x; pointer.y = y;
        root.style.setProperty("--pointer-x", x + "px");
        root.style.setProperty("--pointer-y", y + "px");
        root.style.setProperty("--pointer-xp", (x / Math.max(1, window.innerWidth) * 100).toFixed(2) + "%");
        root.style.setProperty("--pointer-yp", (y / Math.max(1, window.innerHeight) * 100).toFixed(2) + "%");
    }

    function updateScroll() {
        raf = 0;
        var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        var progress = Math.min(1, Math.max(0, window.scrollY / max));
        root.style.setProperty("--scroll-progress", (progress * 100).toFixed(2) + "%");
        root.style.setProperty("--scroll-y", window.scrollY + "px");
    }

    function reveal() {
        if (reduce || !("IntersectionObserver" in window)) {
            document.querySelectorAll(".reveal-on-scroll").forEach(function (el) { el.classList.add("is-visible"); });
            return;
        }
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
        document.querySelectorAll(".card, .fin-card, .hero, .banner, .state-card").forEach(function (el) {
            el.classList.add("reveal-on-scroll");
            observer.observe(el);
        });
    }

    function addRipple(event) {
        var target = event.target.closest && event.target.closest("button, .qa, .btn");
        if (!target || reduce) return;
        var rect = target.getBoundingClientRect();
        var ripple = document.createElement("span");
        ripple.className = "click-ripple";
        ripple.style.left = (event.clientX - rect.left) + "px";
        ripple.style.top = (event.clientY - rect.top) + "px";
        target.appendChild(ripple);
        window.setTimeout(function () { ripple.remove(); }, 650);
    }

    function initTilt() {
        if (reduce || !window.matchMedia || !window.matchMedia("(hover: hover)").matches) return;
        document.addEventListener("pointermove", function (event) {
            setPointer(event.clientX, event.clientY);
            var card = event.target.closest && event.target.closest(".card.hoverable, .fin-card, .hero");
            if (!card) return;
            var r = card.getBoundingClientRect();
            var px = (event.clientX - r.left) / Math.max(1, r.width) - .5;
            var py = (event.clientY - r.top) / Math.max(1, r.height) - .5;
            card.style.setProperty("--tilt-x", (-py * 2.2).toFixed(2) + "deg");
            card.style.setProperty("--tilt-y", (px * 2.2).toFixed(2) + "deg");
            card.classList.add("is-tilting");
        }, { passive: true });
        document.addEventListener("pointerout", function (event) {
            var card = event.target.closest && event.target.closest(".card.hoverable, .fin-card, .hero");
            if (card && !card.contains(event.relatedTarget)) {
                card.style.removeProperty("--tilt-x"); card.style.removeProperty("--tilt-y"); card.classList.remove("is-tilting");
            }
        }, { passive: true });
    }

    function initParticles() {
        var canvas = document.createElement("canvas");
        canvas.className = "particle-canvas";
        canvas.setAttribute("aria-hidden", "true");
        document.body.appendChild(canvas);
        var ctx = canvas.getContext("2d");
        if (!ctx) return;
        var particles = [];
        var width = 0, height = 0, dpr = 1, lastScroll = window.scrollY, scrollKick = 0;
        var maxCount = reduce ? 18 : (window.innerWidth < 700 ? 34 : 72);

        function resize() {
            dpr = Math.min(2, window.devicePixelRatio || 1);
            width = window.innerWidth; height = window.innerHeight;
            canvas.width = width * dpr; canvas.height = height * dpr;
            canvas.style.width = width + "px"; canvas.style.height = height + "px";
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            if (particles.length === 0) {
                for (var i = 0; i < maxCount; i++) particles.push({
                    x: Math.random() * width, y: Math.random() * height,
                    vx: (Math.random() - .5) * .22, vy: .10 + Math.random() * .34,
                    r: 1 + Math.random() * 2.1, hue: 190 + Math.random() * 105,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
        function draw(time) {
            ctx.clearRect(0, 0, width, height);
            var pulse = time * .0006;
            for (var i = 0; i < particles.length; i++) {
                var p = particles[i];
                if (!reduce) {
                    var dx = p.x - pointer.x, dy = p.y - pointer.y;
                    var distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    if (distance < 150) {
                        var force = (150 - distance) / 150 * .022;
                        p.vx += dx / distance * force; p.vy += dy / distance * force;
                    }
                    p.vx += Math.sin(p.phase + pulse) * .0012;
                    p.vy += scrollKick * .00045;
                    p.vx *= .994; p.vy = Math.max(-.3, Math.min(.9, p.vy * .996));
                    p.x += p.vx; p.y += p.vy;
                }
                if (p.x < -20) p.x = width + 20; if (p.x > width + 20) p.x = -20;
                if (p.y < -20) p.y = height + 20; if (p.y > height + 20) p.y = -20;
                var alpha = .27 + Math.sin(p.phase + pulse * 2) * .12;
                ctx.beginPath(); ctx.fillStyle = "hsla(" + p.hue + ", 90%, 74%, " + alpha + ")";
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                for (var j = i + 1; j < particles.length; j++) {
                    var q = particles[j], lx = p.x - q.x, ly = p.y - q.y, dist = Math.sqrt(lx * lx + ly * ly);
                    if (dist < 118) {
                        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
                        ctx.strokeStyle = "hsla(" + ((p.hue + q.hue) / 2) + ", 80%, 72%, " + ((1 - dist / 118) * .14) + ")";
                        ctx.lineWidth = .65; ctx.stroke();
                    }
                }
            }
            scrollKick *= .90;
            if (!reduce) requestAnimationFrame(draw);
        }
        window.addEventListener("resize", resize, { passive: true });
        window.addEventListener("scroll", function () { scrollKick = window.scrollY - lastScroll; lastScroll = window.scrollY; }, { passive: true });
        resize(); draw(0);
    }

    function installObservers() {
        var progress = document.createElement("div");
        progress.className = "scroll-progress";
        progress.setAttribute("aria-hidden", "true");
        document.body.appendChild(progress);
        var glow = document.createElement("div");
        glow.className = "cursor-glow";
        glow.setAttribute("aria-hidden", "true");
        document.body.appendChild(glow);
        initParticles();
        document.addEventListener("pointermove", function (event) { setPointer(event.clientX, event.clientY); }, { passive: true });
        document.addEventListener("click", addRipple, { passive: true });
        window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(updateScroll); }, { passive: true });
        updateScroll();
        reveal();
        if ("MutationObserver" in window) {
            new MutationObserver(function () { reveal(); }).observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
        }
        initTilt();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installObservers);
    else installObservers();
})();
