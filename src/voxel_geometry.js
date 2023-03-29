import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import VoxelWorld from "./helpers/VoxelWorld";

// ui
const uiDiv = document.createElement("div");
uiDiv.id = "ui";
const uiContent = `
<div class="tiles">
<input type="radio" name="voxel" id="voxel1" value="1"><label for="voxel1" style="background-position:   -0% -0%"></label>
<input type="radio" name="voxel" id="voxel2" value="2"><label for="voxel2" style="background-position: -100% -0%"></label>
<input type="radio" name="voxel" id="voxel3" value="3"><label for="voxel3" style="background-position: -200% -0%"></label>
<input type="radio" name="voxel" id="voxel4" value="4"><label for="voxel4" style="background-position: -300% -0%"></label>
<input type="radio" name="voxel" id="voxel5" value="5"><label for="voxel5" style="background-position: -400% -0%"></label>
<input type="radio" name="voxel" id="voxel6" value="6"><label for="voxel6" style="background-position: -500% -0%"></label>
<input type="radio" name="voxel" id="voxel7" value="7"><label for="voxel7" style="background-position: -600% -0%"></label>
<input type="radio" name="voxel" id="voxel8" value="8"><label for="voxel8" style="background-position: -700% -0%"></label>
</div>
<div class="tiles">
<input type="radio" name="voxel" id="voxel9"  value="9" ><label for="voxel9"  style="background-position:  -800% -0%"></label>
<input type="radio" name="voxel" id="voxel10" value="10"><label for="voxel10" style="background-position:  -900% -0%"></label>
<input type="radio" name="voxel" id="voxel11" value="11"><label for="voxel11" style="background-position: -1000% -0%"></label>
<input type="radio" name="voxel" id="voxel12" value="12"><label for="voxel12" style="background-position: -1100% -0%"></label>
<input type="radio" name="voxel" id="voxel13" value="13"><label for="voxel13" style="background-position: -1200% -0%"></label>
<input type="radio" name="voxel" id="voxel14" value="14"><label for="voxel14" style="background-position: -1300% -0%"></label>
<input type="radio" name="voxel" id="voxel15" value="15"><label for="voxel15" style="background-position: -1400% -0%"></label>
<input type="radio" name="voxel" id="voxel16" value="16"><label for="voxel16" style="background-position: -1500% -0%"></label>
</div>`;
uiDiv.innerHTML = uiContent;
document.body.appendChild(uiDiv);

// style
const css = `
html, body {
    height: 100%;
    margin: 0;
  }
  #c {
    width: 100%;
    height: 100%;
    display: block;
  }
  #ui {
    position: absolute;
    left: 10px;
    top: 10px;
    background: rgba(0, 0, 0, 0.8);
    padding: 5px;
  }
  #ui input[type=radio] {
    width: 0;
    height: 0;
    display: none;
  }
  #ui input[type=radio] + label {
    background-image: url('https://threejs.org/manual/examples/resources/images/minecraft/flourish-cc-by-nc-sa.png');
    background-size: 1600% 400%;
    image-rendering: pixelated;
    width: 64px;
    height: 64px;
    display: inline-block;
  }
  #ui input[type=radio]:checked + label {
    outline: 3px solid red;
  }
  @media (max-width: 600px), (max-height: 600px) {
    #ui input[type=radio] + label {
      width: 32px;
      height: 32px;
    }
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

  const cellSize = 32;

  const fov = 75;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(-cellSize * 0.3, cellSize * 0.8, -cellSize * 0.3);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(cellSize / 2, cellSize / 3, cellSize / 2);
  controls.update();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("lightblue");

  const tileSize = 16;
  const tileTextureWidth = 256;
  const tileTextureHeight = 64;
  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    "https://threejs.org/manual/examples/resources/images/minecraft/flourish-cc-by-nc-sa.png",
    render
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;

  function addLight(x, y, z) {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z);
    scene.add(light);
  }
  addLight(-1, 2, 4);
  addLight(1, -1, -2);

  const world = new VoxelWorld({
    cellSize,
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
  });

  const material = new THREE.MeshLambertMaterial({
    map: texture,
    side: THREE.DoubleSide,
    alphaTest: 0.1,
    transparent: true,
  });

  const cellIdToMesh = {};
  function updateCellGeometry(x, y, z) {
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    const cellZ = Math.floor(z / cellSize);
    const cellId = world.computeCellId(x, y, z);
    let mesh = cellIdToMesh[cellId];
    const geometry = mesh ? mesh.geometry : new THREE.BufferGeometry();

    const { positions, normals, uvs, indices } =
      world.generateGeometryDataForCell(cellX, cellY, cellZ);
    const positionNumComponents = 3;
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(positions),
        positionNumComponents
      )
    );
    const normalNumComponents = 3;
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
    );
    const uvNumComponents = 2;
    geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents)
    );
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    if (!mesh) {
      mesh = new THREE.Mesh(geometry, material);
      mesh.name = cellId;
      cellIdToMesh[cellId] = mesh;
      scene.add(mesh);
      mesh.position.set(cellX * cellSize, cellY * cellSize, cellZ * cellSize);
    }
  }

  const neighborOffsets = [
    [0, 0, 0], // self
    [-1, 0, 0], // left
    [1, 0, 0], // right
    [0, -1, 0], // down
    [0, 1, 0], // up
    [0, 0, -1], // back
    [0, 0, 1], // front
  ];
  function updateVoxelGeometry(x, y, z) {
    const updatedCellIds = {};
    for (const offset of neighborOffsets) {
      const ox = x + offset[0];
      const oy = y + offset[1];
      const oz = z + offset[2];
      const cellId = world.computeCellId(ox, oy, oz);
      if (!updatedCellIds[cellId]) {
        updatedCellIds[cellId] = true;
        updateCellGeometry(ox, oy, oz);
      }
    }
  }

  for (let y = 0; y < 2 * cellSize; ++y) {
    for (let z = 0; z < 2 * cellSize; ++z) {
      for (let x = 0; x < 2 * cellSize; ++x) {
        const height =
          (Math.sin((x / cellSize) * Math.PI * 2) +
            Math.sin((z / cellSize) * Math.PI * 3)) *
            (cellSize / 6) +
          cellSize / 2;
        if (y < height) {
          world.setVoxel(x, y, z, randInt(1, 17));
        }
      }
    }
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  updateVoxelGeometry(1, 1, 1); // 0,0,0 will generate
  updateVoxelGeometry(33, 1, 1); // 0,0,0 will generate
  updateVoxelGeometry(1, 33, 1); // 0,0,0 will generate
  updateVoxelGeometry(1, 1, 33); // 0,0,0 will generate
  updateVoxelGeometry(33, 33, 1); // 0,0,0 will generate
  updateVoxelGeometry(1, 33, 33); // 0,0,0 will generate
  updateVoxelGeometry(33, 1, 33); // 0,0,0 will generate

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

  let currentVoxel = 0;
  let currentId;

  document
    .querySelectorAll("#ui .tiles input[type=radio][name=voxel]")
    .forEach((elem) => {
      elem.addEventListener("click", allowUncheck);
    });

  function allowUncheck() {
    if (this.id === currentId) {
      this.checked = false;
      currentId = undefined;
      currentVoxel = 0;
    } else {
      currentId = this.id;
      currentVoxel = parseInt(this.value);
    }
  }

  function getCanvasRelativePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function placeVoxel(event) {
    const pos = getCanvasRelativePosition(event);
    const x = (pos.x / canvas.width) * 2 - 1;
    const y = (pos.y / canvas.height) * -2 + 1; // note we flip Y

    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    start.setFromMatrixPosition(camera.matrixWorld);
    end.set(x, y, 1).unproject(camera);

    const intersection = world.intersectRay(start, end);
    if (intersection) {
      const voxelId = event.shiftKey ? 0 : currentVoxel;
      // the intersection point is on the face. That means
      // the math imprecision could put us on either side of the face.
      // so go half a normal into the voxel if removing (currentVoxel = 0)
      // our out of the voxel if adding (currentVoxel  > 0)
      const pos = intersection.position.map((v, ndx) => {
        return v + intersection.normal[ndx] * (voxelId > 0 ? 0.5 : -0.5);
      });
      world.setVoxel(...pos, voxelId);
      updateVoxelGeometry(...pos);
      requestRenderIfNotRequested();
    }
  }

  const mouse = {
    x: 0,
    y: 0,
  };

  function recordStartPosition(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.moveX = 0;
    mouse.moveY = 0;
  }
  function recordMovement(event) {
    mouse.moveX += Math.abs(mouse.x - event.clientX);
    mouse.moveY += Math.abs(mouse.y - event.clientY);
  }
  function placeVoxelIfNoMovement(event) {
    if (mouse.moveX < 5 && mouse.moveY < 5) {
      placeVoxel(event);
    }
    window.removeEventListener("pointermove", recordMovement);
    window.removeEventListener("pointerup", placeVoxelIfNoMovement);
  }
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      event.preventDefault();
      recordStartPosition(event);
      window.addEventListener("pointermove", recordMovement);
      window.addEventListener("pointerup", placeVoxelIfNoMovement);
    },
    { passive: false }
  );
  canvas.addEventListener(
    "touchstart",
    (event) => {
      // prevent scrolling
      event.preventDefault();
    },
    { passive: false }
  );

  controls.addEventListener("change", requestRenderIfNotRequested);
  window.addEventListener("resize", requestRenderIfNotRequested);
}

main();
