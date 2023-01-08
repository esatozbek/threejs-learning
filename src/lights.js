import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "lil-gui";
import ColorGUIHelper from "./gui/ColorGUIHelper";
import DegRadHelper from "./gui/DegRadHelper";

import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper";

// init scene
const canvas = document.getElementById("canvas");
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas });
RectAreaLightUniformsLib.init();

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
  .add({ selectedLightType: "AmbientLight" }, "selectedLightType", [
    "AmbientLight",
    "HemisphereLight",
    "DirectionalLight",
    "PointLight",
    "SpotLight",
    "RectAreaLight",
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
function addAmbientLight() {
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.AmbientLight(color, intensity);
  scene.add(light);

  // controls
  const colorController = gui
    .addColor(new ColorGUIHelper(light, "color"), "value")
    .name("color");
  const lightController = gui.add(light, "intensity", 0, 2, 0.01);

  return () => {
    scene.remove(light);

    // remove controls
    colorController.destroy();
    lightController.destroy();
  };
}

function addHemisphereLight() {
  const skyColor = 0xb1e1ff; // light blue
  const groundColor = 0xb97a20; // brownish orange
  const intensity = 1;
  const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  scene.add(light);

  // controls
  const skyColorController = gui
    .addColor(new ColorGUIHelper(light, "color"), "value")
    .name("skyColor");
  const groundColorController = gui
    .addColor(new ColorGUIHelper(light, "groundColor"), "value")
    .name("groundColor");
  const lightController = gui.add(light, "intensity", 0, 2, 0.01);

  return () => {
    scene.remove(light);

    // remove controls
    skyColorController.destroy();
    groundColorController.destroy();
    lightController.destroy();
  };
}

function addDirectionalLight() {
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(0, 10, 0);
  light.target.position.set(-5, 0, 0);
  scene.add(light);
  scene.add(light.target);

  // helper
  const helper = new THREE.DirectionalLightHelper(light);
  scene.add(helper);
  light.target.updateMatrixWorld();
  helper.update();

  // controllers
  const colorController = gui
    .addColor(new ColorGUIHelper(light, "color"), "value")
    .name("color");
  const lightController = gui.add(light, "intensity", 0, 2, 0.01);
  const lightControllerFolder = makeXYZGUI(light.position, "position", () => {
    light.target.updateMatrixWorld();
    helper.update();
  });
  const lightTargetControllerFolder = makeXYZGUI(
    light.target.position,
    "target",
    () => {
      light.target.updateMatrixWorld();
      helper.update();
    }
  );

  return () => {
    scene.remove(light.target);
    scene.remove(light);
    scene.remove(helper);

    // remove controls
    colorController.destroy();
    lightController.destroy();
    lightControllerFolder.destroy();
    lightTargetControllerFolder.destroy();
  };
}

function addPointLight() {
  renderer.physicallyCorrectLights = true;

  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.PointLight(color, intensity);
  light.power = 800;
  light.decay = 2;
  light.distance = Infinity;
  light.position.set(0, 10, 0);
  scene.add(light);

  // helper
  const helper = new THREE.PointLightHelper(light);
  scene.add(helper);
  helper.update();

  // gui
  const colorController = gui
    .addColor(new ColorGUIHelper(light, "color"), "value")
    .name("color");
  const lightController = gui.add(light, "intensity", 0, 2, 0.01);
  const decayController = gui.add(light, "decay", 0, 4, 0.01);
  const powerController = gui.add(light, "power", 0, 2000);
  const distanceController = gui
    .add(light, "distance", 0, 40)
    .onChange(() => helper.update());
  const lightControllerFolder = makeXYZGUI(light.position, "position", () =>
    helper.update()
  );

  return () => {
    renderer.physicallyCorrectLights = false;

    scene.remove(light.target);
    scene.remove(light);
    scene.remove(helper);

    // remove controls
    colorController.destroy();
    lightController.destroy();
    distanceController.destroy();
    lightControllerFolder.destroy();
    decayController.destroy();
    powerController.destroy();
  };
}

function addSpotLight() {
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.SpotLight(color, intensity);
  light.position.set(0, 10, 0);
  scene.add(light);
  scene.add(light.target);

  // helper
  const helper = new THREE.SpotLightHelper(light);
  scene.add(helper);
  function updateLight() {
    helper.update();
    light.target.updateMatrixWorld();
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
    scene.remove(helper);

    // remove controls
    colorController.destroy();
    lightController.destroy();
    distanceController.destroy();
    lightControllerFolder.destroy();
    angleController.destroy();
    penumbraController.destroy();
    lightTargetControllerFolder.destroy();
  };
}

function addRectAreaLight() {
  const color = 0xffffff;
  const intensity = 5;
  const width = 12;
  const height = 4;
  const light = new THREE.RectAreaLight(color, intensity, width, height);
  light.position.set(0, 10, 0);
  light.rotation.x = THREE.MathUtils.degToRad(-90);
  scene.add(light);

  // helper
  const helper = new RectAreaLightHelper(light);
  light.add(helper);

  // gui
  const colorController = gui
    .addColor(new ColorGUIHelper(light, "color"), "value")
    .name("color");
  const lightController = gui.add(light, "intensity", 0, 10, 0.01);
  const widthController = gui.add(light, "width", 0, 20);
  const heightController = gui.add(light, "height", 0, 20);
  const xController = gui
    .add(new DegRadHelper(light.rotation, "x"), "value", -180, 180)
    .name("x rotation");
  const yController = gui
    .add(new DegRadHelper(light.rotation, "y"), "value", -180, 180)
    .name("y rotation");
  const zController = gui
    .add(new DegRadHelper(light.rotation, "z"), "value", -180, 180)
    .name("z rotation");
  const xyzFolder = makeXYZGUI(light.position, "position");

  return () => {
    scene.remove(light);

    // remove controls
    colorController.destroy();
    lightController.destroy();
    widthController.destroy();
    heightController.destroy();
    xController.destroy();
    yController.destroy();
    zController.destroy();
    xyzFolder.destroy();
  };
}

const lights = {
  AmbientLight: addAmbientLight,
  HemisphereLight: addHemisphereLight,
  DirectionalLight: addDirectionalLight,
  PointLight: addPointLight,
  SpotLight: addSpotLight,
  RectAreaLight: addRectAreaLight,
};

removeLight = addAmbientLight();

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
  scene.add(mesh);
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

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();
