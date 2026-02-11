import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 50); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);


renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
document.body.appendChild(renderer.domElement);

// ===== Center node =====
const centerNode = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 40, 40),
  new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
centerNode.position.set(0, 0, 0);
scene.add(centerNode);

// ===== Secondary nodes =====
const secondaryNodes = [];
const numSecondary = 1;
const minRadius = 8;
const maxRadius = 20;
const minDistance = 8;

function randomPosition(existingNodes) {
  let pos, safe = false;
  while (!safe) {
    const angle = Math.random() * Math.PI * 2;
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    pos = { x, y };
    safe = existingNodes.every(n => {
      const dx = x - n.position.x;
      const dy = y - n.position.y;
      return Math.sqrt(dx * dx + dy * dy) >= minDistance;
    });
  }
  return pos;
}

const secondaryLines = [];

for (let i = 0; i < numSecondary; i++) {
  const secNode = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0x0000ff })
  );
  const pos = randomPosition(secondaryNodes);
  secNode.position.set(pos.x, pos.y, 0);
  secNode.tertiaryNodes = [];
  secNode.linesToTertiary = [];
  scene.add(secNode);
  secondaryNodes.push(secNode);

  const lineGeom = new THREE.BufferGeometry().setFromPoints([centerNode.position.clone(), secNode.position.clone()]);
  const line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 4 }));
  scene.add(line);
  secondaryLines.push({ line, secNode });
}

// ===== Tertiary nodes =====
const tertiaryMinRadius = 1;
const tertiaryMaxRadius = 15;
const tertiaryPerSecondary = 5;

secondaryNodes.forEach(secNode => {
  const existing = [];
  for (let i = 0; i < tertiaryPerSecondary; i++) {
    let pos, safe = false;
    while (!safe) {
      const angle = Math.random() * Math.PI * 2;
      const radius = tertiaryMinRadius + Math.random() * (tertiaryMaxRadius - tertiaryMinRadius);
      const x = secNode.position.x + Math.cos(angle) * radius;
      const y = secNode.position.y + Math.sin(angle) * radius;
      pos = { x, y };
      safe = existing.every(t => {
        const dx = x - t.position.x;
        const dy = y - t.position.y;
        return Math.sqrt(dx * dx + dy * dy) >= 0.15;
      });
    }

    const tNode = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    tNode.position.set(pos.x, pos.y, 0);
    scene.add(tNode);
    secNode.tertiaryNodes.push(tNode);
    existing.push(tNode);

    const tLineGeom = new THREE.BufferGeometry().setFromPoints([secNode.position.clone(), tNode.position.clone()]);
    const tLine = new THREE.Line(tLineGeom, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 1 }));
    scene.add(tLine);
    secNode.linesToTertiary.push(tLine);
  }
});

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedNode = null;
let dragOffset = new THREE.Vector3();
let isPanning = false;

function getMouseXY(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

window.addEventListener('mousedown', (event) => {
  getMouseXY(event);
  raycaster.setFromCamera(mouse, camera);
  
  const intersects = raycaster.intersectObjects(secondaryNodes);
  if (intersects.length > 0) {
    selectedNode = intersects[0].object;
    dragOffset.copy(intersects[0].point).sub(selectedNode.position);
    document.body.style.cursor = 'grabbing';
    return;
  }

  isPanning = true;
  document.body.style.cursor = 'move';
});

window.addEventListener('mousemove', (event) => {
  if (selectedNode) {
    getMouseXY(event);
    raycaster.setFromCamera(mouse, camera);
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(planeZ, intersect);
    
    if (intersect) {
      const dx = intersect.x - dragOffset.x - selectedNode.position.x;
      const dy = intersect.y - dragOffset.y - selectedNode.position.y;
      selectedNode.position.set(intersect.x - dragOffset.x, intersect.y - dragOffset.y, 0);

      selectedNode.tertiaryNodes.forEach(tNode => {
        tNode.position.x += dx;
        tNode.position.y += dy;
      });
    }
    return;
  }

  if (isPanning) {
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * camera.position.z;
    
    const scale = visibleHeight / window.innerHeight;

    const sensitivity = 0.95; 
    camera.position.x -= event.movementX * scale * sensitivity;
    camera.position.y += event.movementY * scale * sensitivity;
  }
});

window.addEventListener('mouseup', () => {
  selectedNode = null;
  isPanning = false;
  document.body.style.cursor = 'default';
});

window.addEventListener('wheel', (event) => {
  const zoomSpeed = 0.05;
  camera.position.z -= event.deltaY * zoomSpeed;
  
  camera.position.z = Math.max(10, Math.min(100, camera.position.z));
});

function animate() {
  requestAnimationFrame(animate);

  secondaryLines.forEach(obj => {
    obj.line.geometry.setFromPoints([centerNode.position.clone(), obj.secNode.position.clone()]);
    obj.line.geometry.attributes.position.needsUpdate = true;
  });

  secondaryNodes.forEach(secNode => {
    secNode.linesToTertiary.forEach((line, i) => {
      const tNode = secNode.tertiaryNodes[i];
      line.geometry.setFromPoints([secNode.position.clone(), tNode.position.clone()]);
      line.geometry.attributes.position.needsUpdate = true;
    });
  });

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});