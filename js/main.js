const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const timeElement = document.querySelector("[data-time]");
const yearElement = document.querySelector("[data-year]");

const updateTime = () => {
    if (!timeElement) return;
    timeElement.textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Colombo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(new Date());
};

updateTime();
window.setInterval(updateTime, 1000);
if (yearElement) yearElement.textContent = new Date().getFullYear();

window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => document.body.classList.add("page-ready"));
});

const revealItems = document.querySelectorAll(".reveal");

if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
        });
    }, { threshold: .1, rootMargin: "0px 0px -5% 0px" });

    revealItems.forEach((item) => revealObserver.observe(item));
}

document.querySelectorAll('a[href]').forEach((link) => {
    link.addEventListener("click", (event) => {
        if (reducedMotion || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.target === "_blank" || link.hasAttribute("download")) return;

        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin || url.protocol === "mailto:" || url.protocol === "tel:") return;
        if (url.pathname === window.location.pathname && url.hash) return;

        event.preventDefault();
        document.body.classList.add("is-leaving");
        window.setTimeout(() => {
            window.location.href = url.href;
        }, 390);
    });
});

window.addEventListener("pageshow", () => {
    document.body.classList.remove("is-leaving");
    document.body.classList.add("page-ready");
});
