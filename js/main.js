const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('[data-year]').forEach((item) => {
    item.textContent = new Date().getFullYear();
});

const updateTime = () => {
    const value = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Colombo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(new Date());
    document.querySelectorAll('[data-time]').forEach((item) => { item.textContent = value; });
};
updateTime();
window.setInterval(updateTime, 30000);

document.querySelectorAll('.project-card video').forEach((video) => {
    if (reducedMotion) return;
    const card = video.closest('.project-card');
    card.addEventListener('mouseenter', () => video.play().catch(() => {}));
    card.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
});
