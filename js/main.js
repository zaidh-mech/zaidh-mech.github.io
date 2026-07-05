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

const mapTopics = {
    core: {
        kicker: "System / overview",
        title: "One loop, not five separate demos.",
        copy: "The platform continually turns physical measurements into a pose and a map, then feeds that state back into controlled motion.",
        signal: "Sensors → estimate → decision → motors"
    },
    sensing: {
        kicker: "01 / physical input",
        title: "Measure the room and the robot.",
        copy: "A swept VL53L8CX captures range, the MPU6050 tracks rotation, and wheel encoders measure translation before the data enters the estimator.",
        signal: "Range + yaw + wheel ticks → time-aligned samples"
    },
    localization: {
        kicker: "02 / state estimation",
        title: "Keep a usable pose while moving.",
        copy: "Encoder motion and inertial yaw are fused into the robot pose, giving every accepted range ray a position and heading in the world frame.",
        signal: "Odometry + IMU → x, y, θ"
    },
    mapping: {
        kicker: "03 / environment model",
        title: "Turn range rays into spatial evidence.",
        copy: "Validated measurements are projected from the estimated pose into an occupancy grid for simulation, comparison, and live map construction.",
        signal: "Pose + accepted rays → occupancy grid"
    },
    motion: {
        kicker: "04 / controlled output",
        title: "Move without starving the sensing loop.",
        copy: "Non-blocking scan motion, motor ramping, and closed-loop commands keep actuation predictable while sensing and telemetry continue in real time.",
        signal: "Motion target + feedback → motor commands"
    },
    hardware: {
        kicker: "05 / physical platform",
        title: "Make the architecture buildable.",
        copy: "The ESP32 control board, regulated power, motor and sensor interfaces, swept mount, and chassis package the full loop into one robot.",
        signal: "Firmware + PCB + mechanics → integrated platform"
    }
};

const systemMap = document.querySelector("[data-system-map]");
const mapTitle = document.querySelector("[data-map-title]");
const mapKicker = document.querySelector("[data-map-kicker]");
const mapCopy = document.querySelector("[data-map-copy]");
const mapSignal = document.querySelector("[data-map-signal]");

systemMap?.querySelectorAll("[data-map-topic]").forEach((node) => {
    node.addEventListener("click", () => {
        const topicName = node.dataset.mapTopic;
        const topic = mapTopics[topicName];
        if (!topic) return;

        systemMap.querySelectorAll("[data-map-topic]").forEach((item) => {
            const selected = item === node;
            item.classList.toggle("is-active", selected);
            item.setAttribute("aria-pressed", String(selected));
        });

        systemMap.querySelectorAll("[data-route]").forEach((route) => {
            route.classList.toggle("is-active", route.dataset.route === topicName);
        });

        if (mapTitle) mapTitle.textContent = topic.title;
        if (mapKicker) mapKicker.textContent = topic.kicker;
        if (mapCopy) mapCopy.textContent = topic.copy;
        if (mapSignal) mapSignal.textContent = topic.signal;
    });
});

const year = document.querySelector("[data-year]");
if (year) year.textContent = new Date().getFullYear();
