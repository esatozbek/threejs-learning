import * as THREE from "three";

// init scene
const canvas = document.getElementById("canvas");
const scene = new THREE.Scene();
const fov = 40;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 1000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.set(0, 42, 0);
camera.up.set(0, 0, 1);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas });

// light
{
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(0, 30, 0);
  light.lookAt(0, 0, 0);
  scene.add(light);
}

// sphere
const sphereGeometry = new THREE.SphereGeometry(4, 7, 7);
const phongMaterial = new THREE.MeshPhongMaterial({
  color: 0xff0000,
  flatShading: true,
  shininess: 30,
});
const sphereMesh = new THREE.Mesh(sphereGeometry, phongMaterial);
sphereMesh.position.x = -10;
scene.add(sphereMesh);

const lambertMaterial = new THREE.MeshToonMaterial({
  color: 0x0000ff,
  // shininess: 30,
});
const sphereMesh2 = new THREE.Mesh(sphereGeometry, lambertMaterial);
sphereMesh2.position.x = 10;
scene.add(sphereMesh2);

// controls
const slider = document.getElementById("myRange");
slider.oninput = (e) => {
  const { value } = e.target;
  console.log("changed");
  phongMaterial.shininess = value;
  lambertMaterial.shininess = value;
};

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

  sphereMesh.rotation.y = time;
  sphereMesh2.rotation.y = time;

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

render();
