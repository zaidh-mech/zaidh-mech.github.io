/**
 * Zaidh Rizme portfolio: interactions, transitions and the SLAM map.
 * Plain JavaScript, no dependencies. Every feature degrades to static content.
 */
(function () {
    'use strict';

    var doc = document.documentElement;
    var body = document.body;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    var canVT = typeof document.startViewTransition === 'function';
    var THEME_KEY = 'zr-theme';

    var store = {
        get: function (key) {
            try { return window.localStorage.getItem(key); } catch (e) { return null; }
        },
        set: function (key, value) {
            try { window.localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
        }
    };

    function motionOK() {
        return !reduceMotion.matches;
    }

    function onMediaChange(query, handler) {
        if (typeof query.addEventListener === 'function') query.addEventListener('change', handler);
        else if (typeof query.addListener === 'function') query.addListener(handler);
    }

    /* Runs a same-document view transition with only the elements we name.
       Starting a new one skips the previous one, so only the newest may clean up. */
    var vtToken = 0;
    function localTransition(update, extraClass) {
        if (!canVT || !motionOK()) {
            update();
            return null;
        }
        var token = ++vtToken;
        doc.classList.remove('vt-theme');
        doc.classList.add('vt-local');
        if (extraClass) doc.classList.add(extraClass);
        var updated = false;
        var guarded = function () {
            updated = true;
            return update();
        };
        var transition;
        try {
            transition = document.startViewTransition(guarded);
        } catch (e) {
            doc.classList.remove('vt-local');
            if (extraClass) doc.classList.remove(extraClass);
            update();
            return null;
        }
        // Watchdog: if the browser cannot render a frame (throttled or frozen page),
        // skip the animation so the state change still happens promptly.
        var watchdog = window.setTimeout(function () {
            if (!updated) transition.skipTransition();
        }, 900);
        var cleanup = function () {
            window.clearTimeout(watchdog);
            if (token !== vtToken) return;
            doc.classList.remove('vt-local');
            if (extraClass) doc.classList.remove(extraClass);
        };
        transition.finished.then(cleanup, cleanup);
        transition.ready.catch(function () { /* skipped transitions are fine */ });
        return transition;
    }

    /* Cross-page transitions are skipped when a navigation interrupts them; that is fine,
       so keep their promise rejections out of the console. (pagereveal is handled inline in <head>.) */
    window.addEventListener('pageswap', function (e) {
        var vt = e.viewTransition;
        if (!vt) return;
        vt.ready.catch(function () {});
        vt.updateCallbackDone.catch(function () {});
    });

    /* ---------- Year ---------- */
    document.querySelectorAll('[data-year]').forEach(function (node) {
        node.textContent = String(new Date().getFullYear());
    });

    /* ---------- Toast ---------- */
    // The live region must exist before its first message, or screen readers skip that message.
    var toastEl = null;
    var toastTimer = 0;
    if (document.querySelector('[data-copy]')) {
        toastEl = document.createElement('div');
        toastEl.className = 'toast';
        toastEl.setAttribute('role', 'status');
        toastEl.setAttribute('aria-live', 'polite');
        body.appendChild(toastEl);
    }
    function toast(message) {
        if (!toastEl) return;
        toastEl.textContent = message;
        window.requestAnimationFrame(function () { toastEl.classList.add('is-visible'); });
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2600);
    }

    /* ---------- Theme ---------- */
    var metaTheme = document.querySelector('meta[name="theme-color"]');

    function effectiveTheme() {
        var set = doc.getAttribute('data-theme');
        if (set === 'dark' || set === 'light') return set;
        return darkQuery.matches ? 'dark' : 'light';
    }

    function syncTheme() {
        var dark = effectiveTheme() === 'dark';
        if (metaTheme) metaTheme.setAttribute('content', dark ? '#14171b' : '#ffffff');
        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
            btn.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
        });
        document.dispatchEvent(new CustomEvent('themechange'));
    }

    function applyTheme(next) {
        doc.setAttribute('data-theme', next);
        store.set(THEME_KEY, next);
        syncTheme();
    }

    syncTheme();
    onMediaChange(darkQuery, function () {
        if (!store.get(THEME_KEY)) syncTheme();
    });

    // Pages restored by Back/Forward, and other open tabs, should follow the latest choice.
    function adoptStoredTheme() {
        var stored = store.get(THEME_KEY);
        if (stored === 'dark' || stored === 'light') doc.setAttribute('data-theme', stored);
        else doc.removeAttribute('data-theme');
        syncTheme();
    }
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) adoptStoredTheme();
    });
    window.addEventListener('storage', function (e) {
        if (e.key === THEME_KEY || e.key === null) adoptStoredTheme();
    });

    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
            var rect = btn.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;
            var radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
            var transition = localTransition(function () { applyTheme(next); }, 'vt-theme');
            if (transition) {
                transition.ready.then(function () {
                    doc.animate(
                        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
                        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
                    );
                }).catch(function () { /* transition skipped */ });
            }
        });
    });

    /* ---------- Header state ---------- */
    var header = document.querySelector('.site-header');
    var progress = null;
    var needsJSProgress = false;

    function onScroll() {
        if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
        if (progress && needsJSProgress) {
            var max = doc.scrollHeight - window.innerHeight;
            progress.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : '0');
        }
    }

    /* ---------- Reading progress (case studies) ---------- */
    if (body.classList.contains('page-case')) {
        progress = document.createElement('div');
        progress.className = 'read-progress';
        progress.setAttribute('aria-hidden', 'true');
        body.appendChild(progress);
        needsJSProgress = !(window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()'));
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    /* ---------- Mobile menu ---------- */
    var menuBtn = document.querySelector('.menu-toggle');
    var siteNav = document.querySelector('.site-nav');

    if (menuBtn && siteNav) {
        var menu = document.createElement('div');
        menu.className = 'mobile-menu';
        menu.id = 'mobile-menu';
        menu.inert = true;
        menu.setAttribute('aria-hidden', 'true');

        var menuNav = document.createElement('nav');
        menuNav.setAttribute('aria-label', 'Site');

        var wordmark = document.querySelector('.wordmark');
        var home = document.createElement('a');
        home.href = wordmark ? wordmark.getAttribute('href') : 'index.html';
        home.textContent = 'Home';
        if (body.classList.contains('page-home')) home.setAttribute('aria-current', 'page');
        var links = [home].concat(Array.prototype.slice.call(siteNav.querySelectorAll('a')).map(function (a) {
            return a.cloneNode(true);
        }));
        links.forEach(function (link, i) {
            link.style.setProperty('--i', String(i));
            menuNav.appendChild(link);
        });

        var foot = document.createElement('p');
        foot.className = 'mobile-menu-foot';
        foot.appendChild(document.createTextNode('Based in Colombo. Write to '));
        var mail = document.createElement('a');
        mail.href = 'mailto:rizme.zaidh@gmail.com';
        mail.textContent = 'rizme.zaidh@gmail.com';
        foot.appendChild(mail);

        menu.appendChild(menuNav);
        menu.appendChild(foot);
        body.appendChild(menu);

        var outside = Array.prototype.slice.call(document.querySelectorAll('body > main, body > footer, body > .skip-link'));

        var setMenu = function (open) {
            // Move focus out before the menu becomes inert, so it never falls back to <body>.
            if (!open && menu.contains(document.activeElement)) {
                // After a resize past the breakpoint the Menu button is hidden; fall back to the nav.
                var back = menuBtn.getClientRects().length ? menuBtn : (siteNav.querySelector('a') || wordmark);
                if (back) back.focus({ preventScroll: true });
            }
            menu.classList.toggle('is-open', open);
            menu.inert = !open;
            menu.setAttribute('aria-hidden', String(!open));
            menuBtn.setAttribute('aria-expanded', String(open));
            menuBtn.textContent = open ? 'Close' : 'Menu';
            doc.classList.toggle('menu-open', open);
            outside.forEach(function (el) { el.inert = open; });
            if (open) {
                var first = menuNav.querySelector('a');
                if (first) first.focus({ preventScroll: true });
            }
        };

        menuBtn.addEventListener('click', function () {
            setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
        });
        menuNav.addEventListener('click', function (e) {
            if (e.target.closest('a')) setMenu(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
                setMenu(false);
                menuBtn.focus();
            }
        });
        window.addEventListener('resize', function () {
            if (window.innerWidth > 720 && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false);
        });
        // Returning through the back/forward cache should never show an open menu.
        window.addEventListener('pageshow', function () {
            if (menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false);
        });
    }

    /* ---------- Plate reveal on scroll ---------- */
    if ('IntersectionObserver' in window && motionOK()) {
        var viewportH = window.innerHeight;
        var pending = Array.prototype.slice.call(document.querySelectorAll('main .plate')).filter(function (plate) {
            return plate.getBoundingClientRect().top > viewportH * 0.92;
        });
        if (pending.length) {
            var revealer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-revealed');
                    entry.target.classList.remove('is-pending');
                    revealer.unobserve(entry.target);
                });
            }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
            pending.forEach(function (plate) {
                plate.classList.add('is-pending');
                revealer.observe(plate);
            });
        }
    }

    /* ---------- Lightbox ---------- */
    var zoomables = Array.prototype.slice.call(document.querySelectorAll('main .plate > img')).filter(function (img) {
        return !img.closest('a, button, [data-no-zoom]');
    });

    if (zoomables.length && typeof HTMLDialogElement === 'function') {
        var dialog = document.createElement('dialog');
        dialog.className = 'lightbox';
        dialog.setAttribute('aria-label', 'Enlarged image');
        dialog.innerHTML =
            '<button class="lightbox-close" type="button" aria-label="Close enlarged image">' +
            '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2l12 12M14 2 2 14" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>' +
            '</button><figure class="lightbox-figure"><img alt=""><figcaption></figcaption></figure>';
        body.appendChild(dialog);

        var bigImg = dialog.querySelector('img');
        var bigCap = dialog.querySelector('figcaption');
        var sourceImg = null;
        var busy = false;

        var inViewport = function (el) {
            var r = el.getBoundingClientRect();
            return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
        };

        var fill = function (img) {
            var fig = img.closest('figure');
            var capNode = fig ? fig.querySelector('figcaption') : null;
            var caption = img.alt || '';
            if (capNode) {
                // Captions may be "h3 + p"; join their parts so words don't run together.
                var parts = capNode.children.length
                    ? Array.prototype.map.call(capNode.children, function (el) { return el.textContent.replace(/\s+/g, ' ').trim(); })
                    : [capNode.textContent.replace(/\s+/g, ' ').trim()];
                caption = parts.filter(Boolean).join(': ');
            }
            bigImg.src = img.currentSrc || img.src;
            bigImg.alt = img.alt || '';
            bigImg.classList.toggle('is-vector', /\.svg(?:[?#]|$)/i.test(bigImg.src));
            bigCap.textContent = caption;
            bigCap.hidden = !caption;
        };

        var openBox = function (img) {
            if (busy || dialog.open) return;
            sourceImg = img;
            var animate = canVT && motionOK();
            dialog.classList.toggle('no-anim', animate);
            if (!animate) {
                fill(img);
                dialog.showModal();
                doc.classList.add('lightbox-open');
                return;
            }
            busy = true;
            img.style.viewTransitionName = 'zoom-image';
            var t = localTransition(function () {
                img.style.viewTransitionName = '';
                fill(img);
                bigImg.style.viewTransitionName = 'zoom-image';
                dialog.showModal();
                doc.classList.add('lightbox-open');
                return bigImg.decode ? bigImg.decode().catch(function () {}) : undefined;
            });
            var done = function () { bigImg.style.viewTransitionName = ''; busy = false; };
            if (t) t.finished.then(done, done); else done();
        };

        var closeBox = function () {
            if (busy || !dialog.open) return;
            var finish = function () {
                dialog.close();
                doc.classList.remove('lightbox-open');
            };
            if (!(canVT && motionOK() && sourceImg && inViewport(sourceImg))) {
                finish();
                return;
            }
            busy = true;
            bigImg.style.viewTransitionName = 'zoom-image';
            var src = sourceImg;
            var t = localTransition(function () {
                bigImg.style.viewTransitionName = '';
                finish();
                src.style.viewTransitionName = 'zoom-image';
            });
            var done = function () { src.style.viewTransitionName = ''; busy = false; };
            if (t) t.finished.then(done, done); else done();
        };

        zoomables.forEach(function (img) {
            var plate = img.parentElement;
            plate.classList.add('is-zoomable');
            plate.setAttribute('role', 'button');
            plate.setAttribute('tabindex', '0');
            plate.setAttribute('aria-label', 'Enlarge image' + (img.alt ? ': ' + img.alt : ''));
            plate.addEventListener('click', function () { openBox(img); });
            plate.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openBox(img);
                }
            });
        });

        dialog.addEventListener('click', closeBox);
        dialog.addEventListener('cancel', function (e) {
            // Mid-animation, let the browser close the dialog itself; the close listener tidies up.
            if (busy) return;
            e.preventDefault();
            closeBox();
        });
        dialog.addEventListener('close', function () {
            doc.classList.remove('lightbox-open');
        });
    }

    /* ---------- Work filters ---------- */
    var filterButtons = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
    var filterRows = Array.prototype.slice.call(document.querySelectorAll('[data-category]'));
    var filterStatus = document.querySelector('[data-filter-status]');

    if (filterButtons.length && filterRows.length) {
        var matches = function (row, key) {
            return key === 'all' || (row.getAttribute('data-category') || '').split(/\s+/).indexOf(key) !== -1;
        };

        filterButtons.forEach(function (btn) {
            var count = btn.querySelector('.count');
            var key = btn.getAttribute('data-filter');
            if (count) count.textContent = String(filterRows.filter(function (row) { return matches(row, key); }).length);
        });

        var applyFilter = function (key, label) {
            var shown = 0;
            filterRows.forEach(function (row) {
                var on = matches(row, key);
                row.hidden = !on;
                if (on) shown += 1;
            });
            filterButtons.forEach(function (btn) {
                btn.setAttribute('aria-pressed', String(btn.getAttribute('data-filter') === key));
            });
            if (filterStatus) filterStatus.textContent = 'Showing ' + shown + (shown === 1 ? ' project' : ' projects') + (key === 'all' ? '' : ' in ' + label);
        };

        var filterRun = 0;
        filterButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.getAttribute('aria-pressed') === 'true') return;
                var key = btn.getAttribute('data-filter');
                var label = (btn.firstChild && btn.firstChild.textContent ? btn.firstChild.textContent : btn.textContent).trim();
                if (!canVT || !motionOK()) {
                    applyFilter(key, label);
                    return;
                }
                var run = ++filterRun;
                filterRows.forEach(function (row, i) { row.style.viewTransitionName = 'work-row-' + i; });
                var t = localTransition(function () { applyFilter(key, label); });
                var clear = function () {
                    if (run !== filterRun) return;   // a newer click owns the names now
                    filterRows.forEach(function (row) { row.style.viewTransitionName = ''; });
                };
                if (t) t.finished.then(clear, clear); else clear();
            });
        });
    }

    /* ---------- Copy to clipboard ---------- */
    function legacyCopy(text) {
        var area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        body.appendChild(area);
        area.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        body.removeChild(area);
        return ok;
    }

    document.querySelectorAll('[data-copy]').forEach(function (btn) {
        var original = btn.textContent;
        btn.addEventListener('click', function () {
            var text = btn.getAttribute('data-copy');
            var report = function (ok) {
                toast(ok ? 'Email address copied' : 'Copy failed. The address is ' + text);
                if (!ok) return;
                btn.textContent = 'Copied';
                window.setTimeout(function () { btn.textContent = original; }, 1800);
            };
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(function () { report(true); }, function () { report(legacyCopy(text)); });
            } else {
                report(legacyCopy(text));
            }
        });
    });

    /* ---------- SLAM map ---------- */
    document.querySelectorAll('canvas[data-slam]').forEach(function (canvas) {
        try {
            initSlam(canvas);
        } catch (e) {
            // The map is decorative; the page must keep working if canvas is unavailable.
            if (canvas.parentElement) canvas.parentElement.classList.add('is-static');
        }
    });

    function initSlam(canvas) {
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        // World: 8 m x 6 m at 0.1 m per cell, the same occupancy-grid idea the robot's MATLAB pipeline uses.
        var WORLD_W = 8, WORLD_H = 6, RES = 0.1;
        var COLS = 80, ROWS = 60;
        var L_FREE = -0.42, L_OCC = 1.05, L_MIN = -2.4, L_MAX = 3.4;
        var MAX_RANGE = 4.0;
        var FOV = 45 * Math.PI / 180;
        var ZONES = 8;
        var SPEED = 0.62;      // m/s
        var TURN_RATE = 2.4;   // rad/s
        var ROBOT_R = 0.16;
        var INTERIOR = 76 * 56;

        var logOdds = new Float32Array(COLS * ROWS);
        var level = new Uint8Array(COLS * ROWS);
        var known = 0;

        var walls = [];
        function addRect(list, x0, y0, x1, y1) {
            list.push([x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]);
        }
        addRect(walls, 0.2, 0.2, 7.8, 5.8);
        walls.push([2.8, 0.2, 2.8, 2.2], [5.0, 5.8, 5.0, 3.8], [5.0, 3.8, 5.9, 3.8]);
        addRect(walls, 1.2, 3.4, 2.0, 4.2);   // bench
        addRect(walls, 3.9, 1.0, 4.5, 1.5);   // crate
        addRect(walls, 6.3, 1.5, 6.7, 1.9);   // column
        addRect(walls, 3.4, 5.2, 4.4, 5.8);   // cabinet
        var obstacles = [];                    // user-placed: { x, y, segs }

        var waypoints = [
            [1.2, 1.0], [2.2, 1.6], [2.4, 2.9], [3.4, 3.0], [4.4, 2.4], [5.4, 1.0], [6.9, 0.9], [7.3, 2.6],
            [6.8, 4.6], [5.6, 5.0], [6.6, 3.2], [4.6, 3.3], [3.4, 4.4], [2.4, 4.9], [0.7, 5.0], [0.7, 2.8]
        ];

        var robot = { x: waypoints[0][0], y: waypoints[0][1], th: Math.atan2(waypoints[1][1] - waypoints[0][1], waypoints[1][0] - waypoints[0][0]) };
        var target = 1;
        var mode = 'turn';
        var simTime = 0;
        var scanAngle = 0;
        var fading = 0;
        var trail = [];
        var lastTrail = { x: robot.x, y: robot.y };
        var rays = [];
        var pings = [];

        var colors = {};
        function readColors() {
            var cs = window.getComputedStyle(canvas);
            colors.free = cs.getPropertyValue('--map-free').trim() || '#ffffff';
            colors.occ = cs.getPropertyValue('--map-occ').trim() || '#17191c';
            colors.grid = cs.getPropertyValue('--map-grid').trim() || 'rgba(0,0,0,0.08)';
            colors.accent = cs.getPropertyValue('--accent').trim() || '#ff4f00';
            colors.ink3 = cs.getPropertyValue('--ink-3').trim() || '#686e77';
        }
        readColors();

        // Layers: grid (static), map (incremental), frame (composited every tick).
        var gridLayer = document.createElement('canvas');
        var mapLayer = document.createElement('canvas');
        var gridCtx = gridLayer.getContext('2d');
        var mapCtx = mapLayer.getContext('2d');
        var pxW = 0, pxH = 0, cell = 0, scale = 0, dpr = 1;

        function paintGrid() {
            gridCtx.clearRect(0, 0, pxW, pxH);
            gridCtx.strokeStyle = colors.grid;
            gridCtx.lineWidth = Math.max(1, dpr * 0.75);
            gridCtx.beginPath();
            for (var c = 0; c <= COLS; c += 5) {
                var x = Math.round(c * cell) + 0.5;
                gridCtx.moveTo(x, 0);
                gridCtx.lineTo(x, pxH);
            }
            for (var r = 0; r <= ROWS; r += 5) {
                var y = Math.round(r * cell) + 0.5;
                gridCtx.moveTo(0, y);
                gridCtx.lineTo(pxW, y);
            }
            gridCtx.stroke();
        }

        function paintCell(i) {
            var cx = i % COLS;
            var cy = (i - cx) / COLS;
            var x0 = Math.round(cx * cell), y0 = Math.round(cy * cell);
            var x1 = Math.round((cx + 1) * cell), y1 = Math.round((cy + 1) * cell);
            mapCtx.clearRect(x0, y0, x1 - x0, y1 - y0);
            var lv = level[i];
            if (!lv) return;
            var gap = cell >= 6 ? Math.max(1, Math.round(dpr * 0.6)) : 0;
            if (lv === 1) {
                mapCtx.globalAlpha = 1;
                mapCtx.fillStyle = colors.free;
            } else {
                mapCtx.globalAlpha = lv === 2 ? 0.45 : 1;
                mapCtx.fillStyle = colors.occ;
            }
            mapCtx.fillRect(x0, y0, Math.max(1, x1 - x0 - gap), Math.max(1, y1 - y0 - gap));
            mapCtx.globalAlpha = 1;
        }

        function repaintMap() {
            mapCtx.clearRect(0, 0, pxW, pxH);
            for (var i = 0; i < level.length; i++) if (level[i]) paintCell(i);
        }

        function levelFor(l) {
            if (l > 1.3) return 3;
            if (l > 0.45) return 2;
            if (l < -0.55) return 1;
            return 0;
        }

        function bump(i, delta) {
            var l = logOdds[i] + delta;
            if (l < L_MIN) l = L_MIN; else if (l > L_MAX) l = L_MAX;
            logOdds[i] = l;
            var lv = levelFor(l);
            if (lv !== level[i]) {
                if (!level[i] && lv) known += 1;
                else if (level[i] && !lv) known -= 1;
                level[i] = lv;
                if (cell) paintCell(i);
            }
        }

        function cellIndex(x, y) {
            var cx = Math.floor(x / RES), cy = Math.floor(y / RES);
            if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return -1;
            return cy * COLS + cx;
        }

        function castRay(ox, oy, angle) {
            var dx = Math.cos(angle), dy = Math.sin(angle);
            var best = Infinity;
            var test = function (s) {
                var vx = s[2] - s[0], vy = s[3] - s[1];
                var denom = dx * vy - dy * vx;
                if (Math.abs(denom) < 1e-9) return;
                var px = s[0] - ox, py = s[1] - oy;
                var t = (px * vy - py * vx) / denom;
                var u = (px * dy - py * dx) / denom;
                if (t > 0 && u >= 0 && u <= 1 && t < best) best = t;
            };
            for (var i = 0; i < walls.length; i++) test(walls[i]);
            for (var j = 0; j < obstacles.length; j++) obstacles[j].segs.forEach(test);
            return best;
        }

        function integrateRay(ox, oy, angle) {
            var hit = castRay(ox, oy, angle);
            var isHit = hit <= MAX_RANGE;
            var dist = isHit ? hit : MAX_RANGE;
            var dx = Math.cos(angle), dy = Math.sin(angle);
            var last = -1;
            var hitIndex = isHit ? cellIndex(ox + dx * (hit + 0.01), oy + dy * (hit + 0.01)) : -1;
            for (var s = 0; s < dist - 0.02; s += RES * 0.5) {
                var i = cellIndex(ox + dx * s, oy + dy * s);
                if (i !== last && i !== -1 && i !== hitIndex) bump(i, L_FREE);
                last = i;
            }
            if (hitIndex !== -1) bump(hitIndex, L_OCC);
            return { a: angle, d: dist, hit: isHit };
        }

        function sense() {
            var ox = robot.x + Math.cos(robot.th) * 0.1;
            var oy = robot.y + Math.sin(robot.th) * 0.1;
            scanAngle = robot.th + 1.55 * Math.sin(simTime * 1.35);
            rays = [];
            for (var k = 0; k < ZONES; k++) {
                var a = scanAngle + ((k + 0.5) / ZONES - 0.5) * FOV;
                rays.push(integrateRay(ox, oy, a));
            }
            rays.ox = ox;
            rays.oy = oy;
        }

        function wrapAngle(a) {
            while (a > Math.PI) a -= Math.PI * 2;
            while (a < -Math.PI) a += Math.PI * 2;
            return a;
        }

        function step(dt) {
            simTime += dt;
            var wp = waypoints[target];
            var dx = wp[0] - robot.x, dy = wp[1] - robot.y;
            if (mode === 'turn') {
                var err = wrapAngle(Math.atan2(dy, dx) - robot.th);
                var turn = TURN_RATE * dt;
                if (Math.abs(err) <= turn) {
                    robot.th = Math.atan2(dy, dx);
                    mode = 'drive';
                } else {
                    robot.th = wrapAngle(robot.th + Math.sign(err) * turn);
                }
            } else {
                var dist = Math.hypot(dx, dy);
                var move = SPEED * dt;
                if (dist <= move) {
                    robot.x = wp[0];
                    robot.y = wp[1];
                    target = (target + 1) % waypoints.length;
                    mode = 'turn';
                    if (target === 1) fading = 1;   // a full lap: let the map fade and remap
                } else {
                    robot.x += dx / dist * move;
                    robot.y += dy / dist * move;
                }
            }
            if (Math.hypot(robot.x - lastTrail.x, robot.y - lastTrail.y) > 0.12) {
                trail.push({ x: robot.x, y: robot.y });
                if (trail.length > 260) trail.shift();
                lastTrail = { x: robot.x, y: robot.y };
            }
            if (fading > 0) {
                fading -= dt / 1.4;
                for (var i = 0; i < logOdds.length; i++) {
                    if (logOdds[i] !== 0) {
                        var l = logOdds[i] * 0.9;
                        logOdds[i] = Math.abs(l) < 0.05 ? 0 : l;
                        var lv = levelFor(logOdds[i]);
                        if (lv !== level[i]) {
                            if (!level[i] && lv) known += 1;
                            else if (level[i] && !lv) known -= 1;
                            level[i] = lv;
                            if (cell) paintCell(i);
                        }
                    }
                }
                if (fading <= 0) {
                    fading = 0;
                    trail = [];
                }
            }
            sense();
        }

        function toPx(v) { return v * scale; }

        function draw() {
            if (!pxW) return;
            ctx.clearRect(0, 0, pxW, pxH);
            ctx.drawImage(gridLayer, 0, 0);
            ctx.drawImage(mapLayer, 0, 0);

            // Travelled path
            if (trail.length > 1) {
                ctx.fillStyle = colors.ink3;
                ctx.globalAlpha = 0.55;
                var dot = Math.max(1, dpr * 1.1);
                for (var t = 0; t < trail.length; t += 1) {
                    ctx.fillRect(toPx(trail[t].x) - dot / 2, toPx(trail[t].y) - dot / 2, dot, dot);
                }
                ctx.globalAlpha = 1;
            }

            // Sensor field of view and zone rays
            if (rays.length) {
                var ox = toPx(rays.ox), oy = toPx(rays.oy);
                ctx.beginPath();
                ctx.moveTo(ox, oy);
                ctx.arc(ox, oy, toPx(MAX_RANGE * 0.3), scanAngle - FOV / 2, scanAngle + FOV / 2);
                ctx.closePath();
                ctx.fillStyle = colors.accent;
                ctx.globalAlpha = 0.1;
                ctx.fill();
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = colors.accent;
                ctx.lineWidth = Math.max(1, dpr * 0.8);
                ctx.beginPath();
                rays.forEach(function (ray) {
                    ctx.moveTo(ox, oy);
                    ctx.lineTo(ox + Math.cos(ray.a) * toPx(ray.d), oy + Math.sin(ray.a) * toPx(ray.d));
                });
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.fillStyle = colors.accent;
                var hs = Math.max(2, dpr * 2.4);
                rays.forEach(function (ray) {
                    if (!ray.hit) return;
                    ctx.fillRect(ox + Math.cos(ray.a) * toPx(ray.d) - hs / 2, oy + Math.sin(ray.a) * toPx(ray.d) - hs / 2, hs, hs);
                });
            }

            // Placement feedback
            var now = performance.now();
            pings = pings.filter(function (p) { return now - p.t < 700; });
            pings.forEach(function (p) {
                var k = (now - p.t) / 700;
                ctx.globalAlpha = 1 - k;
                ctx.strokeStyle = p.ok ? colors.accent : colors.ink3;
                ctx.lineWidth = Math.max(1, dpr * 1.5);
                ctx.beginPath();
                ctx.arc(toPx(p.x), toPx(p.y), toPx(0.18 + k * 0.35), 0, Math.PI * 2);
                ctx.stroke();
            });
            ctx.globalAlpha = 1;

            // Robot body
            var rx = toPx(robot.x), ry = toPx(robot.y);
            ctx.fillStyle = colors.accent;
            ctx.beginPath();
            ctx.arc(rx, ry, toPx(ROBOT_R), 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.5, dpr * 1.6);
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx + Math.cos(robot.th) * toPx(ROBOT_R * 0.95), ry + Math.sin(robot.th) * toPx(ROBOT_R * 0.95));
            ctx.stroke();
        }

        var hudPose = canvas.parentElement ? canvas.parentElement.querySelector('[data-hud="pose"]') : null;
        var hudCov = canvas.parentElement ? canvas.parentElement.querySelector('[data-hud="cov"]') : null;
        var hudAt = 0;
        function updateHud(force) {
            var now = performance.now();
            if (!force && now - hudAt < 120) return;
            hudAt = now;
            var deg = Math.round(((robot.th * 180 / Math.PI) % 360 + 360) % 360);
            if (hudPose) hudPose.textContent = 'x ' + robot.x.toFixed(2) + ' m   y ' + robot.y.toFixed(2) + ' m   θ ' + deg + '°';
            if (hudCov) hudCov.textContent = Math.min(100, Math.round(known / INTERIOR * 100)) + '% mapped';
        }

        function resize() {
            var cssW = canvas.clientWidth;
            if (!cssW) return;
            var cssH = cssW * (WORLD_H / WORLD_W);
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            pxW = Math.round(cssW * dpr);
            pxH = Math.round(cssH * dpr);
            canvas.width = gridLayer.width = mapLayer.width = pxW;
            canvas.height = gridLayer.height = mapLayer.height = pxH;
            scale = pxW / WORLD_W;
            cell = RES * scale;
            paintGrid();
            repaintMap();
            draw();
        }

        // Interaction: drop a box the robot has to discover.
        function distToSegment(px, py, s) {
            var vx = s[2] - s[0], vy = s[3] - s[1];
            var len2 = vx * vx + vy * vy;
            var t = len2 ? ((px - s[0]) * vx + (py - s[1]) * vy) / len2 : 0;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(px - (s[0] + vx * t), py - (s[1] + vy * t));
        }

        function canPlace(x, y) {
            if (x < 0.6 || y < 0.6 || x > WORLD_W - 0.6 || y > WORLD_H - 0.6) return false;
            if (Math.hypot(x - robot.x, y - robot.y) < 0.6) return false;
            for (var i = 0; i < waypoints.length; i++) {
                var a = waypoints[i], b = waypoints[(i + 1) % waypoints.length];
                if (distToSegment(x, y, [a[0], a[1], b[0], b[1]]) < 0.45) return false;
            }
            for (var j = 0; j < walls.length; j++) if (distToSegment(x, y, walls[j]) < 0.3) return false;
            for (var k = 0; k < obstacles.length; k++) if (Math.hypot(x - obstacles[k].x, y - obstacles[k].y) < 0.45) return false;
            return true;
        }

        var running = false;
        var visible = true;
        var rafId = 0;
        var lastTime = 0;

        function frame(time) {
            rafId = 0;
            if (!running) return;
            // Keep simulated time honest on slow devices, but never jump more than 0.25 s.
            var elapsed = lastTime ? Math.min(0.25, (time - lastTime) / 1000) : 1 / 60;
            lastTime = time;
            while (elapsed > 1e-4) {
                var dt = Math.min(elapsed, 1 / 30);
                step(dt);
                elapsed -= dt;
            }
            draw();
            updateHud(false);
            rafId = window.requestAnimationFrame(frame);
        }

        function start() {
            if (running || !motionOK()) return;
            running = true;
            lastTime = 0;
            rafId = window.requestAnimationFrame(frame);
        }

        function stop() {
            running = false;
            if (rafId) window.cancelAnimationFrame(rafId);
            rafId = 0;
        }

        var userPaused = false;

        function syncRunning() {
            if (visible && !document.hidden && motionOK() && !userPaused) start(); else stop();
        }

        function renderStatic() {
            // Reduced motion: map one full lap instantly and show the result.
            stop();
            for (var i = 0; i < 1600 && !(target === 0 && mode === 'turn'); i++) step(1 / 30);
            fading = 0;
            draw();
            updateHud(true);
        }

        function placeObstacle(x, y) {
            var ok = canPlace(x, y);
            pings.push({ x: x, y: y, ok: ok, t: performance.now() });
            if (ok) {
                var half = 0.18;
                var segs = [];
                addRect(segs, x - half, y - half, x + half, y + half);
                obstacles.push({ x: x, y: y, segs: segs });
                if (obstacles.length > 4) obstacles.shift();
            }
            if (!running) draw();
            return ok;
        }

        canvas.addEventListener('click', function (e) {
            if (!motionOK() || !scale) return;
            var rect = canvas.getBoundingClientRect();
            placeObstacle((e.clientX - rect.left) / rect.width * WORLD_W, (e.clientY - rect.top) / rect.height * WORLD_H);
        });

        // Keyboard-reachable controls: pause/play (WCAG 2.2.2) and a random obstacle drop.
        var plateEl = canvas.parentElement;
        var pauseBtn = plateEl ? plateEl.querySelector('[data-map="pause"]') : null;
        var dropBtn = plateEl ? plateEl.querySelector('[data-map="drop"]') : null;
        if (pauseBtn) {
            pauseBtn.addEventListener('click', function () {
                userPaused = !userPaused;
                pauseBtn.textContent = userPaused ? 'Play' : 'Pause';
                pauseBtn.setAttribute('aria-label', userPaused ? 'Play the mapping animation' : 'Pause the mapping animation');
                syncRunning();
            });
        }
        if (dropBtn) {
            dropBtn.addEventListener('click', function () {
                if (!motionOK() || !scale) return;
                for (var n = 0; n < 120; n++) {
                    var x = 0.6 + Math.random() * (WORLD_W - 1.2);
                    var y = 0.6 + Math.random() * (WORLD_H - 1.2);
                    if (canPlace(x, y)) {
                        placeObstacle(x, y);
                        return;
                    }
                }
            });
        }

        // Re-rasterise when the screen resolution changes (zoom, moving to another monitor).
        (function watchResolution() {
            if (!window.matchMedia) return;
            var mq = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
            var onChange = function () {
                if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange);
                else if (typeof mq.removeListener === 'function') mq.removeListener(onChange);
                resize();
                watchResolution();
            };
            onMediaChange(mq, onChange);
        })();

        if ('ResizeObserver' in window) {
            new ResizeObserver(function () { resize(); }).observe(canvas);
        } else {
            window.addEventListener('resize', resize);
        }

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                visible = entries[entries.length - 1].isIntersecting;
                syncRunning();
            }).observe(canvas);
        }

        document.addEventListener('visibilitychange', syncRunning);
        document.addEventListener('themechange', function () {
            readColors();
            if (!pxW) return;
            paintGrid();
            repaintMap();
            draw();
        });
        onMediaChange(reduceMotion, function () {
            if (motionOK()) syncRunning(); else renderStatic();
        });

        resize();
        sense();
        if (motionOK()) {
            syncRunning();
        } else {
            renderStatic();
        }
        updateHud(true);
    }
})();
