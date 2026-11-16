import * as T from "three";
import { palette, material } from "./palette.js";
export function createMap(scene) {
  const colliders = [],
    shootables = [],
    nodes = [],
    spawns = [[], []],
    sites = [
      { name: "CRUSHER", letter: "A", x: 17.4, z: -9, y: 0.5, color: "rust" },
      { name: "PONDS", letter: "B", x: -17.4, z: -9, y: 0, color: "brine" },
    ];
  const mats = {};
  for (const k in palette) mats[k] = material(k);
  function box(x, y, z, w, h, d, m = "salt", solid = true) {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), typeof m === "string" ? mats[m] : m);
    o.position.set(x, y + h / 2, z);
    o.castShadow = true;
    o.receiveShadow = true;
    scene.add(o);
    if (solid) {
      colliders.push({
        minX: x - w / 2,
        maxX: x + w / 2,
        minZ: z - d / 2,
        maxZ: z + d / 2,
        top: y + h,
        bottom: y,
      });
      shootables.push(o);
    }
    return o;
  }
  function cylinder(x, y, z, r, h, m) {
    const o = new T.Mesh(new T.CylinderGeometry(r, r, h, 24), mats[m]);
    o.position.set(x, y + h / 2, z);
    o.castShadow = true;
    o.receiveShadow = true;
    scene.add(o);
    return o;
  }
  function label(text, x, y, z, color, size = 1, flat = false) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const a = c.getContext("2d");
    a.fillStyle = palette[color];
    a.font = "700 80px system-ui";
    a.textAlign = "center";
    a.fillText(text, 128, 91);
    const m = new T.MeshBasicMaterial({
      map: new T.CanvasTexture(c),
      transparent: true,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const o = new T.Mesh(new T.PlaneGeometry(size * 2, size), m);
    o.position.set(x, y, z);
    if (flat) o.rotation.x = -Math.PI / 2;
    scene.add(o);
    return o;
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = palette.salt;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = palette.sand;
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = palette.iron;
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, 252, 252);
  ctx.globalAlpha = 1;
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(22, 17);
  const floor = new T.Mesh(new T.PlaneGeometry(44, 34), material("salt", { map: tex }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  shootables.push(floor);
  box(0, 0, -17, 44, 4.2, 0.4);
  box(0, 0, 17, 44, 4.2, 0.4);
  box(-22, 0, 0, 0.4, 4.2, 34);
  box(22, 0, 0, 0.4, 4.2, 34);
  // Broken partitions preserve three readable lanes and two cross connectors.
  for (const x of [-10, 10]) {
    box(x, 0, 3, 1, 4.2, 16);
    box(x, 0, -13, 1, 4.2, 6);
    box(x, 3.9, -1, 1.3, 0.3, 26, "iron", false);
  }
  for (const x of [-7, 7])
    for (const z of [-6, 8]) {
      box(x, 0, z, 1.2, 4.2, 1.2, "iron");
      box(x, 4.2, z, 1.5, 0.2, 1.5, "salt", false);
    }
  box(0, 0.006, 1, 14, 0.025, 2, "brine", false);
  const mound = cylinder(0, 0, 0, 3, 0.55, "salt");
  colliders.push({
    minX: -2.3,
    maxX: 2.3,
    minZ: -2.3,
    maxZ: 2.3,
    top: 0.55,
    bottom: 0,
  });
  shootables.push(mound);
  function sacks(x, z) {
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 3; i++) {
        const o = box(x + (i - 1) * 0.58, j * 0.46, z + (j % 2) * 0.09, 0.62, 0.46, 0.8, "sand");
        o.rotation.z = (i % 2 ? 1 : -1) * 0.035;
        box(x + (i - 1) * 0.58, j * 0.46 + 0.19, z + 0.405, 0.5, 0.025, 0.012, "salt", false);
      }
  }
  for (const p of [
    [-19, 7],
    [-19, -1],
    [19, 7],
    [19, -1],
    [-4, -1],
    [4, -1],
    [-8, -8],
    [8, -8],
  ])
    sacks(...p);
  for (const x of [-4, 4])
    for (const z of [4, 6]) {
      shootables.push(cylinder(x, 0, z, 0.42, 0.9, "brine"));
      colliders.push({
        minX: x - 0.42,
        maxX: x + 0.42,
        minZ: z - 0.42,
        maxZ: z + 0.42,
        top: 0.9,
        bottom: 0,
      });
    }
  function rack(x, z, w = 3) {
    box(x, 0, z, w, 1, 0.55, "iron");
    for (let i = 0; i < 4; i++) {
      const o = new T.Mesh(new T.CylinderGeometry(0.13, 0.13, w + 0.3, 10), mats.iron);
      o.rotation.z = Math.PI / 2;
      o.position.set(x, 0.25 + i * 0.22, z);
      scene.add(o);
    }
  }
  rack(-5, 2);
  rack(5, 2);
  for (const x of [-16, 16]) for (const z of [10, 4, -2]) rack(x, z, 2);
  rack(-15, -5);
  rack(15, -5);
  const glass = material("salt", {
    opacity: 0.16,
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    depthWrite: false,
  });
  for (const x of [-6, 6]) {
    box(x, 0, -9, 0.16, 2.8, 1.8, glass);
    box(x, 0, -9, 0.25, 0.15, 2, "iron");
    box(x, 2.8, -9, 0.25, 0.15, 2, "iron", false);
  }
  box(0, 0, -11.9, 12, 0.6, 2.2);
  box(0, 0, -10.5, 12, 0.3, 0.6);
  label("SALT HALL", 0, 3, -16.7, "iron", 3);
  for (const s of sites) {
    if (s.letter === "A") {
      box(s.x, 0, s.z, 5, 0.5, 4);
      box(19, 0.5, -10, 2.2, 2.2, 2, "iron");
      const hopper = new T.Mesh(new T.CylinderGeometry(1.5, 0.8, 1.1, 4), mats.rust);
      hopper.position.set(19, 3.2, -10);
      hopper.castShadow = true;
      scene.add(hopper);
    } else {
      for (let i = 0; i < 3; i++) box(-19 + i * 1.4, 0.02, -10, 1.1, 0.04, 4, "brine", false);
    }
    const ring = new T.Mesh(
      new T.RingGeometry(2.05, 2.13, 64),
      new T.MeshBasicMaterial({ color: palette[s.color], side: T.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.x, s.y + 0.02, s.z);
    scene.add(ring);
    label(s.letter, s.x, s.y + 0.03, s.z, s.color, 2, true);
    label(s.name, s.x, 3.4, -16.7, s.color, 2.8);
  }
  // Industrial silhouettes and wall ribs establish scale without blocking routes.
  for (const x of [-21.6, 21.6])
    for (let z = -14; z <= 14; z += 7) {
      box(x, 0, z, 0.3, 4.35, 0.42, "iron", false);
      box(x, 3.6, z, 0.5, 0.15, 2, "sand", false);
    }
  for (const z of [-16.7, 16.7]) {
    box(0, 0.1, z, 43, 0.16, 0.16, "iron", false);
    box(0, 3.9, z, 43, 0.12, 0.18, "sand", false);
  }
  for (const x of [-16, 16]) {
    for (const z of [11, -4]) {
      box(x - 2.4, 0, z, 0.16, 3.4, 0.16, "iron", false);
      box(x + 2.4, 0, z, 0.16, 3.4, 0.16, "iron", false);
      box(x, 3.3, z, 5, 0.16, 0.22, "iron", false);
      for (let j = 0; j < 3; j++) {
        const pipe = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 5.4, 12), mats.sand);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(x, 3.6 + j * 0.24, z);
        pipe.castShadow = true;
        scene.add(pipe);
      }
    }
  }
  for (const x of [-27, 27])
    for (let i = 0; i < 3; i++) {
      cylinder(x, 0, -11 + i * 7, 2.2, 6 + i * 0.6, "sand");
      cylinder(x, 6 + i * 0.6, -11 + i * 7, 2.3, 0.18, "iron");
    }
  for (let i = 0; i < 7; i++) {
    const pile = new T.Mesh(new T.ConeGeometry(4 + (i % 3), 3 + (i % 2) * 2, 5), mats.salt);
    pile.position.set(-32 + i * 10, 1, -27 - (i % 2) * 3);
    pile.rotation.y = i * 0.7;
    scene.add(pile);
  }
  const skyCanvas = document.createElement("canvas");
  skyCanvas.width = 8;
  skyCanvas.height = 256;
  const sky = skyCanvas.getContext("2d"),
    gradient = sky.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, palette.dusk);
  gradient.addColorStop(0.6, palette.dusk);
  gradient.addColorStop(1, palette.sand);
  sky.fillStyle = gradient;
  sky.fillRect(0, 0, 8, 256);
  const skyMap = new T.CanvasTexture(skyCanvas);
  skyMap.colorSpace = T.SRGBColorSpace;
  const dome = new T.Mesh(
    new T.SphereGeometry(85, 32, 16),
    new T.MeshBasicMaterial({ map: skyMap, side: T.BackSide, fog: false }),
  );
  scene.add(dome);
  label("SOUTH GATE", 0, 3, 16.7, "iron", 3).rotation.y = Math.PI;
  for (let team = 0; team < 2; team++)
    for (let i = 0; i < 5; i++) spawns[team].push({ x: (i - 2) * 1.5, z: team ? -14.5 : 14.5 });
  function node(name, x, z, y = 0) {
    nodes.push({ name, x, z, y, edges: [] });
    return nodes.length - 1;
  }
  for (let t = 0; t < 2; t++)
    for (let i = 0; i < 5; i++) node((t ? "HALL" : "GATE") + i, spawns[t][i].x, spawns[t][i].z);
  for (const n of [
    ["MID", 0, 4],
    ["MID_HOLD", 0, -4],
    ["SW", -5, 7],
    ["SE", 5, 7],
    ["NW", -5, -5],
    ["NE", 5, -5],
    ["WEST_ENTRY", -16, 12],
    ["WEST_MID", -16, 1],
    ["WEST_EXIT", -16, -7],
    ["EAST_ENTRY", 16, 12],
    ["EAST_MID", 16, 1],
    ["EAST_EXIT", 16, -7],
    ["TRESTLE_W", -12, -8.5],
    ["TRESTLE", 0, -8.5],
    ["TRESTLE_E", 12, -8.5],
    ["CRUSHER_HOLD", 17.4, -6],
    ["CRUSHER", 17.4, -9, 0.5],
    ["PONDS_HOLD", -17.4, -6],
    ["PONDS", -17.4, -9],
    ["DOCK_HOLD", 0, -12, 0.6],
  ])
    node(...n);
  for (const x of [-17, -13, 13, 17]) for (const z of [13, 8, 0, -4, -8]) node("LANE_" + x + "_" + z, x, z);
  for (const x of [-3, 3]) for (const z of [3, -4, -8, -12]) node("INNER_" + x + "_" + z, x, z);
  // A corridor test excludes full-height obstructions; low cover is navigated around.
  function clear(a, b) {
    for (const c of colliders) {
      if (c.top <= 0.65) continue;
      for (let t = 0; t <= 1; t += 0.025) {
        const x = a.x + (b.x - a.x) * t,
          z = a.z + (b.z - a.z) * t;
        if (x > c.minX - 0.3 && x < c.maxX + 0.3 && z > c.minZ - 0.3 && z < c.maxZ + 0.3) return false;
      }
    }
    return true;
  }
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      if (Math.hypot(nodes[i].x - nodes[j].x, nodes[i].z - nodes[j].z) < 16 && clear(nodes[i], nodes[j])) {
        nodes[i].edges.push(j);
        nodes[j].edges.push(i);
      }
  // Bake static solids by material; invisible originals remain precise bullet surfaces.
  const batches = new Map();
  for (const mesh of scene.children) {
    if (!mesh.isMesh || !mesh.material.isMeshStandardMaterial || mesh.material.transparent) continue;
    let batch = batches.get(mesh.material);
    if (!batch) {
      batch = [];
      batches.set(mesh.material, batch);
    }
    batch.push(mesh);
  }
  for (const [mat, batch] of batches) {
    if (batch.length < 2) continue;
    const geometries = [];
    let count = 0;
    for (const mesh of batch) {
      mesh.updateMatrixWorld(true);
      const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      count += geo.attributes.position.count;
      geometries.push(geo);
      mesh.visible = false;
    }
    const geo = new T.BufferGeometry();
    for (const name of ["position", "normal", "uv"]) {
      const size = name === "uv" ? 2 : 3,
        data = new Float32Array(count * size);
      let offset = 0;
      for (const part of geometries) {
        data.set(part.attributes[name].array, offset);
        offset += part.attributes[name].array.length;
      }
      geo.setAttribute(name, new T.BufferAttribute(data, size));
    }
    const mesh = new T.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    for (const part of geometries) part.dispose();
  }
  return {
    colliders,
    shootables,
    nodes,
    spawns,
    sites,
    coverNodes: nodes.filter((n) =>
      ["NW", "NE", "SW", "SE", "WEST_EXIT", "EAST_EXIT", "TRESTLE_W", "TRESTLE_E"].includes(n.name),
    ),
  };
}
export function route(map, start, end) {
  const ns = map.nodes;
  let a = 0,
    b = 0,
    da = Infinity,
    db = Infinity;
  for (let i = 0; i < ns.length; i++) {
    let d = Math.hypot(ns[i].x - start.x, ns[i].z - start.z);
    if (d < da) {
      da = d;
      a = i;
    }
    d = Math.hypot(ns[i].x - end.x, ns[i].z - end.z);
    if (d < db) {
      db = d;
      b = i;
    }
  }
  const queue = [a],
    prev = new Int16Array(ns.length).fill(-1);
  prev[a] = a;
  for (let q = 0; q < queue.length && prev[b] < 0; q++) {
    const k = queue[q];
    for (const n of ns[k].edges)
      if (prev[n] < 0) {
        prev[n] = k;
        queue.push(n);
      }
  }
  const path = [];
  if (prev[b] < 0) return path;
  for (let k = b; k !== a; k = prev[k]) path.unshift(ns[k]);
  path.push(end);
  return path;
}
