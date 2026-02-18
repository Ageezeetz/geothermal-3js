import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// --- DOM ELEMENTS ---
const hud = document.getElementById('hud');
const pitchOverlay = document.getElementById('pitchOverlay');

// --- DATA ---
const companyData = [
    {
        id: "borobotics",
        name: "Borobotics",
        color: 0x7aff7a,
        coords: { x: 75, y: 15 },
        bubbleRadius: 180,
        houseCount: 150,
        emoji: "🤖",
        location: "Switzerland",
        description: "The 'World's Strongest Worm'—a silent, automated 150kg metal drill that redefines urban geothermal precision.",
        bullets: [
            "300m shallow depth precision",
            "86% reduction in drill emissions",
            "Single-worker remote operation",
            "Automatic artesian failsafe"
        ]
    },
    // ... add the other companies here following the same format
];

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 150);

let targetCamPos = new THREE.Vector3(0, 0, 150);
let isAutopilot = false;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- TEXTURE HELPER ---
function createEmojiTexture(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '80px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

// --- HQ GENERATION ---
const hq = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏢') }));
hq.scale.set(8, 9, 1);
hq.position.set(0, 0, 0);
hq.renderOrder = 3;
hq.userData = { isHQ: true };
scene.add(hq);

// --- COMPANY GENERATION ---
const secondaryNodes = [];
companyData.forEach((data) => {
    const r = Math.sqrt(data.bubbleRadius) * 2.5; 
    const secNode = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture(data.emoji) }));
    secNode.scale.set(6, 6, 1);
    secNode.position.set(data.coords.x, data.coords.y, 0);
    secNode.renderOrder = 2;
    secNode.userData = { ...data, actualR: r };

    // Perimeter
    const curve = new THREE.EllipseCurve(0, 0, r, r);
    const circumference = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
        new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.4 })
    );
    circumference.scale.set(0.175, 0.175, 1); 
    secNode.add(circumference);

    // Connection to HQ
    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), secNode.position]);
    const mainLine = new THREE.Line(lineGeom, new THREE.LineDashedMaterial({ color: data.color, dashSize: 1, gapSize: 0.5, transparent: true, opacity: 0.5 }));
    mainLine.computeLineDistances();
    scene.add(mainLine);
    secNode.mainLine = mainLine;

    // Houses
    for (let i = 0; i < data.houseCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = r * (0.3 + Math.random() * 0.6); 
        const home = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏠') }));
        home.scale.set(1.5, 1.5, 1);
        home.position.set(secNode.position.x + Math.cos(angle) * dist, secNode.position.y + Math.sin(angle) * dist, 0);
        scene.add(home);
        
        const tLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([secNode.position, home.position]),
            new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.15 })
        );
        scene.add(tLine);
    }
    scene.add(secNode);
    secondaryNodes.push(secNode);
});

// --- UI FUNCTIONS ---
window.resetCamera = () => {
    targetCamPos.set(0, 0, 150);
    isAutopilot = true;
    hud.style.display = 'none';
};

window.closePitchDeck = () => {
    pitchOverlay.style.display = 'none';
    window.resetCamera();
};

window.showCompanyHUD = (d, pos) => {
    isAutopilot = true;
    targetCamPos.set(pos.x, pos.y, (d.actualR * 1.25) / Math.tan((camera.fov * Math.PI / 180) / 2));

    hud.style.display = 'block';
    hud.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 class="hud-title">${d.name} ${d.emoji}</h2>
            <span onclick="window.resetCamera()" style="cursor:pointer; font-size:18px;">✕</span>
        </div>
        <div class="hud-location">${d.location}</div>
        <div class="hud-desc">${d.description}</div>
        <ul class="hud-list">
            ${d.bullets.map(b => `<li>${b}</li>`).join('')}
        </ul>
    `;
};

window.showPitchDeck = () => {
    isAutopilot = true;
    targetCamPos.set(0, 0, 45);
    pitchOverlay.style.display = 'block';
    pitchOverlay.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <h1 style="margin:0; color:cyan; font-size:32px;">GEOCORE GLOBAL</h1>
                <p style="margin:5px 0 0 0; color:#888; font-size:14px;">RENEWABLE ENERGY ACCELERATOR</p>
            </div>
            <button class="close-btn" onclick="window.closePitchDeck()">ESC to Close</button>
        </div>

        <div style="margin-top:40px;">
            <p style="font-size:18px; line-height:1.8; color:#eee;">
                The future of energy production isn't just about renewables—it's about <b>stability</b>. Geothermal is the only source that runs 24/7, regardless of weather.
            </p>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:40px; margin-top:30px;">
                <section>
                    <h3>The Proposal</h3>
                    <p style="font-size:14px; color:#cbd5e0; line-height:1.7;">
                        By investing in shallow-drilling technology today, we secure a first-mover advantage in a market that will become the backbone of the grid. We prepare for the future while others react to it.
                    </p>
                </section>
                <section>
                    <h3>The Impact</h3>
                    <p style="font-size:14px; color:#cbd5e0; line-height:1.7;">
                        Widespread geothermal makes heating and electricity cheaper. We provide consistent energy to those who need it most, ensuring clean accessibility for every community.
                    </p>
                </section>
            </div>

            <div style="margin-top:40px; padding:30px; background:rgba(0,255,255,0.04); border-radius:15px; border:1px solid rgba(0,255,255,0.1);">
                <h3 style="margin-top:0;">Our Ecosystem</h3>
                <p style="font-size:14px; line-height:1.8; margin:0;">
                    We funnel strategic investment into elite drilling partners. In return, we secure a share of the energy production—building a <b>global, resilient supply network</b> to power our customer base.
                </p>
            </div>
        </div>
    `;
};

// --- EVENTS ---
window.addEventListener('mousedown', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    const hqHit = raycaster.intersectObject(hq);
    const companyHits = raycaster.intersectObjects(secondaryNodes);

    if (hqHit.length > 0) window.showPitchDeck();
    else if (companyHits.length > 0) window.showCompanyHUD(companyHits[0].object.userData, companyHits[0].object.position);
    else if (pitchOverlay.style.display !== 'block') window.resetCamera();
});

window.addEventListener('wheel', (e) => {
    if (pitchOverlay.style.display === 'block') return; // Disable zoom
    isAutopilot = false; 
    camera.position.z = Math.max(30, Math.min(camera.position.z + e.deltaY * 0.1, 400));
});

window.addEventListener('keydown', (e) => { if (e.key === "Escape") window.closePitchDeck(); });

// --- LOOP ---
function animate() {
    requestAnimationFrame(animate);
    if (isAutopilot) {
        camera.position.lerp(targetCamPos, 0.08);
        if (camera.position.distanceTo(targetCamPos) < 0.1) isAutopilot = false;
    }
    secondaryNodes.forEach(n => { if (n.mainLine) n.mainLine.material.dashOffset -= 0.01; });
    renderer.render(scene, camera);
}
animate();