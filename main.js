import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// --- DOM ELEMENTS ---
const hud = document.getElementById('hud');
const pitchOverlay = document.getElementById('pitchOverlay');
const titleScreen = document.getElementById('titleScreen');
const enterBtn = document.getElementById('enterBtn');

// --- TITLE SCREEN LOGIC ---
enterBtn.addEventListener('click', () => {
    titleScreen.style.opacity = '0';
    setTimeout(() => {
        titleScreen.style.visibility = 'hidden';
    }, 1000);
});

// --- 1. DATA ---
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
        description: "The 'World's Strongest Worm'—a silent, automated 150kg drill redefining urban geothermal installation.",
        bullets: ["300m shallow depth precision", "86% lower emission profile", "Single-worker remote control"]
    },
    {
        id: "dig_energy",
        name: "Dig Energy",
        color: 0x00ffff,
        coords: { x: -25, y: -25 },
        bubbleRadius: 120, 
        houseCount: 90,
        emoji: "💧",
        location: "USA (Texas)",
        description: "Proprietary water-jet boring that slashes traditional drilling costs by 80% for decentralized energy.",
        bullets: ["Hardware-as-a-Service model", "Water-jet boring tech", "Minimal surface footprint"]
    },
    {
        id: "fervo_energy",
        name: "Fervo Energy",
        color: 0xff7a18,
        coords: { x: -60, y: -5 },
        bubbleRadius: 250, 
        houseCount: 220,
        emoji: "🔥",
        location: "USA (Nevada)",
        description: "A pioneer in horizontal drilling, turning hot rock into consistent, 24/7 carbon-free power.",
        bullets: ["Fiber optic heat telemetry", "AI-optimized heat mining", "24/7 baseload reliability"]
    },
    {
        id: "dandelion",
        name: "Dandelion Energy",
        color: 0xffff00,
        coords: { x: 10, y: 15 },
        bubbleRadius: 160, 
        houseCount: 180,
        emoji: "🌻",
        location: "USA (Northeast)",
        description: "Google X spinoff bringing geothermal to backyards by replacing gas furnaces with clean pumps.",
        bullets: ["Residential heat-pump leader", "4x more efficient than gas", "Smart home ecosystem sync"]
    },
    {
        id: "celsius",
        name: "Celsius Energy",
        color: 0xff00ff,
        coords: { x: 70, y: 10 },
        bubbleRadius: 140, 
        houseCount: 130,
        emoji: "🏙️",
        location: "France",
        description: "Specialists in slanted drilling for dense cities, allowing retrofits without extra land use.",
        bullets: ["Inclined probe technology", "90% carbon footprint reduction", "Urban retrofit optimization"]
    },
    {
        id: "heat_transport",
        name: "District Loop Co.",
        color: 0xffffff,
        coords: { x: 5, y: -40 },
        bubbleRadius: 110, 
        houseCount: 250, 
        emoji: "🏘️",
        location: "Global South focus",
        description: "Building the infrastructure to transport heat across low-income housing blocks.",
        bullets: ["Heat-sharing network grid", "Energy poverty reduction", "Scalable community heating"]
    }
];

// --- 2. RENDERER & SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 150);

let targetCamPos = new THREE.Vector3(0, 0, 150);
let isAutopilot = false;

const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    powerPreference: "high-performance" 
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function createEmojiTexture(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '80px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

// --- 3. OBJECT GENERATION ---
const hq = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏢') }));
hq.scale.set(8, 9, 1);
hq.position.set(0, 0, 0);
hq.renderOrder = 3;
hq.userData = { isHQ: true };
scene.add(hq);

const secondaryNodes = [];
const houseMat = new THREE.SpriteMaterial({ 
    map: createEmojiTexture('🏠'), 
    alphaTest: 0.5, 
    transparent: false 
});

companyData.forEach((data) => {
    const r = Math.sqrt(data.bubbleRadius) * 2.5; 
    const secNode = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture(data.emoji) }));
    secNode.scale.set(6, 6, 1);
    secNode.position.set(data.coords.x, data.coords.y, 0);
    secNode.renderOrder = 2;
    secNode.userData = { ...data, actualR: r };

    // Circle Outline (Non-interactable)
    const curve = new THREE.EllipseCurve(0, 0, r, r);
    const circumference = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
        new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.4 })
    );
    circumference.scale.set(0.175, 0.175, 1); 
    circumference.raycast = () => null; 
    secNode.add(circumference);

    // Main connection lines
    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), secNode.position]);
    const mainLine = new THREE.Line(lineGeom, new THREE.LineDashedMaterial({ color: data.color, dashSize: 1, gapSize: 0.5, transparent: true, opacity: 0.5 }));
    mainLine.computeLineDistances();
    scene.add(mainLine);
    secNode.mainLine = mainLine;

    // Optimized Houses
    for (let i = 0; i < data.houseCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = r * (0.3 + Math.random() * 0.6); 
        const home = new THREE.Sprite(houseMat);
        home.scale.set(1.5, 1.5, 1);
        home.position.set(secNode.position.x + Math.cos(angle) * dist, secNode.position.y + Math.sin(angle) * dist, 0);
        home.raycast = () => null;
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

// --- 4. UI FUNCTIONS ---
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
    if (!d || !d.name) return;
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
    pitchOverlay.style.display = 'flex';
    pitchOverlay.innerHTML = `
        <div class="pitch-content">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid rgba(0,255,255,0.2); padding-bottom:20px;">
                <div>
                    <h1 style="margin:0; color:cyan; font-size:32px;">GEOCORE GLOBAL</h1>
                    <p style="margin:5px 0 0 0; color:#888; font-size:14px;">Baseload Energy Distribution</p>
                </div>
                <button class="close-btn" onclick="window.closePitchDeck()">ESC to Close</button>
            </div>
            <div style="margin-top:30px;">
                <p style="font-size:18px; line-height:1.8; color:#eee;">
                    The world doesn't just need more energy—it needs <b>consistent</b> power. Geothermal is the only source that never stops, regardless of weather.
                </p>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:35px; margin-top:30px;">
                    <section>
                        <h3 style="margin-top:0;">The Strategy</h3>
                        <p style="font-size:14px; color:#cbd5e0; line-height:1.7;">
                            By investing in shallow-drilling today, we secure a first-mover advantage. We prepare for the inevitable future of renewable heat while others are still reacting to it.
                        </p>
                    </section>
                    <section>
                        <h3 style="margin-top:0;">The Impact</h3>
                        <p style="font-size:14px; color:#cbd5e0; line-height:1.7;">
                            Widespread geothermal makes heating affordable. We provide reliable energy to those struggling financially, ensuring clean heat is accessible for all.
                        </p>
                    </section>
                </div>
                <div style="margin-top:40px; padding:25px; background:rgba(0,255,255,0.05); border-radius:15px; border:1px solid rgba(0,255,255,0.1);">
                    <h3 style="margin-top:0;">Our Ecosystem</h3>
                    <p style="font-size:14px; line-height:1.8; margin:0;">
                        We funnel investment into elite drilling partners. In exchange, we receive a share of the energy production—creating a global, resilient supply network for our customers.
                    </p>
                </div>
            </div>
        </div>
    `;
    // Click outside logic
    pitchOverlay.onclick = (e) => { if(e.target === pitchOverlay) window.closePitchDeck(); };
};

// --- 5. INTERACTION EVENTS ---
window.addEventListener('mousedown', (e) => {
    // If we click the dark overlay background, reset
    if (e.target === pitchOverlay) {
        window.closePitchDeck();
        return;
    }
    // Only raycast if clicking the canvas
    if (e.target !== renderer.domElement) return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const hqHit = raycaster.intersectObject(hq);
    const companyHits = raycaster.intersectObjects(secondaryNodes);

    if (hqHit.length > 0) window.showPitchDeck();
    else if (companyHits.length > 0) window.showCompanyHUD(companyHits[0].object.userData, companyHits[0].object.position);
    else if (pitchOverlay.style.display !== 'flex') window.resetCamera();
});

window.addEventListener('wheel', (e) => {
    if (pitchOverlay.style.display === 'flex') return; 
    isAutopilot = false; 
    camera.position.z = Math.max(30, Math.min(camera.position.z + e.deltaY * 0.1, 400));
});

window.addEventListener('keydown', (e) => { if (e.key === "Escape") window.closePitchDeck(); });

// --- 6. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    if (isAutopilot) {
        camera.position.lerp(targetCamPos, 0.08);
        if (camera.position.distanceTo(targetCamPos) < 0.1) isAutopilot = false;
    }
    // Only animate dash offset for visual flow
    secondaryNodes.forEach(n => { if (n.mainLine) n.mainLine.material.dashOffset -= 0.01; });
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});