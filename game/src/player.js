import { clamp } from "./utils.js";
export function floorAt(p, map) {
  let floor = 0;
  for (let i = 0; i < map.colliders.length; i++) {
    const c = map.colliders[i];
    if (c.top <= 0.65 && p.x > c.minX - 0.22 && p.x < c.maxX + 0.22 && p.z > c.minZ - 0.22 && p.z < c.maxZ + 0.22)
      floor = Math.max(floor, c.top);
  }
  return floor;
}
export function collide(p, dx, dz, map) {
  const slices = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.2);
  if (slices > 1) {
    for (let i = 0; i < slices; i++) collide(p, dx / slices, dz / slices, map);
    return;
  }
  const r = 0.28,
    height = p.crouch ? 1.2 : 1.8;
  for (let axis = 0; axis < 2; axis++) {
    const old = axis ? p.z : p.x;
    if (axis) p.z += dz;
    else p.x += dx;
    for (let i = 0; i < map.colliders.length; i++) {
      const c = map.colliders[i];
      if (c.top <= p.y + 0.65 || c.bottom >= p.y + height) continue;
      if (p.x + r > c.minX && p.x - r < c.maxX && p.z + r > c.minZ && p.z - r < c.maxZ) {
        if (axis) p.z = old;
        else p.x = old;
        break;
      }
    }
  }
}
export function movePlayer(p, input, map, dt, speed) {
  p.crouch = !!(input.keys.KeyC || input.keys.ControlLeft);
  let x = (input.keys.KeyD ? 1 : 0) - (input.keys.KeyA ? 1 : 0),
    z = (input.keys.KeyS ? 1 : 0) - (input.keys.KeyW ? 1 : 0);
  const l = Math.hypot(x, z) || 1;
  x /= l;
  z /= l;
  const s = Math.sin(p.yaw),
    c = Math.cos(p.yaw),
    v = p.crouch ? 2.4 : speed,
    acc = p.onGround ? 42 : 9;
  const tx = (x * c + z * s) * v,
    tz = (-x * s + z * c) * v;
  p.vx += clamp(tx - p.vx, -acc * dt, acc * dt);
  p.vz += clamp(tz - p.vz, -acc * dt, acc * dt);
  if (!x && !z && p.onGround) {
    p.vx *= Math.max(0, 1 - 9 * dt);
    p.vz *= Math.max(0, 1 - 9 * dt);
  }
  if (input.keys.Space && p.onGround) {
    p.vy = 6.2;
    p.onGround = false;
  }
  p.vy -= 20 * dt;
  collide(p, p.vx * dt, p.vz * dt, map);
  p.y += p.vy * dt;
  const f = floorAt(p, map);
  if (p.y <= f) {
    p.y = f;
    p.vy = 0;
    p.onGround = true;
  }
  p.pitch = clamp(p.pitch, -1.4, 1.4);
}
export function look(p, dx, dy) {
  p.yaw -= dx * 0.0022;
  p.pitch = clamp(p.pitch - dy * 0.0022, -1.4, 1.4);
}
