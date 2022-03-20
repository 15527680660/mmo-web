import * as THREE from "three";
// Three.js - Cleanup
// from https://threejs.org/manual/examples/cleanup-simple.html

class ResourceTracker {
  constructor() {
    this.resources = new Set();
  }
  track(resource) {
    if (!resource) {
      return resource;
    }

    // handle children and when material is an array of materials or
    // uniform is array of textures
    if (Array.isArray(resource)) {
      resource.forEach((resource) => this.track(resource));
      return resource;
    }

    if (resource.dispose || resource instanceof THREE.Object3D) {
      this.resources.add(resource);
    }
    if (resource instanceof THREE.Object3D) {
      this.track(resource.geometry);
      this.track(resource.material);
      this.track(resource.children);
    } else if (resource instanceof THREE.Material) {
      // We have to check if there are any textures on the material
      for (const value of Object.values(resource)) {
        if (value instanceof THREE.Texture) {
          this.track(value);
        }
      }
      // We also have to check if any uniforms reference textures or arrays of textures
      if (resource.uniforms) {
        for (const value of Object.values(resource.uniforms)) {
          if (value) {
            const uniformValue = value.value;
            if (
              uniformValue instanceof THREE.Texture ||
              Array.isArray(uniformValue)
            ) {
              this.track(uniformValue);
            }
          }
        }
      }
    }
    return resource;
  }
  untrack(resource) {
    this.resources.delete(resource);
  }
  dispose() {
    for (const resource of this.resources) {
      if (resource instanceof THREE.Object3D) {
        if (resource.parent) {
          resource.parent.remove(resource);
        }
      }
      if (resource.dispose) {
        resource.dispose();
      }
    }
    this.resources.clear();
  }
}

function main() {
  const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({ canvas });

  const fov = 75;
  const aspect = 2; // the canvas default
  const near = 0.1;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;

  const scene = new THREE.Scene();
  const cubes = []; // an array we can use to rotate the cubes

  function addStuffToScene() {
    const resTracker = new ResourceTracker();
    const track = resTracker.track.bind(resTracker);

    const boxWidth = 1;
    const boxHeight = 1;
    const boxDepth = 1;
    const geometry = track(
      new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth)
    );

    const loader = new THREE.TextureLoader();

    const material = track(
      new THREE.MeshBasicMaterial({
        map: track(
          loader.load(
            "https://threejs.org/manual/examples/resources/images/wall.jpg"
          )
        ),
      })
    );
    const cube = track(new THREE.Mesh(geometry, material));
    scene.add(cube);
    cubes.push(cube); // add to our list of cubes to rotate
    return resTracker;
  }

  function waitSeconds(seconds = 0) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  async function process() {
    for (;;) {
      const resTracker = addStuffToScene();
      await waitSeconds(2);
      cubes.length = 0; // remove the cubes
      resTracker.dispose();
      await waitSeconds(1);
    }
  }
  process();

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

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cubes.forEach((cube, ndx) => {
      const speed = 0.2 + ndx * 0.1;
      const rot = time * speed;
      cube.rotation.x = rot;
      cube.rotation.y = rot;
    });

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

main();
