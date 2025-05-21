import * as THREE from "three";
import { ARButton } from "three/addons/webxr/ARButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

class CustomSinCurve extends THREE.Curve {

	constructor( scale = 1 ) {
		super();
		this.scale = scale;
	}

	getPoint( t, optionalTarget = new THREE.Vector3() ) {

		const tx = t * 3 - 1.5;
		const ty = Math.sin( 2 * Math.PI * t );
		const tz = 0;

		return optionalTarget.set( tx, ty, tz ).multiplyScalar( this.scale );
	}
}

let camera, scene, renderer;
let dodecahedronMesh, extrudeMesh, tubeMesh;
let controls;
let particles;
let hue = 0;

let rotationEnabled = true;
let pulseMoveEnabled = true;
let colorEmitEnabled = true;
let speedMode = "normal";
let texturesEnabled = true;
let rotationDirection = 1;
let specialEffectActive = false;
let specialEffectTimer = 0;

let dodecahedronMaterial, dodecahedronMaterialNoTexture;
let tubeMaterial, tubeMaterialNoTexture;
let extrudeMaterial, extrudeMaterialNoTexture;

init();
animate();

function init() {
  const container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
  directionalLight.position.set(3, 3, 3);
  scene.add(directionalLight);

  const pointLight = new THREE.PointLight(0xffffff, 10, 10);
  pointLight.position.set(-2, 2, 2);
  scene.add(pointLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const textureLoader = new THREE.TextureLoader();
  const colorfulMetalTexture = textureLoader.load(
    "https://images.unsplash.com/photo-1659776026027-6b0f66d92675?q=80&w=1527&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  );
  const glassTexture = textureLoader.load(
    "https://as1.ftcdn.net/v2/jpg/01/61/23/82/1000_F_161238202_GbkRIC1lSjG7lZCLLPfQ7wAaEQyw9UsG.jpg"
  );
  const futuristicTexture = textureLoader.load(
    "https://images.unsplash.com/photo-1617864323755-662e612eb00a?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  );

  const dodecahedronGeometry = new THREE.DodecahedronGeometry(0.6);
  dodecahedronMaterial = new THREE.MeshPhysicalMaterial({
    map: colorfulMetalTexture,
    transparent: false,
    opacity: 1.0,
    roughness: 0.5,
    metalness: 0.9,
    transmission: 0.6,
  });
  dodecahedronMaterialNoTexture = new THREE.MeshPhysicalMaterial({
    color: 0x508194,
    transparent: true,
    opacity: 0.7,
    roughness: 0.5,
    metalness: 0.3,
    transmission: 0.6,
  });
  dodecahedronMesh = new THREE.Mesh(dodecahedronGeometry, dodecahedronMaterial);
  dodecahedronMesh.position.set(-2.0, 0, -5);
  scene.add(dodecahedronMesh);

  const extrudeGeometry = new THREE.ExtrudeGeometry();
  extrudeMaterial = new THREE.MeshStandardMaterial({
    map: glassTexture,
    opacity: 0.5,
    metalness: 0.9,
    roughness: 0.2
  })
  extrudeMaterialNoTexture = new THREE.MeshStandardMaterial({
    color: 0x370852,
    metalness: 0.8
  })
  extrudeMesh = new THREE.Mesh(extrudeGeometry, extrudeMaterial);
  extrudeMesh.position.set(0, 0, -5);
  scene.add(extrudeMesh);

  const path = new CustomSinCurve(0.5);
  const tubeGeometry = new THREE.TubeGeometry( path, 20, 0.2, 8, false );
  tubeMaterial = new THREE.MeshStandardMaterial({
    map: futuristicTexture,
    metalness: 0.9,
    roughness: 0.4,
  });
  tubeMaterialNoTexture = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x000000,
    emissiveIntensity: 1.5,
    metalness: 0.5,
    roughness: 0.4,
  });
  tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
  tubeMesh.position.set(2.0, 0, -5);
  scene.add(tubeMesh);

  createParticles();

  camera.position.z = 3;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  const button = ARButton.createButton(renderer, {
    onSessionStarted: () => {
      renderer.domElement.style.background = "transparent";
      document.getElementById("controls").style.display = "flex";
    },
    onSessionEnded: () => {
      document.getElementById("controls").style.display = "flex";
    },
  });
  document.body.appendChild(button);
  renderer.domElement.style.display = "block";

  document
    .getElementById("toggleRotationBtn")
    .addEventListener("click", toggleRotation);
  document
    .getElementById("togglePulseBtn")
    .addEventListener("click", togglePulseMove);
  document
    .getElementById("toggleColorBtn")
    .addEventListener("click", toggleColorEmit);
  document
    .getElementById("toggleSpeedBtn")
    .addEventListener("click", toggleSpeed);
  document
    .getElementById("toggleTexturesBtn")
    .addEventListener("click", toggleTextures);
  document
    .getElementById("toggleDirectionBtn")
    .addEventListener("click", toggleDirection);
  document
    .getElementById("specialEffectBtn")
    .addEventListener("click", triggerSpecialEffect);

  window.addEventListener("resize", onWindowResize, false);
}

function createParticles() {
  const particleGeometry = new THREE.BufferGeometry();
  const particleCount = 150;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 8;

    colors[i * 3] = Math.random();
    colors[i * 3 + 1] = Math.random();
    colors[i * 3 + 2] = Math.random();
  }

  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const particleMaterial = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0,
  });

  particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);
}

function toggleRotation() {
  rotationEnabled = !rotationEnabled;
  document.getElementById("toggleRotationBtn").textContent = rotationEnabled
    ? "Disable Rotation"
    : "Enable Rotation";
}

function togglePulseMove() {
  pulseMoveEnabled = !pulseMoveEnabled;
  document.getElementById("togglePulseBtn").textContent = pulseMoveEnabled
    ? "Disable Pulse/Move"
    : "Enable Pulse/Move";
}

function toggleColorEmit() {
  colorEmitEnabled = !colorEmitEnabled;
  document.getElementById("toggleColorBtn").textContent = colorEmitEnabled
    ? "Disable Color/Emit"
    : "Enable Color/Emit";
}

function toggleSpeed() {
  speedMode = speedMode === "normal" ? "fast" : "normal";
  document.getElementById("toggleSpeedBtn").textContent = `Speed: ${
    speedMode.charAt(0).toUpperCase() + speedMode.slice(1)
  }`;
}

function toggleTextures() {
  texturesEnabled = !texturesEnabled;
  document.getElementById("toggleTexturesBtn").textContent = texturesEnabled
    ? "Disable Textures"
    : "Enable Textures";

  dodecahedronMesh.material = texturesEnabled ? dodecahedronMaterial : dodecahedronMaterialNoTexture;
  extrudeMesh.material = texturesEnabled ? extrudeMaterial : extrudeMaterialNoTexture;
  tubeMesh.material = texturesEnabled ? tubeMaterial : tubeMaterialNoTexture;

  dodecahedronMesh.material.needsUpdate = true;
  extrudeMesh.material.needsUpdate = true;
  tubeMesh.material.needsUpdate = true;
}

function toggleDirection() {
  rotationDirection *= -1;
  document.getElementById("toggleDirectionBtn").textContent =
    rotationDirection === 1 ? "Direction: Forward" : "Direction: Backward";
}

function triggerSpecialEffect() {
  specialEffectActive = true;
  specialEffectTimer = 0;
  particles.material.opacity = 1;
  particles.position.z = 0;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
  controls.update();
}

function render(timestamp) {
  animateObjects(timestamp);
  renderer.render(scene, camera);
}

function animateObjects(timestamp) {
  const speed = speedMode === "normal" ? 1 : 2;
  const specialSpeed = specialEffectActive ? 3 : 1;

  if (rotationEnabled) {
    dodecahedronMesh.rotation.y -= 0.01 * speed * rotationDirection * specialSpeed;
    dodecahedronMesh.rotation.x -= 0.01 * speed * rotationDirection * specialSpeed;
  }
  if (pulseMoveEnabled) {
    const scale = 1 + 0.2 * Math.sin(timestamp * 0.002 * speed * specialSpeed);
    dodecahedronMesh.scale.set(scale, scale, scale);
    dodecahedronMesh.position.y =
      0.5 * Math.sin(timestamp * 0.002 * speed * specialSpeed);
    dodecahedronMesh.material.opacity =
      0.5 + 0.2 * Math.sin(timestamp * 0.003 * speed * specialSpeed);
  }

  if (rotationEnabled) {
    extrudeMesh.rotation.x -= 0.01 * speed * rotationDirection * specialSpeed;
  }
  if (pulseMoveEnabled) {
    const innerRadius =
      0.4 + 0.1 * Math.sin(timestamp * 0.002 * speed * specialSpeed);
    const outerRadius =
      0.6 + 0.1 * Math.sin(timestamp * 0.002 * speed * specialSpeed);
    extrudeMesh.geometry = new THREE.ExtrudeGeometry();
  }
  if (colorEmitEnabled) {
    hue += 0.005 * speed * specialSpeed;
    if (hue > 1) hue = 0;
    extrudeMesh.material.color.setHSL(hue, 1, 0.5);
  }

  if (rotationEnabled) {
    tubeMesh.rotation.y -= 0.01 * speed * rotationDirection * specialSpeed;
  }
  if (pulseMoveEnabled) {
    const jump =
      Math.abs(Math.sin(timestamp * 0.005 * speed * specialSpeed)) * 0.5;
    tubeMesh.position.y = jump;
  }
  if (colorEmitEnabled) {
    tubeMesh.material.emissiveIntensity =
      1.5 + Math.sin(timestamp * 0.003 * speed * specialSpeed);
  }

  if (specialEffectActive) {
    specialEffectTimer += 0.1 * speed * specialSpeed;
    particles.position.z += 0.1 * speed * specialSpeed;
    particles.material.opacity = Math.max(0, 1 - specialEffectTimer / 5);
    if (specialEffectTimer >= 5) {
      specialEffectActive = false;
      particles.material.opacity = 0;
      particles.position.z = 0;
    }
  }
}
