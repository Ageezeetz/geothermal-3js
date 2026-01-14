import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101010);

// Camera setup
const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 40);

// Renderer setup
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Lighting
const light = new THREE.PointLight(0xffffff, 1);
light.position.set(50, 50, 50);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040, 1));

// Materials
const centralMaterial = new THREE.MeshPhongMaterial({ color: 0xff9900 }); // central node
const partnerMaterial = new THREE.MeshPhongMaterial({ color: 0x00ccff });
const endUserMaterial = new THREE.MeshPhongMaterial({ color: 0x66ff66 });
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

// Nodes
const centralNode = new THREE.Mesh(new THREE.SphereGeometry(2, 32, 32), centralMaterial);
centralNode.position.set(0, 0, 0);
scene.add(centralNode);

const partners = [];
const partnerCount = 5;
for (let i = 0; i < partnerCount; i++) {
    const angle = (i / partnerCount) * Math.PI * 2;
    const x = 10 * Math.cos(angle);
    const z = 10 * Math.sin(angle);
    const node = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), partnerMaterial);
    node.position.set(x, 0, z);
    partners.push(node);
    scene.add(node);

    // Line from central to partner
    const points = [centralNode.position, node.position];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    scene.add(line);
}

const endUsers = [];
const endUserCount = 10;
for (let i = 0; i < endUserCount; i++) {
    const angle = (i / endUserCount) * Math.PI * 2;
    const radius = 20;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), endUserMaterial);
    node.position.set(x, 0, z);
    endUsers.push(node);
    scene.add(node);

    // Connect to random partner
    const partner = partners[Math.floor(Math.random() * partnerCount)];
    const points = [partner.position, node.position];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, lineMaterial);
    scene.add(line);
}

// Animate energy flow
// TODO: Research Space/Time Complexity to understand performance implications
function animateFlow() {
    const time = Date.now() * 0.002;
    partners.forEach((partner, i) => {
        partner.position.y = Math.sin(time + i) * 1.5;
    });
    endUsers.forEach((user, i) => {
        user.position.y = Math.sin(time + i * 0.5) * 0.5;
    });
}

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Render loop
function animate() {
    requestAnimationFrame(animate);
    animateFlow();
    controls.update();
    renderer.render(scene, camera);
}

animate();