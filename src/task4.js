import './style.css'

import * as THREE from "three"
import { ARButton } from "three/addons/webxr/ARButton.js"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let container;
let camera, scene, renderer;
let reticle;
let controller;
let models = [];
let directionalLightEnabled = true;
let jumpEnabled = true;
let rotationEnabled = true;
let directionalLight;
let lightIntensity = 3;
let lightColors = [0xffffff, 0xffaaaa, 0xaaffaa, 0xaaaaff];
let currentLightColorIndex = 0;

const materials = {
  realistic: null,
  gold: new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.9,
    roughness: 0.1,
  }),
  glow: new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x00ff00,
    emissiveIntensity: 1.5,
    metalness: 0.3,
    roughness: 0.3, 
  }),
  glass: new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.5,
    metalness: 0.2,
    roughness: 0.05,
    transmission: 0.9,
    thickness: 0.5,
  }),
  chrome: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1,
    roughness: 0.02,
  }),
};

const originalMaterials = new Map();
let currentMaterial = "realistic";


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

    directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
    directionalLight.position.set(2, 3, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 0.5);
    hemisphereLight.position.set(0, 1, 0);
    scene.add(hemisphereLight);

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
    renderer.domElement.style.display = "block";

    document.getElementById("materialRealisticBtn").addEventListener("click", () => setMaterial("realistic"));
    document.getElementById("materialGoldBtn").addEventListener("click", () => setMaterial("gold"));
    document.getElementById("materialGlowBtn").addEventListener("click", () => setMaterial("glow"));
    document.getElementById("materialGlassBtn").addEventListener("click", () => setMaterial("glass"));
    document.getElementById("materialChromeBtn").addEventListener("click", () => setMaterial("chrome"));
    document.getElementById("toggleDirectionalLightBtn").addEventListener("click", toggleDirectionalLight);
    document.getElementById("increaseLightIntensityBtn").addEventListener("click", increaseLightIntensity);
    document.getElementById("decreaseLightIntensityBtn").addEventListener("click", decreaseLightIntensity);
    document.getElementById("changeLightColorBtn").addEventListener("click", changeLightColor);
    document.getElementById("toggleJumpBtn").addEventListener("click", toggleJump);
    document.getElementById("toggleRotationBtn").addEventListener("click", toggleRotation);

    window.addEventListener("resize", onWindowResize, false);
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.7,
    });

    reticle = new THREE.Mesh(geometry, material);

    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    reticle.add(new THREE.AxesHelper(0.5));
}

function onSelect() {
    if (reticle.visible) {
        const modelUrl = 'https://raw.githubusercontent.com/andrsydor/planet_model/main/scene.gltf';

        const loader = new GLTFLoader();
        loader.load(
            modelUrl,
                function (gltf) {
                    const model = gltf.scene;
                    
                    model.position.setFromMatrixPosition(reticle.matrix);
                    model.quaternion.setFromRotationMatrix(reticle.matrix);
                    model.scale.set(0.01, 0.01, 0.01);

                    model.userData.basePosition = model.position.clone();
                    model.userData.rotationSpeed = 0.02;

                    // model.traverse((child) => {
                    //     if (child.isMesh) {
                    //         console.log("Mesh found:", child.name, "Material:", child.material);
                    //         originalMaterials.set(child, child.material);
                    //         child.castShadow = true; // Модель відкидає тіні
                    //         child.receiveShadow = true; // Модель приймає тіні
                    //         if (child.material) {
                    //         child.material.side = THREE.DoubleSide;
                    //         child.material.needsUpdate = true;
                    //         // Налаштування для чіткості
                    //         child.material.metalness = child.material.metalness || 0.5; // Збільшуємо для відблисків
                    //         child.material.roughness = child.material.roughness || 0.3; // Зменшуємо для чіткості
                    //         if (child.material.map) {
                    //             child.material.map.encoding = THREE.sRGBEncoding;
                    //             child.material.map.flipY = false;
                    //         }
                    //         if (child.material.normalMap) {
                    //             child.material.normalMap.encoding = THREE.LinearEncoding;
                    //         }
                    //         if (child.material.roughnessMap) {
                    //             child.material.roughnessMap.encoding = THREE.LinearEncoding;
                    //         }
                    //         if (child.material.metalnessMap) {
                    //             child.material.metalnessMap.encoding = THREE.LinearEncoding;
                    //         }
                    //         }
                    //     }
                    // });

                    if (materials[currentMaterial]) {
                        model.traverse((child) => {
                            if (child.isMesh) {
                            child.material = materials[currentMaterial].clone();
                            child.material.needsUpdate = true;
                            }
                        });
                    }

                    models.push(model);
                    scene.add(model);

                    const placeSound = document.getElementById("placeSound");
                        if (placeSound) {
                        placeSound.currentTime = 0;
                        placeSound.play();
                    }

                    console.log("Model added to scene at", model.position);
                },

                function (xhr) {
                    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                },

                function (error) {
                    console.error('Error loading model:', error);
                }
        );
    }
}

function setMaterial(type) {
  currentMaterial = type;
  models.forEach((model) => {
    if (materials[type]) {
      model.traverse((child) => {
        if (child.isMesh) {
          child.material = materials[type].clone();
          child.material.needsUpdate = true;
        }
      });
    } else {
      model.traverse((child) => {
        if (child.isMesh) {
          const originalMaterial = originalMaterials.get(child);
          if (originalMaterial) {
            child.material = originalMaterial;
            child.material.needsUpdate = true;
          }
        }
      });
    }
  });

  document.getElementById("materialRealisticBtn").textContent =
    currentMaterial === "realistic" ? "Material: Realistic (Active)" : "Material: Realistic";
  document.getElementById("materialGoldBtn").textContent =
    currentMaterial === "gold" ? "Material: Gold (Active)" : "Material: Gold";
  document.getElementById("materialGlowBtn").textContent =
    currentMaterial === "glow" ? "Material: Glow (Active)" : "Material: Glow";
  document.getElementById("materialGlassBtn").textContent =
    currentMaterial === "glass" ? "Material: Glass (Active)" : "Material: Glass";
  document.getElementById("materialChromeBtn").textContent =
    currentMaterial === "chrome" ? "Material: Chrome (Active)" : "Material: Chrome";
}

function toggleDirectionalLight() {
  directionalLightEnabled = !directionalLightEnabled;
  directionalLight.visible = directionalLightEnabled;
  document.getElementById("toggleDirectionalLightBtn").textContent =
    directionalLightEnabled ? "Directional Light: On" : "Directional Light: Off";
}

function increaseLightIntensity() {
  lightIntensity = Math.min(lightIntensity + 0.5, 5);
  directionalLight.intensity = lightIntensity;
  console.log("Light intensity increased to", lightIntensity);
}

function decreaseLightIntensity() {
  lightIntensity = Math.max(lightIntensity - 0.5, 0);
  directionalLight.intensity = lightIntensity;
  console.log("Light intensity decreased to", lightIntensity);
}

function changeLightColor() {
  currentLightColorIndex = (currentLightColorIndex + 1) % lightColors.length;
  directionalLight.color.setHex(lightColors[currentLightColorIndex]);
  const colorNames = ["White", "Red", "Green", "Blue"];
  document.getElementById(
    "changeLightColorBtn"
  ).textContent = `Light Color: ${colorNames[currentLightColorIndex]}`;
}

function toggleJump() {
  jumpEnabled = !jumpEnabled;
  document.getElementById("toggleJumpBtn").textContent = jumpEnabled
    ? "Jump: On"
    : "Jump: Off";
}

function toggleRotation() {
  rotationEnabled = !rotationEnabled;
  document.getElementById("toggleRotationBtn").textContent = rotationEnabled
    ? "Rotation: On"
    : "Rotation: Off";
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
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(localSpace);

        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);

        reticle.material.opacity = 0.7 + 0.3 * Math.sin(timestamp * 0.005);
        reticle.material.color.setHSL((timestamp * 0.0005) % 1, 0.7, 0.5);
      } else {
        reticle.visible = false;
      }
    }

    // Анімації для кожної моделі
    models.forEach((model) => {
      // Анімація стрибків
      if (jumpEnabled) {
        const jumpHeight = 0.1;
        const jumpSpeed = 0.005;
        const offsetY = Math.sin(timestamp * jumpSpeed) * jumpHeight;
        model.position.y = model.userData.basePosition.y + offsetY;
      } else {
        model.position.y = model.userData.basePosition.y;
      }

      // Анімація обертання
      if (rotationEnabled) {
        model.rotation.y += model.userData.rotationSpeed;
      }
    });

    renderer.render(scene, camera);
  }
}