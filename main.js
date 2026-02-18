import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a); 

// ===== Camera & Renderer =====
const camera = new THREE.PerspectiveCamera(30, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 60);
// UI appears only when camera is zoomed in past this Z position
const UI_ZOOM_THRESHOLD = 20;
// Secondary nodes will be placed randomly in an annulus around the center
const MIN_SECONDARY_DIST = 8; // minimum distance from center for secondary nodes
const MAX_SECONDARY_DIST = 32; // maximum distance from center for secondary nodes
// Tertiary nodes will be placed within this radial range from their parent secondary
const MIN_TERTIARY_FROM_SECONDARY = 1.5;
const MAX_TERTIARY_FROM_SECONDARY = 5.0;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Helper for Emoji Icons
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

// ===== Nodes & Connections =====

// 1. Center Node (HQ)
const centerNode = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏢') }));
centerNode.scale.set(4, 5, 1);
scene.add(centerNode);

const secondaryNodes = [];
const numSecondary = 10; 
const tertiaryPerSecondary = 50;
// Color palette for neighborhoods
const NEIGHBOR_COLORS = [0x00ffff, 0xff7a18, 0x7aff7a, 0xff4db6, 0x7a9bff, 0xffd67a, 0xa27aff];

for (let i = 0; i < numSecondary; i++) {
    // 2. Secondary Node (Digger)
    const secNode = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏗️') }));
    secNode.scale.set(2, 2, 1); 
    
    // Collision logic for spawning
    const secNodeRadius = Math.max(secNode.scale.x, secNode.scale.y) * 1.8;
    let validPosition = false;
    let attempts = 0;
    const maxAttempts = 250;
    
    while (!validPosition && attempts < maxAttempts) {
        const angle = Math.random() * Math.PI * 2;
        const dist = MIN_SECONDARY_DIST + Math.random() * (MAX_SECONDARY_DIST - MIN_SECONDARY_DIST);
        const candidatePos = { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
        const centerDist = Math.sqrt(candidatePos.x * candidatePos.x + candidatePos.y * candidatePos.y);
        if (centerDist < 3 + secNodeRadius) { attempts++; continue; }
        
        let colliding = false;
        for (let k = 0; k < secondaryNodes.length; k++) {
            const otherNode = secondaryNodes[k];
            const otherRadius = otherNode.userData.radius || secNodeRadius;
            const dx = candidatePos.x - otherNode.position.x;
            const dy = candidatePos.y - otherNode.position.y;
            if (Math.sqrt(dx * dx + dy * dy) < secNodeRadius + otherRadius) {
                colliding = true;
                break;
            }
        }
        if (!colliding) { secNode.position.set(candidatePos.x, candidatePos.y, 0); validPosition = true; }
        attempts++;
    }
    
    secNode.userData = { radius: secNodeRadius };

    // --- MOVABLE BUBBLE ---
    const bubbleRadius = 3.5;
    const curve = new THREE.EllipseCurve(0, 0, bubbleRadius, bubbleRadius);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
    const circumference = new THREE.LineLoop(geometry, material);
    
    // ATTACH TO secNode: Now it moves wherever the Digger goes
    circumference.raycast = () => {}; 
    secNode.add(circumference);
    
    secNode.tertiaryNodes = [];
    secNode.linesToTertiary = [];
    scene.add(secNode);
    secondaryNodes.push(secNode);

    // HQ Line
    const lineGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), secNode.position.clone().setLength(
        Math.max(secNode.position.length() - (2 * bubbleRadius), 0))]);
    const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 }));
    scene.add(line);
    secNode.mainLine = line;

    // 3. Tertiary Nodes (Homes)
    for (let j = 0; j < tertiaryPerSecondary; j++) {
        const home = new THREE.Sprite(new THREE.SpriteMaterial({ map: createEmojiTexture('🏠') }));
        home.scale.set(1.2, 1.2, 1);

        // Place tertiary node randomly around its parent, but avoid other secondary bubbles
        let placed = false;
        const homeRadius = Math.max(home.scale.x, home.scale.y) * 0.6;
        const tertiaryAttempts = 80;
        for (let a = 0; a < tertiaryAttempts; a++) {
            const tAngle = Math.random() * Math.PI * 2;
            const tDist = MIN_TERTIARY_FROM_SECONDARY + Math.random() * (MAX_TERTIARY_FROM_SECONDARY - MIN_TERTIARY_FROM_SECONDARY);
            const candX = secNode.position.x + Math.cos(tAngle) * tDist;
            const candY = secNode.position.y + Math.sin(tAngle) * tDist;

            // Ensure tertiary is not inside any other secondary node's bubble
            let colliding = false;
            for (let s = 0; s < secondaryNodes.length; s++) {
                const other = secondaryNodes[s];
                if (other === secNode) continue;
                const otherBubble = other.userData?.bubbleRadius || 0;
                const dx = candX - other.position.x;
                const dy = candY - other.position.y;
                if (Math.sqrt(dx * dx + dy * dy) < (otherBubble + homeRadius + 0.5)) { colliding = true; break; }
            }

            if (!colliding) {
                home.position.set(candX, candY, 0);
                placed = true;
                break;
            }
        }

        // Fallback: place close to parent if no valid spot found
        if (!placed) {
            const fallbackAngle = Math.random() * Math.PI * 2;
            const fallbackDist = MIN_TERTIARY_FROM_SECONDARY + Math.random() * (MAX_TERTIARY_FROM_SECONDARY - MIN_TERTIARY_FROM_SECONDARY);
            home.position.set(secNode.position.x + Math.cos(fallbackAngle) * fallbackDist, secNode.position.y + Math.sin(fallbackAngle) * fallbackDist, 0);
        }

        scene.add(home);
        secNode.tertiaryNodes.push(home);

        const tLineGeom = new THREE.BufferGeometry().setFromPoints([secNode.position, home.position]);
        const tLine = new THREE.Line(tLineGeom, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 }));
        scene.add(tLine);
        secNode.linesToTertiary.push(tLine);
    }

    secNode.userData = {
        name: "Drill Team " + (i + 1),
        status: "Excavating Area " + String.fromCharCode(65 + i),
        isCompany: true, // A flag so we know it's clickable
        radius: secNodeRadius,
        bubbleRadius: bubbleRadius
    };
    // Assign neighborhood color
    const color = NEIGHBOR_COLORS[i % NEIGHBOR_COLORS.length];
    secNode.userData.color = color;
    // Update the line to use dashed material and the neighborhood color
    const dashed = new THREE.Line(lineGeom, new THREE.LineDashedMaterial({ color: color, dashSize: 1.2, gapSize: 0.8, transparent: false }));
    dashed.computeLineDistances?.();
    scene.remove(line);
    scene.add(dashed);
    secNode.mainLine = dashed;
    // Color tertiary lines to match parent
    secNode.linesToTertiary.forEach(tl => tl.material.color.setHex(color));
}

// ===== Interaction =====
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedNode = null;
let isPanning = false;
const hoverLabel = document.getElementById('hover-label');

window.addEventListener('mousedown', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(secondaryNodes);

        if (intersects.length > 0) {
            selectedNode = intersects[0].object;
            isPanning = false; // Disable panning so we don't move the map while clicking

            // Show info panel only when zoomed in far enough and clicked node is a partner
            const data = selectedNode.userData || {};
            const panel = document.getElementById('info-panel');
            if (camera.position.z <= UI_ZOOM_THRESHOLD && data.isCompany) {
                document.getElementById('comp-name').innerText = data.name || '';
                document.getElementById('comp-status').innerText = "Status: " + (data.status || '');
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }

        } else {
            selectedNode = null;
            isPanning = true;
            
            // Hide the box if we click the empty dark background
            document.getElementById('info-panel').style.display = 'none';
        }
    });

window.addEventListener('mousemove', (e) => {
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const scale = (2 * Math.tan(vFOV / 2) * camera.position.z) / window.innerHeight;

    // update normalized mouse coords for raycasting
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    // Hover label logic: show name when hovering a secondary node
    raycaster.setFromCamera(mouse, camera);
    const hoverIntersects = raycaster.intersectObjects(secondaryNodes);
    if (hoverIntersects.length > 0) {
        const hovered = hoverIntersects[0].object;
        const data = hovered.userData || {};
        if (hoverLabel) {
            hoverLabel.style.display = 'block';
            hoverLabel.innerText = data.name || 'Drill';
            hoverLabel.style.left = e.clientX + 'px';
            hoverLabel.style.top = e.clientY + 'px';
            // color the label border to match neighborhood if available
            if (data.color) hoverLabel.style.borderColor = '#' + data.color.toString(16).padStart(6, '0');
        }
    } else {
        if (hoverLabel) hoverLabel.style.display = 'none';
    }

    if (selectedNode) {
        const dx = e.movementX * scale;
        const dy = -e.movementY * scale;

        selectedNode.position.x += dx;
        selectedNode.position.y += dy;

        // Homes move with Digger
        selectedNode.tertiaryNodes.forEach((tNode, i) => {
            tNode.position.x += dx;
            tNode.position.y += dy;
            selectedNode.linesToTertiary[i].geometry.setFromPoints([selectedNode.position, tNode.position]);
            selectedNode.linesToTertiary[i].geometry.attributes.position.needsUpdate = true;
        });
        
        // HQ Line updates
            const r = selectedNode.userData?.bubbleRadius || 0;
            const endPos = selectedNode.position.clone().setLength(
                Math.max(selectedNode.position.length() - (2 * r), 0)
            );
            selectedNode.mainLine.geometry.setFromPoints([new THREE.Vector3(0,0,0), endPos]);
            selectedNode.mainLine.computeLineDistances();
            
        selectedNode.mainLine.geometry.attributes.position.needsUpdate = true;
        
        // BUBBLE moves automatically because it is a child of selectedNode
    }

    if (isPanning) {
        camera.position.x -= e.movementX * scale;
        camera.position.y += e.movementY * scale;
    }
});

window.addEventListener('mouseup', () => { selectedNode = null; isPanning = false; });
// Helper: unproject mouse to world position on z=0 plane
// 1. FIXED: Reliable world position calculation
function getMouseWorldPos(clientX, clientY) {
    const vec = new THREE.Vector3(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1,
        0.5
    );
    vec.unproject(camera);
    
    // We want the intersection with the Z=0 plane
    // Formula: Ray intersection with plane
    const pos = camera.position;
    const dir = vec.sub(pos).normalize();
    const distance = -pos.z / dir.z;
    
    return pos.clone().add(dir.multiplyScalar(distance));
}

// 2. FIXED: Stable Zoom-to-Mouse
window.addEventListener('wheel', (e) => {
    e.preventDefault(); // Prevent page scrolling

    // Get the point the mouse is hovering over BEFORE the zoom
    const pointBefore = getMouseWorldPos(e.clientX, e.clientY);

    // Perform the actual zoom (clamped)
    const zoomAmount = e.deltaY * 0.04;
    camera.position.z = THREE.MathUtils.clamp(camera.position.z + zoomAmount, 10, 100);
    
    // Crucial: Update matrices so the 'After' calculation is accurate
    camera.updateMatrixWorld();

    // Get the point under the mouse AFTER the zoom
    const pointAfter = getMouseWorldPos(e.clientX, e.clientY);

    // Shift camera X and Y to keep the 'before' point under the cursor
    camera.position.x += (pointBefore.x - pointAfter.x);
    camera.position.y += (pointBefore.y - pointAfter.y);

    // UI visibility threshold
    const panel = document.getElementById('info-panel');
    if (panel) {
        panel.style.display = camera.position.z > UI_ZOOM_THRESHOLD ? 'none' : panel.style.display;
    }
}, { passive: false });

// 3. FIXED: Smooth Animation & Flow
function animate() {
    requestAnimationFrame(animate);
    
    secondaryNodes.forEach((sn) => {
        // Flowing dashed lines (HQ to Digger)
        if (sn.mainLine && sn.mainLine.material.type === 'LineDashedMaterial') {
            sn.mainLine.material.dashOffset -= 0.015;
        }
        
        // Dynamic opacity: Fade tertiary lines out when zooming out
        // This keeps the map from looking like a giant white blob
        const opacityScale = THREE.MathUtils.mapLinear(camera.position.z, 15, 60, 0.1, 0.01);
        sn.linesToTertiary.forEach(tl => {
            tl.material.opacity = THREE.MathUtils.clamp(opacityScale, 0.01, 0.1);
        });
    });
    
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});