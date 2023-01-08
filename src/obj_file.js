import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "lil-gui";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import ColorGUIHelper from "./gui/ColorGUIHelper";
import DimensionGUIHelper from "./gui/DimensionGUIHelper";
import MinMaxGUIHelper from "./gui/MinMaxGUIHelper";

// init scene
const canvas = document.getElementById("canvas");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#404258");
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMap.enabled = true;
console.log(scene);
// camera
const fov = 45;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 10000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 100, 200);
camera.lookAt(0, 50, 0);
// controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 50, 0);
controls.update();

// light
const color = 0xffffff;
const intensity = 1;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(150, 200, 0);
light.target.position.set(-5, 0, 0);
light.castShadow = true;
light.shadow.mapSize.width = 100000;
light.shadow.mapSize.height = 100000;
light.shadow.camera.near = 1;
light.shadow.camera.far = 10000;
light.shadow.camera.visible = true;
light.shadow.camera.left = 500;
light.shadow.camera.right = -500;
light.shadow.camera.top = 500;
light.shadow.camera.bottom = -500;
scene.add(light);
scene.add(light.target);
// light shadow helper
// const cameraHelper = new THREE.CameraHelper(light.shadow.camera);
// scene.add(cameraHelper);
function updateCamera() {
  // update the light target's matrixWorld because it's needed by the helper
  light.target.updateMatrixWorld();
  // update the light's shadow camera's projection matrix
  light.shadow.camera.updateProjectionMatrix();
  // and now update the camera helper we're using to show the light's shadow camera
  //   cameraHelper.update();
}
updateCamera();

// helper
const helper = new THREE.DirectionalLightHelper(light);
// scene.add(helper);
light.target.updateMatrixWorld();
// helper.update();

// controllers
// controllers
// gui
const gui = new GUI();

function makeXYZGUI(vector3, name, onChange) {
  const folder = gui.addFolder(name);
  folder.add(vector3, "x", -100, 100).onChange(onChange);
  folder.add(vector3, "y", 0, 200).onChange(onChange);
  folder.add(vector3, "z", -100, 100).onChange(onChange);
  folder.open();
  return folder;
}
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
    1000
  )
  .name("width")
  .onChange(updateCamera);
shadowFolder
  .add(
    new DimensionGUIHelper(light.shadow.camera, "bottom", "top"),
    "value",
    1,
    1000
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
  .add(minMaxGUIHelper, "min", 0.1, 500, 0.1)
  .name("near")
  .onChange(updateCamera);
shadowFolder
  .add(minMaxGUIHelper, "max", 0.1, 500, 0.1)
  .name("far")
  .onChange(updateCamera);
shadowFolder
  .add(light.shadow.camera, "zoom", 0.01, 1.5, 0.01)
  .onChange(updateCamera);

// ground plane
{
  const planeSize = 4000;

  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    "https://threejs.org/manual/examples/resources/images/checker.png"
  );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  const repeats = planeSize / 200;
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

// obj file
{
  const mtlLoader = new MTLLoader();
  mtlLoader.load("assets/houseplant/plant_02.mtl.bak", (mtl) => {
    mtl.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(mtl);
    objLoader.load("assets/houseplant/plant_02.obj", (root) => {
      console.log(
        "root",
        root.traverse((child) => (child.castShadow = true))
      );
      root.castShadow = true;
      scene.add(root);
    });
  });
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
