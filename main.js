import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a); 

const camera = new THREE.PerspectiveCamera(30, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

function createEmojiTexture(emoji) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = '90px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

// 1. Center Node (HQ)
const centerNode = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏢') }));
centerNode.scale.set(4, 5, 1);
scene.add(centerNode);

const secondaryNodes = [];
const numSecondary = 9; 
const tertiaryPerSecondary = 50;

for (let i = 0; i < numSecondary; i++) {
    // 2. Secondary Node (Digger)
    const secNode = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏗️') }));
    secNode.scale.set(2, 2, 1); 
    
    // Collision radius for secondary nodes (derived from sprite scale)
    const secNodeRadius = Math.max(secNode.scale.x, secNode.scale.y) * 1.8;
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!validPosition && attempts < maxAttempts) {
        // Random angle and distance from center
        const angle = Math.random() * Math.PI * 2;
        const dist = 12 + Math.random() * 18; // Random distance range around center
        
        const candidatePos = {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist
        };
        
        // Check collision with center node (approximate as radius ~3)
        const centerDist = Math.sqrt(candidatePos.x * candidatePos.x + candidatePos.y * candidatePos.y);
        if (centerDist < 3 + secNodeRadius) {
            attempts++;
            continue;
        }
        
        // Check collision with all previously placed secondary nodes (use each node's stored radius)
        let colliding = false;
        for (let k = 0; k < secondaryNodes.length; k++) {
            const otherNode = secondaryNodes[k];
            const otherRadius = otherNode.userData && otherNode.userData.radius ? otherNode.userData.radius : secNodeRadius;
            const dx = candidatePos.x - otherNode.position.x;
            const dy = candidatePos.y - otherNode.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < secNodeRadius + otherRadius) {
                colliding = true;
                break;
            }
        }
        
        if (!colliding) {
            secNode.position.set(candidatePos.x, candidatePos.y, 0);
            validPosition = true;
        }
        
        attempts++;
    }
    
    // Fallback position if couldn't find valid spot
    if (!validPosition) {
        const angle = (i / numSecondary) * Math.PI * 2;
        const dist = 20;
        secNode.position.set(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
    }
    
    // store radius for future collision checks
    secNode.userData = secNode.userData || {};
    secNode.userData.radius = secNodeRadius;

    // --- SIMPLE CIRCUMFERENCE ---
    const radius = 4;
    const curve = new THREE.EllipseCurve(0, 0, radius, radius);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });
    const circumference = new THREE.LineLoop(geometry, material);
    
    secNode.add(circumference);
    
    secNode.tertiaryNodes = [];
    secNode.linesToTertiary = [];
    scene.add(secNode);
    secondaryNodes.push(secNode);

    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), secNode.position]);
    const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    scene.add(line);
    secNode.mainLine = line;

    // 3. Tertiary Nodes (Homes)
    for (let j = 0; j < tertiaryPerSecondary; j++) {
        const home = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏠') }));
        home.scale.set(1.5, 1.5, 1);
        
        const tAngle = Math.random() * Math.PI * 2;
        const tDist = 2 + Math.random() * 4; 
        home.position.set(
            secNode.position.x + Math.cos(tAngle) * tDist,
            secNode.position.y + Math.sin(tAngle) * tDist,
            0
        );
        
        scene.add(home);
        secNode.tertiaryNodes.push(home);

        const tLineGeom = new THREE.BufferGeometry().setFromPoints([secNode.position, home.position]);
        const tLine = new THREE.Line(tLineGeom, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 }));
        scene.add(tLine);
        secNode.linesToTertiary.push(tLine);
    }
}

// ===== Interaction =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedNode = null;
let isPanning = false;

window.addEventListener('mousedown', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(secondaryNodes);
    if (intersects.length > 0) {
        selectedNode = intersects[0].object;
    } else {
        isPanning = true;
    }
});

window.addEventListener('mousemove', (e) => {
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const scale = (2 * Math.tan(vFOV / 2) * camera.position.z) / window.innerHeight;

    if (selectedNode) {
        const dx = e.movementX * scale;
        const dy = -e.movementY * scale;

        selectedNode.position.x += dx;
        selectedNode.position.y += dy;

        selectedNode.tertiaryNodes.forEach((tNode, i) => {
            tNode.position.x += dx;
            tNode.position.y += dy;
            selectedNode.linesToTertiary[i].geometry.setFromPoints([selectedNode.position, tNode.position]);
        });
        selectedNode.mainLine.geometry.setFromPoints([new THREE.Vector3(0,0,0), selectedNode.position]);
    }

    if (isPanning) {
        camera.position.x -= e.movementX * scale;
        camera.position.y += e.movementY * scale;
    }
});

window.addEventListener('mouseup', () => { selectedNode = null; isPanning = false; });

window.addEventListener('wheel', (e) => {
    camera.position.z += e.deltaY * 0.05;
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, 15, 100);
});

function animate(time) {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});