// Landing-page behaviour only: reveal-on-scroll, the mobile menu, the extra
// theme buttons and log out. Tool navigation lives in script.js.
(function () {
    const root = document.documentElement;

    // Reveal sections as they scroll into view, once each.
    const items = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('in');
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
        items.forEach((el) => io.observe(el));
    } else {
        items.forEach((el) => el.classList.add('in'));
    }

    // Mobile menu
    const nav = document.getElementById('site-nav');
    const menuBtn = document.getElementById('menu-btn');
    function setMenu(open) {
        nav.classList.toggle('open', open);
        menuBtn.setAttribute('aria-expanded', String(open));
    }
    menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    nav.querySelectorAll('.nav-drawer a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

    // The navbar switch owns the theme; these buttons just press it, so the
    // saved preference and the Themes tool stay in step.
    const flips = document.querySelectorAll('.theme-flip');
    function labelFlips() {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        flips.forEach((b) => { b.textContent = 'Switch to ' + next; });
    }
    flips.forEach((b) => b.addEventListener('click', () => {
        const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.getElementById('theme-' + next).click();
    }));
    new MutationObserver(labelFlips).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    labelFlips();

    // Log out clears the session cookie, then goes to the login page.
    const logout = document.getElementById('logout-btn');
    if (logout) {
        logout.addEventListener('click', () => {
            fetch('/api/logout', { method: 'POST', credentials: 'same-origin' })
                .catch(() => {})
                .finally(() => { window.location.href = '/login'; });
        });
    }
})();
