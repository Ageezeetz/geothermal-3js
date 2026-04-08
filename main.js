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
        description: "Developed 'Grabowski', a 150kg automated 'worm' drill designed to operate in basements and tight urban spaces.",
        bullets: ["300m depth / 135mm diameter", "94% quieter than diesel rigs", "Plugs into standard 400V outlets"]
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
        description: "Google X spinoff and the largest US residential installer, utilizing high-velocity sonic drilling for backyards.",
        bullets: ["Turnkey residential ground loops", "Proprietary 'Dandelion Geo' pump", "50-year ground loop warranty"]
    },
    {
        id: "celsius",
        name: "Celsius Energy",
        color: 0xff00ff,
        coords: { x: 70, y: -25 },
        bubbleRadius: 140, 
        houseCount: 130,
        emoji: "🏙️",
        location: "France (SLB Venture)",
        description: "Specialists in 'Star Drilling'—a slanted, fan-shaped drilling method that fits under existing parking lots.",
        bullets: ["Inclined probe technology", "90% smaller surface footprint", "Optimized for urban retrofitting"]
    },
    {
        id: "eavor",
        name: "Eavor Technologies",
        color: 0x00ffff,
        coords: { x: -25, y: -25 },
        bubbleRadius: 200, 
        houseCount: 140,
        emoji: "🌀",
        location: "Canada / Germany",
        description: "Pioneered the 'Eavor-Loop', a massive underground radiator that circulates fluid in a totally closed loop.",
        bullets: ["No fracking or water use", "Scalable baseload heat/power", "Sedimentary rock specialist"]
    },
    {
        id: "terra_thermal",
        name: "Terra Thermal",
        color: 0xff7a18,
        coords: { x: -60, y: -5 },
        bubbleRadius: 120, 
        houseCount: 80,
        emoji: "🔥",
        location: "United Kingdom",
        description: "Focuses on 'Heat-as-a-Service' for large-scale social housing, using shared ground loop arrays (SGLAs).",
        bullets: ["Shared community heat grids", "Eliminates fuel poverty", "Low-temp district heating"]
    },
    {
        id: "gt_energy",
        name: "GT Energy",
        color: 0xffffff,
        coords: { x: 5, y: -40 },
        bubbleRadius: 110, 
        houseCount: 100, 
        emoji: "🏗️",
        location: "Ireland / UK",
        description: "Deep-shallow specialists focused on large-scale urban heat networks and city-center district energy hubs.",
        bullets: ["Multi-megawatt heat delivery", "Strategic Dublin/UK pipeline", "Acquired by Star Energy Group"]
    }
];

// --- 2. RENDERER & SCENE ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 125);

let targetCamPos = new THREE.Vector3(0, 0, 125);
let isAutopilot = false;

// --- CUTSCENE STATE ---
let cutsceneActive = false;
let cutscenePhase = 0; 
const MAX_ZOOM = 1000; 

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

const starGeometry = new THREE.BufferGeometry();
const starCount = 3000;
const posArray = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) { posArray[i] = (Math.random() - 0.5) * 1000; }
starGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const starMaterial = new THREE.PointsMaterial({ size: 1, color: 0xffffff, transparent: true, opacity: 1 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

const secondaryNodes = [];
const houseMat = new THREE.SpriteMaterial({ map: createEmojiTexture('🏠'), alphaTest: 0.5, transparent: true });

companyData.forEach((data) => {
    const r = Math.sqrt(data.bubbleRadius) * 2.5; 
    const secNode = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture(data.emoji) }));
    secNode.scale.set(6, 6, 1);
    secNode.position.set(data.coords.x, data.coords.y, 0);
    secNode.renderOrder = 2;
    secNode.userData = { ...data, actualR: r };

    const circumference = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, r, r).getPoints(64)),
        new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.4 })
    );
    circumference.position.set(data.coords.x, data.coords.y, 0);
    scene.add(circumference); 
    secNode.circle = circumference;

    const mainLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), secNode.position]),
        new THREE.LineDashedMaterial({ color: data.color, dashSize: 1, gapSize: 0.5, transparent: true, opacity: 0.5 })
    );
    mainLine.computeLineDistances();
    scene.add(mainLine);
    secNode.mainLine = mainLine;

    secNode.houses = [];
    for (let i = 0; i < data.houseCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = r * (0.3 + Math.random() * 0.6); 
        const home = new THREE.Sprite(houseMat.clone());
        home.scale.set(1.5, 1.5, 1);
        home.position.set(secNode.position.x + Math.cos(angle) * dist, secNode.position.y + Math.sin(angle) * dist, 0);
        scene.add(home);
        
        const tLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([secNode.position, home.position]),
            // FIXED: Reference to 'data.color' instead of 'randomData.color'
            new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.15 })
        );
        scene.add(tLine);
        home.userData.myLine = tLine; // Link the line to the house
        secNode.houses.push(home);
    }
    scene.add(secNode);
    secondaryNodes.push(secNode);
});

// --- 4. UI FUNCTIONS ---
window.resetCamera = () => { targetCamPos.set(0, 0, 125); isAutopilot = true; hud.style.display = 'none'; };
window.closePitchDeck = () => { pitchOverlay.style.display = 'none'; window.resetCamera(); };
window.showCompanyHUD = (d, pos) => {
    if (!d || !d.name) return;
    isAutopilot = true;
    targetCamPos.set(pos.x, pos.y, (d.actualR / Math.tan((camera.fov * Math.PI / 180) / 2)));
    hud.style.display = 'block';
    hud.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><h2 class="hud-title">${d.name} ${d.emoji}</h2><span onclick="window.resetCamera()" style="cursor:pointer; font-size:18px;">✕</span></div><div class="hud-location">${d.location}</div><div class="hud-desc">${d.description}</div><ul class="hud-list">${d.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
};

// --- 5. INTERACTION & CUTSCENE TRIGGER ---
window.addEventListener('mousedown', (e) => {
    if (e.target === pitchOverlay) { window.closePitchDeck(); return; }
    if (e.target !== renderer.domElement) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hqHit = raycaster.intersectObject(hq);
    const companyHits = raycaster.intersectObjects(secondaryNodes);
    if (hqHit.length > 0) { /* show pitch deck logic */ } 
    else if (companyHits.length > 0) { window.showCompanyHUD(companyHits[0].object.userData, companyHits[0].object.position); } 
    else { window.resetCamera(); }
});

// SPACEBAR OR BUTTON TRIGGER
window.addEventListener('keydown', (e) => { 
    if (e.code === "Space" && !cutsceneActive) startExpansion();
});

// --- 8. MOUSE WHEEL ZOOM ---
window.addEventListener('wheel', (e) => {
    // Disable manual zoom if the expansion animation is currently playing
    if (cutsceneActive) return;

    // Stop any current autopilot (like returning from a company view) 
    // if the user starts scrolling manually
    isAutopilot = false;

    // Determine zoom direction and speed
    const zoomSpeed = 5;
    if (e.deltaY > 0) {
        // Scrolling Down -> Zoom Out
        targetCamPos.z += zoomSpeed;
    } else {
        // Scrolling Up -> Zoom In
        targetCamPos.z -= zoomSpeed;
    }

    // Constraints: Don't let the user zoom too far in or past the starfield
    targetCamPos.z = Math.max(30, Math.min(targetCamPos.z, MAX_ZOOM));
    
    // Apply the movement to the camera position
    // We update camera.position.z directly or use the existing lerp logic
    // Using direct assignment for immediate tactile response:
    camera.position.z = targetCamPos.z;
}, { passive: true });

// Add a simple button to your HTML and link it here
window.startExpansion = () => {
    if (cutsceneActive) return;

    // Reset logic
    spawnedCount = 0; 
    lastSpawnZ = 125; 
    
    cutsceneActive = true;
    cutscenePhase = 1;
    hud.style.display = 'none';
};

// --- 6. DYNAMIC SPAWNING ---
let spawnedCount = 0;
const maxDynamicNodes = 100; 
let lastSpawnZ = 125; 
const spawnInterval = 10;

function spawnRandomNode() {
    // Check if we already have a node at this index in the array
    let secNode = secondaryNodes.find((n, index) => n.userData.isDynamic && index === (companyData.length + spawnedCount));

    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 300;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    if (!secNode) {
        // --- CREATE NEW NODE (Only runs the first time) ---
        const randomData = {
            name: "Emerging Partner",
            isDynamic: true, // Tag to distinguish from main 6
            emoji: ["🔋", "⚙️", "🔌", "🔧", "🏗️", "⚡"][Math.floor(Math.random() * 6)],
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
            bubbleRadius: 40 + Math.random() * 60,
            targetScale: 8 + Math.random() * 4
        };

        const r = Math.sqrt(randomData.bubbleRadius) * 2.5;
        const nodeMat = new THREE.SpriteMaterial({ map: createEmojiTexture(randomData.emoji), transparent: true, opacity: 0 });
        secNode = new THREE.Sprite(nodeMat);
        secNode.userData = { ...randomData, actualR: r };

        // Circle
        const circumference = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, r, r).getPoints(64)),
            new THREE.LineBasicMaterial({ color: randomData.color, transparent: true, opacity: 0 })
        );
        scene.add(circumference);
        secNode.circle = circumference;

        // Main Line
        const mainLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, 0)]),
            new THREE.LineDashedMaterial({ color: randomData.color, dashSize: 1, gapSize: 0.5, transparent: true, opacity: 0 })
        );
        scene.add(mainLine);
        secNode.mainLine = mainLine;

        // Houses
        secNode.houses = [];
        for (let i = 0; i < 10; i++) {
            const hAngle = Math.random() * Math.PI * 2;
            const hDist = r * (0.4 + Math.random() * 0.5);
            const home = new THREE.Sprite(houseMat.clone());
            home.material.opacity = 0;
            home.scale.set(1.2, 1.2, 1);
            scene.add(home);
            
            const tLine = new THREE.Line(
                new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,0)]),
                new THREE.LineBasicMaterial({ color: randomData.color, transparent: true, opacity: 0 })
            );
            scene.add(tLine);
            home.userData.myLine = tLine; 
            secNode.houses.push(home);
        }

        scene.add(secNode);
        secondaryNodes.push(secNode);
    }

    // --- REFRESH/RESET NODE (Runs every time) ---
    secNode.position.set(x, y, 0);
    secNode.scale.set(0, 0, 0);
    secNode.material.opacity = 0;
    
    if (secNode.circle) {
        secNode.circle.position.set(x, y, 0);
        secNode.circle.material.opacity = 0;
    }
    
    if (secNode.mainLine) {
        secNode.mainLine.geometry.setFromPoints([new THREE.Vector3(0, 0, 0), secNode.position]);
        secNode.mainLine.material.opacity = 0;
    }

    if (secNode.houses) {
        secNode.houses.forEach(h => {
            const hAngle = Math.random() * Math.PI * 2;
            const hDist = secNode.userData.actualR * (0.4 + Math.random() * 0.5);
            h.position.set(x + Math.cos(hAngle) * hDist, y + Math.sin(hAngle) * hDist, 0);
            h.material.opacity = 0;
            if (h.userData.myLine) {
                h.userData.myLine.geometry.setFromPoints([secNode.position, h.position]);
                h.userData.myLine.material.opacity = 0;
            }
        });
    }
}

// --- 7. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    stars.rotation.y += 0.0001;
        if (cutscenePhase === 1) {
            // INCREASED SPEED: Changed from 1.5 to 4.0 (or higher for "warp" speed)
            const speed = 0.8 + (camera.position.z / 300); 
                
            camera.position.z += speed; 

            // ADJUST SPAWN INTERVAL: 
            // Since we are moving faster, we decrease the interval (e.g., to 5) 
            // so nodes appear more frequently to match the high-speed travel.
            const highSpeedInterval = 5; 

            if (camera.position.z > lastSpawnZ + highSpeedInterval && spawnedCount < maxDynamicNodes) {
                spawnRandomNode();
                spawnedCount++;
                lastSpawnZ = camera.position.z;
            }

            // End Phase 1 when limit reached
            if (camera.position.z >= MAX_ZOOM) {
                cutscenePhase = 2;
            }
        }
        else if (cutscenePhase === 2) {
            // SOFT RETURN: Lower lerp value (0.015) makes it glide in gently
            camera.position.lerp(new THREE.Vector3(0, 0, 125), 0.015);
            
            // CLEANUP
            secondaryNodes.forEach(n => {
                if (n.userData.name === "Emerging Partner") {
                    n.material.opacity -= 0.015;
                    if (n.mainLine) n.mainLine.material.opacity -= 0.015;
                    if (n.circle) n.circle.material.opacity -= 0.015;
                    if (n.houses) n.houses.forEach(h => {
                        h.material.opacity -= 0.015;
                        if (h.userData.myLine) h.userData.myLine.material.opacity -= 0.015;
                    });
                }
            });

            if (camera.position.z <= 126) {
                cutsceneActive = false;
                cutscenePhase = 0;
            }
        } else if (isAutopilot) {
            camera.position.lerp(targetCamPos, 0.08);
            if (camera.position.distanceTo(targetCamPos) < 0.1) isAutopilot = false;
        }

    // GENERAL FADE & SCALE
    secondaryNodes.forEach(n => {
        // Only fade in during Phase 1 (Zoom Out) or Normal mode
        if (!cutsceneActive || cutscenePhase === 1) {
            if (n.material.opacity < 1) {
                n.material.opacity += 0.02; // Speed of appearing
                
                if (n.mainLine) n.mainLine.material.opacity = n.material.opacity * 0.3;
                if (n.circle) n.circle.material.opacity = n.material.opacity * 0.3;
                
                if (n.houses) {
                    n.houses.forEach(h => {
                        h.material.opacity = n.material.opacity;
                        if (h.userData.myLine) {
                            h.userData.myLine.material.opacity = n.material.opacity * 0.15;
                        }
                    });
                }
            }
        }
        
        // Scale Logic (Existing)
        const baseScale = n.userData.targetScale || 6;
        const target = n.userData.isHovered ? baseScale * 1.5 : baseScale;
        
        // Only scale up if we aren't in Phase 2 (Cleanup)
        if (cutscenePhase !== 2) {
            n.scale.lerp(new THREE.Vector3(target, target, 1), 0.1);
        }
    });

    renderer.render(scene, camera);
}
animate();