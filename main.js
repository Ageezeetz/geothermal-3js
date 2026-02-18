import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

// 1. DATA: bubbleRadius is the "Input Value"
const companyData = [
    {
        id: "borobotics",
        name: "Borobotics",
        color: 0x7aff7a,
        coords: { x: 75, y: 15 }, // Switzerland: Far East, slightly North
        bubbleRadius: 180,
        houseCount: 150,
        emoji: "🤖",
        location: "Switzerland",
        description: "Automated 'strongest worm' drill. 86% less emissions and nearly silent.",
        bullets: ["Automated traveling", "300m shallow depth"]
    },
    {
        id: "dig_energy",
        name: "Dig Energy",
        color: 0x00ffff,
        coords: { x: -25, y: -25 }, // Texas: West and South
        bubbleRadius: 120, 
        houseCount: 90,
        emoji: "💧",
        location: "USA (Texas)",
        description: "Water-jet boring technology that reduces drilling costs by 80%.",
        bullets: ["Company-based drill supply", "High-pressure precision"]
    },
    {
        id: "fervo_energy",
        name: "Fervo Energy",
        color: 0xff7a18,
        coords: { x: -60, y: -5 }, // Houston/Nevada: Far West
        bubbleRadius: 250, 
        houseCount: 220,
        emoji: "🔥",
        location: "USA",
        description: "Next-gen geothermal using horizontal drilling and fiber optic data.",
        bullets: ["Real-time geographic data", "Max heat-mining efficiency"]
    },
    {
        id: "dandelion",
        name: "Dandelion Energy",
        color: 0xffff00,
        coords: { x: 10, y: 15 }, // New York/MA: Close East and North
        bubbleRadius: 160, 
        houseCount: 180,
        emoji: "🌻",
        location: "USA (Northeast)",
        description: "Residential geothermal experts making home heating affordable and renewable.",
        bullets: ["Home heat-pump integration", "Zero-down financing models"]
    },
    {
        id: "celsius",
        name: "Celsius Energy",
        color: 0xff00ff,
        coords: { x: 70, y: 10 }, // France: Far East, slightly North
        bubbleRadius: 140, 
        houseCount: 130,
        emoji: "🏙️",
        location: "France",
        description: "Urban geothermal solutions using angled shallow probes for city buildings.",
        bullets: ["Small footprint design", "Ideal for urban retrofitting"]
    },
    {
        id: "heat_transport",
        name: "District Loop Co.",
        color: 0xffffff,
        coords: { x: 5, y: -40 }, // Southern US focus for pilot
        bubbleRadius: 110, 
        houseCount: 250, 
        emoji: "🏘️",
        location: "Global",
        description: "Transportation of heat via insulated liquid loops to low-income housing.",
        bullets: ["Heat sharing networks", "Reduces individual energy bills"]
    }
];

// 2. SCENE SETUP
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 150);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

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

// 3. GENERATION
const secondaryNodes = [];
const hq = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏢') }));
hq.scale.set(6, 7, 1);
scene.add(hq);

companyData.forEach((data) => {
    // Determine visual radius (r)
    const r = Math.sqrt(data.bubbleRadius) * 2.5; 
    
    const secNode = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture(data.emoji) }));
    secNode.scale.set(6, 6, 1);
    secNode.position.set(data.coords.x, data.coords.y, 0);

    // ADD THIS: Higher number means it draws on top of the lines
    secNode.renderOrder = 2; 

    // Ensure the material depth testing doesn't cause "ghosting"
    secNode.material.depthTest = false;
    
    // Store actual visual R for the line-connector logic
    secNode.userData = { ...data, actualR: r }; 

    // Visual Perimeter
    const curve = new THREE.EllipseCurve(0, 0, r, r);
    const circumference = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
        new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.4 })
    );
    circumference.scale.set(0.175, 0.175, 1); //Shrinks the circle back to the 1:1 ratio after being expanded above
    circumference.raycast = () => null;
    secNode.add(circumference);

    // --- HQ Line: Points directly to the center from start ---
    const lineEnd = secNode.position.clone(); // Targets the center of the emoji
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0), 
        lineEnd
    ]);

    const mainLine = new THREE.Line(
        lineGeom, 
        new THREE.LineDashedMaterial({ 
            color: data.color, 
            dashSize: 1, 
            gapSize: 0.5,
            transparent: true,
            opacity: 0.5 
        })
    );

    mainLine.computeLineDistances(); // Required for dashed lines to show up
    scene.add(mainLine);
    secNode.mainLine = mainLine;

    // Houses: Scaling and Placement relative to 'r'
    secNode.tertiaryNodes = [];
    secNode.linesToTertiary = [];
    
    // Scale house icon based on bubble size (so they don't look tiny)
    const houseScale = 1.5;

    for (let i = 0; i < data.houseCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Spread houses between 30% and 90% of the radius
        const dist = r * (0.3 + Math.random() * 0.6); 
        
        const posX = secNode.position.x + Math.cos(angle) * dist;
        const posY = secNode.position.y + Math.sin(angle) * dist;

        const home = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏠') }));
        home.scale.set(houseScale, houseScale, 1);
        home.position.set(posX, posY, 0);
        home.raycast = () => null;
        
        const tLine = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([secNode.position, home.position]),
            new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: 0.15 })
        );
        
        scene.add(home);
        scene.add(tLine);
        secNode.tertiaryNodes.push(home);
        secNode.linesToTertiary.push(tLine);
    }
    scene.add(secNode);
    secondaryNodes.push(secNode);
});

// 4. INTERACTION
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedNode = null;
let isPanning = false;

window.addEventListener('wheel', (e) => {
    camera.position.z += e.deltaY * 0.1;
    camera.position.z = Math.max(30, Math.min(camera.position.z, 400));
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
        hud.innerHTML = `<h2 style="margin:0;">${d.name}</h2>
                         <p style="color:#aaa; font-size:12px; margin: 4px 0;">${d.location}</p>
                         <p style="font-size:14px; line-height:1.4;">${d.description}</p>
                         <ul style="font-size:12px; color:#ccc; padding-left:15px;">
                            ${d.bullets.map(b => `<li>${b}</li>`).join('')}
                         </ul>`;
    } else {
        isPanning = true;
        hud.style.display = 'none';
    }
});

window.addEventListener('mousemove', (e) => {
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const scale = (2 * Math.tan(vFOV / 2) * camera.position.z) / window.innerHeight;

    // --- REMOVED THE SELECTEDNODE DRAGGING LOGIC FROM HERE ---

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