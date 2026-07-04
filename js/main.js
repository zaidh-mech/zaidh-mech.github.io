const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const updateHeader = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 16);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

menuToggle?.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    nav?.classList.toggle("is-open", !open);
});

nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
        menuToggle?.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
    });
});

const revealItems = document.querySelectorAll(".reveal");

if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => observer.observe(item));
}

const telemetry = {
    yaw: document.querySelector('[data-telemetry="yaw"]'),
    range: document.querySelector('[data-telemetry="range"]'),
    loop: document.querySelector('[data-telemetry="loop"]')
};

if (!reducedMotion && telemetry.yaw && telemetry.range && telemetry.loop) {
    window.setInterval(() => {
        const yaw = 34 + Math.random() * 9;
        const range = 1180 + Math.floor(Math.random() * 130);
        const loop = 29 + Math.floor(Math.random() * 7);
        telemetry.yaw.textContent = `+${yaw.toFixed(1).padStart(5, "0")}°`;
        telemetry.range.textContent = `${range} mm`;
        telemetry.loop.textContent = `${String(loop).padStart(3, "0")} ms`;
    }, 1800);
}

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();
