
// ==========================================
// 5 EFFETS FEUX D'ARTIFICE — réguliers, intenses, rapides, 5 types différents
// ==========================================

// --- 1. FEUX D'ARTIFICE CLASSIQUES RAPIDES (éclatement radial classique, très fréquent) ---
function injectFeuxClassiquesStyles() {
    if (document.getElementById('feux-classiques-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'feux-classiques-inline-style';
    styleTag.textContent = `
        .fw-classique-particle {
            position: fixed;
            width: 5px; height: 5px;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation: fw-classique-burst 1s ease-out forwards;
        }
        @keyframes fw-classique-burst {
            0%   { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectFeuxClassiquesStyles();

let feuxClassiquesIntervalId = null;

function launchFeuxClassiques() {
    const colors = ['#ff5252', '#ffd452', '#52ff8a', '#52c8ff', '#c452ff', '#ff8a52'];
    const originX = 10 + Math.random() * 80;
    const originY = 10 + Math.random() * 50;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = 18;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const distance = 60 + Math.random() * 40;
        const particle = document.createElement('div');
        particle.className = 'fw-classique-particle';
        particle.style.left = `${originX}%`;
        particle.style.top = `${originY}%`;
        particle.style.background = color;
        particle.style.boxShadow = `0 0 6px 2px ${color}`;
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1050);
    }
}

function scheduleNextFeuxClassiques() {
    if (!feuxClassiquesEnabled) return;
    const delay = 500 + Math.random() * 400; // rapide et régulier
    feuxClassiquesIntervalId = setTimeout(() => {
        if (feuxClassiquesEnabled) launchFeuxClassiques();
        scheduleNextFeuxClassiques();
    }, delay);
}

function toggleFeuxClassiquesSetting(checked) {
    feuxClassiquesEnabled = checked;
    localStorage.setItem('feuxClassiquesEnabled', checked ? 'true' : 'false');
    if (feuxClassiquesIntervalId) { clearTimeout(feuxClassiquesIntervalId); feuxClassiquesIntervalId = null; }
    if (checked) scheduleNextFeuxClassiques();
}

function initFeuxClassiquesState() {
    if (feuxClassiquesEnabled) scheduleNextFeuxClassiques();
}

// --- 2. FEUX D'ARTIFICE EN FONTAINE (jaillissent du bas, retombent) ---
function injectFeuxFontaineStyles() {
    if (document.getElementById('feux-fontaine-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'feux-fontaine-inline-style';
    styleTag.textContent = `
        .fw-fontaine-particle {
            position: fixed;
            bottom: 0;
            width: 4px; height: 4px;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation: fw-fontaine-arc 1.3s ease-out forwards;
        }
        @keyframes fw-fontaine-arc {
            0%   { transform: translate(0, 0); opacity: 1; }
            60%  { transform: translate(var(--dx), calc(-1 * var(--h))); opacity: 1; }
            100% { transform: translate(var(--dx), calc(-1 * var(--h))); opacity: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectFeuxFontaineStyles();

let feuxFontaineIntervalId = null;

function launchFeuxFontaine() {
    const colors = ['#ffd452', '#ff8a52', '#52c8ff', '#52ff8a'];
    const originX = 15 + Math.random() * 70;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = 10;

    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'fw-fontaine-particle';
        particle.style.left = `${originX}%`;
        particle.style.background = color;
        particle.style.boxShadow = `0 0 6px 2px ${color}`;
        particle.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}px`);
        particle.style.setProperty('--h', `${140 + Math.random() * 80}px`);
        particle.style.animationDelay = `${Math.random() * 0.15}s`;
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1550);
    }
}

function scheduleNextFeuxFontaine() {
    if (!feuxFontaineEnabled) return;
    const delay = 400 + Math.random() * 350;
    feuxFontaineIntervalId = setTimeout(() => {
        if (feuxFontaineEnabled) launchFeuxFontaine();
        scheduleNextFeuxFontaine();
    }, delay);
}

function toggleFeuxFontaineSetting(checked) {
    feuxFontaineEnabled = checked;
    localStorage.setItem('feuxFontaineEnabled', checked ? 'true' : 'false');
    if (feuxFontaineIntervalId) { clearTimeout(feuxFontaineIntervalId); feuxFontaineIntervalId = null; }
    if (checked) scheduleNextFeuxFontaine();
}

function initFeuxFontaineState() {
    if (feuxFontaineEnabled) scheduleNextFeuxFontaine();
}

// --- "En spirale" a rejoint le gestionnaire de feux d'artifice (bouton 🎆) : voir FIREWORK_RECIPES
//     et fwPatternSpiral() plus bas, ce n'est plus un réglage séparé ici. ---

// --- PÉTARD CLIC-CLAC (réglage indépendant, réutilise le motif "groundPop" du gestionnaire) ---
let petardClicClacEnabled = localStorage.getItem('petardClicClacEnabled') === 'true';
let petardClicClacIntervalId = null;
const PETARD_CLIC_CLAC_DEF = { pattern: 'groundPop', count: 6, size: [3, 3], distance: [15, 25], duration: 350, colors: ['#ffffff', '#ffd452'], minDelay: 350, maxDelay: 600 };

function scheduleNextPetardClicClac() {
    if (!petardClicClacEnabled) return;
    const delay = PETARD_CLIC_CLAC_DEF.minDelay + Math.random() * (PETARD_CLIC_CLAC_DEF.maxDelay - PETARD_CLIC_CLAC_DEF.minDelay);
    petardClicClacIntervalId = setTimeout(() => {
        if (petardClicClacEnabled) {
            playFireworkSoundForPattern(PETARD_CLIC_CLAC_DEF.pattern);
            fwPatternGroundPop(PETARD_CLIC_CLAC_DEF);
        }
        scheduleNextPetardClicClac();
    }, delay);
}

function togglePetardClicClacSetting(checked) {
    petardClicClacEnabled = checked;
    localStorage.setItem('petardClicClacEnabled', checked ? 'true' : 'false');
    if (petardClicClacIntervalId) { clearTimeout(petardClicClacIntervalId); petardClicClacIntervalId = null; }
    if (checked) scheduleNextPetardClicClac();
}

function initPetardClicClacState() {
    if (petardClicClacEnabled) scheduleNextPetardClicClac();
}

// --- 4. FEUX D'ARTIFICE CRÉPITANTS (beaucoup de mini étincelles denses et brèves) ---
function injectFeuxCrepitantsStyles() {
    if (document.getElementById('feux-crepitants-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'feux-crepitants-inline-style';
    styleTag.textContent = `
        .fw-crepitant-particle {
            position: fixed;
            width: 2.5px; height: 2.5px;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation: fw-crepitant-flick 0.45s ease-out forwards;
        }
        @keyframes fw-crepitant-flick {
            0%   { transform: translate(0, 0); opacity: 1; }
            100% { transform: translate(var(--dx), var(--dy)); opacity: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectFeuxCrepitantsStyles();

let feuxCrepitantsIntervalId = null;

function launchFeuxCrepitants() {
    const colors = ['#fff45c', '#ffffff', '#ff8a52'];
    const originX = 10 + Math.random() * 80;
    const originY = 10 + Math.random() * 55;
    const count = 26;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 20; // rayon court : effet dense, pas un grand éclatement
        const color = colors[Math.floor(Math.random() * colors.length)];
        const particle = document.createElement('div');
        particle.className = 'fw-crepitant-particle';
        particle.style.left = `${originX}%`;
        particle.style.top = `${originY}%`;
        particle.style.background = color;
        particle.style.boxShadow = `0 0 4px 1px ${color}`;
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 500);
    }
}

function scheduleNextFeuxCrepitants() {
    if (!feuxCrepitantsEnabled) return;
    const delay = 300 + Math.random() * 250; // très fréquent, effet crépitant continu
    feuxCrepitantsIntervalId = setTimeout(() => {
        if (feuxCrepitantsEnabled) launchFeuxCrepitants();
        scheduleNextFeuxCrepitants();
    }, delay);
}

function toggleFeuxCrepitantsSetting(checked) {
    feuxCrepitantsEnabled = checked;
    localStorage.setItem('feuxCrepitantsEnabled', checked ? 'true' : 'false');
    if (feuxCrepitantsIntervalId) { clearTimeout(feuxCrepitantsIntervalId); feuxCrepitantsIntervalId = null; }
    if (checked) scheduleNextFeuxCrepitants();
}

function initFeuxCrepitantsState() {
    if (feuxCrepitantsEnabled) scheduleNextFeuxCrepitants();
}

// --- 5. FEUX D'ARTIFICE GÉANTS (bien plus gros, plus de particules, toujours fréquents) ---
function injectFeuxGeantsStyles() {
    if (document.getElementById('feux-geants-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'feux-geants-inline-style';
    styleTag.textContent = `
        .fw-geant-particle {
            position: fixed;
            width: 8px; height: 8px;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation: fw-geant-burst 1.4s ease-out forwards;
        }
        @keyframes fw-geant-burst {
            0%   { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--dx), var(--dy)) scale(0.2); opacity: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectFeuxGeantsStyles();

let feuxGeantsIntervalId = null;

function launchFeuxGeants() {
    const colors = ['#ff5252', '#ffd452', '#52ff8a', '#52c8ff', '#c452ff', '#ff8a52'];
    const originX = 15 + Math.random() * 70;
    const originY = 10 + Math.random() * 40;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = 32;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const distance = 110 + Math.random() * 60;
        const particle = document.createElement('div');
        particle.className = 'fw-geant-particle';
        particle.style.left = `${originX}%`;
        particle.style.top = `${originY}%`;
        particle.style.background = color;
        particle.style.boxShadow = `0 0 10px 3px ${color}`;
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1450);
    }
}

function scheduleNextFeuxGeants() {
    if (!feuxGeantsEnabled) return;
    const delay = 900 + Math.random() * 600;
    feuxGeantsIntervalId = setTimeout(() => {
        if (feuxGeantsEnabled) launchFeuxGeants();
        scheduleNextFeuxGeants();
    }, delay);
}

function toggleFeuxGeantsSetting(checked) {
    feuxGeantsEnabled = checked;
    localStorage.setItem('feuxGeantsEnabled', checked ? 'true' : 'false');
    if (feuxGeantsIntervalId) { clearTimeout(feuxGeantsIntervalId); feuxGeantsIntervalId = null; }
    if (checked) scheduleNextFeuxGeants();
}

function initFeuxGeantsState() {
    if (feuxGeantsEnabled) scheduleNextFeuxGeants();
}

// ==========================================
// SPECTRE AUDIO ANIMÉ 2.0
// Même mécanique que le spectre d'origine (initSpectrum) : détecte isCurrentlyPlaying pour
// savoir si c'est en pause ou non, mêmes barres qui montent/descendent en douceur. On y ajoute
// l'orange et le jaune à la palette, et les couleurs défilent en continu (la bande de couleur
// avance de gauche à droite au fil du temps, plutôt que rester fixe par position de barre).
// ==========================================

function injectSpectrum2Styles() {
    if (document.getElementById('spectrum2-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'spectrum2-inline-style';
    styleTag.textContent = `
        #spectrum2-canvas {
            display: none;
            position: fixed;
            left: 0;
            bottom: 0;
            width: 100%;
            height: 60px;
            z-index: 500;
            pointer-events: none;
            background: transparent;
        }
    `;
    document.head.appendChild(styleTag);
}
injectSpectrum2Styles();

function ensureSpectrum2Canvas() {
    let canvas = document.getElementById('spectrum2-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'spectrum2-canvas';
        document.body.appendChild(canvas);
    }
    return canvas;
}

let spectrum2Bars = [];
let spectrum2AnimId = null;
let spectrum2ColorScroll = 0;

function initSpectrum2() {
    const canvas = ensureSpectrum2Canvas();
    const ctx = canvas.getContext('2d');
    const barCount = 48;

    spectrum2Bars = Array.from({ length: barCount }, () => ({
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.035,
        current: 0.04
    }));

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function draw() {
        spectrum2AnimId = requestAnimationFrame(draw);

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        if (!spectrum2Enabled) {
            spectrum2Bars.forEach(bar => { bar.current = 0.04; });
            return;
        }

        // Même détection pause/lecture que le spectre d'origine
        const active = spectrum2Enabled && isCurrentlyPlaying;
        const barWidth = w / spectrum2Bars.length;

        // Les couleurs défilent en continu, indépendamment de la lecture
        spectrum2ColorScroll += 0.6;

        spectrum2Bars.forEach((bar, i) => {
            bar.phase += bar.speed;

            const targetAmplitude = active
                ? (0.25 + 0.75 * Math.abs(Math.sin(bar.phase)))
                : 0.04;
            bar.current += (targetAmplitude - bar.current) * 0.08;

            const barHeight = Math.max(2, bar.current * h);
            // Palette étendue : vert → jaune → orange → bleu → rose (boucle sur 360°),
            // + décalage qui avance dans le temps pour faire défiler la bande de gauche à droite
            const hue = (i / spectrum2Bars.length) * 360 + spectrum2ColorScroll;

            const gradient = ctx.createLinearGradient(0, h, 0, h - barHeight);
            gradient.addColorStop(0, `hsl(${hue}, 90%, 45%)`);
            gradient.addColorStop(1, `hsl(${hue}, 90%, 70%)`);
            ctx.fillStyle = gradient;

            const x = i * barWidth;
            const gap = barWidth * 0.15;
            ctx.fillRect(x + gap, h - barHeight, barWidth - gap * 2, barHeight);
        });
    }
    draw();
}

function toggleSpectrum2Setting(checked) {
    spectrum2Enabled = checked;
    localStorage.setItem('spectrum2Enabled', checked ? 'true' : 'false');
    const canvas = ensureSpectrum2Canvas();
    canvas.style.display = checked ? 'block' : 'none';
    if (checked && !spectrum2AnimId) initSpectrum2();
}

function initSpectrum2State() {
    const canvas = ensureSpectrum2Canvas();
    canvas.style.display = spectrum2Enabled ? 'block' : 'none';
    if (spectrum2Enabled) initSpectrum2();
}

// --- "Saule pleureur" a rejoint le gestionnaire de feux d'artifice (bouton 🎆) : voir
//     FIREWORK_RECIPES et le motif "willow" plus bas, ce n'est plus un réglage séparé ici. ---

// --- 7. FEU D'ARTIFICE "DOUBLE EXPLOSION" (éclatement principal + mini-éclatements secondaires) ---
function injectFeuxDoubleStyles() {
    if (document.getElementById('feux-double-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'feux-double-inline-style';
    styleTag.textContent = `
        .fw-double-particle {
            position: fixed;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation: fw-double-out linear forwards;
        }
        @keyframes fw-double-out {
            0%   { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectFeuxDoubleStyles();

let feuxDoubleIntervalId = null;

function spawnFeuxDoubleParticle(xPx, yPx, dx, dy, size, color, duration) {
    const particle = document.createElement('div');
    particle.className = 'fw-double-particle';
    particle.style.left = `${xPx}px`;
    particle.style.top = `${yPx}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = color;
    particle.style.boxShadow = `0 0 6px 2px ${color}`;
    particle.style.setProperty('--dx', `${dx}px`);
    particle.style.setProperty('--dy', `${dy}px`);
    particle.style.animationDuration = `${duration}ms`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), duration + 50);
}

function launchFeuxDouble() {
    const colors = ['#ff5252', '#ffd452', '#52c8ff', '#c452ff'];
    const originXpx = window.innerWidth * (0.15 + Math.random() * 0.7);
    const originYpx = window.innerHeight * (0.1 + Math.random() * 0.4);
    const color = colors[Math.floor(Math.random() * colors.length)];
    const primaryCount = 12;
    const primaryDuration = 900;

    for (let i = 0; i < primaryCount; i++) {
        const angle = (i / primaryCount) * Math.PI * 2;
        const distance = 70 + Math.random() * 30;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        spawnFeuxDoubleParticle(originXpx, originYpx, dx, dy, 6, color, primaryDuration);

        // À mi-parcours de la particule principale, un mini-éclatement secondaire se déclenche
        // à sa position du moment — effet de crépitement en deux temps.
        setTimeout(() => {
            const secondaryX = originXpx + dx * 0.5;
            const secondaryY = originYpx + dy * 0.5;
            const secondaryColor = colors[Math.floor(Math.random() * colors.length)];
            for (let k = 0; k < 5; k++) {
                const angle2 = Math.random() * Math.PI * 2;
                const distance2 = 15 + Math.random() * 15;
                spawnFeuxDoubleParticle(
                    secondaryX, secondaryY,
                    Math.cos(angle2) * distance2, Math.sin(angle2) * distance2,
                    3, secondaryColor, 450
                );
            }
        }, primaryDuration * 0.5);
    }
}

function scheduleNextFeuxDouble() {
    if (!feuxDoubleEnabled) return;
    const delay = 700 + Math.random() * 500;
    feuxDoubleIntervalId = setTimeout(() => {
        if (feuxDoubleEnabled) launchFeuxDouble();
        scheduleNextFeuxDouble();
    }, delay);
}

function toggleFeuxDoubleSetting(checked) {
    feuxDoubleEnabled = checked;
    localStorage.setItem('feuxDoubleEnabled', checked ? 'true' : 'false');
    if (feuxDoubleIntervalId) { clearTimeout(feuxDoubleIntervalId); feuxDoubleIntervalId = null; }
    if (checked) scheduleNextFeuxDouble();
}

function initFeuxDoubleState() {
    if (feuxDoubleEnabled) scheduleNextFeuxDouble();
}

// ==========================================
// BOUTON RIDEAU 🎭 — réglage désactivé par défaut, bouton fixe qui ferme/ouvre le rideau
// à chaque clic (contrairement aux effets d'ambiance automatiques : ici c'est l'utilisateur
// qui contrôle l'état). Positionné à droite du bouton pétard, même style de bouton.
// Style de rideau revu : plis (texture rayée), liseré doré sur le bord intérieur, bord bas
// festonné, et une animation plus "tissu" (léger effet d'élan au début/à la fin du mouvement).
// ==========================================
let rideauBtnEnabled = localStorage.getItem('rideauBtnEnabled') === 'true'; // désactivé par défaut
let rideauBtnClosed = false; // état runtime (pas persisté) : ouvert par défaut à chaque chargement

function injectRideauBtnStyles() {
    if (document.getElementById('rideau-btn-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'rideau-btn-inline-style';
    styleTag.textContent = `
        #rideau-btn {
            position: fixed !important;
            left: 86px !important;
            bottom: 16px !important;
            width: 60px !important;
            height: 60px !important;
            border-radius: 50% !important;
            background: rgba(0,0,0,0.55) !important;
            border: none !important;
            font-size: 1.8rem !important;
            display: none;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer !important;
            z-index: 500 !important;
            box-shadow: 0 4px 14px rgba(0,0,0,0.4) !important;
            transition: transform 0.15s ease !important;
        }
        #rideau-btn.pressed {
            transform: scale(0.82) !important;
        }

        #rideau-wrapper {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 400;
            pointer-events: none;
            overflow: hidden;
        }
        .rideau-panel {
            position: absolute;
            top: 0;
            width: 51%;
            height: 100%;
            background:
                repeating-linear-gradient(90deg,
                    rgba(0,0,0,0.18) 0px, transparent 14px, transparent 28px, rgba(0,0,0,0.18) 42px),
                linear-gradient(90deg, #4a0505, #8b0000 55%, #4a0505);
            box-shadow: 0 0 50px 14px rgba(0, 0, 0, 0.65);
            transition: transform 1.4s cubic-bezier(0.65, -0.15, 0.35, 1.15);
        }
        /* Bord bas festonné (effet tissu drapé) */
        .rideau-panel::after {
            content: "";
            position: absolute;
            bottom: -14px;
            left: 0;
            width: 100%;
            height: 24px;
            background: radial-gradient(circle at 10px 0, transparent 12px, #4a0505 13px);
            background-size: 24px 24px;
            background-repeat: repeat-x;
        }
        /* Liseré doré sur le bord intérieur */
        .rideau-panel.left::before {
            content: "";
            position: absolute;
            top: 0; right: 0;
            width: 5px; height: 100%;
            background: linear-gradient(180deg, #ffd452, #a8791a, #ffd452);
            box-shadow: 0 0 8px 2px rgba(255, 212, 82, 0.6);
        }
        .rideau-panel.right::before {
            content: "";
            position: absolute;
            top: 0; left: 0;
            width: 5px; height: 100%;
            background: linear-gradient(180deg, #ffd452, #a8791a, #ffd452);
            box-shadow: 0 0 8px 2px rgba(255, 212, 82, 0.6);
        }
        .rideau-panel.left  { left: 0; transform: translateX(-100%); }
        .rideau-panel.right { right: 0; transform: translateX(100%); }
        .rideau-panel.closed.left  { transform: translateX(0%); }
        .rideau-panel.closed.right { transform: translateX(0%); }
    `;
    document.head.appendChild(styleTag);
}
injectRideauBtnStyles();

function ensureRideauWrapper() {
    let wrapper = document.getElementById('rideau-wrapper');
    if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = 'rideau-wrapper';
        const left = document.createElement('div');
        left.className = 'rideau-panel left';
        const right = document.createElement('div');
        right.className = 'rideau-panel right';
        wrapper.appendChild(left);
        wrapper.appendChild(right);
        document.body.appendChild(wrapper);
    }
    return wrapper;
}

function ensureRideauBtn() {
    let btn = document.getElementById('rideau-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'rideau-btn';
        btn.innerText = '🎭';
        btn.title = "Fermer / ouvrir le rideau";
        btn.style.display = 'none';
        btn.onclick = toggleRideauClick;
        document.body.appendChild(btn);
    }
    return btn;
}

// Un clic = ferme si ouvert, ouvre si fermé
function toggleRideauClick() {
    const btn = document.getElementById('rideau-btn');
    if (btn) {
        btn.classList.add('pressed');
        setTimeout(() => btn.classList.remove('pressed'), 150);
    }

    const wrapper = ensureRideauWrapper();
    wrapper.style.display = 'block';
    rideauBtnClosed = !rideauBtnClosed;
    wrapper.querySelectorAll('.rideau-panel').forEach(p => p.classList.toggle('closed', rideauBtnClosed));
}

function toggleRideauBtnSetting(checked) {
    rideauBtnEnabled = checked;
    localStorage.setItem('rideauBtnEnabled', checked ? 'true' : 'false');
    const btn = ensureRideauBtn();
    btn.style.display = checked ? 'flex' : 'none';
}

function initRideauBtnState() {
    const btn = ensureRideauBtn();
    btn.style.display = rideauBtnEnabled ? 'flex' : 'none';
}

// ==========================================
// GRANDE COLLECTION DE FEUX D'ARTIFICE (types réels de pyrotechnie)
// Moteur générique piloté par une table de "recettes" (couleurs, motif, nombre de
// particules, distance, durée...) plutôt que du code dupliqué pour chacun — plus
// simple à maintenir pour un aussi grand nombre de variantes.
// ==========================================

function injectFwGenericStyles() {
    if (document.getElementById('fw-generic-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'fw-generic-inline-style';
    styleTag.textContent = `
        .fw-generic-particle {
            position: fixed;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation-name: fw-double-out;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
        }
        .fw-generic-particle.strobe {
            animation-name: fw-strobe-out;
        }
        @keyframes fw-strobe-out {
            0%, 100% { opacity: 0; }
            10%, 20%, 30%, 40%, 50%, 60%, 70%, 80% { opacity: 1; }
            15%, 25%, 35%, 45%, 55%, 65%, 75% { opacity: 0.2; }
        }
        .fw-generic-willow {
            position: fixed;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation-name: fw-saule-fall;
            animation-timing-function: ease-in;
            animation-fill-mode: forwards;
        }
        @keyframes fw-saule-fall {
            0%   { transform: translate(0, 0); opacity: 1; }
            30%  { transform: translate(var(--dx), var(--dy-up)); opacity: 1; }
            100% { transform: translate(calc(var(--dx) * 1.2), var(--dy-down)); opacity: 0; }
        }
        .fw-generic-kamuro-strobe {
            position: fixed;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation-name: fw-kamuro-strobe-fall;
            animation-timing-function: ease-in;
            animation-fill-mode: forwards;
        }
        @keyframes fw-kamuro-strobe-fall {
            0%   { transform: translate(0, 0); opacity: 1; }
            30%  { transform: translate(var(--dx), var(--dy-up)); opacity: 1; }
            38%  { opacity: 0.15; }
            46%  { opacity: 1; }
            54%  { opacity: 0.15; }
            62%  { opacity: 1; }
            70%  { opacity: 0.15; }
            78%  { opacity: 1; }
            100% { transform: translate(calc(var(--dx) * 1.2), var(--dy-down)); opacity: 0; }
        }
        .fw-generic-ghost {
            position: fixed;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            filter: blur(3px);
            animation-name: fw-ghost-drift;
            animation-timing-function: ease-in-out;
            animation-fill-mode: forwards;
        }
        @keyframes fw-ghost-drift {
            0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
            20%  { opacity: 0.7; }
            50%  { transform: translate(calc(var(--dx) * 0.6), calc(var(--dy) * 0.6)) scale(1); opacity: 0.35; }
            80%  { opacity: 0.6; }
            100% { transform: translate(var(--dx), var(--dy)) scale(1.2); opacity: 0; }
        }
        .fw-generic-leaves {
            position: fixed;
            border-radius: 2px;
            z-index: 400;
            pointer-events: none;
            animation-name: fw-leaves-fall;
            animation-timing-function: linear;
            animation-fill-mode: forwards;
        }
        @keyframes fw-leaves-fall {
            0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
            25%  { transform: translate(var(--dx), calc(var(--dy) * 0.25)) rotate(90deg); opacity: 0.3; }
            50%  { transform: translate(0, calc(var(--dy) * 0.5)) rotate(180deg); opacity: 1; }
            75%  { transform: translate(var(--dx), calc(var(--dy) * 0.75)) rotate(270deg); opacity: 0.3; }
            100% { transform: translate(0, var(--dy)) rotate(360deg); opacity: 0; }
        }
        .fw-generic-fountain {
            position: fixed;
            bottom: 0;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation-name: fw-fontaine-arc;
            animation-timing-function: ease-out;
            animation-fill-mode: forwards;
        }
        .fw-generic-flare {
            position: fixed;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            filter: blur(6px);
            animation: fw-flare-glow linear forwards;
        }
        @keyframes fw-flare-glow {
            0%   { opacity: 0; transform: scale(0.6); }
            15%  { opacity: 1; transform: scale(1); }
            80%  { opacity: 0.9; }
            100% { opacity: 0; transform: scale(1.1); }
        }
        .fw-generic-dart {
            position: fixed;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation: fw-dart-move linear forwards;
        }
        @keyframes fw-dart-move {
            0%   { transform: translate(0, 0); opacity: 1; }
            25%  { transform: translate(var(--dx1), var(--dy1)); }
            50%  { transform: translate(var(--dx2), var(--dy2)); }
            75%  { transform: translate(var(--dx3), var(--dy3)); }
            100% { transform: translate(var(--dx4), var(--dy4)); opacity: 0; }
        }
        .fw-generic-flash {
            position: fixed;
            border-radius: 50%;
            z-index: 400;
            pointer-events: none;
            animation: fw-flash-pop 0.35s ease-out forwards;
        }
        @keyframes fw-flash-pop {
            0%   { transform: scale(0.3); opacity: 1; }
            100% { transform: scale(3.5); opacity: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}
injectFwGenericStyles();

function fwSpawnParticle(cls, xPx, yPx, size, color, durationMs, extraProps) {
    const el = document.createElement('div');
    el.className = cls;
    el.style.left = `${xPx}px`;
    el.style.top = `${yPx}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.background = color;
    el.style.boxShadow = `0 0 ${size + 3}px ${Math.max(1, Math.round(size / 2))}px ${color}`;
    el.style.animationDuration = `${durationMs}ms`;
    if (extraProps) {
        for (const key in extraProps) el.style.setProperty(key, extraProps[key]);
    }
    document.body.appendChild(el);
    setTimeout(() => el.remove(), durationMs + 80);
    return el;
}

function fwRandomOrigin() {
    return {
        x: window.innerWidth * (0.15 + Math.random() * 0.7),
        y: window.innerHeight * (0.08 + Math.random() * 0.4)
    };
}

// --- Motif "radial" : éclatement classique (pivoine, dahlia, anneau, étoile, crépitement,
//     compact, mortier, bombe, crossette) ---
function fwPatternRadial(origin, def) {
    const count = def.count;
    const fanBaseAngle = Math.random() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
        let angle;
        if (def.shape === 'ring') {
            angle = (i / count) * Math.PI * 2;
        } else if (def.shape === 'star') {
            angle = (i % 5) * (Math.PI * 2 / 5) + (Math.floor(i / 5) * 0.05);
        } else if (def.shape === 'fan') {
            // Éventail : les particules restent dans un cône de 90°, pas tout le cercle
            angle = fanBaseAngle + (Math.random() - 0.5) * (Math.PI / 2);
        } else {
            angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
        }
        const dist = def.shape === 'ring'
            ? def.distance[1]
            : def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;

        fwSpawnParticle('fw-generic-particle', origin.x, origin.y, size, color, def.duration, { '--dx': `${dx}px`, '--dy': `${dy}px` });

        if (def.crossette) {
            // Chaque particule primaire se scinde en 2 mini-particules à mi-parcours
            setTimeout(() => {
                const midX = origin.x + dx * 0.55;
                const midY = origin.y + dy * 0.55;
                for (let k = -1; k <= 1; k += 2) {
                    const splitAngle = angle + k * 0.5;
                    const splitDist = 25 + Math.random() * 15;
                    fwSpawnParticle('fw-generic-particle', midX, midY, size * 0.7, color, def.duration * 0.4, {
                        '--dx': `${Math.cos(splitAngle) * splitDist}px`,
                        '--dy': `${Math.sin(splitAngle) * splitDist}px`
                    });
                }
            }, def.duration * 0.55);
        }
    }
}

// --- Motif "comet" : traînée qui traverse l'écran en diagonale (comète) ---
// --- Motif "kamuroStrobe" : comme "willow" mais les particules scintillent en tombant ---
function fwPatternKamuroStrobe(origin, def) {
    for (let i = 0; i < def.count; i++) {
        const angle = (-175 + Math.random() * 170) * (Math.PI / 180);
        const upDist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const downDist = def.fallDistance[0] + Math.random() * (def.fallDistance[1] - def.fallDistance[0]);
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        fwSpawnParticle('fw-generic-kamuro-strobe', origin.x, origin.y, size, color, def.duration, {
            '--dx': `${Math.cos(angle) * upDist}px`,
            '--dy-up': `${Math.sin(angle) * upDist}px`,
            '--dy-down': `${downDist}px`
        });
    }
}

// --- Motif "ghost" : particules pâles qui dérivent doucement en pulsant, façon apparition ---
function fwPatternGhost(origin, def) {
    for (let i = 0; i < def.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        fwSpawnParticle('fw-generic-ghost', origin.x, origin.y, size, color, def.duration, {
            '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist - 40}px`
        });
    }
}

// --- Motif "leaves" : chute en zigzag (feuilles) + scintillement ---
function fwPatternLeaves(origin, def) {
    // Un vrai "pop" d'éclatement d'abord (plus gros qu'avant), dont les paillettes tombent ensuite
    // en scintillant — et UNIQUEMENT en dessous du point d'éclatement, pas dispersées ailleurs
    // (sinon ça n'a pas de sens physiquement : la gravité les fait tomber, pas voler au hasard).
    const burstCount = 26;
    for (let i = 0; i < burstCount; i++) {
        const angle = (i / burstCount) * Math.PI * 2;
        const dist = 55 + Math.random() * 35;
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        fwSpawnParticle('fw-generic-particle', origin.x, origin.y, 5, color, 650, {
            '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
        });
    }

    for (let i = 0; i < def.count; i++) {
        // Départ resserré horizontalement, juste sous le point d'éclatement — pas de dispersion en cercle
        const startX = origin.x + (Math.random() - 0.5) * 90;
        const startY = origin.y + 10 + Math.random() * 20;
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        const fallDist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const zigzag = 35 + Math.random() * 40;
        setTimeout(() => {
            fwSpawnParticle('fw-generic-leaves', startX, startY, size, color, def.duration, {
                '--dx': `${zigzag}px`, '--dy': `${fallDist}px`
            });
        }, 300 + Math.random() * def.duration * 0.25);
    }
}

// --- Motif "mandala" : plusieurs anneaux concentriques tirés ensemble (motif décoratif) ---
function fwPatternMandala(origin, def) {
    const rings = 3;
    for (let r = 0; r < rings; r++) {
        const ringDist = def.distance[0] + (r / (rings - 1)) * (def.distance[1] - def.distance[0]);
        const ringCount = def.count + r * 4;
        const color = def.colors[r % def.colors.length];
        for (let i = 0; i < ringCount; i++) {
            const angle = (i / ringCount) * Math.PI * 2 + (r * 0.3);
            fwSpawnParticle('fw-generic-particle', origin.x, origin.y, def.size[0], color, def.duration, {
                '--dx': `${Math.cos(angle) * ringDist}px`, '--dy': `${Math.sin(angle) * ringDist}px`
            });
        }
    }
}

// --- Motif "ultraGiant" : explosion énorme, la plus grosse de toutes ---
function fwPatternUltraGiant(origin, def) {
    const count = def.count;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
        const dist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        fwSpawnParticle('fw-generic-particle', origin.x, origin.y, size, color, def.duration, {
            '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
        });
    }
    // Un second souffle un peu plus tard, plus dense au centre, pour accentuer l'ampleur de l'explosion
    setTimeout(() => {
        for (let i = 0; i < Math.round(count * 0.5); i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = (def.distance[0] * 0.5) + Math.random() * (def.distance[1] * 0.5);
            const color = def.colors[Math.floor(Math.random() * def.colors.length)];
            fwSpawnParticle('fw-generic-particle', origin.x, origin.y, def.size[1], color, def.duration * 0.7, {
                '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
            });
        }
    }, 120);
}

// --- Motif "ensembleBlancDore" : plusieurs éléments à la fois (crépitement, fusée, fontaine,
//     explosion ronde), tous en blanc et doré — c'est le "Bouquet blanc et doré" ---
function fwPatternEnsembleBlancDore(origin, def) {
    const whiteGold = def.colors;
    const pick = () => whiteGold[Math.floor(Math.random() * whiteGold.length)];

    // 1. Amorce : un petit crépitement annonce le début de l'effet
    for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * 22;
        fwSpawnParticle('fw-generic-particle', origin.x, origin.y, 2.5, pick(), 400, {
            '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
        });
    }

    // 2. Deux fontaines pyrotechniques blanches/dorées, de part et d'autre, jaillissent en continu
    [-1, 1].forEach(side => {
        const fx = origin.x + side * 90;
        for (let i = 0; i < 16; i++) {
            setTimeout(() => {
                const angle = (-90 + (Math.random() * 26 - 13)) * (Math.PI / 180);
                const dist = 70 + Math.random() * 80;
                fwSpawnParticle('fw-generic-particle', fx, window.innerHeight, 3, pick(), 950, {
                    '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
                });
            }, i * 45);
        }
    });

    // 3. Une fusée blanche monte au centre puis éclate en un bouquet moyen doré
    setTimeout(() => {
        const groundY = window.innerHeight;
        const burstY = window.innerHeight * (0.18 + Math.random() * 0.12);
        fwSpawnParticle('fw-generic-particle', origin.x, groundY, 3, '#ffffff', 480, {
            '--dx': '0px', '--dy': `${-(groundY - burstY)}px`
        });
        setTimeout(() => {
            for (let i = 0; i < 20; i++) {
                const angle = (i / 20) * Math.PI * 2;
                const dist = 55 + Math.random() * 25;
                fwSpawnParticle('fw-generic-particle', origin.x, burstY, 5, pick(), 800, {
                    '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
                });
            }
        }, 490);
    }, 150);

    // 4. Bouquet doré principal : grosse explosion ronde à 3 anneaux, le vrai temps fort de l'effet
    setTimeout(() => {
        const rings = [
            { count: 22, dist: 70,  size: 6 },
            { count: 30, dist: 130, size: 6 },
            { count: 36, dist: 190, size: 5 }
        ];
        rings.forEach((ring, r) => {
            for (let i = 0; i < ring.count; i++) {
                const angle = (i / ring.count) * Math.PI * 2 + r * 0.15;
                const dist = ring.dist + Math.random() * 20;
                fwSpawnParticle('fw-generic-particle', origin.x, origin.y, ring.size, pick(), 1500, {
                    '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
                });
            }
        });
    }, 650);

    // 5. Scintillement final qui accompagne la retombée du bouquet principal
    setTimeout(() => {
        for (let i = 0; i < 34; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 90;
            fwSpawnParticle('fw-generic-particle', origin.x, origin.y, 2.5, pick(), 600, {
                '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
            });
        }
    }, 1350);
}

// --- Motif "heart" : éclatement en forme de cœur (courbe paramétrique classique) ---
function fwPatternHeart(origin, def) {
    const count = def.count;
    const color = def.colors[Math.floor(Math.random() * def.colors.length)];
    const scale = def.distance[0] / 16; // ajuste la taille du cœur selon la "distance" de la recette
    for (let i = 0; i < count; i++) {
        const t = (i / count) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        fwSpawnParticle('fw-generic-particle', origin.x, origin.y, def.size[0], color, def.duration, {
            '--dx': `${hx * scale}px`, '--dy': `${hy * scale}px`
        });
    }
}

// --- Motif "scintillant" : traîne scintillante dense et persistante par direction ---
function fwPatternScintillant(origin, def) {
    const count = def.count;
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.2;
        const dist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        for (let t = 0; t < 3; t++) {
            setTimeout(() => {
                fwSpawnParticle('fw-generic-particle', origin.x, origin.y, Math.max(1.5, def.size[0] - t * 0.7), color, Math.max(300, def.duration - t * 200), {
                    '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`, '--end-scale': 0.15
                });
            }, t * 180);
        }
    }
}

// --- Motif "serpentin" : trajectoires qui ondulent en s'échappant du centre (réutilise le
//     zigzag de "leaves", mais projeté vers l'extérieur plutôt que retombant vers le bas) ---
function fwPatternSerpentin(origin, def) {
    const count = def.count;
    for (let i = 0; i < count; i++) {
        const baseAngle = Math.random() * Math.PI * 2;
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        const dist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const wiggle = 25 + Math.random() * 25;
        fwSpawnParticle('fw-generic-leaves', origin.x, origin.y, def.size[0], color, def.duration, {
            '--dx': `${Math.cos(baseAngle) * dist + wiggle}px`, '--dy': `${Math.sin(baseAngle) * dist}px`
        });
    }
}

// --- Motif "cascade" : rideau suspendu depuis lequel les étincelles tombent en continu (Niagara) ---
function fwPatternCascade(origin, def) {
    // Éclatement d'abord (comme un vrai feu d'artifice), puis les étincelles retombent en rideau
    // sous le point d'éclatement — plutôt qu'un simple rideau suspendu sans explosion initiale.
    const burstCount = 22;
    for (let i = 0; i < burstCount; i++) {
        const angle = (i / burstCount) * Math.PI * 2;
        const dist = 60 + Math.random() * 40;
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        fwSpawnParticle('fw-generic-particle', origin.x, origin.y, 5, color, 700, {
            '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
        });
    }

    // La cascade : les étincelles retombent ensuite en rideau, réparties sous la largeur de l'éclatement
    const count = def.count;
    for (let i = 0; i < count; i++) {
        const startX = origin.x + (Math.random() - 0.5) * 220;
        const startY = origin.y + 20;
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        const fallDist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        setTimeout(() => {
            fwSpawnParticle('fw-generic-particle', startX, startY, size, color, def.duration, {
                '--dx': '0px', '--dy': `${fallDist}px`, '--end-scale': 0.4
            });
        }, 350 + Math.random() * 400);
    }
}

// --- Motif "colorChange" : le bouquet change de couleur à mi-parcours (pivoine à couleur changeante) ---
function fwPatternColorChange(origin, def) {
    const count = def.count;
    const color1 = def.colors[0];
    const color2 = def.colors[1] || def.colors[0];
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const midX = Math.cos(angle) * dist * 0.5;
        const midY = Math.sin(angle) * dist * 0.5;
        fwSpawnParticle('fw-generic-particle', origin.x, origin.y, def.size[0], color1, def.duration * 0.45, {
            '--dx': `${midX}px`, '--dy': `${midY}px`, '--end-scale': 1
        });
        setTimeout(() => {
            fwSpawnParticle('fw-generic-particle', origin.x + midX, origin.y + midY, def.size[0], color2, def.duration * 0.55, {
                '--dx': `${midX}px`, '--dy': `${midY}px`
            });
        }, def.duration * 0.4);
    }
}

// --- Motif "rafale" : plusieurs éclatements successifs au même endroit (shell à ruptures multiples) ---
function fwPatternRafale(origin, def) {
    const bursts = 3;
    for (let b = 0; b < bursts; b++) {
        setTimeout(() => {
            const count = def.count;
            const color = def.colors[Math.floor(Math.random() * def.colors.length)];
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const dist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
                fwSpawnParticle('fw-generic-particle', origin.x, origin.y, def.size[0], color, def.duration, {
                    '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
                });
            }
        }, b * 280);
    }
}

// --- Motif "spiral" : les particules s'échappent en dessinant une spirale (en spirale) ---
function fwPatternSpiral(origin, def) {
    const goldenAngle = 137.5 * (Math.PI / 180);
    const color = def.colors[Math.floor(Math.random() * def.colors.length)];
    for (let i = 0; i < def.count; i++) {
        const angle = i * goldenAngle;
        const dist = (def.distanceStep || 5.4) * i;
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;
        // Décalage progressif : la spirale "se déroule" au lieu d'exploser d'un coup
        setTimeout(() => {
            fwSpawnParticle('fw-generic-particle', origin.x, origin.y, size, color, def.duration, {
                '--dx': `${dx}px`, '--dy': `${dy}px`
            });
        }, i * (def.delayStep || 15));
    }
}

// --- Motif "willow" (saule) : montée puis retombée gracieuse avec traînée
//     (chrysanthème, brocart, palmier, kamuro, queue de cheval) ---
function fwPatternWillow(origin, def) {
    for (let i = 0; i < def.count; i++) {
        const angle = (-160 + Math.random() * 140) * (Math.PI / 180);
        const upDist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        const fallDist = def.fallDistance ? def.fallDistance[0] + Math.random() * (def.fallDistance[1] - def.fallDistance[0]) : 100;

        fwSpawnParticle('fw-generic-willow', origin.x, origin.y, size, color, def.duration, {
            '--dx': `${Math.cos(angle) * upDist * 1.15}px`,
            '--dy-up': `${Math.sin(angle) * upDist}px`,
            '--dy-down': `${fallDist}px`
        });
    }
}

// --- Motif "fontaine" : jaillit depuis le bas, s'estompe en haut (pots à feu, fontaine
//     pyrotechnique, fontaine au sol) ---
function fwPatternFountain(def) {
    const originX = 10 + Math.random() * 80;
    for (let i = 0; i < def.count; i++) {
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        const h = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const el = document.createElement('div');
        el.className = 'fw-generic-fountain';
        el.style.left = `${originX}%`;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.background = color;
        el.style.boxShadow = `0 0 ${size + 3}px ${Math.round(size / 2)}px ${color}`;
        el.style.setProperty('--dx', `${(Math.random() - 0.5) * 40}px`);
        el.style.setProperty('--h', `${h}px`);
        el.style.animationDuration = `${def.duration}ms`;
        el.style.animationDelay = `${Math.random() * 0.15}s`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), def.duration + 200);
    }
}

// --- Motif "flash" : bang bref, quasi sans traînée (marron d'air) ---
function fwPatternFlash(origin, def) {
    const color = def.colors[0];
    fwSpawnParticle('fw-generic-flash', origin.x, origin.y, 26, color, 350);
    for (let i = 0; i < def.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        fwSpawnParticle('fw-generic-particle', origin.x, origin.y, 3, color, 400, {
            '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
        });
    }
}

// --- Motif "flare" : lueur continue qui pulse doucement (bengale) ---
function fwPatternFlare(origin, def) {
    const el = document.createElement('div');
    el.className = 'fw-generic-flare';
    el.style.left = `${origin.x - 20}px`;
    el.style.top = `${origin.y - 20}px`;
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.background = def.colors[0];
    el.style.boxShadow = `0 0 30px 12px ${def.colors[0]}`;
    el.style.animationDuration = `${def.duration}ms`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), def.duration + 100);
}

// --- Motif "strobe" : particules qui clignotent en s'éloignant (clignotant) ---
function fwPatternStrobe(origin, def) {
    for (let i = 0; i < def.count; i++) {
        const angle = (i / def.count) * Math.PI * 2;
        const dist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        fwSpawnParticle('fw-generic-particle strobe', origin.x, origin.y, size, color, def.duration, {
            '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
        });
    }
}

// --- Motif "dart" : trajectoire erratique en zigzag (abeille / poisson) ---
function fwPatternDart(origin, def) {
    for (let i = 0; i < def.count; i++) {
        const size = def.size[0] + Math.random() * (def.size[1] - def.size[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        const rand = () => (Math.random() - 0.5) * (def.distance[1]);
        const el = document.createElement('div');
        el.className = 'fw-generic-dart';
        el.style.left = `${origin.x}px`;
        el.style.top = `${origin.y}px`;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.background = color;
        el.style.boxShadow = `0 0 ${size + 2}px ${Math.round(size / 2)}px ${color}`;
        el.style.setProperty('--dx1', `${rand()}px`); el.style.setProperty('--dy1', `${rand()}px`);
        el.style.setProperty('--dx2', `${rand()}px`); el.style.setProperty('--dy2', `${rand()}px`);
        el.style.setProperty('--dx3', `${rand()}px`); el.style.setProperty('--dy3', `${rand()}px`);
        el.style.setProperty('--dx4', `${rand()}px`); el.style.setProperty('--dy4', `${rand()}px`);
        el.style.animationDuration = `${def.duration}ms`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), def.duration + 60);
    }
}

// --- Motif "rocket" : fusée qui monte puis éclate en petit bouquet (fusée) ---
function fwPatternRocket(def) {
    const originX = 15 + Math.random() * 70;
    const startY = window.innerHeight;
    const peakY = window.innerHeight * (0.15 + Math.random() * 0.25);
    const color = def.colors[Math.floor(Math.random() * def.colors.length)];

    const rocket = document.createElement('div');
    rocket.className = 'fw-generic-fountain';
    rocket.style.left = `${originX}%`;
    rocket.style.width = '4px';
    rocket.style.height = '4px';
    rocket.style.background = color;
    rocket.style.boxShadow = `0 0 6px 2px ${color}`;
    rocket.style.setProperty('--dx', '0px');
    rocket.style.setProperty('--h', `${startY - peakY}px`);
    rocket.style.animationDuration = '700ms';
    rocket.style.animationTimingFunction = 'ease-out';
    document.body.appendChild(rocket);

    setTimeout(() => {
        rocket.remove();
        fwPatternRadial({ x: window.innerWidth * (originX / 100), y: peakY }, {
            count: 16, size: [3, 5], distance: [60, 100], duration: 900, colors: def.colors
        });
    }, 650);
}

// --- Motif "roman candle" : tirs uniques successifs (chandelle) ---
function fwPatternRomanCandle(def) {
    const originX = 15 + Math.random() * 70;
    for (let shot = 0; shot < 5; shot++) {
        setTimeout(() => {
            const color = def.colors[shot % def.colors.length];
            const el = document.createElement('div');
            el.className = 'fw-generic-fountain';
            el.style.left = `${originX}%`;
            el.style.width = '6px';
            el.style.height = '6px';
            el.style.background = color;
            el.style.boxShadow = `0 0 8px 3px ${color}`;
            el.style.setProperty('--dx', '0px');
            el.style.setProperty('--h', `${140 + Math.random() * 60}px`);
            el.style.animationDuration = '500ms';
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 600);
        }, shot * 260);
    }
}

// --- Motif "multi" : plusieurs éclatements simultanés (bouquet) ---
function fwPatternMulti(def) {
    const burstCount = 4;
    for (let b = 0; b < burstCount; b++) {
        const origin = fwRandomOrigin();
        fwPatternRadial(origin, {
            count: def.count, size: def.size, distance: def.distance,
            duration: def.duration, colors: def.colors, shape: 'default'
        });
    }
}

// --- Motif "ground pop" : petits pops rapides et bas (pétard clic-clac) ---
function fwPatternGroundPop(def) {
    const originX = 10 + Math.random() * 80;
    const originY = window.innerHeight - 20;
    for (let i = 0; i < def.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = def.distance[0] + Math.random() * (def.distance[1] - def.distance[0]);
        const color = def.colors[Math.floor(Math.random() * def.colors.length)];
        fwSpawnParticle('fw-generic-particle', originX, originY, 3, color, def.duration, {
            '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`
        });
    }
}

// --- Table des recettes ---
const FIREWORK_RECIPES = {
    pivoine:            { label: "Pivoine",                    pattern: 'radial',  count: 26, size: [4, 6], distance: [80, 130],  duration: 1100, colors: ['#ff5252', '#ff8a52', '#ffd452'], minDelay: 700,  maxDelay: 1200 },
    chrysantheme:        { label: "Chrysanthème",                pattern: 'willow',  count: 30, size: [3, 5], distance: [90, 140],  fallDistance: [90, 140],  duration: 1900, colors: ['#52c8ff', '#c452ff', '#ffffff'], minDelay: 900, maxDelay: 1400 },
    dahlia:              { label: "Dahlia",                      pattern: 'radial',  count: 14, size: [6, 8], distance: [100, 150], duration: 1200, colors: ['#ff5252', '#ffd452'], minDelay: 800, maxDelay: 1300 },
    brocart:             { label: "Brocart doré",                pattern: 'willow',  count: 34, size: [2, 4], distance: [90, 140],  fallDistance: [110, 160], duration: 2100, colors: ['#ffd452', '#fff1c2'], minDelay: 1000, maxDelay: 1500 },
    palmier:             { label: "Palmier",                     pattern: 'willow',  count: 8,  size: [4, 6], distance: [130, 170], fallDistance: [130, 170], duration: 1900, colors: ['#52ff8a', '#ffd452'], minDelay: 1100, maxDelay: 1600 },
    anneau:              { label: "Anneau",                      pattern: 'radial',  count: 28, size: [4, 5], distance: [100, 100], duration: 1200, colors: ['#52c8ff'], shape: 'ring', minDelay: 800, maxDelay: 1300 },
    etoile:              { label: "Étoile",                      pattern: 'radial',  count: 25, size: [5, 7], distance: [90, 140],  duration: 1100, colors: ['#ffd452'], shape: 'star', minDelay: 800, maxDelay: 1300 },
    crepitementIntense:  { label: "Crépitement intense",         pattern: 'radial',  count: 55, size: [1.5, 2.5], distance: [15, 45], duration: 550,  colors: ['#fff45c', '#ffffff'], minDelay: 300, maxDelay: 500 },
    crossette:           { label: "Crossette",                   pattern: 'radial',  count: 10, size: [4, 6], distance: [95, 95],   duration: 1300, colors: ['#ff5252', '#52c8ff'], crossette: true, minDelay: 900, maxDelay: 1400 },
    marronAir:           { label: "Marron d'air (bang)",         pattern: 'flash',   count: 6,  size: [3, 3], distance: [20, 40],   duration: 400,  colors: ['#ffffff'], minDelay: 600, maxDelay: 1000 },
    potsAFeu:            { label: "Pots à feu",                  pattern: 'fountain', count: 14, size: [3, 5], distance: [50, 90],   duration: 1100, colors: ['#ff8a52', '#ffd452'], minDelay: 400, maxDelay: 700 },
    kamuro:              { label: "Kamuro",                      pattern: 'willow',  count: 42, size: [2, 4], distance: [120, 170], fallDistance: [150, 200], duration: 2500, colors: ['#fff1c2', '#ffd452'], minDelay: 1200, maxDelay: 1800 },
    queueDeCheval:       { label: "Queue de cheval",             pattern: 'willow',  count: 6,  size: [4, 5], distance: [140, 180], fallDistance: [160, 200], duration: 2000, colors: ['#52c8ff', '#ffffff'], minDelay: 1000, maxDelay: 1500 },
    fontainePyro:        { label: "Fontaine pyrotechnique",      pattern: 'fountain', count: 18, size: [3, 4], distance: [60, 100],  duration: 1200, colors: ['#52c8ff', '#a0e8ff', '#ffffff'], minDelay: 400, maxDelay: 700 },
    mortier:             { label: "Mortier",                     pattern: 'radial',  count: 36, size: [5, 7], distance: [130, 190], duration: 1300, colors: ['#ff5252', '#52c8ff', '#ffd452'], minDelay: 900, maxDelay: 1400 },
    fusee:                { label: "Fusée",                       pattern: 'rocket',  colors: ['#ffd452', '#ffffff'], minDelay: 1000, maxDelay: 1600 },
    clignotant:          { label: "Clignotant",                  pattern: 'strobe',  count: 20, size: [4, 6], distance: [80, 120],  duration: 1500, colors: ['#ffffff', '#52c8ff'], minDelay: 900, maxDelay: 1400 },
    abeillePoisson:      { label: "Abeille / Poisson",           pattern: 'dart',    count: 14, size: [2, 4], distance: [50, 90],   duration: 1400, colors: ['#ffd452', '#ff8a52'], minDelay: 700, maxDelay: 1200 },
    compact:             { label: "Compact",                     pattern: 'radial',  count: 14, size: [4, 5], distance: [50, 70],   duration: 700,  colors: ['#c452ff', '#52ff8a'], minDelay: 500, maxDelay: 800 },
    chandelle:           { label: "Chandelle (roman candle)",    pattern: 'romanCandle', colors: ['#ff5252', '#ffd452', '#52c8ff'], minDelay: 1300, maxDelay: 1900 },
    bengale:             { label: "Bengale",                     pattern: 'flare',   duration: 2000, colors: ['#ff3366'], minDelay: 2200, maxDelay: 2200 },
    bombeArtifice:       { label: "Bombe d'artifice",            pattern: 'radial',  count: 46, size: [5, 8], distance: [140, 200], duration: 1500, colors: ['#ff5252', '#ffffff'], minDelay: 1000, maxDelay: 1500 },
    fontaineArtificeSol: { label: "Fontaine au sol",             pattern: 'fountain', count: 20, size: [3, 4], distance: [60, 100],  duration: 1300, colors: ['#ffd452', '#c452ff'], minDelay: 400, maxDelay: 700 },
    bouquet:             { label: "Bouquet (plusieurs à la fois)", pattern: 'multi', count: 18, size: [4, 6], distance: [90, 140],  duration: 1200, colors: ['#ff5252', '#ffd452', '#52ff8a', '#52c8ff', '#c452ff'], minDelay: 1600, maxDelay: 2200 },
    saulePleureur:       { label: "Saule pleureur",                pattern: 'willow',  count: 20, size: [3, 4],   distance: [40, 70], fallDistance: [120, 180], duration: 2100, colors: ['#ffd452', '#ffb347', '#fff1c2'], minDelay: 1000, maxDelay: 1700 },
    spirale:             { label: "En spirale",                    pattern: 'spiral',  count: 24, size: [5, 5],   distanceStep: 5.4, delayStep: 15, duration: 1100, colors: ['#c452ff', '#52c8ff', '#ff5252', '#ffd452'], minDelay: 700, maxDelay: 1200 },
    kamuroStrobe:        { label: "Kamuro strobe",                 pattern: 'kamuroStrobe', count: 32, size: [2, 4], distance: [110, 160], fallDistance: [140, 190], duration: 2200, colors: ['#ffffff', '#a0e8ff', '#ffd452'], minDelay: 1200, maxDelay: 1800 },
    ghost:               { label: "Ghost",                         pattern: 'ghost',   count: 16, size: [6, 10],  distance: [40, 90],  duration: 2600, colors: ['#e8e8ff', '#c9f7ff', '#ffffff'], minDelay: 1400, maxDelay: 2000 },
    strobeFallingLeaves: { label: "Strobe falling leaves",         pattern: 'leaves',  count: 20, size: [3, 5],   distance: [400, 650], duration: 3000, colors: ['#ff8a52', '#ffd452', '#c9a24b'], minDelay: 700, maxDelay: 1100 },
    volcano:             { label: "Volcano",                       pattern: 'fountain', count: 34, size: [3, 6],  distance: [90, 220],  duration: 1400, colors: ['#ff5252', '#ff8a52', '#ffd452', '#8b0000'], minDelay: 300, maxDelay: 550 },
    pattern:             { label: "Motif",                          pattern: 'mandala', count: 12, size: [4, 5],   distance: [50, 130], duration: 1300, colors: ['#c452ff', '#52c8ff', '#ffd452', '#ff5252'], minDelay: 1100, maxDelay: 1700 },
    horsetail:           { label: "Horsetail",                     pattern: 'willow',  count: 50, size: [2, 3],   distance: [100, 130], fallDistance: [200, 260], duration: 2400, colors: ['#ffffff', '#a0e8ff'], minDelay: 1300, maxDelay: 1900 },
    ultraGeant:          { label: "Ultra géant",                   pattern: 'ultraGiant', count: 60, size: [10, 14], distance: [180, 260], duration: 1900, colors: ['#ff5252', '#ffd452', '#52ff8a', '#52c8ff', '#c452ff', '#ff8a52', '#ffffff'], minDelay: 2200, maxDelay: 3000 },
    bouquetBlancDore:    { label: "Bouquet blanc et doré",         pattern: 'ensembleBlancDore', size: [4, 4], duration: 1500, colors: ['#ffffff', '#fff1c2', '#ffd452', '#d4af37'], minDelay: 2400, maxDelay: 3200 },
    coeur:               { label: "Cœur",                          pattern: 'heart',   count: 34, size: [5, 5],   distance: [90, 90],  duration: 1300, colors: ['#ff1493', '#ff5252'], minDelay: 1400, maxDelay: 2000 },
    scintillant:         { label: "Scintillant",                   pattern: 'scintillant', count: 24, size: [4, 5], distance: [90, 140], duration: 1400, colors: ['#ffffff', '#a0e8ff', '#ffd452'], minDelay: 900, maxDelay: 1400 },
    serpentin:           { label: "Serpentin",                     pattern: 'serpentin', count: 20, size: [3, 4], distance: [80, 130], duration: 1800, colors: ['#52ff8a', '#c452ff', '#ffd452'], minDelay: 800, maxDelay: 1300 },
    cascadeNiagara:      { label: "Cascade",                       pattern: 'cascade', count: 28, size: [2, 4], distance: [260, 380], duration: 2000, colors: ['#ffd452', '#ffffff', '#ff8a52'], minDelay: 500, maxDelay: 850 },
    pivoineChangeante:   { label: "Pivoine à couleur changeante",  pattern: 'colorChange', count: 26, size: [5, 6], distance: [100, 150], duration: 1600, colors: ['#52c8ff', '#ff5252'], minDelay: 1300, maxDelay: 1900 },
    rafale:              { label: "Rafale",                        pattern: 'rafale',  count: 16, size: [4, 5], distance: [60, 90],  duration: 700, colors: ['#ff8a52', '#ffd452', '#ff5252'], minDelay: 1600, maxDelay: 2200 }
};

let fireworkTypeEnabled = {};
let fireworkTypeIntervalId = {};

Object.keys(FIREWORK_RECIPES).forEach(key => {
    fireworkTypeEnabled[key] = localStorage.getItem('fw_' + key + '_enabled') === 'true';
});

// launchFireworkRecipe() est défini plus bas, avec gestion du son + surcharge pour les feux personnalisés.

function scheduleFireworkType(key) {
    const def = FIREWORK_RECIPES[key];
    if (!fireworkTypeEnabled[key]) return;
    const delay = def.minDelay + Math.random() * (def.maxDelay - def.minDelay);
    fireworkTypeIntervalId[key] = setTimeout(() => {
        if (fireworkTypeEnabled[key]) launchFireworkRecipe(key);
        scheduleFireworkType(key);
    }, delay);
}

function toggleFireworkTypeSetting(key, checked) {
    fireworkTypeEnabled[key] = checked;
    localStorage.setItem('fw_' + key + '_enabled', checked ? 'true' : 'false');
    if (fireworkTypeIntervalId[key]) { clearTimeout(fireworkTypeIntervalId[key]); fireworkTypeIntervalId[key] = null; }
    if (checked) scheduleFireworkType(key);
}

function initFireworkTypeState(key) {
    if (fireworkTypeEnabled[key]) scheduleFireworkType(key);
}

function initAllFireworkTypes() {
    Object.keys(FIREWORK_RECIPES).forEach(key => initFireworkTypeState(key));
}

function syncFireworkTypeToggles() {
    Object.keys(FIREWORK_RECIPES).forEach(key => {
        const el = document.getElementById('feux-' + key.replace(/([A-Z])/g, '-$1').toLowerCase() + '-toggle');
        if (el) el.checked = fireworkTypeEnabled[key];
    });
}

// ==========================================
// GESTIONNAIRE DE FEUX D'ARTIFICE — panneau dédié
// Regroupe les 25 recettes + sons synthétisés + créateur de feux personnalisés.
// ⚠️ Pas de vrais fichiers audio (aucun asset fourni) : les sons sont synthétisés en direct
// via Web Audio API (bruit filtré, oscillateurs) — aucun fichier .mp3/.wav à héberger.
// ==========================================

// --- Moteur sonore synthétisé, un "type" de son par famille de motif ---
let fwAudioCtx = null;
let fwMasterChain = null;   // { input, compressor }
let fwReverbSend = null;
let fwSharedNoiseBuffer = null;

function fwGetAudioCtx() {
    if (!fwAudioCtx) fwAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (fwAudioCtx.state === 'suspended') fwAudioCtx.resume();
    return fwAudioCtx;
}

// Buffer de bruit blanc généré une seule fois et réutilisé pour tous les sons (au lieu de
// recréer 1-2s de bruit à chaque appel) : moins coûteux, et le rendu reste cohérent d'un son à l'autre.
function fwGetSharedNoiseBuffer() {
    const ctx = fwGetAudioCtx();
    if (fwSharedNoiseBuffer) return fwSharedNoiseBuffer;
    const length = ctx.sampleRate * 2; // 2 secondes de bruit, largement assez pour tous les sons
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    fwSharedNoiseBuffer = buffer;
    return fwSharedNoiseBuffer;
}

// Chaîne de sortie commune : compresseur (évite la saturation/écrêtage quand plusieurs sons se
// chevauchent, "colle" le mix ensemble) + une petite réverb synthétique (délai + feedback +
// filtre, sans fichier "impulse response" à héberger) pour donner de l'ampleur/de l'espace.
function fwGetMasterChain() {
    const ctx = fwGetAudioCtx();
    if (fwMasterChain) return fwMasterChain;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 24;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    compressor.connect(ctx.destination);

    const input = ctx.createGain();
    input.gain.value = 0.9;
    input.connect(compressor);

    fwMasterChain = { input, compressor };
    return fwMasterChain;
}

function fwGetReverbSend() {
    const ctx = fwGetAudioCtx();
    const master = fwGetMasterChain();
    if (fwReverbSend) return fwReverbSend;

    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.15;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.34;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2400;
    const wet = ctx.createGain();
    wet.gain.value = 0.4;

    delay.connect(lowpass);
    lowpass.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(master.input);

    fwReverbSend = delay;
    return fwReverbSend;
}

// Sortie commune à tous les sons : signal direct + envoi vers la réverb + un léger panoramique
// stéréo aléatoire (donne une sensation d'espace, les tirs ne sortent pas tous pile au centre).
function fwConnectOut(node, sendAmount, panValue) {
    const ctx = fwGetAudioCtx();
    const master = fwGetMasterChain();
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    if (panner) {
        panner.pan.value = panValue != null ? panValue : (Math.random() * 1.4 - 0.7);
        node.connect(panner);
        panner.connect(master.input);
    } else {
        node.connect(master.input);
    }

    if (sendAmount) {
        const send = ctx.createGain();
        send.gain.value = sendAmount;
        node.connect(send);
        send.connect(fwGetReverbSend());
    }
}

function fwPlayNoiseBurst(duration, volume, filterFreq, options) {
    const opts = options || {};
    const ctx = fwGetAudioCtx();

    const noise = ctx.createBufferSource();
    noise.buffer = fwGetSharedNoiseBuffer();
    // Point de départ aléatoire dans le buffer partagé : deux bruits joués au même instant ne
    // sonnent jamais identiques, malgré la mise en cache.
    noise.loop = false;
    const startOffset = Math.random() * 1.5;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType || 'bandpass';
    filter.frequency.setValueAtTime(filterFreq || 2000, ctx.currentTime);
    if (opts.filterSweepTo) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(opts.filterSweepTo, 30), ctx.currentTime + duration);
    }
    filter.Q.value = opts.q || 1;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + Math.min(0.01, duration * 0.15));
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter).connect(gain);
    fwConnectOut(gain, opts.send != null ? opts.send : 0.28, opts.pan);
    noise.start(ctx.currentTime, startOffset, duration);
}

function fwPlayTone(freqStart, freqEnd, duration, volume, type, options) {
    const opts = options || {};
    const ctx = fwGetAudioCtx();
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    // Léger vibrato (LFO sur la fréquence) sur les sons tenus : évite le côté "synthé plat"
    const detune = (Math.random() - 0.5) * (opts.detune || 0);
    osc.detune.value = detune;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ctx.currentTime + duration);

    let vibratoLfo = null;
    if (opts.vibrato) {
        vibratoLfo = ctx.createOscillator();
        vibratoLfo.frequency.value = opts.vibratoRate || 5;
        const vibratoGain = ctx.createGain();
        vibratoGain.gain.value = opts.vibrato;
        vibratoLfo.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);
        vibratoLfo.start();
        vibratoLfo.stop(ctx.currentTime + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + Math.min(0.015, duration * 0.1));
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    fwConnectOut(gain, opts.send != null ? opts.send : 0.28, opts.pan);
    osc.start();
    osc.stop(ctx.currentTime + duration);
}

// --- Sons "travaillés" : plusieurs couches superposées par effet, avec une petite part de
//     hasard (pitch, timing, panoramique) pour un rendu organique plutôt qu'un bip répétitif ---

function fwPlayBoom() {
    const pan = Math.random() * 1.2 - 0.6;
    // Sub-bass (le "coup" ressenti dans le ventre)
    fwPlayTone(85 + Math.random() * 15, 30, 0.55, 0.42, 'sine', { send: 0.32, pan });
    // Corps médium qui donne le "punch"
    fwPlayTone(170, 55, 0.2, 0.24, 'triangle', { send: 0.18, pan });
    // Souffle de bruit filtré qui redescend (le "crac" de l'explosion)
    fwPlayNoiseBurst(0.4, 0.24, 900, { filterType: 'lowpass', filterSweepTo: 180, send: 0.38, pan });
    // Harmonique aiguë très brève, pour la morsure initiale du coup
    fwPlayNoiseBurst(0.05, 0.15, 4500, { filterType: 'bandpass', q: 2, send: 0.2, pan });
}

function fwPlayCrackle() {
    const hits = 7 + Math.floor(Math.random() * 6);
    const basePan = Math.random() * 1.2 - 0.6;
    for (let i = 0; i < hits; i++) {
        setTimeout(() => {
            fwPlayNoiseBurst(0.045 + Math.random() * 0.035, 0.12 + Math.random() * 0.05, 2600 + Math.random() * 4000, {
                filterType: 'bandpass', q: 3.5 + Math.random() * 2, send: 0.3,
                pan: basePan + (Math.random() - 0.5) * 0.6
            });
        }, i * (35 + Math.random() * 40));
    }
}

function fwPlayWhoosh() {
    const pan = Math.random() * 1.2 - 0.6;
    fwPlayNoiseBurst(0.9, 0.11, 3800, { filterType: 'bandpass', filterSweepTo: 450, q: 0.7, send: 0.42, pan });
    fwPlayTone(1500, 320, 0.9, 0.06, 'sawtooth', { send: 0.32, pan });
}

function fwPlayHiss() {
    // Deux couches de bruit décalées pour un fizz continu plutôt qu'un souffle plat
    fwPlayNoiseBurst(0.55, 0.09, 6500, { filterType: 'highpass', send: 0.2 });
    fwPlayNoiseBurst(0.5, 0.05, 3200, { filterType: 'bandpass', q: 1.2, send: 0.15 });
}

function fwPlayBang() {
    const pan = Math.random() * 1.2 - 0.6;
    fwPlayNoiseBurst(0.2, 0.4, 1000, { filterType: 'lowpass', filterSweepTo: 220, send: 0.38, pan });
    fwPlayTone(220, 55, 0.2, 0.32, 'square', { send: 0.25, pan });
    fwPlayNoiseBurst(0.03, 0.18, 5000, { filterType: 'bandpass', q: 2, send: 0.2, pan });
}

function fwPlayFlareHum() {
    fwPlayTone(182, 168, 1.8, 0.07, 'sine', { send: 0.42, vibrato: 3, vibratoRate: 4.5 });
    fwPlayNoiseBurst(1.8, 0.018, 4200, { send: 0.42 });
}

function fwPlayBeep() {
    fwPlayTone(1200, 1200, 0.07, 0.12, 'square', { send: 0.15 });
}

function fwPlayBuzz() {
    fwPlayTone(300, 250, 0.3, 0.08, 'sawtooth', { send: 0.15 });
    fwPlayTone(306, 256, 0.3, 0.05, 'sawtooth', { send: 0.1 }); // légèrement désaccordé : buzz plus "épais"
}

function fwPlayWhistlePop() {
    const pan = Math.random() * 1.2 - 0.6;
    fwPlayTone(420, 1750, 0.65, 0.1, 'sine', { send: 0.35, vibrato: 8, vibratoRate: 12, pan });
    setTimeout(fwPlayBoom, 650);
}

function fwPlayPopSeries() {
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            fwPlayNoiseBurst(0.07, 0.19, 1000 + Math.random() * 500, { send: 0.25, pan: (Math.random() - 0.5) * 1.2 });
        }, i * 260);
    }
}

function fwPlayGroundPop() {
    fwPlayNoiseBurst(0.05, 0.18, 2200 + Math.random() * 600, { filterType: 'bandpass', q: 3, send: 0.2 });
}

const FW_SOUND_BY_PATTERN = {
    radial:      () => { fwPlayBoom(); fwPlayCrackle(); },
    spiral:      () => { fwPlayBoom(); fwPlayCrackle(); },
    willow:      () => { fwPlayWhoosh(); fwPlayCrackle(); },
    fountain:    fwPlayHiss,
    flash:       fwPlayBang,
    flare:       fwPlayFlareHum,
    strobe:      () => { for (let i = 0; i < 4; i++) setTimeout(fwPlayBeep, i * 160); },
    dart:        fwPlayBuzz,
    rocket:      fwPlayWhistlePop,
    romanCandle: fwPlayPopSeries,
    multi:       () => { fwPlayBoom(); setTimeout(fwPlayBoom, 150); fwPlayCrackle(); },
    groundPop:   () => { for (let i = 0; i < 4; i++) setTimeout(fwPlayGroundPop, i * 90); },
    // --- Sons manquants ajoutés pour les motifs plus récents ---
    kamuroStrobe: () => { fwPlayWhoosh(); for (let i = 0; i < 4; i++) setTimeout(fwPlayBeep, 300 + i * 180); fwPlayCrackle(); },
    ghost:        () => { fwPlayFlareHum(); },
    leaves:       () => { fwPlayBoom(); fwPlayCrackle(); },
    mandala:      () => { fwPlayBoom(); setTimeout(fwPlayBoom, 120); fwPlayCrackle(); },
    ultraGiant:   () => { fwPlayBoom(); setTimeout(fwPlayBoom, 90); setTimeout(fwPlayBoom, 220); fwPlayCrackle(); },
    ensembleBlancDore: () => { fwPlayWhistlePop(); setTimeout(fwPlayHiss, 200); fwPlayCrackle(); },
    heart:              () => { fwPlayBoom(); fwPlayCrackle(); },
    scintillant:        () => { fwPlayBoom(); fwPlayCrackle(); setTimeout(fwPlayCrackle, 300); },
    serpentin:          () => { fwPlayWhoosh(); fwPlayBuzz(); },
    cascade:            fwPlayHiss,
    colorChange:        () => { fwPlayBoom(); setTimeout(fwPlayBoom, 380); fwPlayCrackle(); },
    rafale:             () => { fwPlayBoom(); setTimeout(fwPlayBoom, 280); setTimeout(fwPlayBoom, 560); }
};

let fireworksSoundEnabled = localStorage.getItem('fireworksSoundEnabled') === 'true';

function toggleFireworksSoundSetting(checked) {
    fireworksSoundEnabled = checked;
    localStorage.setItem('fireworksSoundEnabled', checked ? 'true' : 'false');
    if (checked) fwGetAudioCtx(); // débloque l'audio dès le clic (geste utilisateur requis par les navigateurs)
}

function playFireworkSoundForPattern(pattern) {
    if (!fireworksSoundEnabled) return;
    const fn = FW_SOUND_BY_PATTERN[pattern];
    if (fn) fn();
}

// --- launchFireworkRecipe() modifiée : joue le son correspondant, et accepte une "recette"
//     surchargée (utilisé par les feux personnalisés pour appliquer couleurs/taille custom) ---
function launchFireworkRecipe(key, overrideDef) {
    const def = overrideDef || FIREWORK_RECIPES[key];
    if (!def) return;
    playFireworkSoundForPattern(def.pattern);
    const origin = fwRandomOrigin();

    switch (def.pattern) {
        case 'radial':      fwPatternRadial(origin, def); break;
        case 'spiral':       fwPatternSpiral(origin, def); break;
        case 'willow':       fwPatternWillow(origin, def); break;
        case 'fountain':     fwPatternFountain(def); break;
        case 'flash':        fwPatternFlash(origin, def); break;
        case 'flare':         fwPatternFlare(origin, def); break;
        case 'strobe':        fwPatternStrobe(origin, def); break;
        case 'dart':           fwPatternDart(origin, def); break;
        case 'rocket':         fwPatternRocket(def); break;
        case 'romanCandle':    fwPatternRomanCandle(def); break;
        case 'multi':          fwPatternMulti(def); break;
        case 'groundPop':      fwPatternGroundPop(def); break;
        case 'kamuroStrobe':   fwPatternKamuroStrobe(origin, def); break;
        case 'ghost':           fwPatternGhost(origin, def); break;
        case 'leaves':          fwPatternLeaves(origin, def); break;
        case 'mandala':         fwPatternMandala(origin, def); break;
        case 'ultraGiant':       fwPatternUltraGiant(origin, def); break;
        case 'ensembleBlancDore': fwPatternEnsembleBlancDore(origin, def); break;
        case 'heart':              fwPatternHeart(origin, def); break;
        case 'scintillant':        fwPatternScintillant(origin, def); break;
        case 'serpentin':          fwPatternSerpentin(origin, def); break;
        case 'cascade':            fwPatternCascade(origin, def); break;
        case 'colorChange':        fwPatternColorChange(origin, def); break;
        case 'rafale':             fwPatternRafale(origin, def); break;
    }
}

// --- Styles du panneau ---
function injectFireworksManagerStyles() {
    if (document.getElementById('fireworks-manager-inline-style')) return;
    const styleTag = document.createElement('style');
    styleTag.id = 'fireworks-manager-inline-style';
    styleTag.textContent = `
        #fireworks-manager-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: #0d0d0d;
            z-index: 2000;
            flex-direction: column;
            padding: 14px;
            box-sizing: border-box;
        }
        .fwm-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-shrink: 0; }
        .fwm-title { color: var(--spotify-green, #1DB954); font-weight: bold; }
        .fwm-close-btn { background: none; border: none; color: #fff; font-size: 1.6rem; cursor: pointer; line-height: 1; }
        .fwm-sound-row { display: flex; align-items: center; justify-content: space-between; padding: 10px; background: #1a1a1a; border-radius: 10px; margin-bottom: 10px; flex-shrink: 0; }
        .fwm-sound-row span { font-size: 0.85rem; color: #fff; }
        .fwm-scroll { flex: 1; overflow-y: auto; }
        .fwm-section-title { color: var(--text-grey, #b3b3b3); font-weight: bold; font-size: 0.8rem; margin: 10px 0 6px 0; }
        .fwm-perso-title { color: var(--spotify-green, #1DB954) !important; }
        .fwm-row { padding: 8px; border-bottom: 1px solid #222; cursor: pointer; }
        .fwm-row-label { color: #fff; font-size: 0.9rem; margin-bottom: 4px; }
        .fwm-row-controls { display: flex; align-items: center; gap: 6px; }
        .fwm-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
        .fwm-dot.on  { background: var(--spotify-green, #1DB954); box-shadow: 0 0 6px 2px rgba(29, 185, 84, 0.6); }
        .fwm-dot.off { background: #c0392b; }
        .fwm-dot-text { font-size: 0.75rem; color: var(--text-grey, #b3b3b3); }
        .fwm-spectacle-title { margin-top: 0 !important; }
        .fwm-show-row { display: flex; gap: 12px; margin-bottom: 14px; }
        .fwm-show-btn-wrap {
            flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;
            background: #1a1a1a; border-radius: 12px; padding: 12px 8px;
        }
        .fwm-show-btn {
            background: var(--spotify-green, #1DB954); color: #000; border: none; border-radius: 20px;
            padding: 10px 14px; font-weight: bold; font-size: 0.9rem; cursor: pointer; width: 100%;
        }
        .fwm-timeline-outer { display: flex; align-items: stretch; gap: 8px; margin: 10px 0; }
        .fwm-timeline-scroll { flex: 1; overflow-x: auto; overflow-y: hidden; background: #111; border-radius: 8px; height: 90px; }
        .fwm-timeline-track { position: relative; height: 100%; background: linear-gradient(to right, #1a1a1a, #161616); cursor: crosshair; }
        .fwm-timeline-mark {
            position: absolute; top: 0; bottom: 0; border-left: 1px solid #333;
            font-size: 0.6rem; color: var(--text-grey, #b3b3b3); padding-left: 3px; padding-top: 2px; pointer-events: none;
        }
        .fwm-timeline-finale-zone {
            position: absolute; top: 0; bottom: 0;
            background: rgba(212, 175, 55, 0.15); border-left: 1px dashed rgba(212, 175, 55, 0.6); pointer-events: none;
        }
        .fwm-timeline-icon {
            position: absolute; width: 16px; height: 16px; border-radius: 50%; cursor: pointer;
            border: 2px solid rgba(255, 255, 255, 0.45); box-shadow: 0 0 6px rgba(0, 0, 0, 0.6);
            transform: translateX(-50%);
        }
        .fwm-timeline-icon.selected { border-color: var(--spotify-green, #1DB954); box-shadow: 0 0 8px 2px rgba(29, 185, 84, 0.8); }
        .fwm-timeline-zoom { display: flex; flex-direction: column; gap: 4px; }
        .fwm-timeline-zoom button {
            width: 30px; height: 30px; border-radius: 8px; border: none; background: #1a1a1a;
            color: #fff; font-size: 1rem; cursor: pointer;
        }
        .fwm-effects-palette { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; max-height: 150px; overflow-y: auto; }
        .fwm-effect-swatch {
            width: 36px; height: 36px; border-radius: 8px; cursor: pointer; display: flex; align-items: center;
            justify-content: center; font-size: 0.6rem; font-weight: bold; color: #000;
            text-shadow: 0 1px 1px rgba(255, 255, 255, 0.35); flex-shrink: 0; box-sizing: border-box;
        }
        .fwm-show3-item {
            display: flex; align-items: center; justify-content: space-between; padding: 6px 10px;
            background: #1a1a1a; border-radius: 8px; margin-bottom: 4px; font-size: 0.8rem; color: #fff;
        }
        .fwm-show3-remove { color: #ff5252; cursor: pointer; font-weight: bold; padding: 0 4px; }
        .fwm-show3-name-input {
            width: 100%; box-sizing: border-box; background: #121212; color: #fff; border: 1px solid #333;
            border-radius: 8px; padding: 8px; font-size: 0.85rem; margin: 4px 0 10px 0;
        }
        .fwm-palette { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        .fwm-swatch { width: 26px; height: 26px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; box-sizing: border-box; }
        .fwm-swatch.selected { border-color: var(--spotify-green, #1DB954); }
        .fwm-create-btn { background: var(--spotify-green, #1DB954); color: #000; border: none; border-radius: 20px; padding: 8px 16px; font-weight: bold; cursor: pointer; margin-bottom: 12px; display: block; }
        .fwm-custom-chip { background: #1a1a1a; border-radius: 10px; padding: 8px; margin-bottom: 8px; }
        .fwm-custom-chip-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
        .fwm-custom-chip-top span { color: #fff; font-size: 0.85rem; }
        .fwm-custom-chip-bottom { display: flex; gap: 8px; }
        .fwm-custom-chip-bottom button {
            background: none; border: 1px solid var(--spotify-green, #1DB954); color: var(--spotify-green, #1DB954);
            border-radius: 14px; padding: 4px 10px; font-size: 0.75rem; cursor: pointer;
        }
        .fwm-editor { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; }
        .fwm-editor label { font-size: 0.75rem; color: var(--text-grey, #b3b3b3); }
        .fwm-editor select {
            background: #121212; color: #fff; border: 1px solid #333; border-radius: 8px; padding: 6px; font-size: 0.85rem;
        }
        .fwm-editor button {
            background: var(--spotify-green, #1DB954); color: #000; border: none; border-radius: 14px;
            padding: 6px 12px; font-size: 0.8rem; font-weight: bold; cursor: pointer; margin-top: 4px;
        }
        #fireworks-manager-btn {
            background: none; border: 1px solid var(--spotify-green, #1DB954); color: var(--spotify-green, #1DB954);
            border-radius: 20px; padding: 8px 15px; font-size: 0.8rem; font-weight: bold; cursor: pointer;
            display: block; width: 100%; margin-top: 6px; box-sizing: border-box;
        }
    `;
    document.head.appendChild(styleTag);
}
injectFireworksManagerStyles();

function ensureFireworksManagerOverlay() {
    let overlay = document.getElementById('fireworks-manager-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'fireworks-manager-overlay';
        overlay.innerHTML = `
            <div class="fwm-topbar">
                <span class="fwm-title">🎆 Feux d'artifice</span>
                <button class="fwm-close-btn" onclick="toggleFireworksManager()">✕</button>
            </div>
            <div class="fwm-sound-row">
                <span>🔊 Activer les sons</span>
                <label class="switch">
                    <input type="checkbox" id="fwm-sound-toggle" onchange="toggleFireworksSoundSetting(this.checked)">
                    <span class="slider"></span>
                </label>
            </div>
            <div class="fwm-scroll">
                <p class="fwm-section-title fwm-spectacle-title">🎪 Spectacle</p>
                <div class="fwm-show-row">
                    <div class="fwm-show-btn-wrap">
                        <button class="fwm-show-btn" onclick="toggleFireworkShow('1min')">1 min</button>
                        <span class="fwm-dot off" id="fwm-show-dot-1min"></span>
                    </div>
                    <div class="fwm-show-btn-wrap">
                        <button class="fwm-show-btn" onclick="toggleFireworkShow('1min30')">1 min 30</button>
                        <span class="fwm-dot off" id="fwm-show-dot-1min30"></span>
                    </div>
                </div>

                <button class="fwm-create-btn" onclick="toggleFwShow3Form()">🎬 Spectacle 3.0 — créer le mien</button>
                <div id="fwm-show3-form" style="display: none;">
                    <label style="font-size: 0.75rem; color: var(--text-grey);">Nom du spectacle</label>
                    <input type="text" id="fwm-show3-name" class="fwm-show3-name-input" placeholder="Mon spectacle">

                    <div class="fwm-timeline-outer">
                        <div class="fwm-timeline-scroll" id="fwm-timeline-scroll">
                            <div class="fwm-timeline-track" id="fwm-timeline-track"></div>
                        </div>
                        <div class="fwm-timeline-zoom">
                            <button onclick="fwTimelineZoom(1)">+</button>
                            <button onclick="fwTimelineZoom(-1)">−</button>
                        </div>
                    </div>

                    <p class="fwm-section-title">Effets disponibles (clique pour ajouter)</p>
                    <div id="fwm-effects-palette" class="fwm-effects-palette"></div>

                    <p class="fwm-section-title">Effets présents</p>
                    <div id="fwm-show3-list"></div>

                    <button class="fwm-create-btn" onclick="saveCustomShow3()">Enregistrer le spectacle</button>
                </div>
                <div id="fwm-show3-list-saved"></div>

                <div style="height: 18px;"></div>

                <p class="fwm-section-title">40 effets</p>
                <div id="fwm-list"></div>

                <div style="height: 18px;"></div>
                <button class="fwm-create-btn" onclick="toggleFwCreateForm()">➕ Créer un feu personnalisé</button>
                <div id="fwm-create-form" style="display: none;">
                    <p class="fwm-section-title fwm-perso-title">🎨 Personnalisation</p>
                    <div id="fwm-palette" class="fwm-palette"></div>
                    <div class="fwm-editor" id="fwm-new-options">
                        <label>Effet de base</label>
                        <select id="fwm-new-basetype"></select>
                        <label>Taille</label>
                        <select id="fwm-new-size">
                            <option value="aleatoire">Aléatoire</option>
                            <option value="petit">Petit</option>
                            <option value="moyen" selected>Moyen</option>
                            <option value="grand">Grand</option>
                            <option value="très grand">Très grand</option>
                        </select>
                        <label>Nombre simultané</label>
                        <select id="fwm-new-rhythm">
                            <option value="aleatoire">Aléatoire</option>
                            <option value="1" selected>1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                        <label>Délai de réapparition</label>
                        <select id="fwm-new-delay"></select>
                        <button onclick="confirmCreateCustomFirework()">Créer</button>
                    </div>
                </div>
                <div id="fwm-custom-list"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    return overlay;
}

function renderFireworksManagerList() {
    const container = document.getElementById('fwm-list');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(FIREWORK_RECIPES).forEach(key => {
        const def = FIREWORK_RECIPES[key];
        const row = document.createElement('div');
        row.className = 'fwm-row';
        row.innerHTML = `
            <div class="fwm-row-label">${def.label}</div>
            <div class="fwm-row-controls">
                <span class="fwm-dot ${fireworkTypeEnabled[key] ? 'on' : 'off'}" id="fwm-dot-${key}"></span>
                <span class="fwm-dot-text" id="fwm-dot-text-${key}">${fireworkTypeEnabled[key] ? 'Activé' : 'Désactivé'}</span>
            </div>
        `;
        row.onclick = () => {
            const newState = !fireworkTypeEnabled[key];
            toggleFireworkTypeSetting(key, newState);
            const dot = document.getElementById(`fwm-dot-${key}`);
            const txt = document.getElementById(`fwm-dot-text-${key}`);
            if (dot) dot.className = `fwm-dot ${newState ? 'on' : 'off'}`;
            if (txt) txt.innerText = newState ? 'Activé' : 'Désactivé';
        };
        container.appendChild(row);
    });
}

function toggleFireworksManager() {
    const overlay = ensureFireworksManagerOverlay();
    const isClosed = overlay.style.display === 'none' || overlay.style.display === '';
    if (isClosed) {
        overlay.style.display = 'flex';
        renderFireworksManagerList();
        renderCustomFireworksList();
        renderCustomShowsList();
        const soundToggle = document.getElementById('fwm-sound-toggle');
        if (soundToggle) soundToggle.checked = fireworksSoundEnabled;
    } else {
        overlay.style.display = 'none';
    }
}

// --- Créateur de feux d'artifice personnalisés ---
// 18 couleurs + le doré, plus une case "couleur aléatoire" (change de couleur à chaque tir,
// parmi les 19 ci-dessus) — repérable par son dégradé arc-en-ciel plutôt qu'une teinte unique.
const FW_PALETTE_COLORS = [
    '#ff5252', '#ff3366', '#ff8a52', '#ffd452', '#fff45c',
    '#52ff8a', '#7cfc00', '#52c8ff', '#00ffea', '#40e0d0', '#a0e8ff',
    '#4169e1', '#c452ff', '#ff69b4', '#ff1493',
    '#ffffff', '#c0c0c0', '#8b0000',
    '#d4af37' // doré
];
const FW_RANDOM_COLOR_TOKEN = 'random';
let fwCustomBuilderSelectedColors = [];

function fwPickRandomPaletteColor() {
    return FW_PALETTE_COLORS[Math.floor(Math.random() * FW_PALETTE_COLORS.length)];
}

function renderFwPalette() {
    const container = document.getElementById('fwm-palette');
    if (!container) return;
    container.innerHTML = '';

    FW_PALETTE_COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'fwm-swatch' + (fwCustomBuilderSelectedColors.includes(color) ? ' selected' : '');
        swatch.style.background = color;
        swatch.title = color === '#d4af37' ? 'Doré' : color;
        swatch.onclick = () => {
            const idx = fwCustomBuilderSelectedColors.indexOf(color);
            if (idx >= 0) fwCustomBuilderSelectedColors.splice(idx, 1);
            else fwCustomBuilderSelectedColors.push(color);
            renderFwPalette();
        };
        container.appendChild(swatch);
    });

    // Case "couleur aléatoire" : dégradé arc-en-ciel pour la distinguer visuellement des teintes fixes
    const randomSwatch = document.createElement('div');
    randomSwatch.className = 'fwm-swatch' + (fwCustomBuilderSelectedColors.includes(FW_RANDOM_COLOR_TOKEN) ? ' selected' : '');
    randomSwatch.style.background = 'conic-gradient(red, orange, yellow, green, blue, violet, red)';
    randomSwatch.title = 'Couleur aléatoire';
    randomSwatch.onclick = () => {
        const idx = fwCustomBuilderSelectedColors.indexOf(FW_RANDOM_COLOR_TOKEN);
        if (idx >= 0) fwCustomBuilderSelectedColors.splice(idx, 1);
        else fwCustomBuilderSelectedColors.push(FW_RANDOM_COLOR_TOKEN);
        renderFwPalette();
    };
    container.appendChild(randomSwatch);
}

function toggleFwCreateForm() {
    const form = document.getElementById('fwm-create-form');
    if (!form) return;
    const isHidden = form.style.display === 'none' || form.style.display === '';
    form.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        fwCustomBuilderSelectedColors = [];
        renderFwPalette();
        populateFwNewFireworkOptions();
    }
}

function populateFwNewFireworkOptions() {
    const baseSelect = document.getElementById('fwm-new-basetype');
    if (baseSelect && baseSelect.options.length === 0) {
        const randomOpt = document.createElement('option');
        randomOpt.value = FW_RANDOM_TOKEN;
        randomOpt.innerText = 'Aléatoire';
        baseSelect.appendChild(randomOpt);
        Object.keys(FIREWORK_RECIPES).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.innerText = FIREWORK_RECIPES[key].label;
            baseSelect.appendChild(opt);
        });
    }
    const delaySelect = document.getElementById('fwm-new-delay');
    if (delaySelect && delaySelect.options.length === 0) {
        const randomOpt = document.createElement('option');
        randomOpt.value = FW_RANDOM_TOKEN;
        randomOpt.innerText = 'Aléatoire';
        delaySelect.appendChild(randomOpt);
        FW_DELAY_OPTIONS.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.innerText = `${d}s`;
            if (d === 3) opt.selected = true;
            delaySelect.appendChild(opt);
        });
    }
}

let customFireworks = JSON.parse(localStorage.getItem('customFireworksList') || '[]');
let customFireworksCounter = parseInt(localStorage.getItem('customFireworksCounter') || '0', 10);
let customFireworksIntervalIds = {};

function saveCustomFireworksList() {
    localStorage.setItem('customFireworksList', JSON.stringify(customFireworks));
}

function confirmCreateCustomFirework() {
    if (fwCustomBuilderSelectedColors.length === 0) {
        alert("Choisis au moins une couleur avant de créer un feu d'artifice personnalisé.");
        return;
    }
    customFireworksCounter++;
    localStorage.setItem('customFireworksCounter', String(customFireworksCounter));

    const rhythmRaw = document.getElementById('fwm-new-rhythm').value;
    const delayRaw = document.getElementById('fwm-new-delay').value;

    const fw = {
        id: 'custom_' + Date.now(),
        name: String(customFireworksCounter), // "1", puis "2", etc.
        colors: [...fwCustomBuilderSelectedColors],
        baseType: document.getElementById('fwm-new-basetype').value,
        size: document.getElementById('fwm-new-size').value,
        rhythm: rhythmRaw === FW_RANDOM_TOKEN ? FW_RANDOM_TOKEN : parseInt(rhythmRaw, 10),
        delay: delayRaw === FW_RANDOM_TOKEN ? FW_RANDOM_TOKEN : parseFloat(delayRaw),
        enabled: true
    };
    customFireworks.push(fw);
    saveCustomFireworksList();

    fwCustomBuilderSelectedColors = [];
    document.getElementById('fwm-create-form').style.display = 'none';
    renderCustomFireworksList();
    scheduleCustomFirework(fw.id);
}

function deleteCustomFirework(id) {
    customFireworks = customFireworks.filter(f => f.id !== id);
    saveCustomFireworksList();
    if (customFireworksIntervalIds[id]) { clearTimeout(customFireworksIntervalIds[id]); delete customFireworksIntervalIds[id]; }
    renderCustomFireworksList();
}

function toggleCustomFireworkEnabled(id) {
    const fw = customFireworks.find(f => f.id === id);
    if (!fw) return;
    fw.enabled = !fw.enabled;
    saveCustomFireworksList();
    if (customFireworksIntervalIds[id]) { clearTimeout(customFireworksIntervalIds[id]); delete customFireworksIntervalIds[id]; }
    if (fw.enabled) scheduleCustomFirework(id);
    renderCustomFireworksList();
}

// --- Résolution du "Aléatoire" : un choix différent tiré à chaque tir/cycle, pas figé à la création ---
const FW_RANDOM_TOKEN = 'aleatoire';
const FW_SIZE_OPTIONS = ['petit', 'moyen', 'grand', 'très grand'];
const FW_RHYTHM_OPTIONS = [1, 2, 3, 4, 5];
const FW_DELAY_OPTIONS = [0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20];

function fwResolveRandom(value, options) {
    return value === FW_RANDOM_TOKEN ? options[Math.floor(Math.random() * options.length)] : value;
}

const FW_SIZE_MULTIPLIERS = { 'petit': 0.6, 'moyen': 1.0, 'grand': 1.5, 'très grand': 2.2 };

function launchCustomFirework(id) {
    const fw = customFireworks.find(f => f.id === id);
    if (!fw) return;

    const resolvedBaseType = fwResolveRandom(fw.baseType, Object.keys(FIREWORK_RECIPES));
    const baseDef = FIREWORK_RECIPES[resolvedBaseType];
    if (!baseDef) return;
    const resolvedSize = fwResolveRandom(fw.size, FW_SIZE_OPTIONS);
    const mult = FW_SIZE_MULTIPLIERS[resolvedSize] || 1;
    const resolvedRhythm = fwResolveRandom(fw.rhythm, FW_RHYTHM_OPTIONS);

    const scaledDef = {
        ...baseDef,
        count: baseDef.count ? Math.round(baseDef.count * mult) : baseDef.count,
        size: baseDef.size ? baseDef.size.map(s => s * mult) : baseDef.size,
        distance: baseDef.distance ? baseDef.distance.map(d => d * mult) : baseDef.distance,
        fallDistance: baseDef.fallDistance ? baseDef.fallDistance.map(d => d * mult) : baseDef.fallDistance,
        duration: baseDef.duration ? Math.round(baseDef.duration * (0.9 + mult * 0.2)) : baseDef.duration
    };

    for (let r = 0; r < resolvedRhythm; r++) {
        // La case "couleur aléatoire" est résolue ici, à chaque tir (pas une fois pour toutes à la
        // création) : si elle est cochée, une couleur différente est tirée parmi la palette à chaque lancement.
        const perShotDef = { ...scaledDef, colors: fw.colors.map(c => c === FW_RANDOM_COLOR_TOKEN ? fwPickRandomPaletteColor() : c) };
        setTimeout(() => launchFireworkRecipe(resolvedBaseType, perShotDef), r * 120);
    }
}

function scheduleCustomFirework(id) {
    const fw = customFireworks.find(f => f.id === id);
    if (!fw || !fw.enabled) return;
    const resolvedDelay = fwResolveRandom(fw.delay, FW_DELAY_OPTIONS);
    const delayMs = resolvedDelay * 1000;
    customFireworksIntervalIds[id] = setTimeout(() => {
        const stillExists = customFireworks.find(f => f.id === id);
        if (stillExists && stillExists.enabled) launchCustomFirework(id);
        scheduleCustomFirework(id);
    }, delayMs);
}

function initCustomFireworks() {
    customFireworks.forEach(fw => { if (fw.enabled) scheduleCustomFirework(fw.id); });
}

// ==========================================
// SPECTACLE — 2 boutons (1 min / 1 min 30), lancent un enchaînement automatique de tirs parmi
// les 40 effets, qui s'intensifie et se termine par un bouquet final. Un point rouge/vert indique
// si un spectacle est en cours ; recliquer l'arrête et réinitialise (le suivant repart de 0).
// ==========================================
// SPECTACLE — 2 boutons (1 min / 1 min 30), déroulé en plusieurs phases (ouverture → montée →
// avant-finale → bouquet final), avec variété (pas de répétition immédiate du même effet) et un
// bouquet final dense en fin de spectacle. Un point rouge/vert indique si un spectacle est en
// cours ; recliquer l'arrête et réinitialise (le suivant repart de 0).
// ==========================================
let fireworkShowActive = false;
let fireworkShowKey = null; // '1min', '1min30', ou 'custom_<id>' pour un spectacle 3.0
let fireworkShowTimeoutIds = [];
let fireworkShowRecentKeys = []; // anti-répétition : évite de tirer 2x le même effet d'affilée
let activeCustomShowId = null; // id du spectacle 3.0 en cours de lecture, le cas échéant

function updateFireworkShowDots() {
    ['1min', '1min30'].forEach(key => {
        const dot = document.getElementById(`fwm-show-dot-${key}`);
        if (!dot) return;
        const isThisOne = fireworkShowActive && fireworkShowKey === key;
        dot.className = `fwm-dot ${isThisOne ? 'on' : 'off'}`;
    });
    renderCustomShowsList();
}

function stopFireworkShow() {
    fireworkShowActive = false;
    fireworkShowKey = null;
    activeCustomShowId = null;
    fireworkShowRecentKeys = [];
    fireworkShowTimeoutIds.forEach(id => clearTimeout(id));
    fireworkShowTimeoutIds = [];
    updateFireworkShowDots();
}

// Tire une recette au hasard, en évitant les 3 derniers effets déjà utilisés (variété du spectacle).
// "pool" optionnel : restreint le tirage à une liste de recettes plus "spectaculaires" pour les
// moments forts (avant-finale, bouquet final).
function fwShowPickRecipe(pool) {
    const candidates = pool || Object.keys(FIREWORK_RECIPES);
    let choices = candidates.filter(k => !fireworkShowRecentKeys.includes(k));
    if (choices.length === 0) choices = candidates;
    const key = choices[Math.floor(Math.random() * choices.length)];
    fireworkShowRecentKeys.push(key);
    if (fireworkShowRecentKeys.length > 3) fireworkShowRecentKeys.shift();
    return key;
}

function fwShowLaunch(key) {
    if (fireworkShowActive) launchFireworkRecipe(key);
}

// Effets particulièrement spectaculaires, privilégiés dans les moments forts du spectacle
const FW_SHOW_GRAND_POOL = ['ultraGeant', 'bouquetBlancDore', 'geants', 'bombeArtifice', 'mortier', 'bouquet', 'crossette', 'coeur', 'rafale', 'cascadeNiagara'];

function toggleFireworkShow(key) {
    // Reclique pendant un spectacle en cours (le même bouton, ou l'autre) : on arrête et on réinitialise
    if (fireworkShowActive) {
        stopFireworkShow();
        return;
    }

    const durationMs = key === '1min30' ? 90000 : 60000;
    const finaleDurationMs = key === '1min30' ? 15000 : 10000; // demandé : 10s pour 1 min, 15s pour 1 min 30
    const finaleStartAt = durationMs - finaleDurationMs;

    fireworkShowActive = true;
    fireworkShowKey = key;
    fireworkShowRecentKeys = [];
    updateFireworkShowDots();

    let elapsed = 0;

    // --- Phase 1 : ouverture — tirs simples et espacés, pour installer l'ambiance ---
    function runOpening() {
        const openingEnd = finaleStartAt * 0.2;
        if (elapsed >= openingEnd) { runBuildUp(); return; }
        const delay = 1100 + Math.random() * 500;
        const id = setTimeout(() => {
            if (!fireworkShowActive) return;
            fwShowLaunch(fwShowPickRecipe());
            elapsed += delay;
            runOpening();
        }, delay);
        fireworkShowTimeoutIds.push(id);
    }

    // --- Phase 2 : montée — rythme plus soutenu, quelques doubles tirs ---
    function runBuildUp() {
        const buildEnd = finaleStartAt * 0.65;
        if (elapsed >= buildEnd) { runPreFinale(); return; }
        const delay = 750 + Math.random() * 350;
        const id = setTimeout(() => {
            if (!fireworkShowActive) return;
            fwShowLaunch(fwShowPickRecipe());
            if (Math.random() < 0.3) {
                setTimeout(() => fwShowLaunch(fwShowPickRecipe()), 150);
            }
            elapsed += delay;
            runBuildUp();
        }, delay);
        fireworkShowTimeoutIds.push(id);
    }

    // --- Phase 3 : avant-finale — plus rapide, effets plus spectaculaires, souvent 2-3 tirs à la fois ---
    function runPreFinale() {
        if (elapsed >= finaleStartAt) { runFinale(); return; }
        const delay = 450 + Math.random() * 250;
        const id = setTimeout(() => {
            if (!fireworkShowActive) return;
            const shots = 1 + Math.floor(Math.random() * 2); // 1 à 2 tirs simultanés
            for (let s = 0; s < shots; s++) {
                setTimeout(() => fwShowLaunch(fwShowPickRecipe(Math.random() < 0.4 ? FW_SHOW_GRAND_POOL : null)), s * 130);
            }
            elapsed += delay;
            runPreFinale();
        }, delay);
        fireworkShowTimeoutIds.push(id);
    }

    // --- Phase 4 : bouquet final — vagues denses et rapprochées, effets spectaculaires en priorité,
    //     jusqu'à un dernier tir massif tout à la fin ---
    function runFinale() {
        const finaleWaves = Math.round(finaleDurationMs / 700); // une vague toutes les ~700ms
        for (let w = 0; w < finaleWaves; w++) {
            const id = setTimeout(() => {
                if (!fireworkShowActive) return;
                const shotsInWave = 2 + Math.floor(Math.random() * 3); // 2 à 4 tirs simultanés par vague
                for (let s = 0; s < shotsInWave; s++) {
                    setTimeout(() => {
                        if (fireworkShowActive) fwShowLaunch(fwShowPickRecipe(FW_SHOW_GRAND_POOL));
                    }, s * 80);
                }
            }, (finaleDurationMs / finaleWaves) * w);
            fireworkShowTimeoutIds.push(id);
        }

        // Bouquet ultime, tout à la fin : plusieurs très gros effets tirés d'un coup
        const grandFinaleId = setTimeout(() => {
            if (!fireworkShowActive) return;
            ['ultraGeant', 'bouquetBlancDore', 'ultraGeant', 'bombeArtifice', 'bouquet'].forEach((k, i) => {
                setTimeout(() => { if (fireworkShowActive) launchFireworkRecipe(k); }, i * 110);
            });
        }, Math.max(finaleDurationMs - 900, 0));
        fireworkShowTimeoutIds.push(grandFinaleId);

        // Fin du spectacle : remet le bouton/point à l'état par défaut
        const endId = setTimeout(() => {
            if (fireworkShowActive) stopFireworkShow();
        }, finaleDurationMs + 500);
        fireworkShowTimeoutIds.push(endId);
    }

    runOpening();
}

// ==========================================
// SPECTACLE 3.0 — éditeur de timeline : on pose les effets à la main sur une barre de temps
// fixe de 2 minutes, on les repositionne en cliquant, on zoome/dézoome et on peut faire défiler
// la barre quand elle est zoomée. Très différent des 2 spectacles automatiques ci-dessus.
// ==========================================
const FW_SHOW3_DURATION = 120; // durée fixe du spectacle : 2 minutes
let fwShow3Effects = [];        // [{ id, recipeKey, timeSec }] du spectacle en cours d'édition
let fwShow3PxPerSec = 4;        // échelle de zoom (pixels par seconde)
let fwShow3SelectedId = null;   // icône sélectionnée sur la timeline, en attente d'un nouveau clic pour la déplacer
let fwShow3EditingId = null;    // id du spectacle enregistré en cours de modification (null = nouvelle création)

let customShows = JSON.parse(localStorage.getItem('customShowsList') || '[]');
let customShowsCounter = parseInt(localStorage.getItem('customShowsCounter') || '0', 10);

function fwFormatShowTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.round(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

function toggleFwShow3Form() {
    const form = document.getElementById('fwm-show3-form');
    if (!form) return;
    const isHidden = form.style.display === 'none' || form.style.display === '';
    form.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        if (!fwShow3EditingId) {
            fwShow3Effects = [];
            const nameInput = document.getElementById('fwm-show3-name');
            if (nameInput) nameInput.value = '';
        }
        fwShow3SelectedId = null;
        renderFwEffectsPalette();
        renderFwTimeline();
        renderFwShow3List();
    }
}

function fwTimelineZoom(direction) {
    fwShow3PxPerSec = Math.max(2, Math.min(30, fwShow3PxPerSec + direction * 2));
    renderFwTimeline();
}

// Couleurs de chaque effet dans la palette : reprend directement ses propres couleurs de recette
// (pas d'icône par effet à trouver pour 40 effets — plus lisible et cohérent visuellement)
function renderFwEffectsPalette() {
    const container = document.getElementById('fwm-effects-palette');
    if (!container) return;
    container.innerHTML = '';
    Object.keys(FIREWORK_RECIPES).forEach(key => {
        const def = FIREWORK_RECIPES[key];
        const swatch = document.createElement('div');
        swatch.className = 'fwm-effect-swatch';
        const c1 = (def.colors && def.colors[0]) || '#1DB954';
        const c2 = (def.colors && def.colors[1]) || c1;
        swatch.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
        swatch.title = def.label;
        swatch.innerText = def.label.slice(0, 2).toUpperCase();
        swatch.onclick = () => fwShow3AddEffect(key);
        container.appendChild(swatch);
    });
}

// Ajoute l'effet cliqué au premier créneau libre de la timeline (espacé d'au moins 1s des autres)
function fwShow3AddEffect(recipeKey) {
    let t = 0;
    while (fwShow3Effects.some(e => Math.abs(e.timeSec - t) < 1) && t < FW_SHOW3_DURATION) t += 3;
    t = Math.min(t, FW_SHOW3_DURATION - 1);
    fwShow3Effects.push({ id: 'fx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), recipeKey, timeSec: t });
    renderFwTimeline();
    renderFwShow3List();
}

function fwShow3RemoveEffect(id) {
    fwShow3Effects = fwShow3Effects.filter(e => e.id !== id);
    if (fwShow3SelectedId === id) fwShow3SelectedId = null;
    renderFwTimeline();
    renderFwShow3List();
}

// Clic sur la timeline : si une icône est sélectionnée, la déplace à l'endroit cliqué (réajustement
// facile en 2 clics : je clique l'icône à déplacer, puis je clique son nouvel emplacement)
function fwShow3HandleTrackClick(e) {
    if (!fwShow3SelectedId) return;
    const track = document.getElementById('fwm-timeline-track');
    const rect = track.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    let timeSec = xPx / fwShow3PxPerSec;
    timeSec = Math.round(timeSec * 2) / 2; // aimantation à 0,5s
    timeSec = Math.max(0, Math.min(FW_SHOW3_DURATION, timeSec));

    const effect = fwShow3Effects.find(x => x.id === fwShow3SelectedId);
    if (effect) effect.timeSec = timeSec;
    fwShow3SelectedId = null;
    renderFwTimeline();
    renderFwShow3List();
}

function renderFwTimeline() {
    const track = document.getElementById('fwm-timeline-track');
    if (!track) return;
    const widthPx = FW_SHOW3_DURATION * fwShow3PxPerSec;
    track.style.width = `${widthPx}px`;
    track.onclick = fwShow3HandleTrackClick;
    track.innerHTML = '';

    const gradStep = fwShow3PxPerSec > 12 ? 5 : (fwShow3PxPerSec > 5 ? 10 : 15);
    for (let t = 0; t <= FW_SHOW3_DURATION; t += gradStep) {
        const mark = document.createElement('div');
        mark.className = 'fwm-timeline-mark';
        mark.style.left = `${t * fwShow3PxPerSec}px`;
        mark.innerText = fwFormatShowTime(t);
        track.appendChild(mark);
    }

    const finaleZone = document.createElement('div');
    finaleZone.className = 'fwm-timeline-finale-zone';
    finaleZone.style.left = `${(FW_SHOW3_DURATION - 20) * fwShow3PxPerSec}px`;
    finaleZone.style.width = `${20 * fwShow3PxPerSec}px`;
    track.appendChild(finaleZone);

    const sorted = [...fwShow3Effects].sort((a, b) => a.timeSec - b.timeSec);
    const groupThresholdSec = 16 / fwShow3PxPerSec;
    const groups = [];
    sorted.forEach(effect => {
        let group = groups.find(g => Math.abs(g.timeSec - effect.timeSec) < groupThresholdSec);
        if (!group) { group = { timeSec: effect.timeSec, items: [] }; groups.push(group); }
        group.items.push(effect);
    });

    groups.forEach(group => {
        group.items.forEach((effect, i) => {
            const def = FIREWORK_RECIPES[effect.recipeKey];
            const icon = document.createElement('div');
            icon.className = 'fwm-timeline-icon' + (fwShow3SelectedId === effect.id ? ' selected' : '');
            icon.style.left = `${effect.timeSec * fwShow3PxPerSec}px`;
            icon.style.bottom = `${6 + i * 20}px`;
            icon.style.background = (def.colors && def.colors[0]) || '#1DB954';
            icon.title = `${def.label} — ${fwFormatShowTime(effect.timeSec)}`;
            icon.onclick = (e) => {
                e.stopPropagation();
                fwShow3SelectedId = (fwShow3SelectedId === effect.id) ? null : effect.id;
                renderFwTimeline();
            };
            track.appendChild(icon);
        });
    });
}

function renderFwShow3List() {
    const container = document.getElementById('fwm-show3-list');
    if (!container) return;
    if (fwShow3Effects.length === 0) {
        container.innerHTML = "<p style='font-size:0.8rem; color:var(--text-grey); margin:4px 0;'>Aucun effet placé pour l'instant — clique sur un effet ci-dessus.</p>";
        return;
    }
    const sorted = [...fwShow3Effects].sort((a, b) => a.timeSec - b.timeSec);
    container.innerHTML = sorted.map(effect => {
        const def = FIREWORK_RECIPES[effect.recipeKey];
        return `<div class="fwm-show3-item">
            <span>${fwFormatShowTime(effect.timeSec)} — ${def.label}</span>
            <span class="fwm-show3-remove" onclick="fwShow3RemoveEffect('${effect.id}')">✕</span>
        </div>`;
    }).join('');
}

function saveCustomShow3() {
    const nameInput = document.getElementById('fwm-show3-name');
    const name = (nameInput.value || '').trim();
    if (!name) { alert("Donne un nom à ton spectacle."); return; }
    if (fwShow3Effects.length === 0) { alert("Place au moins un effet sur la timeline."); return; }

    if (fwShow3EditingId) {
        const show = customShows.find(s => s.id === fwShow3EditingId);
        if (show) { show.name = name; show.effects = fwShow3Effects.map(e => ({ ...e })); }
    } else {
        customShowsCounter++;
        localStorage.setItem('customShowsCounter', String(customShowsCounter));
        customShows.push({
            id: 'show_' + Date.now(),
            name,
            effects: fwShow3Effects.map(e => ({ ...e }))
        });
    }
    localStorage.setItem('customShowsList', JSON.stringify(customShows));

    fwShow3Effects = [];
    fwShow3EditingId = null;
    fwShow3SelectedId = null;
    document.getElementById('fwm-show3-form').style.display = 'none';
    renderCustomShowsList();
}

function editCustomShow(id) {
    const show = customShows.find(s => s.id === id);
    if (!show) return;
    fwShow3EditingId = id;
    fwShow3Effects = show.effects.map(e => ({ ...e }));
    document.getElementById('fwm-show3-name').value = show.name;
    document.getElementById('fwm-show3-form').style.display = 'block';
    renderFwEffectsPalette();
    renderFwTimeline();
    renderFwShow3List();
}

function deleteCustomShow(id) {
    customShows = customShows.filter(s => s.id !== id);
    localStorage.setItem('customShowsList', JSON.stringify(customShows));
    if (activeCustomShowId === id) stopFireworkShow();
    renderCustomShowsList();
}

function toggleCustomShow(id) {
    if (fireworkShowActive) {
        const wasThisOne = activeCustomShowId === id;
        stopFireworkShow();
        if (wasThisOne) return;
    }
    const show = customShows.find(s => s.id === id);
    if (!show || show.effects.length === 0) return;

    fireworkShowActive = true;
    fireworkShowKey = 'custom_' + id;
    activeCustomShowId = id;
    updateFireworkShowDots();

    show.effects.forEach(effect => {
        const timeoutId = setTimeout(() => {
            if (fireworkShowActive && activeCustomShowId === id) launchFireworkRecipe(effect.recipeKey);
        }, effect.timeSec * 1000);
        fireworkShowTimeoutIds.push(timeoutId);
    });

    const lastTime = Math.max(...show.effects.map(e => e.timeSec));
    const endId = setTimeout(() => {
        if (fireworkShowActive && activeCustomShowId === id) stopFireworkShow();
    }, (lastTime + 3) * 1000);
    fireworkShowTimeoutIds.push(endId);
}

function renderCustomShowsList() {
    const container = document.getElementById('fwm-show3-list-saved');
    if (!container) return;
    container.innerHTML = '';
    customShows.forEach(show => {
        const chip = document.createElement('div');
        chip.className = 'fwm-custom-chip';
        chip.innerHTML = `
            <div class="fwm-custom-chip-top">
                <span>🎬 ${show.name}</span>
                <span class="fwm-dot ${activeCustomShowId === show.id ? 'on' : 'off'}" onclick="toggleCustomShow('${show.id}')"></span>
            </div>
            <div class="fwm-custom-chip-bottom">
                <button onclick="editCustomShow('${show.id}')">✏️ Modifier</button>
                <button onclick="deleteCustomShow('${show.id}')">✕</button>
            </div>
        `;
        container.appendChild(chip);
    });
}

let fwEditorSelectedColors = {}; // { customFireworkId: ['#ff5252', 'random', ...] }

function buildCustomFireworkEditorHtml(fw) {
    const baseOptions = `<option value="${FW_RANDOM_TOKEN}" ${fw.baseType === FW_RANDOM_TOKEN ? 'selected' : ''}>Aléatoire</option>` +
        Object.keys(FIREWORK_RECIPES).map(k =>
            `<option value="${k}" ${fw.baseType === k ? 'selected' : ''}>${FIREWORK_RECIPES[k].label}</option>`
        ).join('');
    const sizeOptions = `<option value="${FW_RANDOM_TOKEN}" ${fw.size === FW_RANDOM_TOKEN ? 'selected' : ''}>Aléatoire</option>` +
        FW_SIZE_OPTIONS.map(s =>
            `<option value="${s}" ${fw.size === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>`
        ).join('');
    const rhythmOptions = `<option value="${FW_RANDOM_TOKEN}" ${fw.rhythm === FW_RANDOM_TOKEN ? 'selected' : ''}>Aléatoire</option>` +
        FW_RHYTHM_OPTIONS.map(r =>
            `<option value="${r}" ${fw.rhythm === r ? 'selected' : ''}>${r}</option>`
        ).join('');
    const delayOptions = `<option value="${FW_RANDOM_TOKEN}" ${fw.delay === FW_RANDOM_TOKEN ? 'selected' : ''}>Aléatoire</option>` +
        FW_DELAY_OPTIONS.map(d =>
            `<option value="${d}" ${fw.delay === d ? 'selected' : ''}>${d}s</option>`
        ).join('');

    return `
        <div class="fwm-editor">
            <label>🎨 Couleurs</label>
            <div id="fwm-edit-palette-${fw.id}" class="fwm-palette"></div>
            <label>Effet de base</label>
            <select id="fwm-edit-basetype-${fw.id}">${baseOptions}</select>
            <label>Taille</label>
            <select id="fwm-edit-size-${fw.id}">${sizeOptions}</select>
            <label>Nombre simultané</label>
            <select id="fwm-edit-rhythm-${fw.id}">${rhythmOptions}</select>
            <label>Délai de réapparition</label>
            <select id="fwm-edit-delay-${fw.id}">${delayOptions}</select>
            <button onclick="saveCustomFireworkEdits('${fw.id}')">Enregistrer</button>
        </div>
    `;
}

// Rendu de la palette DANS le formulaire d'édition d'un feu déjà créé — même liste de couleurs
// que la création, mais avec la sélection déjà en place (les couleurs actuelles du feu édité).
function renderFwEditorPalette(fw) {
    const container = document.getElementById(`fwm-edit-palette-${fw.id}`);
    if (!container) return;
    if (!fwEditorSelectedColors[fw.id]) fwEditorSelectedColors[fw.id] = [...fw.colors];
    const selected = fwEditorSelectedColors[fw.id];

    container.innerHTML = '';
    FW_PALETTE_COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'fwm-swatch' + (selected.includes(color) ? ' selected' : '');
        swatch.style.background = color;
        swatch.title = color === '#d4af37' ? 'Doré' : color;
        swatch.onclick = () => {
            const idx = selected.indexOf(color);
            if (idx >= 0) selected.splice(idx, 1);
            else selected.push(color);
            renderFwEditorPalette(fw);
        };
        container.appendChild(swatch);
    });

    const randomSwatch = document.createElement('div');
    randomSwatch.className = 'fwm-swatch' + (selected.includes(FW_RANDOM_COLOR_TOKEN) ? ' selected' : '');
    randomSwatch.style.background = 'conic-gradient(red, orange, yellow, green, blue, violet, red)';
    randomSwatch.title = 'Couleur aléatoire';
    randomSwatch.onclick = () => {
        const idx = selected.indexOf(FW_RANDOM_COLOR_TOKEN);
        if (idx >= 0) selected.splice(idx, 1);
        else selected.push(FW_RANDOM_COLOR_TOKEN);
        renderFwEditorPalette(fw);
    };
    container.appendChild(randomSwatch);
}

function openCustomFireworkEditor(id) {
    const container = document.getElementById(`fwm-editor-${id}`);
    if (!container) return;
    const fw = customFireworks.find(f => f.id === id);
    if (!fw) return;
    const isHidden = container.style.display === 'none' || container.style.display === '';
    container.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        container.innerHTML = buildCustomFireworkEditorHtml(fw);
        renderFwEditorPalette(fw);
    }
}

function saveCustomFireworkEdits(id) {
    const fw = customFireworks.find(f => f.id === id);
    if (!fw) return;

    const selectedColors = fwEditorSelectedColors[id];
    if (!selectedColors || selectedColors.length === 0) {
        alert("Choisis au moins une couleur.");
        return;
    }

    const rhythmRaw = document.getElementById(`fwm-edit-rhythm-${id}`).value;
    const delayRaw = document.getElementById(`fwm-edit-delay-${id}`).value;

    fw.colors = [...selectedColors];
    fw.baseType = document.getElementById(`fwm-edit-basetype-${id}`).value;
    fw.size = document.getElementById(`fwm-edit-size-${id}`).value;
    fw.rhythm = rhythmRaw === FW_RANDOM_TOKEN ? FW_RANDOM_TOKEN : parseInt(rhythmRaw, 10);
    fw.delay = delayRaw === FW_RANDOM_TOKEN ? FW_RANDOM_TOKEN : parseFloat(delayRaw);
    saveCustomFireworksList();
    delete fwEditorSelectedColors[id];
    if (customFireworksIntervalIds[id]) { clearTimeout(customFireworksIntervalIds[id]); delete customFireworksIntervalIds[id]; }
    if (fw.enabled) scheduleCustomFirework(id);
    document.getElementById(`fwm-editor-${id}`).style.display = 'none';
}

function renderCustomFireworksList() {
    const container = document.getElementById('fwm-custom-list');
    if (!container) return;
    container.innerHTML = '';
    customFireworks.forEach(fw => {
        const chip = document.createElement('div');
        chip.className = 'fwm-custom-chip';
        chip.innerHTML = `
            <div class="fwm-custom-chip-top">
                <span>Personnalisé ${fw.name}</span>
                <span class="fwm-dot ${fw.enabled ? 'on' : 'off'}" onclick="toggleCustomFireworkEnabled('${fw.id}')"></span>
            </div>
            <div class="fwm-custom-chip-bottom">
                <button onclick="openCustomFireworkEditor('${fw.id}')">⚙️ Personnaliser</button>
                <button onclick="deleteCustomFirework('${fw.id}')">✕</button>
            </div>
            <div id="fwm-editor-${fw.id}" style="display: none;"></div>
        `;
        container.appendChild(chip);
    });
}
