import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// 1. DATA (Colors and Info restored)
const companyData = [
    {
        id: "borobotics",
        name: "Borobotics",
        color: 0x7aff7a,
        coords: { x: -35, y: 25 },
        bubbleRadius: 12, 
        houseCount: 40,
        emoji: "🇨🇭",
        location: "Switzerland",
        description: "The 'World's strongest worm': a 2.5m tall, 150kg automated pole.",
        bullets: ["86% less emissions", "300m shallow geothermal depth"]
    },
    {
        id: "dig_energy",
        name: "Dig Energy",
        color: 0x00ffff,
        coords: { x: -25, y: -20 },
        bubbleRadius: 8, 
        houseCount: 15,
        emoji: "💧",
        location: "USA",
        description: "Shallow digging using high-pressure water jets for boring.",
        bullets: ["Costs ~80% of normal drilling", "Drill supply market model"]
    },
    {
        id: "fervo_energy",
        name: "Fervo Energy",
        color: 0xff7a18,
        coords: { x: 30, y: 5 },
        bubbleRadius: 18, 
        houseCount: 70,
        emoji: "🔥",
        location: "USA",
        description: "Large-scale horizontal drilling with fiber optic integration.",
        bullets: ["Real-time fiber optic data", "Algorithm-optimized heat mining"]
    }
];

// 2. SCENE SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 120);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// UI HUD (Fixed styles)
const hud = document.createElement('div');
hud.style = `position: absolute; top: 20px; right: 20px; width: 320px; background: rgba(0, 20, 30, 0.95); 
             border: 1px solid rgba(0, 255, 255, 0.3); border-left: 4px solid cyan; color: white; 
             font-family: sans-serif; padding: 20px; display: none; border-radius: 4px; backdrop-filter: blur(15px); pointer-events: none;`;
document.body.appendChild(hud);

function createEmojiTexture(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '80px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

// 4. GENERATION
const secondaryNodes = [];
const hq = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏢') }));
hq.scale.set(6, 7, 1);
scene.add(hq);

companyData.forEach((data) => {
    const secNode = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture(data.emoji) }));
    secNode.scale.set(4, 4, 1);
    secNode.position.set(data.coords.x, data.coords.y, 0);
    
    // We use the SQRT for the visual r, and save it back to userData so movement logic can find it
    const r = Math.sqrt(data.bubbleRadius);
    secNode.userData = { ...data, actualR: r }; 

    // Visual Perimeter
    const curve = new THREE.EllipseCurve(0, 0, r, r);
    const circumference = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
        new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.4 })
    );
    circumference.raycast = () => null;
    secNode.add(circumference);

    // HQ Line - Snapped to the edge
    const dirToHQ = secNode.position.clone().normalize();
    const lineEnd = secNode.position.clone().sub(dirToHQ.multiplyScalar(r));
    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), lineEnd]);
    const mainLine = new THREE.Line(lineGeom, new THREE.LineDashedMaterial({ color: data.color, dashSize: 0.8, gapSize: 0.5 }));
    mainLine.computeLineDistances();
    scene.add(mainLine);
    secNode.mainLine = mainLine;

    // Houses (Using your preferred spread math)
    secNode.tertiaryNodes = [];
    secNode.linesToTertiary = [];
    for (let i = 0; i < data.houseCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (r * 0.9); // Keeps them inside the ring
        const posX = secNode.position.x + Math.cos(angle) * dist;
        const posY = secNode.position.y + Math.sin(angle) * dist;

        const home = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏠') }));
        home.scale.set(r * 0.15, r * 0.15, 1); // Proportional scale
        home.position.set(posX, posY, 0);
        home.raycast = () => null;
        
        const tLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([secNode.position, home.position]),
            new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.1 })
        );
        
        scene.add(home);
        scene.add(tLine);
        secNode.tertiaryNodes.push(home);
        secNode.linesToTertiary.push(tLine);
    }
    scene.add(secNode);
    secondaryNodes.push(secNode);
});

// 5. INTERACTION (Zoom, Panning, and Line Sync)
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedNode = null;
let isPanning = false;

// ADDED: Zoom Support
window.addEventListener('wheel', (e) => {
    camera.position.z += e.deltaY * 0.05;
    camera.position.z = Math.max(20, Math.min(camera.position.z, 300));
});

window.addEventListener('mousedown', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(secondaryNodes, false); 
    if (hits.length > 0) {
        selectedNode = hits[0].object;
        const d = selectedNode.userData;
        hud.style.display = 'block';
        hud.style.borderLeftColor = `#${d.color.toString(16).padStart(6, '0')}`;
        hud.innerHTML = `<h2 style="margin:0; color:white">${d.name}</h2>
                         <p style="color:#aaa">${d.location}</p>
                         <p>${d.description}</p>
                         <ul>${d.bullets.map(b => `<li>${b}</li>`).join('')}</ul>`;
    } else {
        isPanning = true;
        hud.style.display = 'none';
    }
});

window.addEventListener('mousemove', (e) => {
    const scale = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z) / window.innerHeight;
    if (selectedNode) {
        const dx = e.movementX * scale;
        const dy = -e.movementY * scale;
        selectedNode.position.x += dx;
        selectedNode.position.y += dy;

        selectedNode.tertiaryNodes.forEach((t, i) => {
            t.position.x += dx; t.position.y += dy;
            selectedNode.linesToTertiary[i].geometry.setFromPoints([selectedNode.position, t.position]);
        });

        // FIXED: Now uses actualR (the SQRT value) to snap the line to the visual edge
        const r = selectedNode.userData.actualR; 
        const dirToCenter = selectedNode.position.clone().normalize();
        const lineEnd = selectedNode.position.clone().sub(dirToCenter.multiplyScalar(r));
        selectedNode.mainLine.geometry.setFromPoints([new THREE.Vector3(0,0,0), lineEnd]);
        selectedNode.mainLine.computeLineDistances();
    }
    if (isPanning) {
        camera.position.x -= e.movementX * scale;
        camera.position.y += e.movementY * scale;
    }
});

window.addEventListener('mouseup', () => { selectedNode = null; isPanning = false; });

function animate() {
    requestAnimationFrame(animate);
    secondaryNodes.forEach(n => { if (n.mainLine) n.mainLine.material.dashOffset -= 0.015; });
    renderer.render(scene, camera);
}
animate();