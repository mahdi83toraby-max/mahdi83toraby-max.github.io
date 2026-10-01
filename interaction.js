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

    function installObservers() {
        var progress = document.createElement("div");
        progress.className = "scroll-progress";
        progress.setAttribute("aria-hidden", "true");
        document.body.appendChild(progress);
        var glow = document.createElement("div");
        glow.className = "cursor-glow";
        glow.setAttribute("aria-hidden", "true");
        document.body.appendChild(glow);
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
