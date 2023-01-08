import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import parseData from "./utils/parseDemographicData";
import maleDemographicData from "../public/male_demographic.asc";
import femaleDemographicData from "../public/female_demographic.asc";
import TweenManager from "./utils/TweenManager";

// init scene
const canvas = document.getElementById("canvas");
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas });

// camera
const fov = 45;
const aspect = 2; // the canvas default
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 2.5;

// controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 1.2;
controls.maxDistance = 4;
controls.update();

// tween animation manager
const tweenManager = new TweenManager();

{
  const loader = new THREE.TextureLoader();
  const texture = loader.load(
    "https://threejs.org/manual/examples/resources/images/world.jpg",
    render
  );
  const geometry = new THREE.SphereGeometry(1, 64, 32);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  scene.add(new THREE.Mesh(geometry, material));
}

function initData() {
  function mapValues(data, fn) {
    return data.map((row, rowNdx) => {
      return row.map((value, colNdx) => {
        return fn(value, rowNdx, colNdx);
      });
    });
  }

  function makeDiffFile(baseFile, otherFile, compareFn) {
    let min;
    let max;
    const baseData = baseFile.data;
    const otherData = otherFile.data;
    const data = mapValues(baseData, (base, rowNdx, colNdx) => {
      const other = otherData[rowNdx][colNdx];
      if (base === undefined || other === undefined) {
        return undefined;
      }
      const value = compareFn(base, other);
      min = Math.min(min === undefined ? value : min, value);
      max = Math.max(max === undefined ? value : max, value);
      return value;
    });
    // make a copy of baseFile and replace min, max, and data
    // with the new data
    return { ...baseFile, min, max, data };
  }

  function amountGreaterThan(a, b) {
    return Math.max(a - b, 0);
    // return a - b < 0 ? 1 : 0;''
  }

  const fileInfos = [
    {
      name: "men",
      hueRange: [0.7, 0.3],
      file: parseData(maleDemographicData),
    },
    {
      name: "women",
      hueRange: [0.9, 1.1],
      file: parseData(femaleDemographicData),
    },
  ];
  const menInfo = fileInfos[0];
  const womenInfo = fileInfos[1];
  const menFile = menInfo.file;
  const womenFile = womenInfo.file;
  fileInfos.push({
    name: ">50%men",
    hueRange: [0.6, 1.1],
    file: makeDiffFile(menFile, womenFile, (men, women) => {
      return amountGreaterThan(men, women);
    }),
  });
  fileInfos.push({
    name: ">50% women",
    hueRange: [0.0, 0.4],
    file: makeDiffFile(womenFile, menFile, (women, men) => {
      return amountGreaterThan(women, men);
    }),
  });

  return fileInfos;
}

function dataMissingInAnySet(fileInfos, latNdx, lonNdx) {
  for (const fileInfo of fileInfos) {
    if (fileInfo.file.data[latNdx][lonNdx] === undefined) {
      return true;
    }
  }
  return false;
}

function makeSingleBox(file, hueRange, fileInfos) {
  const { min, max, data } = file;
  const range = max - min;

  // these helpers will make it easy to position the boxes
  // We can rotate the lon helper on its Y axis to the longitude
  const lonHelper = new THREE.Object3D();
  scene.add(lonHelper);
  // We rotate the latHelper on its X axis to the latitude
  const latHelper = new THREE.Object3D();
  lonHelper.add(latHelper);
  // The position helper moves the object to the edge of the sphere
  const positionHelper = new THREE.Object3D();
  positionHelper.position.z = 1;
  latHelper.add(positionHelper);

  // Used to move the center of the box so it scales from the position Z axis
  const originHelper = new THREE.Object3D();
  originHelper.position.z = 0.5;
  positionHelper.add(originHelper);

  const geometries = [];
  const color = new THREE.Color();
  const lonFudge = Math.PI * 0.5;
  const latFudge = Math.PI * -0.135;
  data.forEach((row, latNdx) => {
    row.forEach((value, lonNdx) => {
      if (dataMissingInAnySet(fileInfos, latNdx, lonNdx)) {
        return;
      }
      const amount = (value - min) / range;

      const boxWidth = 1;
      const boxHeight = 1;
      const boxDepth = 1;
      const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

      // adjust the helpers to point to the latitude and longitude
      lonHelper.rotation.y =
        THREE.MathUtils.degToRad(lonNdx + file.xllcorner) + lonFudge;
      latHelper.rotation.x =
        THREE.MathUtils.degToRad(latNdx + file.yllcorner) + latFudge;

      // use the world matrix of the origin helper to
      // position this geometry
      positionHelper.scale.set(
        0.005,
        0.005,
        THREE.MathUtils.lerp(0.01, 0.5, amount)
      );
      originHelper.updateWorldMatrix(true, false);
      geometry.applyMatrix4(originHelper.matrixWorld);

      // compute a color
      const hue = THREE.MathUtils.lerp(...hueRange, amount);
      const saturation = 1;
      const lightness = THREE.MathUtils.lerp(0.4, 1.0, amount);
      color.setHSL(hue, saturation, lightness);
      // get the colors as an array of values from 0 to 255
      const rgb = color.toArray().map((v) => v * 255);

      // make an array to store colors for each vertex
      const numVerts = geometry.getAttribute("position").count;
      const itemSize = 3; // r, g, b
      const colors = new Uint8Array(itemSize * numVerts);

      // copy the color into the colors array for each vertex
      colors.forEach((v, ndx) => {
        colors[ndx] = rgb[ndx % 3];
      });

      const normalized = true;
      const colorAttrib = new THREE.BufferAttribute(
        colors,
        itemSize,
        normalized
      );
      geometry.setAttribute("color", colorAttrib);

      geometries.push(geometry);
    });
  });

  return BufferGeometryUtils.mergeBufferGeometries(geometries, false);
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

  if (tweenManager.update()) {
    requestRenderIfNotRequested();
  }

  controls.update();
  renderer.render(scene, camera);
}

function requestRenderIfNotRequested() {
  if (!renderRequested) {
    renderRequested = true;
    requestAnimationFrame(render);
  }
}

controls.addEventListener("change", requestRenderIfNotRequested);
window.addEventListener("resize", requestRenderIfNotRequested);

const fileInfos = initData();
// make geometry for each data set
const geometries = fileInfos.map((info) => {
  return makeSingleBox(info.file, info.hueRange, fileInfos);
});
// use the first geometry as the base
// and add all the geometries as morphtargets
const baseGeometry = geometries[0];
baseGeometry.morphAttributes.position = geometries.map((geometry, ndx) => {
  const attribute = geometry.getAttribute("position");
  const name = `target${ndx}`;
  attribute.name = name;
  return attribute;
});
baseGeometry.morphAttributes.color = geometries.map((geometry, ndx) => {
  const attribute = geometry.getAttribute("color");
  const name = `target${ndx}`;
  attribute.name = name;
  return attribute;
});
const material = new THREE.MeshBasicMaterial({
  vertexColors: true,
});
const mesh = new THREE.Mesh(baseGeometry, material);
scene.add(mesh);

const uiElem = document.querySelector("#ui");
fileInfos.forEach((info) => {
  const div = document.createElement("div");
  info.elem = div;
  div.textContent = info.name;
  uiElem.appendChild(div);
  div.addEventListener("mouseover", () => {
    showFileInfo(fileInfos, info);
  });
});
// show the selected data, hide the rest
function showFileInfo(fileInfos, fileInfo) {
  const targets = {};
  fileInfos.forEach((info, i) => {
    const visible = fileInfo === info;
    info.elem.className = visible ? "selected" : "";
    targets[i] = visible ? 1 : 0;
  });
  const durationInMs = 500;
  tweenManager
    .createTween(mesh.morphTargetInfluences)
    .to(targets, durationInMs)
    .start();
  requestRenderIfNotRequested();
}

// show the first set of data
showFileInfo(fileInfos, fileInfos[0]);

render();
