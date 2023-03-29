import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "lil-gui";
import ColorGUIHelper from "./gui/ColorGUIHelper";

function main() {
  const canvas = document.getElementById("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas });

  const fov = 75;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 25;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.update();

  const gui = new GUI();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("white");

  function addLight(...pos) {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
  }
  addLight(-1, 2, 4);
  addLight(1, -1, -2);

  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  function makeInstance(geometry, color, x, y, z) {
    let material;
    let cube;
    [THREE.BackSide, THREE.FrontSide].forEach((side) => {
      material = new THREE.MeshPhongMaterial({
        color,
        opacity: 0.5,
        transparent: true,
        side,
      });

      cube = new THREE.Mesh(geometry, material);
      scene.add(cube);

      cube.position.set(x, y, z);
    });

    const folder = gui.addFolder(`Cube${x}`);
    folder
      .addColor(new ColorGUIHelper(material, "color"), "value")
      .name("color")
      .onChange(requestRenderIfNotRequested);
    folder
      .add(cube.scale, "x", 0.1, 1.5)
      .name("scale x")
      .onChange(requestRenderIfNotRequested);
    folder.open();

    return cube;
  }

  function hsl(h, s, l) {
    return new THREE.Color().setHSL(h, s, l);
  }

  {
    const d = 0.8;
    makeInstance(geometry, hsl(0 / 8, 1, 0.5), -d, -d, -d);
    makeInstance(geometry, hsl(1 / 8, 1, 0.5), d, -d, -d);
    makeInstance(geometry, hsl(2 / 8, 1, 0.5), -d, d, -d);
    makeInstance(geometry, hsl(3 / 8, 1, 0.5), d, d, -d);
    makeInstance(geometry, hsl(4 / 8, 1, 0.5), -d, -d, d);
    makeInstance(geometry, hsl(5 / 8, 1, 0.5), d, -d, d);
    makeInstance(geometry, hsl(6 / 8, 1, 0.5), -d, d, d);
    makeInstance(geometry, hsl(7 / 8, 1, 0.5), d, d, d);
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

  let renderRequested = false;

  function render() {
    renderRequested = undefined;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    controls.update();
    renderer.render(scene, camera);
  }
  render();

  function requestRenderIfNotRequested() {
    if (!renderRequested) {
      renderRequested = true;
      requestAnimationFrame(render);
    }
  }

  controls.addEventListener("change", requestRenderIfNotRequested);
  window.addEventListener("resize", requestRenderIfNotRequested);
}

main();
