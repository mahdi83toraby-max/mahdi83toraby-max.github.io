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
        // On touch devices the canvas is the main source of GPU/CPU pressure.
        // Keep the mobile UI responsive; desktop retains the full effect.
        var touchDevice = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
        var narrow = window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
        var saveData = navigator.connection && navigator.connection.saveData;
        var cores = navigator.hardwareConcurrency || 8;
        if (touchDevice || narrow || saveData || cores <= 4) return;
        if (document.querySelector("canvas.particle-canvas")) return;
        var canvas = document.createElement("canvas");
        canvas.className = "particle-canvas";
        canvas.setAttribute("aria-hidden", "true");
        document.body.appendChild(canvas);
        var ctx = canvas.getContext("2d");
        if (!ctx) return;
        var particles = [];
        var width = 0, height = 0, dpr = 1, lastScroll = window.scrollY, scrollKick = 0;
        var mobile = false;
        var lowPower = false;
        var maxCount = reduce ? 10 : (lowPower ? 12 : 72);
        var frame = 0, running = true;

        function resize() {
            dpr = lowPower ? 1 : Math.min(2, window.devicePixelRatio || 1);
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
                    if (!lowPower) p.vx += Math.sin(p.phase + pulse) * .0012;
                    p.vy += scrollKick * (lowPower ? .0002 : .00045);
                    p.vx *= .994; p.vy = Math.max(-.3, Math.min(.9, p.vy * .996));
                    p.x += p.vx; p.y += p.vy;
                }
                if (p.x < -20) p.x = width + 20; if (p.x > width + 20) p.x = -20;
                if (p.y < -20) p.y = height + 20; if (p.y > height + 20) p.y = -20;
                var alpha = .27 + Math.sin(p.phase + pulse * 2) * .12;
                ctx.beginPath(); ctx.fillStyle = "hsla(" + p.hue + ", 90%, 74%, " + alpha + ")";
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
                if (lowPower) continue;
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
            if (!reduce && running) {
                if (lowPower) window.setTimeout(function () { requestAnimationFrame(draw); }, 40);
                else requestAnimationFrame(draw);
            }
        }
        window.addEventListener("resize", resize, { passive: true });
        window.addEventListener("scroll", function () { scrollKick = window.scrollY - lastScroll; lastScroll = window.scrollY; }, { passive: true });
        document.addEventListener("visibilitychange", function () { running = !document.hidden; }, { passive: true });
        resize(); draw(0);
    }

    window.sgmInitParticles = initParticles;

    function installObservers() {
        var touchMode = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
            (window.matchMedia && window.matchMedia("(max-width: 767px)").matches);
        // The app itself remains fully functional; skip this enhancement layer
        // on phones so it cannot compete with Blazor and touch scrolling.
        if (touchMode) return;
        var progress = document.createElement("div");
        progress.className = "scroll-progress";
        progress.setAttribute("aria-hidden", "true");
        document.body.appendChild(progress);
        var glow = document.createElement("div");
        glow.className = "cursor-glow";
        glow.setAttribute("aria-hidden", "true");
        document.body.appendChild(glow);
        try { initParticles(); } catch (error) { console.warn("SGM particle field delayed", error); }
        window.setTimeout(function () {
            if (!document.querySelector("canvas.particle-canvas")) {
                try { initParticles(); } catch (error) { console.warn("SGM particle field unavailable", error); }
            }
        }, 350);
        if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
            document.addEventListener("pointermove", function (event) { setPointer(event.clientX, event.clientY); }, { passive: true });
        }
        document.addEventListener("click", addRipple, { passive: true });
        window.addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(updateScroll); }, { passive: true });
        updateScroll();
        reveal();
        if ("MutationObserver" in window) {
            var revealQueued = false;
            new MutationObserver(function () {
                if (revealQueued) return;
                revealQueued = true;
                window.setTimeout(function () { revealQueued = false; reveal(); }, 120);
            }).observe(document.getElementById("app") || document.body, { childList: true, subtree: true });
        }
        initTilt();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installObservers);
    else installObservers();
})();


(function () {
    "use strict";
    var dotNet = null;
    var drag = null;
    var snapMinutes = 15;

    function zoneAt(x, y) {
        var target = document.elementFromPoint(x, y);
        return target && target.closest ? target.closest(".week-day-events[data-week-day]") : null;
    }

    function formatTime(minutes) {
        var format = new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2, useGrouping: false });
        return format.format(Math.floor(minutes / 60)) + ":" + format.format(minutes % 60);
    }

    function minuteAt(zone, x) {
        var rect = zone.getBoundingClientRect();
        if (!rect.width) return 0;
        var ratio = Math.max(0, Math.min(1, (rect.right - x) / rect.width));
        return Math.round((ratio * 1440) / snapMinutes) * snapMinutes;
    }

    function makeGhost(state, event) {
        if (!state.ghost) {
            state.ghost = document.createElement("div");
            state.ghost.className = "week-drag-ghost";
            document.body.appendChild(state.ghost);
        }
        state.ghost.textContent = state.zone
            ? state.title + " · " + state.zone.dataset.weekDay + " · " + formatTime(state.previewStart) + "–" + formatTime(state.previewEnd)
            : state.title;
        state.ghost.style.left = (event.clientX + 14) + "px";
        state.ghost.style.top = (event.clientY + 14) + "px";
    }

    function finishVisuals(state) {
        if (!state) return;
        state.bar.classList.remove("week-event-dragging");
        if (state.zone) state.zone.classList.remove("week-drop-target");
        if (state.ghost) state.ghost.remove();
    }

    function stopTracking() {
        document.removeEventListener("pointermove", onPointerMove, true);
        document.removeEventListener("pointerup", onPointerUp, true);
        document.removeEventListener("pointercancel", onPointerCancel, true);
    }

    function onPointerDown(event) {
        var bar = event.target.closest && event.target.closest(".week-event[data-task-id]");
        if (!bar || event.button !== 0 || event.isPrimary === false || !dotNet) return;
        event.preventDefault();
        var rect = bar.getBoundingClientRect();
        var duration = Math.max(1, Number(bar.dataset.endMinute) - Number(bar.dataset.startMinute));
        var grabbedFromRight = rect.width ? Math.max(0, Math.min(1, (rect.right - event.clientX) / rect.width)) : 0;
        drag = {
            bar: bar,
            pointerId: event.pointerId,
            taskId: bar.dataset.taskId,
            title: bar.dataset.title || bar.textContent.trim(),
            startMinute: Number(bar.dataset.startMinute),
            endMinute: Number(bar.dataset.endMinute),
            grabOffsetMinutes: grabbedFromRight * duration,
            downX: event.clientX,
            downY: event.clientY,
            dragging: false,
            zone: null,
            ghost: null
        };
        document.addEventListener("pointermove", onPointerMove, true);
        document.addEventListener("pointerup", onPointerUp, true);
        document.addEventListener("pointercancel", onPointerCancel, true);
    }

    function onPointerMove(event) {
        var state = drag;
        if (!state || event.pointerId !== state.pointerId) return;
        if (!state.dragging && Math.hypot(event.clientX - state.downX, event.clientY - state.downY) < 5) return;
        state.dragging = true;
        state.bar.classList.add("week-event-dragging");
        state.zone = zoneAt(event.clientX, event.clientY);
        document.querySelectorAll(".week-drop-target").forEach(function (el) { el.classList.remove("week-drop-target"); });
        if (state.zone) {
            state.zone.classList.add("week-drop-target");
            var duration = Math.max(1, state.endMinute - state.startMinute);
            var maxStart = Math.floor(Math.max(0, 1440 - duration) / snapMinutes) * snapMinutes;
            var snapped = Math.round((minuteAt(state.zone, event.clientX) - state.grabOffsetMinutes) / snapMinutes) * snapMinutes;
            state.previewStart = Math.min(maxStart, Math.max(0, snapped));
            state.previewEnd = state.previewStart + duration;
        }
        makeGhost(state, event);
        event.preventDefault();
    }

    async function onPointerUp(event) {
        var state = drag;
        if (!state || event.pointerId !== state.pointerId) return;
        drag = null;
        stopTracking();
        var zone = zoneAt(event.clientX, event.clientY);
        var shouldMove = state.dragging && zone && dotNet;
        var payload = null;
        if (shouldMove) {
            var duration = Math.max(1, state.endMinute - state.startMinute);
            var maxStart = Math.floor(Math.max(0, 1440 - duration) / snapMinutes) * snapMinutes;
            var snapped = Math.round((minuteAt(zone, event.clientX) - state.grabOffsetMinutes) / snapMinutes) * snapMinutes;
            var start = Math.min(maxStart, Math.max(0, snapped));
            payload = [state.taskId, zone.dataset.weekDay, start, start + duration];
        }
        finishVisuals(state);
        if (!payload) return;
        try {
            await dotNet.invokeMethodAsync("MoveWeekTaskAsync", payload[0], payload[1], payload[2], payload[3]);
        } catch (error) {
            console.error("SGM: moving the weekly task failed", error);
        }
    }

    function onPointerCancel(event) {
        if (!drag || event.pointerId !== drag.pointerId) return;
        var state = drag;
        drag = null;
        stopTracking();
        finishVisuals(state);
    }

    window.sgm = window.sgm || {};
    window.sgm.enableWeekDrag = function (reference) {
        if (dotNet) window.sgm.disableWeekDrag();
        dotNet = reference;
        document.addEventListener("pointerdown", onPointerDown, true);
    };
    window.sgm.disableWeekDrag = function () {
        document.removeEventListener("pointerdown", onPointerDown, true);
        if (drag) {
            var state = drag;
            drag = null;
            stopTracking();
            finishVisuals(state);
        }
        dotNet = null;
    };
})();
