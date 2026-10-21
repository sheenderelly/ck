// Hub pages: the theme switch and icons. On the home page script.js does
// this; the hubs don't load it, so they get the same switch here.
(function () {
    const root = document.documentElement;
    const dark = document.getElementById('theme-dark');
    const light = document.getElementById('theme-light');

    function setTheme(mode) {
        root.setAttribute('data-theme', mode);
        dark.classList.toggle('active', mode === 'dark');
        light.classList.toggle('active', mode === 'light');
        try { localStorage.setItem('sheen-theme', mode); } catch (e) { /* private mode */ }
    }

    dark.addEventListener('click', () => setTheme('dark'));
    light.addEventListener('click', () => setTheme('light'));
    setTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

    if (window.lucide) lucide.createIcons();
})();
