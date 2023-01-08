import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { GUI } from "lil-gui";
import MinMaxGUIHelper from "./gui/MinMaxGUIHelper";
import DimensionGUIHelper from "./gui/DimensionGUIHelper";
import VisibleGUIHelper from "./gui/VisibleGUIHelper";
import dumpObject from "./utils/dumpObject";
import controlPoints from "../public/assets/low_poly_city/controlPoints.json";

console.log("controlPoints", controlPoints);

// init scene
const canvas = document.getElementById("canvas");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#DEFEFF");
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.shadowMap.enabled = true;

// camera
const fov = 45;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

// light
{
  const skyColor = 0xb1e1ff; // light blue
  const groundColor = 0xb97a20; // brownish orange
  const intensity = 0.6;
  const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
  scene.add(light);
}

let light;
{
  const color = 0xffffff;
  const intensity = 0.8;
  light = new THREE.DirectionalLight(color, intensity);
  light.castShadow = true;
  light.position.set(-250, 800, -850);
  light.target.position.set(-550, 40, -450);

  light.shadow.bias = -0.004;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  scene.add(light);
  scene.add(light.target);
  const cam = light.shadow.camera;
  cam.near = 1;
  cam.far = 2000;
  cam.left = -1500;
  cam.right = 1500;
  cam.top = 1500;
  cam.bottom = -1500;
}
const cameraHelper = new THREE.CameraHelper(camera);
scene.add(cameraHelper);
cameraHelper.visible = false;
const helper = new THREE.DirectionalLightHelper(light, 100);
scene.add(helper);
helper.visible = false;

function updateCamera() {
  // update the light target's matrixWorld because it's needed by the helper
  light.updateMatrixWorld();
  light.target.updateMatrixWorld();
  helper.update();
  // update the light's shadow camera's projection matrix
  light.shadow.camera.updateProjectionMatrix();
  // and now update the camera helper we're using to show the light's shadow camera
  cameraHelper.update();
}
updateCamera();

// controls
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 5, 0);
controls.update();

// gui

function makeXYZGUI(gui, vector3, name, onChangeFn) {
  const folder = gui.addFolder(name);
  folder
    .add(vector3, "x", vector3.x - 500, vector3.x + 500)
    .onChange(onChangeFn);
  folder
    .add(vector3, "y", vector3.y - 500, vector3.y + 500)
    .onChange(onChangeFn);
  folder
    .add(vector3, "z", vector3.z - 500, vector3.z + 500)
    .onChange(onChangeFn);
  folder.open();
}

const gui = new GUI();
gui.close();
gui
  .add(new VisibleGUIHelper(helper, cameraHelper), "value")
  .name("show helpers");
gui.add(light.shadow, "bias", -0.1, 0.1, 0.001);
{
  const folder = gui.addFolder("Shadow Camera");
  folder.open();
  folder
    .add(
      new DimensionGUIHelper(light.shadow.camera, "left", "right"),
      "value",
      1,
      4000
    )
    .name("width")
    .onChange(updateCamera);
  folder
    .add(
      new DimensionGUIHelper(light.shadow.camera, "bottom", "top"),
      "value",
      1,
      4000
    )
    .name("height")
    .onChange(updateCamera);
  const minMaxGUIHelper = new MinMaxGUIHelper(
    light.shadow.camera,
    "near",
    "far",
    0.1
  );
  folder
    .add(minMaxGUIHelper, "min", 1, 1000, 1)
    .name("near")
    .onChange(updateCamera);
  folder
    .add(minMaxGUIHelper, "max", 1, 4000, 1)
    .name("far")
    .onChange(updateCamera);
  folder
    .add(light.shadow.camera, "zoom", 0.01, 1.5, 0.01)
    .onChange(updateCamera);
}

makeXYZGUI(gui, light.position, "position", updateCamera);
makeXYZGUI(gui, light.target.position, "target", updateCamera);

// frame area
function frameArea(sizeToFitOnScreen, boxSize, boxCenter, camera) {
  const halfSizeToFitOnScreen = sizeToFitOnScreen * 0.5;
  const halfFovY = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const distance = halfSizeToFitOnScreen / Math.tan(halfFovY);
  // compute a unit vector that points in the direction the camera is now
  // in the xz plane from the center of the box
  const direction = new THREE.Vector3()
    .subVectors(camera.position, boxCenter)
    .multiply(new THREE.Vector3(1, 0, 1))
    .normalize();

  // move the camera to a position distance units way from the center
  // in whatever direction the camera was from the center already
  camera.position.copy(direction.multiplyScalar(distance).add(boxCenter));

  // pick some near and far values for the frustum that
  // will contain the box.
  camera.near = boxSize / 100;
  camera.far = boxSize * 100;

  camera.updateProjectionMatrix();

  // point the camera to look at the center of the box
  camera.lookAt(boxCenter.x, boxCenter.y, boxCenter.z);
}

// gltf file
let cars = [];
{
  const gltfLoader = new GLTFLoader();
  gltfLoader.load("assets/low_poly_city/scene.gltf", (gltf) => {
    const root = gltf.scene;
    scene.add(root);
    console.log(dumpObject(root).join("\n"));
    root.traverse((obj) => {
      if (obj.castShadow !== undefined) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(root);
    const boxSize = box.getSize(new THREE.Vector3()).length();
    const boxCenter = box.getCenter(new THREE.Vector3());
    frameArea(boxSize * 0.5, boxSize, boxCenter, camera);

    // fix car rotations
    const loadedCars = root.getObjectByName("Cars");
    const fixes = [
      { prefix: "Car_08", y: 0, rot: [Math.PI * 0.5, 0, Math.PI * 0.5] },
      { prefix: "CAR_03", y: 33, rot: [0, Math.PI, 0] },
      { prefix: "Car_04", y: 40, rot: [0, Math.PI, 0] },
    ];

    root.updateMatrixWorld();
    for (const car of loadedCars.children.slice()) {
      const fix = fixes.find((fix) => car.name.startsWith(fix.prefix));
      const obj = new THREE.Object3D();
      car.getWorldPosition(obj.position);
      car.position.set(0, fix.y, 0);
      car.rotation.set(...fix.rot);
      obj.add(car);
      scene.add(obj);
      cars.push(obj);
    }

    // update the Trackball controls to handle the new size
    controls.maxDistance = boxSize * 10;
    controls.target.copy(boxCenter);
    controls.update();
  });
}

// adding control points
let curve;
let curveObject;
{
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  curve = new THREE.CatmullRomCurve3(
    controlPoints
      .map((p, ndx) => {
        p0.set(...p);
        p1.set(...controlPoints[(ndx + 1) % controlPoints.length]);
        return [
          new THREE.Vector3().copy(p0),
          new THREE.Vector3().lerpVectors(p0, p1, 0.1),
          new THREE.Vector3().lerpVectors(p0, p1, 0.9),
        ];
      })
      .flat(),
    true
  );
  {
    const points = curve.getPoints(250);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    curveObject = new THREE.Line(geometry, material);
    curveObject.scale.set(100, 100, 100);
    curveObject.position.y = -621;
    curveObject.visible = false;
    scene.add(curveObject);
  }
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

// create 2 Vector3s we can use for path calculations
const carPosition = new THREE.Vector3();
const carTarget = new THREE.Vector3();

function render(time) {
  time *= 0.001;

  checkNeedsResizing();

  {
    const pathTime = time * 0.01;
    const targetOffset = 0.01;
    cars.forEach((car, ndx) => {
      // a number between 0 and 1 to evenly space the cars
      const u = pathTime + ndx / cars.length;

      // get the first point
      curve.getPointAt(u % 1, carPosition);
      carPosition.applyMatrix4(curveObject.matrixWorld);

      // get a second point slightly further down the curve
      curve.getPointAt((u + targetOffset) % 1, carTarget);
      carTarget.applyMatrix4(curveObject.matrixWorld);

      // put the car at the first point (temporarily)
      car.position.copy(carPosition);
      // point the car the second point
      car.lookAt(carTarget);

      // put the car between the 2 points
      car.position.lerpVectors(carPosition, carTarget, 0.5);
    });
  }

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();
