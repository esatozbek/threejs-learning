import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GUI } from "lil-gui";
import GameObjectManager from "./game/GameObjectManager";
import Player from "./game/PlayerComponent";
import InputManager from "./game/InputManager";
import CameraInfo from "./game/CameraInfoComponent";
import Animal from './game/AnimalComponent';
import rand from "./utils/rand";

// global
window.globals = {
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
  kForward: new THREE.Vector3(0, 0, 1),
  debug: true,
  scene: null,
  gameObjectManager: null,
};

// html elements
const loadingDiv = document.createElement("div");
loadingDiv.id = "loading";
const loadingBarHtml = `
      <div>
        <div>...loading...</div>
        <div class="progress"><div id="progressbar"></div></div>
      </div>
`;
loadingDiv.innerHTML = loadingBarHtml;
document.body.appendChild(loadingDiv);
const uiDiv = document.getElementById("ui");
const uiHtml = `
<div id="left"><img src="https://threejs.org/manual/examples/resources/images/left.svg"></div>
<div style="flex: 0 0 40px;"></div>
<div id="right"><img src="https://threejs.org/manual/examples/resources/images/right.svg"></div>
`;
uiDiv.innerHTML = uiHtml;
document.body.appendChild(uiDiv);
const labelsDiv = document.createElement("div");
labelsDiv.id = "labels";
document.body.appendChild(labelsDiv);

// style
const css = `
#loading {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: xx-large;
    font-family: sans-serif;
  }
  #loading>div>div {
    padding: 2px;
  }
  .progress {
    width: 50vw;
    border: 1px solid black;
  }
  #progressbar {
    width: 0;
    transition: width ease-out .5s;
    height: 1em;
    background-color: #888;
    background-image: linear-gradient(
      -45deg, 
      rgba(255, 255, 255, .5) 25%, 
      transparent 25%, 
      transparent 50%, 
      rgba(255, 255, 255, .5) 50%, 
      rgba(255, 255, 255, .5) 75%, 
      transparent 75%, 
      transparent
    );
    background-size: 50px 50px;
    animation: progressanim 2s linear infinite;
  }
   
  @keyframes progressanim {
    0% {
      background-position: 50px 50px;
    }
    100% {
      background-position: 0 0;
    }
  }
  #ui {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-items: center;
    align-content: stretch;
  }
  #ui>div {
    display: flex;
    align-items: flex-end;
    flex: 1 1 auto;
  }
  .bright {
    filter: brightness(2);
  }
  #left {
    justify-content: flex-end;
  }
  #right {
    justify-content: flex-start;
  }
  #ui img {
    padding: 10px;
    width: 80px;
    height: 80px;
    display: block;
  }
  #labels {
    position: absolute !important;  /* let us position ourself inside the container */
    left: 0;             /* make our position the top left of the container */
    top: 0;
    color: white;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
  }
  #labels>div {
    position: absolute !important;  /* let us position them inside the container */
    left: 0;             /* make their default position the top left of the container */
    top: 0;
    font-size: large;
    font-family: monospace;
    user-select: none;   /* don't let the text get selected */
    text-shadow:         /* create a black outline */
      -1px -1px 0 #000,
       0   -1px 0 #000,
       1px -1px 0 #000,
       1px  0   0 #000,
       1px  1px 0 #000,
       0    1px 0 #000,
      -1px  1px 0 #000,
      -1px  0   0 #000;
  }
`;
const head = document.head || document.getElementsByTagName("head")[0];
const style = document.createElement("style");
style.type = "text/css";
style.appendChild(document.createTextNode(css));

head.appendChild(style);

function main() {
  const canvas = document.querySelector("#canvas");
  globals.canvas = canvas;
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.outputEncoding = THREE.sRGBEncoding;

  const fov = 45;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 40, 80);
  globals.camera = camera;

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, 0);
  controls.update();

  const scene = new THREE.Scene();
  globals.scene = scene;
  scene.background = new THREE.Color("white");

  function addLight(...pos) {
    const color = 0xffffff;
    const intensity = 0.8;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(...pos);
    scene.add(light);
    scene.add(light.target);
  }
  addLight(5, 5, 2);
  addLight(-5, 5, 5);

  const labelContainerElem = document.querySelector('#labels');
  function showHideDebugInfo() {
    labelContainerElem.style.display = globals.debug ? '' : 'none';
  }
  const gui = new GUI();
  gui.add(globals, 'debug').onChange(showHideDebugInfo);
  showHideDebugInfo();

  const manager = new THREE.LoadingManager();
  manager.onLoad = init;

  const progressbarElem = document.querySelector("#progressbar");
  manager.onProgress = (url, itemsLoaded, itemsTotal) => {
    progressbarElem.style.width = `${((itemsLoaded / itemsTotal) * 100) | 0}%`;
  };

  const models = {
    pig: {
      url: "https://threejs.org/manual/examples/resources/models/animals/Pig.gltf",
    },
    cow: {
      url: "https://threejs.org/manual/examples/resources/models/animals/Cow.gltf",
    },
    llama: {
      url: "https://threejs.org/manual/examples/resources/models/animals/Llama.gltf",
    },
    pug: {
      url: "https://threejs.org/manual/examples/resources/models/animals/Pug.gltf",
    },
    sheep: {
      url: "https://threejs.org/manual/examples/resources/models/animals/Sheep.gltf",
    },
    zebra: {
      url: "https://threejs.org/manual/examples/resources/models/animals/Zebra.gltf",
    },
    horse: {
      url: "https://threejs.org/manual/examples/resources/models/animals/Horse.gltf",
    },
    knight: {
      url: "https://threejs.org/manual/examples/resources/models/knight/KnightCharacter.gltf",
    },
  };
  {
    const gltfLoader = new GLTFLoader(manager);
    for (const model of Object.values(models)) {
      gltfLoader.load(model.url, (gltf) => {
        model.gltf = gltf;
      });
    }
  }

  function prepModelsAndAnimations() {
    const box = new THREE.Box3();
    const size = new THREE.Vector3();

    Object.values(models).forEach((model) => {
      box.setFromObject(model.gltf.scene);
      box.getSize(size);
      model.size = size.length();
      const animsByName = {};
      model.gltf.animations.forEach((clip) => {
        animsByName[clip.name] = clip;
        if (clip.name === 'Walk') {
          clip.duration /= 2;
        }
      });
      model.animations = animsByName;
    });
    console.log(models)
  }

  const gameObjectManager = new GameObjectManager();
  globals.gameObjectManager = gameObjectManager;
  const inputManager = new InputManager();
  globals.inputManager = inputManager;

  function init() {
    globals.models = models;
    // hide the loading bar
    const loadingElem = document.querySelector("#loading");
    loadingElem.style.display = "none";

    prepModelsAndAnimations();

    {
      const gameObject = gameObjectManager.createGameObject(camera, "camera");
      globals.cameraInfo = gameObject.addComponent(CameraInfo);
    }
    {
      const gameObject = gameObjectManager.createGameObject(scene, "player");
      globals.player = gameObject.addComponent(Player);
      globals.congaLine = [gameObject];
    }
    const animalModelNames = [
      "pig",
      "cow",
      "llama",
      "pug",
      "sheep",
      "zebra",
      "horse",
    ];
    const base = new THREE.Object3D();
    const offset = new THREE.Object3D();
    base.add(offset);

    // position animals in a spiral.
    const numAnimals = 28;
    const arc = 10;
    const b = 10 / (2 * Math.PI);
    let r = 10;
    let phi = r / b;
    for (let i = 0; i < numAnimals; ++i) {
      const name = animalModelNames[rand(animalModelNames.length) | 0];
      const gameObject = gameObjectManager.createGameObject(scene, name);
      gameObject.addComponent(Animal, models[name]);
      base.rotation.y = phi;
      offset.position.x = r;
      offset.updateWorldMatrix(true, false);
      offset.getWorldPosition(gameObject.transform.position);
      phi += arc / r;
      r = b * phi;
    }
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

  let then = 0;
  function render(now) {
    // convert to seconds
    globals.time = now * 0.001;
    // make sure delta time isn't too big.
    globals.deltaTime = Math.min(globals.time - then, 1 / 20);
    then = globals.time;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    gameObjectManager.update();
    inputManager.update();

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
  console.log(gameObjectManager)
}

main();
