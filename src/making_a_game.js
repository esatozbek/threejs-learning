import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import GameObjectManager from "./game/GameObjectManager";
import Player from "./game/PlayerComponent";
import InputManager from "./game/InputManager";
import CameraInfo from "./game/CameraInfoComponent";

// global
window.globals = {
  time: 0,
  deltaTime: 0,
  moveSpeed: 16,
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
`;
const head = document.head || document.getElementsByTagName("head")[0];
const style = document.createElement("style");
style.type = "text/css";
style.appendChild(document.createTextNode(css));

head.appendChild(style);

function main() {
  const canvas = document.querySelector("#canvas");
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.outputEncoding = THREE.sRGBEncoding;

  const fov = 45;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(0, 20, 40);
  globals.camera = camera;

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 5, 0);
  controls.update();

  const scene = new THREE.Scene();
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
    Object.values(models).forEach((model) => {
      const animsByName = {};
      model.gltf.animations.forEach((clip) => {
        animsByName[clip.name] = clip;
      });
      model.animations = animsByName;
    });
  }

  const gameObjectManager = new GameObjectManager();
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
      gameObject.addComponent(Player);
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
    animalModelNames.forEach((name, ndx) => {
      const gameObject = gameObjectManager.createGameObject(scene, name);
      gameObject.addComponent(Animal, models[name]);
      gameObject.transform.position.x = (ndx + 1) * 5;
    });
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
}

main();
