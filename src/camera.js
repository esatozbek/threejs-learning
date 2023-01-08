import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "lil-gui";
import MinMaxGUIHelper from "./gui/MinMaxGUIHelper";

// init html elements
const splitDiv = document.createElement("div");
splitDiv.className = "split";
const view1 = document.createElement("div");
view1.id = "view1";
view1.tabIndex = "1";
splitDiv.appendChild(view1);
const view2 = document.createElement("div");
view2.id = "view2";
view2.tabIndex = "2";
splitDiv.appendChild(view2);
document.body.appendChild(splitDiv);

// init scene
const canvas = document.getElementById("canvas");
const scene = new THREE.Scene();
scene.background = new THREE.Color("black");
const renderer = new THREE.WebGLRenderer({ canvas });

// camera
// const fov = 45;
// const aspect = 2; // the canvas default
// const near = 0.1;
// const far = 100;
// const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
// camera.position.set(0, 10, 20);
// camera.lookAt(0, 0, 0);

// Orthographic camera
const left = -1;
const right = 1;
const top = 1;
const bottom = -1;
const near = 5;
const far = 50;
const camera = new THREE.OrthographicCamera(
  left,
  right,
  top,
  bottom,
  near,
  far
);
camera.zoom = 0.2;

const camera2 = new THREE.PerspectiveCamera(
  60, // fov
  2, // aspect
  0.1, // near
  500 // far
);
camera2.position.set(40, 10, 30);
camera2.lookAt(0, 5, 0);

// camera helper
const cameraHelper = new THREE.CameraHelper(camera);
scene.add(cameraHelper);

// light
const color = 0xffffff;
const intensity = 1;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(0, 10, 0);
light.target.position.set(-5, 0, 0);
scene.add(light);
scene.add(light.target);

// controls
const controls = new OrbitControls(camera, view1);
controls.target.set(0, 5, 0);
controls.update();

const controls2 = new OrbitControls(camera2, view2);
controls2.target.set(0, 5, 0);
controls2.update();

// gui
const gui = new GUI();
gui.add(camera, "fov", 1, 180);
const minMaxGUIHelper = new MinMaxGUIHelper(camera, "near", "far", 0.1);
gui.add(minMaxGUIHelper, "min", 0.1, 50, 0.1).name("near");
gui.add(minMaxGUIHelper, "max", 0.1, 50, 0.1).name("far");
gui.add(camera, "zoom", 0.01, 1, 0.01).listen();

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
  const cubeMat = new THREE.MeshPhongMaterial({
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
  const sphereMat = new THREE.MeshPhongMaterial({ color: "#CA8" });
  const mesh = new THREE.Mesh(sphereGeo, sphereMat);
  mesh.position.set(-sphereRadius - 1, sphereRadius + 2, 0);
  scene.add(mesh);
}

// render
function setScissorForElement(elem) {
  const canvasRect = canvas.getBoundingClientRect();
  const elemRect = elem.getBoundingClientRect();

  // compute a canvas relative rectangle
  const right = Math.min(elemRect.right, canvasRect.right) - canvasRect.left;
  const left = Math.max(0, elemRect.left - canvasRect.left);
  const bottom = Math.min(elemRect.bottom, canvasRect.bottom) - canvasRect.top;
  const top = Math.max(0, elemRect.top - canvasRect.top);

  const width = Math.min(canvasRect.width, right - left);
  const height = Math.min(canvasRect.height, bottom - top);

  // setup the scissor to only render to that part of the canvas
  const positiveYUpBottom = canvasRect.height - bottom;
  renderer.setScissor(left, positiveYUpBottom, width, height);
  renderer.setViewport(left, positiveYUpBottom, width, height);

  // return the aspect
  return width / height;
}

function resizeRendererToDisplaySize(renderer) {
  const canvas = renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const needResize = canvas.width !== width || canvas.height !== height;
  if (needResize) {
    renderer.setSize(width, height, false);
  }
  return needResize;
}

function render(time) {
  resizeRendererToDisplaySize(renderer);

  // turn on the scissor
  renderer.setScissorTest(true);

  // render the original view
  {
    const aspect = setScissorForElement(view1);

    // adjust the camera for this aspect
    // for regular camera
    // camera.aspect = aspect;
    // for orthadontic camera
    camera.left = -aspect;
    camera.right = aspect;
    camera.updateProjectionMatrix();
    cameraHelper.update();

    // don't draw the camera helper in the original view
    cameraHelper.visible = false;

    scene.background.set(0x000000);

    // render
    renderer.render(scene, camera);
  }

  // render from the 2nd camera
  {
    const aspect = setScissorForElement(view2);

    // adjust the camera for this aspect
    camera2.aspect = aspect;
    camera2.updateProjectionMatrix();

    // draw the camera helper in the 2nd view
    cameraHelper.visible = true;

    scene.background.set(0x000040);

    renderer.render(scene, camera2);
  }

  requestAnimationFrame(render);
}

render();
