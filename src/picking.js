import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import PickHelper from "./helpers/PickHelper";
import GPUPickHelper from "./helpers/GPUPickHelper";

function main() {
  const canvas = document.getElementById("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas });

  const fov = 60;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 200;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 30;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.update();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("white");
  const pickingScene = new THREE.Scene();
  pickingScene.background = new THREE.Color(0);

  // put the camera on a pole (parent it to an object)
  // so we can spin the pole to move the camera around the scene
  const cameraPole = new THREE.Object3D();
  cameraPole.add(camera);
  scene.add(cameraPole);

  {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    camera.add(light);
  }

  const idToObject = {};
  {
    const boxWidth = 1;
    const boxHeight = 1;
    const boxDepth = 1;
    const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

    const loader = new THREE.TextureLoader();
    const texture = loader.load(
      "https://threejs.org/manual/examples/resources/images/frame.png"
    );

    function rand(min, max) {
      if (max === undefined) {
        max = min;
        min = 0;
      }
      return min + (max - min) * Math.random();
    }

    function randomColor() {
      return `hsl(${rand(360) | 0}, ${rand(50, 100) | 0}%, 50%)`;
    }

    const numObjects = 100;
    for (let i = 0; i < numObjects; ++i) {
      const id = i + 1;
      const material = new THREE.MeshPhongMaterial({
        color: randomColor(),
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1,
      });

      const cube = new THREE.Mesh(geometry, material);
      scene.add(cube);
      idToObject[id] = cube;

      cube.position.set(rand(-20, 20), rand(-20, 20), rand(-20, 20));
      cube.rotation.set(rand(Math.PI), rand(Math.PI), 0);
      cube.scale.set(rand(3, 6), rand(3, 6), rand(3, 6));

      const pickingMaterial = new THREE.MeshPhongMaterial({
        emissive: new THREE.Color(id),
        color: new THREE.Color(0, 0, 0),
        specular: new THREE.Color(0, 0, 0),
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.5,
        blending: THREE.NoBlending,
      });
      const pickingCube = new THREE.Mesh(geometry, pickingMaterial);
      pickingScene.add(pickingCube);
      pickingCube.position.copy(cube.position);
      pickingCube.rotation.copy(cube.rotation);
      pickingCube.scale.copy(cube.scale);
    }
  }

  const pickPosition = { x: 0, y: 0 };
  clearPickPosition();
  // cpu
  //   const pickHelper = new PickHelper();
  // gpu
  const pickHelper = new GPUPickHelper(renderer, camera, idToObject);

  function getCanvasRelativePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function setPickPosition(event) {
    const pos = getCanvasRelativePosition(event);
    // for cpu
    // pickPosition.x = (pos.x / canvas.width) * 2 - 1;
    // pickPosition.y = (pos.y / canvas.height) * -2 + 1; // note we flip Y

    // for gpu
    pickPosition.x = pos.x;
    pickPosition.y = pos.y;
  }

  function clearPickPosition() {
    // unlike the mouse which always has a position
    // if the user stops touching the screen we want
    // to stop picking. For now we just pick a value
    // unlikely to pick something
    pickPosition.x = -100000;
    pickPosition.y = -100000;
  }

  window.addEventListener("mousemove", setPickPosition);
  window.addEventListener("mouseout", clearPickPosition);
  window.addEventListener("mouseleave", clearPickPosition);
  window.addEventListener(
    "touchstart",
    (event) => {
      // prevent the window from scrolling
      event.preventDefault();
      setPickPosition(event.touches[0]);
    },
    { passive: false }
  );
  window.addEventListener("touchmove", (event) => {
    setPickPosition(event.touches[0]);
  });
  window.addEventListener("touchend", clearPickPosition);

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
    time *= 0.001;
    cameraPole.rotation.y = time * 0.1;
    // cpu
    // pickHelper.pick(pickPosition, scene, camera, time);
    // gpu
    pickHelper.pick(pickPosition, pickingScene, camera, time);

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    controls.update();
    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
