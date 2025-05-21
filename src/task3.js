import './style.css'

import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"

let container;
let camera, scene, renderer;
let reticle;
let controller;
let meshes = [];
let rotationEnabled = true;
let scaleAnimationEnabled = true;
let currentMaterialIndex = 0;
let currentColor = 0x00ff00;
let currentScale = 1.0;


const materials = [
  new THREE.MeshPhysicalMaterial({
    color: 0x00ff00,
    metalness: 0.5,
    roughness: 0.3,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    reflectivity: 0.8,
  }),
  new THREE.MeshPhysicalMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.5,
    metalness: 0.1,
    roughness: 0.1,
    transmission: 0.9,
    thickness: 0.5,
  }),
  new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x00ff00,
    emissiveIntensity: 2,
    metalness: 0.2,
    roughness: 0.5,
  }),
];

init();
animate();

function init() {
    container = document.createElement("div");
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    addReticleToScene();

    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        onSessionStarted: () => {
            renderer.domElement.style.background = "transparent";
            document.getElementById("controls").style.display = "flex";
        },
        onSessionEnded: () => {
            document.getElementById("controls").style.display = "flex";
        },
    });
    document.body.appendChild(button);
    renderer.domElement.style.display = "none";

    document.getElementById("changeColorBtn").addEventListener("click", changeConeColor);
    document.getElementById("toggleRotationBtn").addEventListener("click", toggleRotation);
    document.getElementById("changeSizeBtn").addEventListener("click", changeConeSize);
    document.getElementById("toggleScaleAnimationBtn").addEventListener("click", toggleScaleAnimation);
    document.getElementById("changeMaterialBtn").addEventListener("click", changeMaterial);

    updateColorIndicator(0xff0000);

    window.addEventListener("resize", onWindowResize, false);
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(
        -Math.PI / 2
    );
    // geometry.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    const material = new THREE.MeshBasicMaterial();

    reticle = new THREE.Mesh(geometry, material);

    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    reticle.add(new THREE.AxesHelper(1));
}

function onSelect() {        
    if (reticle.visible) {
        const geometry = new THREE.IcosahedronGeometry(0.05);
        const material = materials[currentMaterialIndex].clone();
        material.color.setHex(currentColor);
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.position.setFromMatrixPosition(reticle.matrix);
        mesh.quaternion.setFromRotationMatrix(reticle.matrix);

        mesh.scale.set(currentScale, currentScale, currentScale);

        let scaleUp = true;
        mesh.userData.animateScale = () => {
        if (scaleUp) {
            mesh.scale.multiplyScalar(1.05);
            if (mesh.scale.x >= currentScale) scaleUp = false;
        } else {
            mesh.scale.multiplyScalar(0.95);
            if (mesh.scale.x <= currentScale * 0.5) scaleUp = true;
        }
        };

        mesh.userData.rotationSpeed = 0.02;

        meshes.push(mesh);
        scene.add(mesh); 

        const placeSound = document.getElementById("placeSound");
        placeSound.currentTime = 0;
        placeSound.play();
    }
}

function updateColorIndicator(color) {
  const colorIndicator = document.getElementById("colorIndicator");
  const hexColor = `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
  colorIndicator.style.backgroundColor = hexColor;
}

function changeConeColor() {
  currentColor = Math.random() * 0xffffff;
  meshes.forEach((mesh) => {
    mesh.material.color.setHex(currentColor);
  });
  updateColorIndicator(currentColor);
}

function toggleRotation() {
  rotationEnabled = !rotationEnabled;
  document.getElementById("toggleRotationBtn").textContent = rotationEnabled
    ? "Disable Rotation"
    : "Enable Rotation";
}

function changeConeSize() {
  currentScale = Math.random() * 0.5 + 0.5;
  meshes.forEach((mesh) => {
    mesh.scale.set(currentScale, currentScale, currentScale);
  });
  document.getElementById("scaleIndicator").textContent = `Current Scale: ${currentScale.toFixed(2)}`;
}

function toggleScaleAnimation() {
  scaleAnimationEnabled = !scaleAnimationEnabled;
  document.getElementById("toggleScaleAnimationBtn").textContent =
    scaleAnimationEnabled
      ? "Disable Scale Animation"
      : "Enable Scale Animation";
}

function changeMaterial() {
  currentMaterialIndex = (currentMaterialIndex + 1) % materials.length;
  const newMaterial = materials[currentMaterialIndex].clone();
  meshes.forEach((mesh) => {
    const currentColor = mesh.material.color.getHex();
    mesh.material.dispose();
    mesh.material = newMaterial;
    mesh.material.color.setHex(currentColor);
  });
  document.getElementById("changeMaterialBtn").textContent = `Material: ${
    ["Metallic", "Glass", "Emissive"][currentMaterialIndex]
  }`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

// Hit Testing у WebXR повертає лише координати (позицію) та орієнтацію точки перетину віртуального променя (Raycast) 
// із реальним світом. Але він не надає інформації про саму поверхню, з якою було перетинання (яка саме це поверхня;
// вертикальна чи горизонтальна і тд)
let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;

// Мета даної функції отримати hitTestSource для відслідковування поверхонь у AR
// та створює referenceSpace, тобто як ми інтерпретуватимемо координати у WebXR
// параметр 'viewer' означає, що ми відстежуємо камеру мобільного пристрою
async function initializeHitTestSource() {
    const session = renderer.xr.getSession(); // XRSession
    
    // 'viewer' базується на пололежнні пристрою під час хіт-тесту
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

    // Далі ми використовуємо 'local' referenceSpace, оскільки він забезпечує 
    // стабільність відносно оточення. Це фіксована координатна система, яка дозволяє стабільно
    // відмальовувати наші 3D-об'єкти, навіть якщо користувач рухається. 
    localSpace = await session.requestReferenceSpace("local");

    // Цей крок необхідний, щоб постійно не викликати пошук поверхонь
    hitTestSourceInitialized = true;
    
    // Завершуємо AR-сесію
    session.addEventListener("end", () => {
        hitTestSourceInitialized = false;
        hitTestSource = null;
    });
}

function render(timestamp, frame) {
    if (frame) {
        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }

        if (hitTestSourceInitialized) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            // Ми можемо отримати багато поверхонь у результатах, але та поверхня, яка буде найближчою 
            // до камери буде під номер 1.
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];

                // Pose являє собою положення точки на поверхні
                const pose = hit.getPose(localSpace);

                reticle.visible = true;
                // Перетворюємо мітку поверхні відповідно до позиції хіт-тесту
                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }

        meshes.forEach((mesh) => {
            if (scaleAnimationEnabled && mesh.userData.animateScale) {
                mesh.userData.animateScale();
            }
            if (rotationEnabled) {
                mesh.rotation.y += mesh.userData.rotationSpeed;
            }
        });

        renderer.render(scene, camera);
    }
}