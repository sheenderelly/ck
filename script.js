document.addEventListener('DOMContentLoaded', () => {
    // Kana Maps
    const kanaMap = {
        'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
        'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
        'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
        'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
        'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
        'ｳﾞ': 'ヴ', 'ﾜﾞ': 'ヷ', 'ｦﾞ': 'ヺ',
        'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
        'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
        'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
        'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
        'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
        'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
        'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
        'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
        'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
        'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
        'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
        'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
        '｡': '。', '､': '、', 'ｰ': 'ー', '｢': '「', '｣': '」', '･': '・'
    };

    const revKanaMap = Object.keys(kanaMap).reduce((acc, key) => {
        acc[kanaMap[key]] = key;
        return acc;
    }, {});

    const regKana = new RegExp(Object.keys(kanaMap).sort((a,b) => b.length - a.length).join('|'), 'g');
    const regRevKana = new RegExp(Object.keys(revKanaMap).join('|'), 'g');

    // DOM Elements - Menus
    const textToolsMenu = document.getElementById('text-tools-menu');
    const salesforceToolsMenu = document.getElementById('salesforce-tools-menu');
    const nihonToolsMenu = document.getElementById('nihon-tools-menu');
    const themesView = document.getElementById('themes-view');
    // Default starting menu
    let currentMenu = textToolsMenu;

    // Tab nav
    const navItems = document.querySelectorAll('.tab-btn');

    // Text Tool Views & Elements
    const changeCaseView = document.getElementById('change-case-view');
    const changeCaseCard = document.querySelector('[data-tool="change-case"]');
    const caseInput = document.getElementById('case-input');
    const btnUppercase = document.getElementById('btn-uppercase');
    const btnLowercase = document.getElementById('btn-lowercase');
    const btnSentencecase = document.getElementById('btn-sentencecase');

    const kanaWidthView = document.getElementById('kana-width-view');
    const kanaWidthCard = document.querySelector('[data-tool="kana-width-converter"]');
    const kanaInput = document.getElementById('kana-input');
    const btnToFullWidth = document.getElementById('btn-to-full-width');
    const btnToHalfWidth = document.getElementById('btn-to-half-width');

    // Number Tool Views & Elements
    const phoneFormatterView = document.getElementById('phone-formatter-view');
    const phoneFormatterCard = document.querySelector('[data-tool="phone-formatter"]');
    const phoneInput = document.getElementById('phone-input');
    const countrySelect = document.getElementById('country-select');
    const toggleCountryCode = document.getElementById('toggle-country-code');
    const toggleHyphens = document.getElementById('toggle-hyphens');
    const toggleSpaces = document.getElementById('toggle-spaces');
    const phoneOutput = document.getElementById('phone-output');
    const btnCopyPhone = document.getElementById('btn-copy-phone');

    // Back Buttons
    const backBtns = document.querySelectorAll('.back-btn');

    // Phone format state
    let phoneState = {
        hasCode: false,
        hasHyphen: false,
        hasSpace: false
    };


    /**
     * Navigation helper to show a specific view and hide all others
     */
    function showView(viewElement) {
        if (!viewElement) return;
        
        // Hide all views and menus
        document.querySelectorAll('.tools-menu, .tool-view').forEach(el => {
            el.classList.remove('view-active');
            el.classList.add('view-hidden');
        });
        
        // Show target view
        viewElement.classList.remove('view-hidden');
        viewElement.classList.add('view-active');
    }

    // Tab Category Switcher
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const category = item.dataset.category;
            if (category === 'text') {
                currentMenu = textToolsMenu;
            } else if (category === 'salesforce') {
                currentMenu = salesforceToolsMenu;
            } else if (category === 'nihon') {
                currentMenu = nihonToolsMenu;
            } else if (category === 'themes') {
                currentMenu = themesView;
                initThemes();
            }

            showView(currentMenu);
        });
    });

    // Tool Card Click Listeners (Go to specific tool view)
    if (changeCaseCard) {
        changeCaseCard.addEventListener('click', () => {
            showView(changeCaseView);
            if (caseInput) caseInput.focus();
        });
    }

    if (kanaWidthCard) {
        kanaWidthCard.addEventListener('click', () => {
            showView(kanaWidthView);
            if (kanaInput) kanaInput.focus();
        });
    }

    if (phoneFormatterCard) {
        phoneFormatterCard.addEventListener('click', () => {
            showView(phoneFormatterView);
            if (phoneInput) phoneInput.focus();
        });
    }

    // Japan: Social Insurance
    const socialInsuranceCard = document.querySelector('[data-tool="social-insurance"]');
    const socialInsuranceView = document.getElementById('social-insurance-view');
    if (socialInsuranceCard) {
        socialInsuranceCard.addEventListener('click', () => {
            showView(socialInsuranceView);
            initSocialInsurance();
        });
    }

    // Salesforce: Create Icons
    const createIconsCard = document.querySelector('[data-tool="create-icons"]');
    const createIconsView = document.getElementById('create-icons-view');
    if (createIconsCard) {
        createIconsCard.addEventListener('click', () => {
            showView(createIconsView);
            initIconConverter();
        });
    }

    // Universal Back Button logic
    backBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            showView(currentMenu);
        });
    });

    // --- Tool Logics ---

    // 1. Change Case Tool
    if (btnUppercase) {
        btnUppercase.addEventListener('click', () => {
            if (caseInput) caseInput.value = caseInput.value.toUpperCase();
        });
    }
    if (btnLowercase) {
        btnLowercase.addEventListener('click', () => {
            if (caseInput) caseInput.value = caseInput.value.toLowerCase();
        });
    }
    if (btnSentencecase) {
        btnSentencecase.addEventListener('click', () => {
            if (caseInput) {
                caseInput.value = caseInput.value.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, c => c.toUpperCase());
            }
        });
    }

    // 2. Kana Width Tool
    if (btnToFullWidth) {
        btnToFullWidth.addEventListener('click', () => {
            const text = kanaInput.value;
            if (text) {
                let result = text.replace(/[!-~]/g, c => String.fromCharCode(c.charCodeAt(0) + 0xFEE0)).replace(/ /g, '\u3000');
                kanaInput.value = result.replace(regKana, match => kanaMap[match]);
            }
        });
    }
    if (btnToHalfWidth) {
        btnToHalfWidth.addEventListener('click', () => {
            const text = kanaInput.value;
            if (text) {
                let result = text.replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/\u3000/g, ' ');
                kanaInput.value = result.replace(regRevKana, match => revKanaMap[match]);
            }
        });
    }

    // 3. Phone Formatter Tool
    function formatSingleNumber(num, country) {
        let clean = num.replace(/[\s-]/g, '');
        if (!clean) return '';
        const { hasCode, hasHyphen, hasSpace } = phoneState;
        let prefix = '';
        let separator = hasHyphen ? '-' : (hasSpace ? ' ' : '');
        if (country === 'JP') {
            if (hasCode && clean.startsWith('0')) clean = clean.substring(1);
            if (hasHyphen || hasSpace) {
                if (hasCode && clean.length === 10) clean = clean.replace(/(\d{2})(\d{4})(\d{4})/, `$1${separator}$2${separator}$3`);
                else if (!hasCode && clean.length === 11) clean = clean.replace(/(\d{3})(\d{4})(\d{4})/, `$1${separator}$2${separator}$3`);
                else if (hasCode && clean.length === 9) clean = clean.replace(/(\d{1})(\d{4})(\d{4})/, `$1${separator}$2${separator}$3`);
                else if (!hasCode && clean.length === 10) clean = clean.replace(/(\d{2})(\d{4})(\d{4})/, `$1${separator}$2${separator}$3`);
            }
            if (hasCode) prefix = '+81' + separator;
        } else if (country === 'PH') {
            if (hasCode && clean.startsWith('0')) clean = clean.substring(1);
            if (hasHyphen || hasSpace) {
                if (hasCode && clean.length === 10) clean = clean.replace(/(\d{3})(\d{3})(\d{4})/, `$1${separator}$2${separator}$3`);
                else if (!hasCode && clean.length === 11) clean = clean.replace(/(\d{4})(\d{3})(\d{4})/, `$1${separator}$2${separator}$3`);
            }
            if (hasCode) prefix = '+63' + separator;
        }
        return prefix + clean;
    }

    function updatePhoneFormat() {
        if (!phoneInput || !phoneOutput) return;
        const rawText = phoneInput.value;
        const country = countrySelect.value;
        if (!rawText.trim()) { phoneOutput.value = ''; return; }
        phoneOutput.value = rawText.split('\n').map(line => formatSingleNumber(line, country)).join('\n');
    }

    [toggleCountryCode, toggleHyphens, toggleSpaces].forEach(toggle => {
        if (!toggle) return;
        toggle.addEventListener('click', (e) => {
            const btn = e.target;
            btn.classList.toggle('active');
            if (btn === toggleCountryCode) phoneState.hasCode = btn.classList.contains('active');
            if (btn === toggleHyphens) {
                phoneState.hasHyphen = btn.classList.contains('active');
                if (phoneState.hasHyphen) { phoneState.hasSpace = false; toggleSpaces.classList.remove('active'); }
            }
            if (btn === toggleSpaces) {
                phoneState.hasSpace = btn.classList.contains('active');
                if (phoneState.hasSpace) { phoneState.hasHyphen = false; toggleHyphens.classList.remove('active'); }
            }
            updatePhoneFormat();
        });
    });

    [phoneInput, countrySelect].forEach(el => {
        if (el) {
            el.addEventListener('input', updatePhoneFormat);
            el.addEventListener('change', updatePhoneFormat);
        }
    });

    if (btnCopyPhone) {
        btnCopyPhone.addEventListener('click', () => {
            const textToCopy = phoneOutput.value;
            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = btnCopyPhone.textContent;
                    btnCopyPhone.textContent = 'Copied!';
                    setTimeout(() => { btnCopyPhone.textContent = originalText; }, 2000);
                });
            }
        });
    }

    // 5. Social Insurance — Santei Kiso Todoke Bracket Tracker
    const SIT_BRACKETS = [
        { amount: 58000,  min: 0 },      { amount: 68000,  min: 63000 },
        { amount: 78000,  min: 73000 },  { amount: 88000,  min: 83000 },
        { amount: 98000,  min: 93000 },  { amount: 104000, min: 101000 },
        { amount: 110000, min: 107000 }, { amount: 118000, min: 114000 },
        { amount: 126000, min: 122000 }, { amount: 134000, min: 130000 },
        { amount: 142000, min: 138000 }, { amount: 150000, min: 146000 },
        { amount: 160000, min: 155000 }, { amount: 170000, min: 165000 },
        { amount: 180000, min: 175000 }, { amount: 190000, min: 185000 },
        { amount: 200000, min: 195000 }, { amount: 220000, min: 210000 },
        { amount: 240000, min: 230000 }, { amount: 260000, min: 250000 },
        { amount: 280000, min: 270000 }, { amount: 300000, min: 290000 },
        { amount: 320000, min: 310000 }, { amount: 340000, min: 330000 },
        { amount: 360000, min: 350000 }, { amount: 380000, min: 370000 },
        { amount: 410000, min: 395000 }, { amount: 440000, min: 425000 },
        { amount: 470000, min: 455000 }, { amount: 500000, min: 485000 },
        { amount: 530000, min: 515000 }, { amount: 560000, min: 545000 },
        { amount: 590000, min: 575000 }, { amount: 620000, min: 605000 },
        { amount: 650000, min: 635000 },
    ];
    const SIT_HEALTH_RATE = 0.0499;  // Tokyo 2024 employee share (9.98% / 2)
    const SIT_PENSION_RATE = 0.0915; // employee share (18.3% / 2)
    const SIT_PENSION_CAP = 650000;

    let sitReady = false;
    let sitModes = ['total', 'total', 'total'];

    function sitFindBracket(avg) {
        let b = SIT_BRACKETS[0];
        for (const br of SIT_BRACKETS) { if (avg >= br.min) b = br; else break; }
        return b;
    }
    function sitDeduction(bracketAmount) {
        const h = bracketAmount * SIT_HEALTH_RATE;
        const p = Math.min(bracketAmount, SIT_PENSION_CAP) * SIT_PENSION_RATE;
        return h + p;
    }
    function sitFmt(n) { return '¥' + Math.round(n).toLocaleString('en-US'); }
    function sitFmtH(n) { return (Math.round(n * 10) / 10).toFixed(1) + 'h'; }

    function initSocialInsurance() {
        if (sitReady) return;
        sitReady = true;

        const backBtn = document.getElementById('back-to-menu-btn-si');
        if (backBtn) backBtn.addEventListener('click', () => showView(currentMenu));

        document.querySelectorAll('.sit-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => sitSetMode(parseInt(btn.dataset.month), btn.dataset.mode));
        });
        ['sit-base', 'sit-ot-rate', 'sit-current-bracket'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => { sitSyncBase(); sitUpdate(); });
        });
        for (let i = 0; i < 3; i++) {
            document.getElementById(`sit-gross-${i}`)?.addEventListener('input', sitUpdate);
            document.getElementById(`sit-ot-${i}`)?.addEventListener('input', sitUpdate);
            document.getElementById(`sit-locked-${i}`)?.addEventListener('change', sitUpdate);
        }
        sitSyncBase();
        sitUpdate();
    }

    function sitSetMode(month, mode) {
        sitModes[month] = mode;
        document.querySelectorAll(`.sit-mode-btn[data-month="${month}"]`).forEach(b =>
            b.classList.toggle('active', b.dataset.mode === mode)
        );
        document.getElementById(`sit-total-entry-${month}`).classList.toggle('view-hidden', mode !== 'total');
        document.getElementById(`sit-hours-entry-${month}`).classList.toggle('view-hidden', mode !== 'hours');
        sitUpdate();
    }

    function sitSyncBase() {
        const base = parseFloat(document.getElementById('sit-base')?.value) || 285000;
        document.querySelectorAll('.sit-base-echo').forEach(el => { el.value = base; });
    }

    function sitGetGross(i) {
        const base = parseFloat(document.getElementById('sit-base')?.value) || 285000;
        const otRate = parseFloat(document.getElementById('sit-ot-rate')?.value) || 2224;
        if (sitModes[i] === 'hours') {
            const hours = parseFloat(document.getElementById(`sit-ot-${i}`)?.value) || 0;
            return base + hours * otRate;
        }
        const v = parseFloat(document.getElementById(`sit-gross-${i}`)?.value);
        return isNaN(v) ? base : v;
    }

    function sitIsAdjustable(i) {
        const locked = document.getElementById(`sit-locked-${i}`)?.checked;
        return sitModes[i] === 'hours' && !locked;
    }

    function sitUpdate() {
        const base = parseFloat(document.getElementById('sit-base')?.value) || 285000;
        const otRate = parseFloat(document.getElementById('sit-ot-rate')?.value) || 2224;
        const currentBracketAmt = parseFloat(document.getElementById('sit-current-bracket')?.value) || 260000;

        // Update month footer totals + locked styling
        for (let i = 0; i < 3; i++) {
            const gross = sitGetGross(i);
            const el = document.getElementById(`sit-mg-${i}`);
            if (el) {
                const isManualEmpty = sitModes[i] === 'total' &&
                    (document.getElementById(`sit-gross-${i}`)?.value === '');
                el.textContent = sitFmt(gross) + (isManualEmpty ? ' (est.)' : '');
            }
            const locked = document.getElementById(`sit-locked-${i}`)?.checked;
            const card = document.getElementById(`sit-month-${i}`);
            if (card) {
                card.classList.toggle('sit-locked', !!locked);
                card.classList.toggle('sit-unlocked', !locked);
            }
        }

        const grosses = [0, 1, 2].map(i => sitGetGross(i));
        const avg = grosses.reduce((a, b) => a + b, 0) / 3;
        const projBracket = sitFindBracket(avg);
        const currBracket = sitFindBracket(currentBracketAmt);
        const currDed = sitDeduction(currBracket.amount);

        // Status badge
        const projIdx = SIT_BRACKETS.findIndex(b => b.amount === projBracket.amount);
        const currIdx = SIT_BRACKETS.findIndex(b => b.amount === currBracket.amount);
        const nextBracket = projIdx + 1 < SIT_BRACKETS.length ? SIT_BRACKETS[projIdx + 1] : null;
        const distToNext = nextBracket ? nextBracket.min - avg : Infinity;

        let statusLabel, statusClass;
        if (projBracket.amount > currBracket.amount) {
            statusLabel = distToNext < 15000 ? '⚠ Near next bracket too' : '↑ Higher bracket projected';
            statusClass = 'sit-badge-red';
        } else if (projBracket.amount < currBracket.amount) {
            statusLabel = '↓ Lower bracket projected';
            statusClass = 'sit-badge-green';
        } else {
            statusLabel = distToNext < 15000 ? '⚠ Near bracket limit' : '✓ Staying in current bracket';
            statusClass = distToNext < 15000 ? 'sit-badge-warn' : 'sit-badge-green';
        }

        // Budget for adjustable months
        const adjIdx = [0, 1, 2].filter(i => sitIsAdjustable(i));
        const fixedSum = [0, 1, 2].filter(i => !sitIsAdjustable(i)).reduce((s, i) => s + sitGetGross(i), 0);
        const adjBaseSum = base * adjIdx.length;

        const thresholds = [
            { label: 'Stay in ¥260k bracket', maxAvg: 270000 },
            { label: 'Stay in ¥280k bracket', maxAvg: 290000 },
            { label: 'Stay in ¥300k bracket', maxAvg: 310000 },
            { label: 'Stay in ¥320k bracket', maxAvg: 330000 },
        ];
        const budgets = thresholds.map(t => {
            const otBudget = t.maxAvg * 3 - fixedSum - adjBaseSum;
            const totalH = adjIdx.length > 0 ? otBudget / otRate : null;
            const perMonthH = totalH !== null && adjIdx.length > 0 ? totalH / adjIdx.length : null;
            return { ...t, totalH, perMonthH, possible: adjIdx.length > 0, exceeded: totalH !== null && totalH < 0 };
        });

        // Impact bracket range: show 2 below current and 4 above projected
        const startIdx = Math.max(0, currIdx - 1);
        const endIdx = Math.min(SIT_BRACKETS.length - 1, Math.max(projIdx + 3, currIdx + 4));
        const impactBrackets = SIT_BRACKETS.slice(startIdx, endIdx + 1);

        // Bracket bar
        const barMin = Math.max(0, (currBracket.min || 0) - 20000);
        const barMax = Math.max(projBracket.amount + 80000, currBracket.amount + 100000);
        const barRange = barMax - barMin;
        const avgPct = Math.max(0, Math.min(98, ((avg - barMin) / barRange) * 100)).toFixed(1);
        const safeEdgePct = Math.max(0, Math.min(100, ((currBracket.min + (nextBracket ? nextBracket.min - currBracket.min : 20000) - barMin) / barRange) * 100)).toFixed(1);

        // Tick marks for bracket boundaries
        const ticks = SIT_BRACKETS
            .filter(b => b.min > barMin && b.min < barMax)
            .map(b => {
                const pct = ((b.min - barMin) / barRange * 100).toFixed(1);
                const isTarget = b.amount === currBracket.amount || (nextBracket && b.min === nextBracket.min);
                return `<div class="sit-tick${isTarget ? ' sit-tick-key' : ''}" style="left:${pct}%">
                    <div class="sit-tick-line"></div>
                    <div class="sit-tick-label">${(b.min/1000).toFixed(0)}k</div>
                </div>`;
            }).join('');

        // Budget rows HTML
        const budgetRows = budgets.map(bud => {
            const alreadyMet = avg < bud.maxAvg;
            return `<tr>
                <td class="text-secondary">${bud.label}</td>
                <td class="sit-td-num text-muted">avg &lt; ${sitFmt(bud.maxAvg)}</td>
                <td class="sit-td-num">${!bud.possible
                    ? '<span class="text-muted">Switch a month to "From Hours"</span>'
                    : bud.exceeded
                        ? '<span style="color:var(--error)">Already exceeded — 0 OT won\'t help</span>'
                        : `<span style="color:var(--success)">${sitFmtH(bud.totalH)} total · ${sitFmtH(bud.perMonthH)}/mo</span>`
                }</td>
            </tr>`;
        }).join('');

        // Impact rows HTML
        const impactRows = impactBrackets.map(b => {
            const ded = sitDeduction(b.amount);
            const delta = ded - currDed;
            const isCurr = b.amount === currBracket.amount;
            const isProj = b.amount === projBracket.amount;
            const rowClass = isProj ? 'sit-impact-proj' : isCurr ? 'sit-impact-curr' : '';
            const tag = isProj ? ' ← projected' : isCurr ? ' ← current' : '';
            const nxt = SIT_BRACKETS[SIT_BRACKETS.findIndex(x => x.amount === b.amount) + 1];
            return `<tr class="${rowClass}">
                <td>${sitFmt(b.amount)}<span class="text-muted" style="font-size:10px;">${tag}</span></td>
                <td class="sit-td-num text-muted">${sitFmt(b.min)}${nxt ? '–' + sitFmt(nxt.min) : '+'}</td>
                <td class="sit-td-num">${sitFmt(ded)}</td>
                <td class="sit-td-num ${delta > 0 ? 'sit-delta-up' : delta < 0 ? 'sit-delta-dn' : ''}">${delta === 0 ? '—' : (delta > 0 ? '+' : '') + sitFmt(delta)}</td>
            </tr>`;
        }).join('');

        const dashboard = document.getElementById('sit-dashboard');
        if (!dashboard) return;
        dashboard.innerHTML = `
            <div class="sit-avg-row">
                <div>
                    <div class="sit-avg-label">3-Month Average (Apr + May + Jun) ÷ 3</div>
                    <div class="sit-avg-num">${sitFmt(avg)}</div>
                    <div class="text-muted" style="font-size:11px;margin-top:4px;">
                        ${sitFmt(grosses[0])} + ${sitFmt(grosses[1])} + ${sitFmt(grosses[2])} = ${sitFmt(grosses.reduce((a,b)=>a+b,0))}
                    </div>
                </div>
                <span class="sit-badge ${statusClass}">${statusLabel}</span>
            </div>

            <div class="sit-bar-wrap">
                <div class="sit-bar-track">
                    <div class="sit-bar-safe" style="width:${safeEdgePct}%"></div>
                    ${ticks}
                    <div class="sit-bar-marker" style="left:${avgPct}%">
                        <div class="sit-bar-dot"></div>
                        <div class="sit-bar-val">${sitFmt(Math.round(avg))}</div>
                    </div>
                </div>
                <div class="sit-bar-legend">
                    <span><span class="sit-legend-safe"></span> Current bracket safe zone</span>
                    <span class="text-muted" style="font-size:10px;">Brackets: ${SIT_BRACKETS.filter(b=>b.min>barMin&&b.min<barMax).map(b=>(b.min/1000).toFixed(0)+'k').join(' · ')}</span>
                </div>
            </div>

            <div class="sit-panels-2">
                <div>
                    <div class="panel-title" style="margin-bottom:.75rem;"><i data-lucide="clock"></i> OT Budget to Stay in Bracket</div>
                    ${adjIdx.length === 0
                        ? '<p class="text-muted" style="font-size:12px;">Switch at least one month to "From Hours" mode and uncheck Locked to see OT budgets.</p>'
                        : `<div style="overflow-x:auto;"><table class="sit-table">
                            <thead><tr><th>Target</th><th>Max Avg</th><th>Remaining OT Hours</th></tr></thead>
                            <tbody>${budgetRows}</tbody>
                        </table></div>`
                    }
                </div>
                <div>
                    <div class="panel-title" style="margin-bottom:.75rem;"><i data-lucide="trending-up"></i> Bracket Impact (effective September)</div>
                    <div style="overflow-x:auto;"><table class="sit-table">
                        <thead><tr><th>標準報酬月額</th><th>Avg Range</th><th>Monthly Deduction</th><th>vs Current</th></tr></thead>
                        <tbody>${impactRows}</tbody>
                    </table></div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    // 4. Salesforce Icon Converter
    let iconConverterReady = false;
    let sfCurrentColor = '#0070D2';
    let sfRenderTimer = null;
    let sfFlatSize = 60;

    const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0070D2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
  <line x1="9" y1="13" x2="15" y2="13"/>
  <line x1="9" y1="17" x2="15" y2="17"/>
</svg>`;

    function initIconConverter() {
        if (iconConverterReady) return;
        iconConverterReady = true;

        const svgInput = document.getElementById('svgInput');
        const hexInput = document.getElementById('hexInput');
        const hexPreview = document.getElementById('hexPreview');
        const iconName = document.getElementById('iconName');
        const iconSize = document.getElementById('iconSize');

        hexInput.value = sfCurrentColor;
        hexPreview.style.background = sfCurrentColor;
        sfFlatSize = clampIconSize(iconSize.value);

        iconSize.addEventListener('input', () => {
            sfFlatSize = clampIconSize(iconSize.value);
            document.querySelectorAll('.sf-size-echo').forEach(el => { el.textContent = sfFlatSize; });
            const flat = document.getElementById('canvasFlat');
            flat.width = sfFlatSize;
            flat.height = sfFlatSize;
            updateIconSnippets();
            renderAllIcons();
        });

        hexInput.addEventListener('input', (e) => {
            let v = e.target.value.trim().toUpperCase();
            if (v && !v.startsWith('#')) v = '#' + v;
            if (/^#[0-9A-F]{6}$/.test(v)) {
                sfCurrentColor = v;
                hexPreview.style.background = v;
                renderAllIcons();
            }
        });

        svgInput.value = SAMPLE_SVG;
        svgInput.addEventListener('input', () => {
            clearTimeout(sfRenderTimer);
            sfRenderTimer = setTimeout(renderAllIcons, 250);
        });

        iconName.addEventListener('input', updateIconSnippets);

        document.getElementById('btn-render-icons').addEventListener('click', renderAllIcons);
        document.getElementById('btn-download-all-icons').addEventListener('click', downloadAllIcons);
        document.querySelectorAll('[data-download]').forEach(btn => {
            btn.addEventListener('click', () => {
                const canvasId = btn.dataset.download;
                const suffix = canvasId === 'canvasFlat'
                    ? `${sfFlatSize}x${sfFlatSize}`
                    : btn.dataset.suffix;
                downloadIconCanvas(canvasId, suffix);
            });
        });
        document.querySelectorAll('[data-copy-target]').forEach(btn => {
            btn.addEventListener('click', () => copySnippet(btn));
        });

        updateIconSnippets();
        renderAllIcons();
    }

    function sanitizeIconName(raw) {
        let name = (raw || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
        if (!name || /^\d/.test(name)) name = 'my_icon';
        return name;
    }

    function toCamel(snake) {
        return snake.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    }

    function updateIconSnippets() {
        const raw = document.getElementById('iconName').value;
        const name = sanitizeIconName(raw);
        const camel = toCamel(name);
        const constName = name.toUpperCase();
        const size = sfFlatSize;

        document.querySelectorAll('.sf-name-echo').forEach(el => { el.textContent = name; });
        document.querySelectorAll('.sf-size-echo').forEach(el => { el.textContent = size; });

        const snippets = {
            'snippet-lwc-html':
`<template>
  <img src={iconUrl} alt="${name}" width="${size}" height="${size}" />
</template>`,
            'snippet-lwc-js':
`import { LightningElement } from 'lwc';
import ${constName} from '@salesforce/resourceUrl/${name}';

export default class ${camel.charAt(0).toUpperCase() + camel.slice(1)} extends LightningElement {
  iconUrl = ${constName};
}`,
            'snippet-vf':
`<apex:image url="{!$Resource.${name}}" alt="${name}" width="${size}" height="${size}" />`,
            'snippet-css':
`.${name.replace(/_/g, '-')} {
  background-image: url('/resource/${name}');
  background-size: contain;
  background-repeat: no-repeat;
  width: ${size}px;
  height: ${size}px;
}`,
            'snippet-slds':
`<span class="slds-icon_container slds-icon-standard-custom" title="${name}">
  <img src={iconUrl} alt="${name}" width="${size}" height="${size}" />
  <span class="slds-assistive-text">${name}</span>
</span>`,
        };

        Object.entries(snippets).forEach(([id, code]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = code;
        });
    }

    function copySnippet(btn) {
        const target = document.getElementById(btn.dataset.copyTarget);
        if (!target) return;
        navigator.clipboard.writeText(target.textContent).then(() => {
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = orig; }, 1500);
        });
    }

    function normalizeSvg(svgText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const err = doc.querySelector('parsererror');
        if (err) throw new Error('Invalid SVG: ' + err.textContent.split('\n')[0]);
        const svg = doc.documentElement;
        if (svg.tagName.toLowerCase() !== 'svg') throw new Error('Root element must be <svg>');
        if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        if (!svg.hasAttribute('width') || !svg.hasAttribute('height')) {
            if (svg.hasAttribute('viewBox')) {
                const vb = svg.getAttribute('viewBox').split(/[\s,]+/);
                if (vb.length === 4) {
                    svg.setAttribute('width', vb[2]);
                    svg.setAttribute('height', vb[3]);
                }
            } else {
                svg.setAttribute('width', '24');
                svg.setAttribute('height', '24');
            }
        }
        return new XMLSerializer().serializeToString(svg);
    }

    function svgToImage(svgText) {
        return new Promise((resolve, reject) => {
            const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load SVG as image')); };
            img.src = url;
        });
    }

    function roundRectPath(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function renderLegacyIcon(canvasId, img, size) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
    }

    function renderSldsIcon(canvasId, img, size, color) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, size, size);

        const radius = Math.round(size * 0.15);
        ctx.fillStyle = color;
        roundRectPath(ctx, 0, 0, size, size, radius);
        ctx.fill();

        const glyphSize = Math.round(size * 0.60);
        const glyphX = Math.round((size - glyphSize) / 2);
        const glyphY = Math.round((size - glyphSize) / 2);

        const off = document.createElement('canvas');
        off.width = glyphSize;
        off.height = glyphSize;
        const offCtx = off.getContext('2d');
        offCtx.drawImage(img, 0, 0, glyphSize, glyphSize);
        offCtx.globalCompositeOperation = 'source-in';
        offCtx.fillStyle = '#ffffff';
        offCtx.fillRect(0, 0, glyphSize, glyphSize);

        ctx.drawImage(off, glyphX, glyphY);
    }

    async function renderAllIcons() {
        const errEl = document.getElementById('svgError');
        if (!errEl) return;
        errEl.style.display = 'none';
        try {
            const raw = document.getElementById('svgInput').value;
            if (!raw.trim()) return;
            const normalized = normalizeSvg(raw);
            const img = await svgToImage(normalized);
            const flat = document.getElementById('canvasFlat');
            flat.width = sfFlatSize;
            flat.height = sfFlatSize;
            renderLegacyIcon('canvasFlat', img, sfFlatSize);
            renderSldsIcon('canvasSlds', img, 480, sfCurrentColor);
        } catch (e) {
            errEl.textContent = e.message;
            errEl.style.display = 'block';
        }
    }

    function clampIconSize(v) {
        const n = parseInt(v, 10);
        if (isNaN(n)) return 60;
        return Math.max(16, Math.min(480, n));
    }

    // Lucide icons
    lucide.createIcons();

    // Theme switcher
    const root = document.documentElement;
    const btnDark = document.getElementById('theme-dark');
    const btnLight = document.getElementById('theme-light');
    let themesReady = false;

    function setTheme(mode) {
        root.setAttribute('data-theme', mode);
        btnDark.classList.toggle('active', mode === 'dark');
        btnLight.classList.toggle('active', mode === 'light');
        localStorage.setItem('sheen-theme', mode);
        if (themesReady) syncAllThemePresets();
    }

    if(btnDark) btnDark.addEventListener('click', () => setTheme('dark'));
    if(btnLight) btnLight.addEventListener('click', () => setTheme('light'));

    const saved = localStorage.getItem('sheen-theme');
    if (saved) setTheme(saved);

    function downloadAllIcons() {
        downloadIconCanvas('canvasFlat', `${sfFlatSize}x${sfFlatSize}`);
        setTimeout(() => downloadIconCanvas('canvasSlds', 'slds'), 150);
    }

    function downloadIconCanvas(canvasId, suffix) {
        const canvas = document.getElementById(canvasId);
        const name = (document.getElementById('iconName').value || 'icon').trim().replace(/\s+/g, '_');
        canvas.toBlob(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name}_${suffix}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/png');
    }

    // 6. Themes View
    const varMap = {
        '--m-bg':        '--bg-main',
        '--m-surface':   '--bg-card',
        '--m-text':      '--text-primary',
        '--m-secondary': '--text-secondary',
        '--m-accent':    '--accent',
    };

    const themePresets = {
        sheen: {
            dark:  { '--m-bg': '#1A1C18', '--m-surface': '#242821', '--m-text': '#F1F3EC', '--m-secondary': '#A9BA9D', '--m-accent': '#D4E157' },
            light: { '--m-bg': '#F7F5EC', '--m-surface': '#FFFFFF', '--m-text': '#1A1C18', '--m-secondary': '#4A5441', '--m-accent': '#6B8E23' },
        },
        synchron: {
            dark:  { '--m-bg': '#0F1117', '--m-surface': '#1A1D28', '--m-text': '#E4E8F1', '--m-secondary': '#8892A8', '--m-accent': '#6C9FFF' },
            light: { '--m-bg': '#F0F2F8', '--m-surface': '#FFFFFF', '--m-text': '#1A1D28', '--m-secondary': '#5A6478', '--m-accent': '#2563EB' },
        },
        salesforce: {
            dark:  { '--m-bg': '#1B2431', '--m-surface': '#22334A', '--m-text': '#E8ECF1', '--m-secondary': '#8B99A8', '--m-accent': '#0070D2' },
            light: { '--m-bg': '#F3F3F3', '--m-surface': '#FFFFFF', '--m-text': '#181818', '--m-secondary': '#706E6B', '--m-accent': '#0070D2' },
        },
    };

    function getPickerValues(themeName) {
        const page = document.getElementById('theme-page-' + themeName);
        if (!page) return {};
        const vals = {};
        page.querySelectorAll('.color-picker-group input[type="color"]').forEach(p => {
            vals[p.dataset.mockVar] = p.value.toUpperCase();
        });
        return vals;
    }

    function buildThemeCSS(themeName) {
        const mode = getAppMode();
        const otherMode = mode === 'dark' ? 'light' : 'dark';

        const activeColors = getPickerValues(themeName);
        const otherColors = themePresets[themeName]?.[otherMode] || {};

        function colorBlock(colors) {
            return Object.entries(colors).map(([mockVar, hex]) => {
                const cssVar = varMap[mockVar] || mockVar;
                return `    ${cssVar}: ${hex};`;
            }).join('\n');
        }

        const darkColors  = mode === 'dark' ? activeColors : otherColors;
        const lightColors = mode === 'light' ? activeColors : otherColors;

        return `/* ===== ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Theme ===== */
/* Generated from sheen.dev/tools */

/* --- Shared Tokens --- */
:root {
    --font-family: 'Roboto Mono', 'Noto Sans Mono CJK JP', 'Source Han Code JP', monospace;
    --radius-lg: 8px;
    --radius-md: 6px;
    --radius-sm: 4px;
    --shadow-sm: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --spacing-base: 1.5rem;
    --spacing-tight: 1rem;
}

/* --- Dark Mode --- */
:root[data-theme="dark"] {
${colorBlock(darkColors)}
}

/* --- Light Mode --- */
:root[data-theme="light"] {
${colorBlock(lightColors)}
}

/* --- Font Import --- */
/* @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;500;600;700&display=swap'); */
`;
    }

    function getAppMode() {
        return root.getAttribute('data-theme') || 'dark';
    }

    function applyThemePreset(themeName, mode) {
        const preset = themePresets[themeName]?.[mode];
        if (!preset) return;
        const page = document.getElementById('theme-page-' + themeName);
        if (!page) return;
        const mockup = page.querySelector('.theme-mockup');
        page.querySelectorAll('.color-picker-group input[type="color"]').forEach(picker => {
            const cssVar = picker.dataset.mockVar;
            if (preset[cssVar]) {
                picker.value = preset[cssVar].toLowerCase();
                const hexLabel = picker.parentElement.querySelector('.hex-value');
                if (hexLabel) hexLabel.textContent = preset[cssVar];
                if (mockup) mockup.style.setProperty(cssVar, preset[cssVar]);
            }
        });
    }

    function syncAllThemePresets() {
        const mode = getAppMode();
        Object.keys(themePresets).forEach(name => applyThemePreset(name, mode));
    }

    function initThemes() {
        if (themesReady) return;
        themesReady = true;

        const subnavItems = document.querySelectorAll('.themes-subnav-item');
        const themePages = document.querySelectorAll('.theme-page');

        subnavItems.forEach(item => {
            item.addEventListener('click', () => {
                subnavItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');
                const target = item.dataset.themePage;
                themePages.forEach(page => {
                    page.classList.remove('view-active');
                    page.classList.add('view-hidden');
                });
                const targetPage = document.getElementById('theme-page-' + target);
                if (targetPage) {
                    targetPage.classList.remove('view-hidden');
                    targetPage.classList.add('view-active');
                }
            });
        });

        document.querySelectorAll('.color-picker-group input[type="color"]').forEach(picker => {
            picker.addEventListener('input', (e) => {
                const mockVar = e.target.dataset.mockVar;
                const hex = e.target.value.toUpperCase();
                const hexLabel = e.target.parentElement.querySelector('.hex-value');
                if (hexLabel) hexLabel.textContent = hex;
                const mockup = e.target.closest('.theme-page').querySelector('.theme-mockup');
                if (mockup) mockup.style.setProperty(mockVar, hex);
            });
        });

        document.querySelectorAll('.btn-copy-theme').forEach(btn => {
            btn.addEventListener('click', () => {
                const themeName = btn.dataset.theme;
                const css = buildThemeCSS(themeName);
                navigator.clipboard.writeText(css).then(() => {
                    const orig = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = orig; }, 2000);
                });
            });
        });

        syncAllThemePresets();
        if (window.lucide) lucide.createIcons();
    }

});
