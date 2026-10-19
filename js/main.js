/**
 * Zaidh Rizme Portfolio - Claude-Inspired Engineering UI & Interactions
 */

(function () {
    'use strict';

    // 1. Dynamic Year
    document.querySelectorAll('[data-year]').forEach((node) => {
        node.textContent = new Date().getFullYear();
    });

    // 2. Theme Toggle (Claude Ivory Light & Obsidian Dark)
    const THEME_STORAGE_KEY = 'zaidh_theme_preference';

    function getPreferredTheme() {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const toggleBtns = document.querySelectorAll('.theme-toggle-btn');
        toggleBtns.forEach((btn) => {
            btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
            btn.setAttribute('title', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode (shortcut: 't')`);
        });
    }

    const currentTheme = getPreferredTheme();
    applyTheme(currentTheme);

    function toggleTheme() {
        const active = document.documentElement.getAttribute('data-theme') || 'light';
        const next = active === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem(THEME_STORAGE_KEY, next);
        showToast(`Theme switched to ${next === 'dark' ? 'Obsidian Dark' : 'Warm Light'}`);
    }

    document.querySelectorAll('.theme-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', toggleTheme);
    });

    // Listen to OS theme changes if user hasn't explicitly set preference
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // 3. Header Scrolled State
    const siteHeader = document.querySelector('.site-header');
    if (siteHeader) {
        const updateHeader = () => {
            siteHeader.classList.toggle('is-scrolled', window.scrollY > 24);
        };
        updateHeader();
        window.addEventListener('scroll', updateHeader, { passive: true });
    }

    // 4. Reveal Animations (IntersectionObserver)
    const revealItems = document.querySelectorAll('.reveal');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || !('IntersectionObserver' in window)) {
        revealItems.forEach((item) => item.classList.add('is-visible'));
    } else {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

        revealItems.forEach((item) => observer.observe(item));
    }

    // 5. Toast Notification
    function showToast(message, duration = 3000) {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('is-visible');

        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.classList.remove('is-visible');
        }, duration);
    }
    window.showToast = showToast;

    // 6. Copy Email to Clipboard
    document.querySelectorAll('[data-copy-email]').forEach((elem) => {
        elem.addEventListener('click', (e) => {
            e.preventDefault();
            const email = elem.getAttribute('data-copy-email') || 'rizme.zaidh@gmail.com';
            navigator.clipboard.writeText(email).then(() => {
                showToast(`Copied ${email} to clipboard!`);
            }).catch(() => {
                window.location.href = `mailto:${email}`;
            });
        });
    });

    // 7. Interactive Project Filtering (on homepage & work.html)
    const filterButtons = document.querySelectorAll('.filter-btn');
    const filterableCards = document.querySelectorAll('[data-category]');

    if (filterButtons.length && filterableCards.length) {
        filterButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                filterButtons.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.getAttribute('data-filter') || 'all';

                filterableCards.forEach((card) => {
                    const category = card.getAttribute('data-category') || '';
                    if (filter === 'all' || category.includes(filter)) {
                        card.style.display = '';
                        setTimeout(() => card.classList.add('is-visible'), 50);
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    // 8. Interactive System Explorer (Artifact Tabs on Homepage)
    const artifactTabs = document.querySelectorAll('.artifact-tab');
    const artifactImg = document.getElementById('artifact-img');
    const artifactTitle = document.getElementById('artifact-title');
    const artifactDesc = document.getElementById('artifact-desc');
    const artifactSpecs = document.getElementById('artifact-specs');
    const artifactLink = document.getElementById('artifact-link');

    const artifactData = {
        robotics: {
            title: 'ToF SLAM Autonomous Mobile Robot',
            desc: 'Differential-drive mobile robot custom-designed from component level up. Integrates SolidWorks chassis, VL53L8CX multizone ToF scanner, ESP32 real-time odometry, and host-side MATLAB mapping.',
            img: 'images/projects/tof/robot-cad-main.webp',
            link: 'tof-slam.html',
            specs: [
                { label: 'Chassis Type', val: 'Differential Drive + Rear Ball Caster' },
                { label: 'Range Sensing', val: 'VL53L8CX 8x8 ToF on Stepper Mount' },
                { label: 'Compute & Comm', val: 'ESP32 Dual-Core + TCP Socket' },
                { label: 'Host Software', val: 'Python PyQt5 GUI + MATLAB SLAM' }
            ]
        },
        pcb: {
            title: 'ESP32 SLAM 4-Layer Control PCB',
            desc: 'High-density four-layer PCB featuring dedicated power and ground planes, onboard LM2596S regulation, USB-C programming, MPU6050 IMU, motor driver headers, and full KiCad interactive BOM.',
            img: 'images/projects/tof/pcb-advanced.webp',
            link: 'tof-pcb-advanced.html',
            specs: [
                { label: 'Stack-Up', val: '4-Layer FR-4 (Signal/GND/PWR/Signal)' },
                { label: 'Core Controller', val: 'ESP32-WROOM-32 with USB-C CP2102' },
                { label: 'Actuation', val: 'Dual N20 Encoders + 28BYJ Stepper' },
                { label: 'Design Tools', val: 'KiCad 8, DFM Verification, iBOM' }
            ]
        },
        oil: {
            title: 'Sense-Oil LevelGuard Retrofit System',
            desc: 'Industrial retrofit monitor measuring oil reservoir levels on heavy industrial sewing machines via hydrostatic pressure sensing, ATmega328P processing, and real-time OLED alerts.',
            img: 'images/projects/oil/oil-installed.webp',
            link: 'sense-oil.html',
            specs: [
                { label: 'Sensor Type', val: 'MS5837 Hydrostatic Pressure Transducer' },
                { label: 'Controller', val: 'ATmega328P Custom Control Board' },
                { label: 'Feedback UI', val: '0.96" I2C OLED + RGB Alert LEDs' },
                { label: 'Installation', val: 'Non-Invasive Drain Plug Interface' }
            ]
        },
        automation: {
            title: 'Modified Industrial Iron Workstation',
            desc: 'Pneumatic pre-heating automation station designed and deployed during industrial training at MAS Capital. Features a 23-part coordinated SolidWorks assembly and independent thermal controls.',
            img: 'images/projects/iron/iron-prototype.webp',
            link: 'modified-iron.html',
            specs: [
                { label: 'Actuation', val: 'Double-Acting Pneumatic Cylinder' },
                { label: 'Thermal Loop', val: 'Digital PID Controller + Sourced Iron' },
                { label: 'Mechanism', val: 'Guided 4-Bar Multi-Link Arm' },
                { label: 'Environment', val: 'MAS Capital Intimates Production' }
            ]
        },
        cad: {
            title: 'FLOD Configurable Glue-Pellet Hopper',
            desc: 'Reverse-engineered replacement hopper assembly designed to eliminate pellet bridging and stagnant flow. Includes parametric SolidWorks configurations, laser-cut acrylic window, and motorized agitator.',
            img: 'images/projects/hopper/hopper-cad.webp',
            link: 'flod-hopper.html',
            specs: [
                { label: 'Modeling', val: 'SolidWorks Parametric Configurations' },
                { label: 'Clearing Mechanism', val: 'Geared DC Motor Internal Agitator' },
                { label: 'Inspection Window', val: 'Transparent Acrylic Level Gauge' },
                { label: 'Production', val: 'FLOD Automated Adhesive Line' }
            ]
        }
    };

    if (artifactTabs.length && artifactTitle) {
        artifactTabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const key = tab.getAttribute('data-subsystem');
                if (!artifactData[key]) return;

                artifactTabs.forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');

                const data = artifactData[key];
                artifactTitle.textContent = data.title;
                artifactDesc.textContent = data.desc;
                if (artifactImg) {
                    artifactImg.src = data.img;
                    artifactImg.alt = data.title;
                }
                if (artifactLink) {
                    artifactLink.href = data.link;
                }
                if (artifactSpecs) {
                    artifactSpecs.innerHTML = data.specs
                        .map((s) => `<li><strong>${s.label}</strong>${s.val}</li>`)
                        .join('');
                }
            });
        });
    }

    // 9. Image Lightbox for High-Resolution Drawings & Schematics
    const lightboxModal = document.createElement('div');
    lightboxModal.className = 'lightbox-modal';
    lightboxModal.id = 'lightbox-modal';
    lightboxModal.innerHTML = `
        <button class="lightbox-close" aria-label="Close image">&times;</button>
        <div class="lightbox-container">
            <img class="lightbox-img" src="" alt="Enlarged view">
        </div>
        <p class="lightbox-caption"></p>
    `;
    document.body.appendChild(lightboxModal);

    const lightboxImg = lightboxModal.querySelector('.lightbox-img');
    const lightboxCaption = lightboxModal.querySelector('.lightbox-caption');
    const lightboxClose = lightboxModal.querySelector('.lightbox-close');

    function openLightbox(src, captionText) {
        if (!src) return;
        lightboxImg.src = src;
        lightboxCaption.textContent = captionText || '';
        lightboxModal.classList.add('is-active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightboxModal.classList.remove('is-active');
        document.body.style.overflow = '';
        setTimeout(() => {
            lightboxImg.src = '';
        }, 200);
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxModal.addEventListener('click', (e) => {
        if (e.target === lightboxModal || e.target.classList.contains('lightbox-container')) {
            closeLightbox();
        }
    });

    // Attach lightbox triggers to diagrams, drawings, part media, and galleries
    const zoomableSelector = '.gallery-media img, .part-media img, .configuration-media img, .drawing-sheet img, .document-preview img, .technical-media img, .layer-media img, .stage-media img';
    document.querySelectorAll(zoomableSelector).forEach((img) => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', (e) => {
            // If parent is a PDF link, don't block the link if user clicked specifically on action link, but if clicking the image preview, open lightbox
            const parentLink = img.closest('a');
            if (parentLink && parentLink.getAttribute('href')?.endsWith('.pdf')) {
                e.preventDefault();
            }
            const caption = img.closest('figure')?.querySelector('figcaption')?.textContent ||
                            img.closest('article')?.querySelector('h3')?.textContent ||
                            img.alt;
            openLightbox(img.src, caption);
        });
    });

    // 10. Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        // Toggle theme with 't' if not typing in an input
        if (e.key === 't' || e.key === 'T') {
            if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            toggleTheme();
        }
        // Close modal on Escape
        if (e.key === 'Escape') {
            closeLightbox();
        }
    });

})();
