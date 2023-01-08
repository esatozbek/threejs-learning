import * as THREE from "three";

// const canvas = document.createElement("canvas");
// canvas.setAttribute("height", "400");
// canvas.setAttribute("width", "400");
// document.body.appendChild(canvas);
const canvas = document.getElementById("canvas");
console.log(canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaaaaa);
const camera = new THREE.PerspectiveCamera(40, 4 / 3, 1, 1000);
camera.position.set(0, 45, 60);
camera.lookAt(0, 0, 0);

{
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(-30, 30, 50);
  scene.add(light);
}

let geometry = new THREE.BoxGeometry(15, 15, 15, 27, 27, 27);
const material = new THREE.MeshPhongMaterial({
  color: 0x00ff00,
});
const cube = new THREE.LineSegments(new THREE.WireframeGeometry(geometry));
scene.add(cube);
const cubes = [
  // makeCube(geometry, 0x44aa88, 0),
  cube,
  makeCube(geometry, 0x8844aa, -30),
  addPoints(),
  makeCube(geometry, 0xaa8844, 30),
];

const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
const points = [];
points.push(new THREE.Vector3(-20, 0, 0));
points.push(new THREE.Vector3(0, 20, 0));
points.push(new THREE.Vector3(20, 0, 0));
const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
const line = new THREE.Line(lineGeometry, lineMaterial);
scene.add(line);

const renderer = new THREE.WebGLRenderer({ canvas });
// renderer.setSize(800, 600);
// document.body.appendChild(renderer.domElement);
// renderer.setPixelRatio(window.devicePixelRatio);

function makeCube(geometry, color, xPosition) {
  const material = new THREE.MeshPhongMaterial({
    color,
    // side: THREE.DoubleSide,
  });
  const hue = Math.random();
  const saturation = 1;
  const luminance = 0.5;
  material.color.setHSL(hue, saturation, luminance);
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  cube.position.x = xPosition;
  return cube;
}

function addPoints() {
  const radius = 7;
  const widthSegments = 12;
  const heightSegments = 8;
  const geometry = new THREE.SphereGeometry(
    radius,
    widthSegments,
    heightSegments
  );
  const material = new THREE.PointsMaterial({
    color: "red",
    size: 2, // in world units
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

let framesDrawn = 0;

function animate(time) {
  // console.log("animate");
  framesDrawn += 1;
  time *= 0.001;

  const canvas = renderer.domElement;
  const pixelRatio = window.devicePixelRatio;
  const width = (canvas.clientWidth * pixelRatio) | 0;
  const height = (canvas.clientHeight * pixelRatio) | 0;
  const isNeedsResize = height !== canvas.height || width !== canvas.width;

  if (isNeedsResize) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  line.rotation.x += 0.01;
  line.rotation.y += 0.01;

  cubes.forEach((cube, index) => {
    const speed = 1 + index * 0.1;
    const rot = time * speed;
    cube.rotation.x = rot;
    // cube.rotation.y = rot;
  });
}

const infoBox = document.getElementById("info");

setInterval(() => {
  infoBox.innerText = "Current framerate is " + framesDrawn;
  // console.log();
  framesDrawn = 0;
}, 1000);

animate();
