import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import GPUPickHelperForGlobe from "./helpers/GPUPickHelperForGlobe";

// color util
const tempColor = new THREE.Color();
function get255BasedColor(color) {
  tempColor.set(color);
  const base = tempColor.toArray().map((v) => v * 255);
  base.push(255); // alpha
  return base;
}

// init html elements
const canvas = document.getElementById("canvas");

const css = `
    #labels>div {
        position: absolute;
        left: 0;
        top: 0;
        font-size: small;
        user-select: none;
        pointer-events: none;
        color: white;
        text-shadow: /* create a black outline */
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

const container = document.createElement("div");
container.style.position = "relative";
container.style.height = "100%";
container.style.width = "100%";

const labelsDiv = document.createElement("div");
labelsDiv.style.position = "absolute";
labelsDiv.style.left = 0;
labelsDiv.style.top = 0;
labelsDiv.id = "labels";
container.appendChild(canvas);
container.appendChild(labelsDiv);
document.body.appendChild(container);

async function main() {
  const renderer = new THREE.WebGLRenderer({ canvas });

  const fov = 60;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 200;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2.5;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);
  controls.update();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("white");
  const pickingScene = new THREE.Scene();
  pickingScene.background = new THREE.Color(0);

  const settings = {
    minArea: 20,
    maxVisibleDot: -0.2,
  };
  const gui = new GUI({ width: 300 });
  gui.add(settings, "minArea", 0, 50).onChange(requestRenderIfNotRequested);
  gui
    .add(settings, "maxVisibleDot", -1, 1, 0.01)
    .onChange(requestRenderIfNotRequested);

  {
    const color = 0xffffff;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    camera.add(light);
  }

  // palette texture
  const maxNumCountries = 512;
  const paletteTextureWidth = maxNumCountries;
  const paletteTextureHeight = 1;
  const palette = new Uint8Array(paletteTextureWidth * 4);
  const paletteTexture = new THREE.DataTexture(
    palette,
    paletteTextureWidth,
    paletteTextureHeight
  );

  // globe colors
  const selectedColor = get255BasedColor("red");
  const unselectedColor = get255BasedColor("#444");
  const oceanColor = get255BasedColor("rgb(100,200,255)");
  resetPalette();

  function setPaletteColor(index, color) {
    palette.set(color, index * 4);
  }

  function resetPalette() {
    // make all colors the unselected color
    for (let i = 1; i < maxNumCountries; ++i) {
      setPaletteColor(i, unselectedColor);
    }

    // set the ocean color (index #0)
    setPaletteColor(0, oceanColor);
    paletteTexture.needsUpdate = true;
  }

  {
    paletteTexture.minFilter = THREE.NearestFilter;
    paletteTexture.magFilter = THREE.NearestFilter;

    // texture loading
    const loader = new THREE.TextureLoader();
    const fragmentShaderReplacements = [
      {
        from: "#include <common>",
        to: `
          #include <common>
          uniform sampler2D indexTexture;
          uniform sampler2D paletteTexture;
          uniform float paletteTextureWidth;
        `,
      },
      {
        from: "#include <color_fragment>",
        to: `
          #include <color_fragment>
          {
            vec4 indexColor = texture2D(indexTexture, vUv);
            float index = indexColor.r * 255.0 + indexColor.g * 255.0 * 256.0;
            vec2 paletteUV = vec2((index + 0.5) / paletteTextureWidth, 0.5);
            vec4 paletteColor = texture2D(paletteTexture, paletteUV);
            // diffuseColor.rgb += paletteColor.rgb;   // white outlines
            diffuseColor.rgb = paletteColor.rgb - diffuseColor.rgb;  // black outlines
          }
        `,
      },
    ];
    const texture = loader.load(
      "https://threejs.org/manual/examples/resources/data/world/country-outlines-4k.png",
      render
    );
    const geometry = new THREE.SphereGeometry(1, 64, 32);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    material.onBeforeCompile = function (shader) {
      fragmentShaderReplacements.forEach((rep) => {
        shader.fragmentShader = shader.fragmentShader.replace(rep.from, rep.to);
      });
      shader.uniforms.paletteTexture = { value: paletteTexture };
      shader.uniforms.indexTexture = { value: indexTexture };
      shader.uniforms.paletteTextureWidth = { value: paletteTextureWidth };
    };
    scene.add(new THREE.Mesh(geometry, material));

    const indexTexture = loader.load(
      "https://threejs.org/manual/examples/resources/data/world/country-index-texture.png",
      render
    );
    indexTexture.minFilter = THREE.NearestFilter;
    indexTexture.magFilter = THREE.NearestFilter;
    const pickingMaterial = new THREE.MeshBasicMaterial({ map: indexTexture });
    pickingScene.add(new THREE.Mesh(geometry, pickingMaterial));
  }

  let countryInfos;
  let numCountriesSelected = 0;
  {
    countryInfos = await fetch(
      "https://threejs.org/manual/examples/resources/data/world/country-info.json"
    ).then((r) => r.json());
    const lonFudge = Math.PI * 1.5;
    const latFudge = Math.PI;
    // these helpers will make it easy to position the boxes
    // We can rotate the lon helper on its Y axis to the longitude
    const lonHelper = new THREE.Object3D();
    // We rotate the latHelper on its X axis to the latitude
    const latHelper = new THREE.Object3D();
    lonHelper.add(latHelper);
    // The position helper moves the object to the edge of the sphere
    const positionHelper = new THREE.Object3D();
    positionHelper.position.z = 1;
    latHelper.add(positionHelper);

    const labelParentElem = document.querySelector("#labels");
    for (const countryInfo of countryInfos) {
      const { lat, lon, min, max, name } = countryInfo;

      // adjust the helpers to point to the latitude and longitude
      lonHelper.rotation.y = THREE.MathUtils.degToRad(lon) + lonFudge;
      latHelper.rotation.x = THREE.MathUtils.degToRad(lat) + latFudge;

      // get the position of the lat/lon
      positionHelper.updateWorldMatrix(true, false);
      const position = new THREE.Vector3();
      positionHelper.getWorldPosition(position);
      countryInfo.position = position;

      // compute the area for each country
      const width = max[0] - min[0];
      const height = max[1] - min[1];
      const area = width * height;
      countryInfo.area = area;

      // add an element for each country
      const elem = document.createElement("div");
      elem.textContent = name;
      labelParentElem.appendChild(elem);
      countryInfo.elem = elem;
    }
  }

  const tempV = new THREE.Vector3();
  const cameraToPoint = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();

  function updateLabels() {
    // exit if we have not yet loaded the JSON file
    if (!countryInfos) {
      return;
    }
    const large = settings.minArea * settings.minArea;
    const minVisibleDot = 0.2;
    // get a matrix that represents a relative orientation of the camera
    normalMatrix.getNormalMatrix(camera.matrixWorldInverse);
    // get the camera's position
    camera.getWorldPosition(cameraPosition);

    for (const countryInfo of countryInfos) {
      const { position, elem, area, selected } = countryInfo;
      const largeEnough = area >= large;
      const show = selected || (numCountriesSelected === 0 && largeEnough);
      if (!show) {
        elem.style.display = "none";
        continue;
      }
      // Orient the position based on the camera's orientation.
      // Since the sphere is at the origin and the sphere is a unit sphere
      // this gives us a camera relative direction vector for the position.
      tempV.copy(position);
      tempV.applyMatrix3(normalMatrix);

      // compute the direction to this position from the camera
      cameraToPoint.copy(position);
      cameraToPoint.applyMatrix4(camera.matrixWorldInverse).normalize();

      // get the dot product of camera relative direction to this position
      // on the globe with the direction from the camera to that point.
      // 1 = facing directly towards the camera
      // 0 = exactly on tangent of the sphere from the camera
      // < 0 = facing away
      const dot = tempV.dot(cameraToPoint);

      // if the orientation is not facing us hide it.
      if (dot > settings.maxVisibleDot) {
        elem.style.display = "none";
        continue;
      }

      // restore the element to its default display style
      elem.style.display = "";

      // get the normalized screen coordinate of that position
      // x and y will be in the -1 to +1 range with x = -1 being
      // on the left and y = -1 being on the bottom
      tempV.copy(position);
      tempV.project(camera);

      // convert the normalized position to CSS coordinates
      const x = (tempV.x * 0.5 + 0.5) * canvas.clientWidth;
      const y = (tempV.y * -0.5 + 0.5) * canvas.clientHeight;

      // move the elem to that position
      elem.style.transform = `translate(-50%, -50%) translate(${x}px,${y}px)`;

      // set the zIndex for sorting
      elem.style.zIndex = ((-tempV.z * 0.5 + 0.5) * 100000) | 0;
    }
  }

  // picking
  const pickHelper = new GPUPickHelperForGlobe();

  const maxClickTimeMs = 200;
  const maxMoveDeltaSq = 5 * 5;
  const startPosition = {};
  let startTimeMs;

  function recordStartTimeAndPosition(event) {
    startTimeMs = performance.now();
    const pos = getCanvasRelativePosition(event);
    startPosition.x = pos.x;
    startPosition.y = pos.y;
  }

  function getCanvasRelativePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function pickCountry(event) {
    // exit if we have not loaded the data yet
    if (!countryInfos) {
      return;
    }

    // if it's been a moment since the user started
    // then assume it was a drag action, not a select action
    const clickTimeMs = performance.now() - startTimeMs;
    if (clickTimeMs > maxClickTimeMs) {
      return;
    }

    // if they moved assume it was a drag action
    const position = getCanvasRelativePosition(event);
    const moveDeltaSq =
      (startPosition.x - position.x) ** 2 + (startPosition.y - position.y) ** 2;
    if (moveDeltaSq > maxMoveDeltaSq) {
      return;
    }

    const id = pickHelper.pick(position, pickingScene, camera, renderer);
    if (id > 0) {
      // we clicked a country. Toggle its 'selected' property
      const countryInfo = countryInfos[id - 1];
      const selected = !countryInfo.selected;
      // if we're selecting this country and modifiers are not
      // pressed unselect everything else.
      if (selected && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
        unselectAllCountries();
      }
      numCountriesSelected += selected ? 1 : -1;
      countryInfo.selected = selected;
      setPaletteColor(id, selected ? selectedColor : unselectedColor);
      paletteTexture.needsUpdate = true;
    } else if (numCountriesSelected) {
      // the ocean or sky was clicked
      unselectAllCountries();
    }
    requestRenderIfNotRequested();
  }

  function unselectAllCountries() {
    numCountriesSelected = 0;
    countryInfos.forEach((countryInfo) => {
      countryInfo.selected = false;
    });
    resetPalette();
  }

  canvas.addEventListener("pointerup", pickCountry);
  canvas.addEventListener("pointerdown", recordStartTimeAndPosition);

  // render
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
  function render(time) {
    renderRequested = undefined;
    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    controls.update();
    updateLabels();
    renderer.render(scene, camera);

    // requestAnimationFrame(render);
  }

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
