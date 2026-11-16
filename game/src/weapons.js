import { state } from "./state.js";
import { clamp } from "./utils.js";
import * as T from "three";
import { material } from "./palette.js";
export const guns = {
  duster: {
    name: "DUSTER",
    body: 34,
    head: 102,
    rpm: 300,
    mag: 12,
    reserve: 48,
    still: 0.004,
    moving: 0.03,
    speed: 5.2,
    price: 0,
    reload: 1.4,
    auto: false,
    kick: 0.025,
  },
  squall: {
    name: "SQUALL",
    body: 26,
    head: 78,
    rpm: 750,
    mag: 28,
    reserve: 84,
    still: 0.008,
    moving: 0.035,
    speed: 5.6,
    price: 1500,
    reload: 1.6,
    auto: true,
    kick: 0.018,
  },
  longline: {
    name: "LONGLINE",
    body: 36,
    head: 144,
    rpm: 600,
    mag: 25,
    reserve: 75,
    still: 0.002,
    moving: 0.03,
    speed: 5,
    price: 2700,
    reload: 1.9,
    auto: true,
    kick: 0.032,
  },
};
export const flashpan = {
  price: 300,
  damage: 90,
  edge: 20,
  radius: 6,
  fuse: 1.6,
  gravity: 12,
  bounce: 0.4,
};
export function spread(p) {
  const g = guns[p.gun];
  return (g.still + (g.moving - g.still) * Math.min(1, Math.hypot(p.vx, p.vz) / 3) + p.bloom) * (p.crouch ? 0.7 : 1);
}
export function equip(p, key) {
  if (!p.owned.includes(key)) return false;
  if (p.gun === key && p.ammo?.[key]) return true;
  if (!p.ammo) p.ammo = {};
  if (p.gun) p.ammo[p.gun] = { mag: p.mag, reserve: p.reserve };
  p.gun = key;
  const saved = p.ammo[key];
  p.mag = saved ? saved.mag : guns[key].mag;
  p.reserve = saved ? saved.reserve : guns[key].reserve;
  p.reload = 0;
  return true;
}
export function reload(p) {
  if (!p.reload && p.mag < guns[p.gun].mag && p.reserve > 0) {
    p.reload = guns[p.gun].reload;
    return true;
  }
  return false;
}
export function tickWeapon(p, dt) {
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.bloom = Math.max(0, p.bloom - dt * 0.018);
  p.kick = Math.max(0, p.kick - dt * 0.22);
  if (p.reload) {
    p.reload = Math.max(0, p.reload - dt);
    if (!p.reload) {
      const n = Math.min(guns[p.gun].mag - p.mag, p.reserve);
      p.mag += n;
      p.reserve -= n;
    }
  }
}
export function fired(p) {
  const g = guns[p.gun];
  if (p.reload || p.cooldown || !p.mag) {
    if (!p.mag) reload(p);
    return false;
  }
  p.mag--;
  p.cooldown = 60 / g.rpm;
  p.bloom = Math.min(0.03, p.bloom + 0.0015);
  p.kick += g.kick;
  return true;
}
export function viewModel(camera) {
  const root = new T.Group(),
    iron = material("iron", { emissive: "#3a3f45", emissiveIntensity: 0.3 }),
    rust = material("rust");
  function part(x, y, z, w, h, d, m) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  }
  part(0, 0, 0, 0.12, 0.15, 0.4, iron);
  const barrel = part(0, 0.025, -0.3, 0.055, 0.055, 0.35, iron);
  part(0, -0.15, 0.09, 0.09, 0.22, 0.11, iron).rotation.x = -0.25;
  part(0, -0.02, 0.11, 0.125, 0.09, 0.1, rust);
  part(0, 0.1, -0.08, 0.025, 0.045, 0.15, iron);
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const a = c.getContext("2d");
  a.fillStyle = "#f2ede1";
  a.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 ? 7 : 30,
      t = (i * Math.PI) / 8;
    a.lineTo(32 + Math.cos(t) * r, 32 + Math.sin(t) * r);
  }
  a.fill();
  const flash = new T.Mesh(
    new T.PlaneGeometry(0.22, 0.22),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(c),
      transparent: true,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  );
  flash.position.set(0, 0.025, -0.49);
  flash.visible = false;
  root.add(flash);
  const light = new T.PointLight("#ffcf9e", 0, 3);
  light.position.copy(flash.position);
  root.add(light);
  root.position.set(0.22, -0.23, -0.55);
  camera.add(root);
  return { root, flash, light, barrel };
}
export function updateView(v, p, time) {
  const rifle = p.gun === "longline",
    smg = p.gun === "squall";
  v.barrel.scale.z = rifle ? 1.5 : smg ? 1.1 : 0.5;
  v.root.position.set(
    0.22 + Math.sin(time * 8) * Math.min(0.007, Math.hypot(p.vx, p.vz) * 0.001),
    -0.23 - (p.reload ? Math.sin((p.reload / guns[p.gun].reload) * Math.PI) * 0.27 : 0),
    -0.55 + p.kick * 1.8,
  );
  v.root.rotation.x = p.kick * 1.8;
  v.flash.visible = p.cooldown > 60 / guns[p.gun].rpm - 0.045;
  v.light.intensity = v.flash.visible ? 2 : 0;
  v.root.visible = p.alive;
}

export function throwGrenade(p) {
  if (!p.grenade || !p.alive || state.phase !== "live") return;
  p.grenade = 0;
  const g = {
    x: p.x,
    y: p.y + 1.4,
    z: p.z,
    vx: -Math.sin(p.yaw) * 10,
    vy: 5 + p.pitch * 4,
    vz: -Math.cos(p.yaw) * 10,
    fuse: 1.6,
    bounced: false,
    beep: 0.35,
    owner: p.id,
  };
  state.grenades.push(g);
}
export function stepGrenades(dt, map, fx, damage, sound) {
  for (let i = state.grenades.length - 1; i >= 0; i--) {
    const g = state.grenades[i];
    g.fuse -= dt;
    g.vy -= 12 * dt;
    g.x += g.vx * dt;
    g.z += g.vz * dt;
    g.y += g.vy * dt;
    if (Math.abs(g.x) > 21.5) {
      g.x = clamp(g.x, -21.5, 21.5);
      g.vx *= -0.4;
    }
    if (Math.abs(g.z) > 16.5) {
      g.z = clamp(g.z, -16.5, 16.5);
      g.vz *= -0.4;
    }
    for (const wall of map.colliders) {
      if (
        wall.top < g.y ||
        g.y < wall.bottom ||
        g.x < wall.minX - 0.1 ||
        g.x > wall.maxX + 0.1 ||
        g.z < wall.minZ - 0.1 ||
        g.z > wall.maxZ + 0.1
      )
        continue;
      g.x -= g.vx * dt;
      g.z -= g.vz * dt;
      g.vx *= -0.4;
      g.vz *= -0.4;
      break;
    }
    if (g.y < 0.12) {
      g.y = 0.12;
      if (!g.bounced) {
        g.vy = -g.vy * 0.4;
        g.vx *= 0.4;
        g.vz *= 0.4;
        g.bounced = true;
      } else g.vy = 0;
    }
    g.beep -= dt;
    if (g.beep <= 0) {
      sound("beep", 0.025);
      g.beep = Math.max(0.06, g.fuse * 0.25);
    }
    if (g.fuse <= 0) {
      fx.burst(g.x, g.y, g.z);
      state.emitNoise(g.x, g.z, 40, "blast");
      sound("blast", 0.4);
      for (const p of state.players) {
        const d = Math.hypot(p.x - g.x, p.z - g.z);
        if (d < 6 && p.alive) damage(p, 90 - (70 * d) / 6, state.players[g.owner]);
      }
      if (Math.hypot(state.players[0].x - g.x, state.players[0].z - g.z) < 8) state.shake = 0.4;
      state.grenades.splice(i, 1);
    }
  }
}
