import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "lil-gui";
import ColorGUIHelper from "./gui/ColorGUIHelper";
import DegRadHelper from "./gui/DegRadHelper";
import DimensionGUIHelper from "./gui/DimensionGUIHelper";
import MinMaxGUIHelper from "./gui/MinMaxGUIHelper";

// init scene
const canvas = document.getElementById("canvas");
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMap.enabled = true;
console.log(renderer.capabilities.maxTextureSize);

// camera
const fov = 45;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

// controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 5, 0);
controls.update();

// gui
const gui = new GUI();
let removeLight;

gui
  .add({ selectedLightType: "DirectionalLight" }, "selectedLightType", [
    "DirectionalLight",
    "PointLight",
    "SpotLight",
  ])
  .onChange((event) => {
    if (removeLight) removeLight();
    removeLight = lights[event]();
  });

function makeXYZGUI(vector3, name, onChange) {
  const folder = gui.addFolder(name);
  folder.add(vector3, "x", -10, 10).onChange(onChange);
  folder.add(vector3, "y", 0, 20).onChange(onChange);
  folder.add(vector3, "z", -10, 10).onChange(onChange);
  folder.open();
  return folder;
}

// lights
function addDirectionalLight() {
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(0, 10, 0);
  light.target.position.set(-5, 0, 0);
  scene.add(light);
  scene.add(light.target);
  light.castShadow = true;

  // light shadow helper
  const cameraHelper = new THREE.CameraHelper(light.shadow.camera);
  scene.add(cameraHelper);
  function updateCamera() {
    // update the light target's matrixWorld because it's needed by the helper
    light.target.updateMatrixWorld();
    // update the light's shadow camera's projection matrix
    light.shadow.camera.updateProjectionMatrix();
    // and now update the camera helper we're using to show the light's shadow camera
    cameraHelper.update();
  }
  updateCamera();

  // controllers
  const colorController = gui
    .addColor(new ColorGUIHelper(light, "color"), "value")
    .name("color");
  const lightController = gui.add(light, "intensity", 0, 2, 0.01);
  const lightControllerFolder = makeXYZGUI(light.position, "position", () => {
    light.target.updateMatrixWorld();
  });
  const lightTargetControllerFolder = makeXYZGUI(
    light.target.position,
    "target",
    () => {
      light.target.updateMatrixWorld();
    }
  );

  const shadowFolder = gui.addFolder("Shadow Camera");
  shadowFolder.open();
  shadowFolder
    .add(
      new DimensionGUIHelper(light.shadow.camera, "left", "right"),
      "value",
      1,
      100
    )
    .name("width")
    .onChange(updateCamera);
  shadowFolder
    .add(
      new DimensionGUIHelper(light.shadow.camera, "bottom", "top"),
      "value",
      1,
      100
    )
    .name("height")
    .onChange(updateCamera);
  const minMaxGUIHelper = new MinMaxGUIHelper(
    light.shadow.camera,
    "near",
    "far",
    0.1
  );
  shadowFolder
    .add(minMaxGUIHelper, "min", 0.1, 50, 0.1)
    .name("near")
    .onChange(updateCamera);
  shadowFolder
    .add(minMaxGUIHelper, "max", 0.1, 50, 0.1)
    .name("far")
    .onChange(updateCamera);
  shadowFolder
    .add(light.shadow.camera, "zoom", 0.01, 1.5, 0.01)
    .onChange(updateCamera);

  return () => {
    scene.remove(light.target);
    scene.remove(light);
    scene.remove(cameraHelper);

    // remove controls
    colorController.destroy();
    lightController.destroy();
    lightControllerFolder.destroy();
    lightTargetControllerFolder.destroy();
    shadowFolder.destroy();
  };
}

function addPointLight() {
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.PointLight(color, intensity);
  light.distance = 60;
  light.position.set(0, 10, 0);
  light.castShadow = true;
  scene.add(light);

  // helper
  const helper = new THREE.PointLightHelper(light);
  scene.add(helper);

  // add walls
  const cubeSize = 30;
  const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const cubeMat = new THREE.MeshPhongMaterial({
    color: "#CCC",
    side: THREE.BackSide,
  });
  const wallMesh = new THREE.Mesh(cubeGeo, cubeMat);
  wallMesh.receiveShadow = true;
  wallMesh.position.set(0, cubeSize / 2 - 0.1, 0);
  scene.add(wallMesh);

  // gui
  const colorController = gui
    .addColor(new ColorGUIHelper(light, "color"), "value")
    .name("color");
  const lightController = gui.add(light, "intensity", 0, 2, 0.01);
  const distanceController = gui.add(light, "distance", 0, 40);
  const lightControllerFolder = makeXYZGUI(light.position, "position");
  const shadowFolder = gui.addFolder("Shadow Camera");
  shadowFolder.open();
  const minMaxGUIHelper = new MinMaxGUIHelper(
    light.shadow.camera,
    "near",
    "far",
    0.1
  );
  shadowFolder.add(minMaxGUIHelper, "min", 0.1, 50, 0.1).name("near");
  shadowFolder.add(minMaxGUIHelper, "max", 0.1, 50, 0.1).name("far");

  return () => {
    scene.remove(light.target);
    scene.remove(light);
    scene.remove(helper);
    scene.remove(wallMesh);

    // remove controls
    colorController.destroy();
    lightController.destroy();
    distanceController.destroy();
    lightControllerFolder.destroy();
    shadowFolder.destroy();
  };
}

function addSpotLight() {
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.SpotLight(color, intensity);
  light.castShadow = true;
  light.position.set(0, 10, 0);
  light.target.position.set(-4, 0, -4);
  scene.add(light);
  scene.add(light.target);

  function updateLight() {
    light.target.updateMatrixWorld();
  }
  function updateCamera() {
    // update the light target's matrixWorld because it's needed by the helper
    light.target.updateMatrixWorld();
    // update the light's shadow camera's projection matrix
    light.shadow.camera.updateProjectionMatrix();
  }
  updateLight();

  // gui
  const colorController = gui
    .addColor(new ColorGUIHelper(light, "color"), "value")
    .name("color");
  const lightController = gui.add(light, "intensity", 0, 2, 0.01);
  const distanceController = gui
    .add(light, "distance", 0, 40)
    .onChange(updateLight);
  const angleController = gui
    .add(new DegRadHelper(light, "angle"), "value", 0, 90)
    .name("angle")
    .onChange(updateLight);
  const penumbraController = gui.add(light, "penumbra", 0, 1, 0.01);
  const shadowFolder = gui.addFolder("Shadow Camera");
  shadowFolder.open();
  const minMaxGUIHelper = new MinMaxGUIHelper(
    light.shadow.camera,
    "near",
    "far",
    0.1
  );
  shadowFolder
    .add(minMaxGUIHelper, "min", 0.1, 50, 0.1)
    .name("near")
    .onChange(updateCamera);
  shadowFolder
    .add(minMaxGUIHelper, "max", 0.1, 50, 0.1)
    .name("far")
    .onChange(updateCamera);
  const lightControllerFolder = makeXYZGUI(
    light.position,
    "position",
    updateLight
  );
  const lightTargetControllerFolder = makeXYZGUI(
    light.target.position,
    "target",
    updateLight
  );

  return () => {
    scene.remove(light.target);
    scene.remove(light);

    // remove controls
    colorController.destroy();
    lightController.destroy();
    distanceController.destroy();
    lightControllerFolder.destroy();
    angleController.destroy();
    penumbraController.destroy();
    lightTargetControllerFolder.destroy();
    shadowFolder.destroy();
  };
}

const lights = {
  DirectionalLight: addDirectionalLight,
  PointLight: addPointLight,
  SpotLight: addSpotLight,
};

removeLight = addDirectionalLight();

// ground plane
{
  const planeSize = 40;

  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    "https://threejs.org/manual/examples/resources/images/checker.png"
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  const repeats = planeSize / 2;
  texture.repeat.set(repeats, repeats);

  const planeGeo = new THREE.PlaneGeometry(planeSize, planeSize);
  const planeMat = new THREE.MeshStandardMaterial({
    map: texture,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(planeGeo, planeMat);
  mesh.rotation.x = Math.PI * -0.5;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// spheres
const numSpheres = 15;
const sphereBases = [];
const sphereRadius = 1;
const sphereWidthDivisions = 32;
const sphereHeightDivisions = 16;
const sphereGeo = new THREE.SphereGeometry(
  sphereRadius,
  sphereWidthDivisions,
  sphereHeightDivisions
);

for (let i = 0; i < numSpheres; ++i) {
  // add the sphere to the base
  const u = i / numSpheres; // goes from 0 to 1 as we iterate the spheres.
  const sphereMat = new THREE.MeshPhongMaterial();
  sphereMat.color.setHSL(u, 1, 0.75);
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  sphereMesh.position.set(0, sphereRadius + 2, 0);
  sphereMesh.castShadow = true;
  scene.add(sphereMesh);

  // remember all 3 plus the y position
  sphereBases.push({ sphereMesh, y: sphereMesh.position.y });
}

// elements
{
  const cubeSize = 4;
  const cubeGeo = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
  const cubeMat = new THREE.MeshStandardMaterial({
    color: "#8AC",
    flatShading: false,
  });
  const mesh = new THREE.Mesh(cubeGeo, cubeMat);
  mesh.position.set(cubeSize + 1, cubeSize / 2, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
{
  const sphereRadius = 3;
  const sphereWidthDivisions = 32;
  const sphereHeightDivisions = 16;
  const sphereGeo = new THREE.SphereGeometry(
    sphereRadius,
    sphereWidthDivisions,
    sphereHeightDivisions
  );
  const sphereMat = new THREE.MeshStandardMaterial({ color: "#CA8" });
  const mesh = new THREE.Mesh(sphereGeo, sphereMat);
  mesh.position.set(-sphereRadius - 1, sphereRadius + 2, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

// render
function checkNeedsResizing() {
  const { devicePixelRatio } = window;
  const height = (canvas.clientHeight * devicePixelRatio) | 0;
  const width = (canvas.clientWidth * devicePixelRatio) | 0;
  const isNeedsResizing = height !== canvas.height || width !== canvas.height;

  if (isNeedsResizing) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function render(time) {
  time *= 0.001;

  checkNeedsResizing();

  sphereBases.forEach((sphereShadowBase, ndx) => {
    const { sphereMesh, y } = sphereShadowBase;

    // u is a value that goes from 0 to 1 as we iterate the spheres
    const u = ndx / sphereBases.length;

    // compute a position for the base. This will move
    // both the sphere and its shadow
    const speed = time * 0.2;
    const angle = speed + u * Math.PI * 2 * (ndx % 1 ? 1 : -1);
    const radius = Math.sin(speed - ndx) * 10;
    sphereMesh.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );

    // yOff is a value that goes from 0 to 1
    const yOff = Math.abs(Math.sin(time * 2 + ndx));
    // move the sphere up and down
    sphereMesh.position.y = y + THREE.MathUtils.lerp(-2, 2, yOff);
  });

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();
