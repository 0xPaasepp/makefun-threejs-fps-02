import * as T from "three";
import { state } from "./state.js";
import { distance, angle } from "./utils.js";
import { palette, material } from "./palette.js";
import { route } from "./map.js";
import { collide, floorAt } from "./player.js";
import { guns } from "./weapons.js";
const ray = new T.Raycaster(),
  from = new T.Vector3(),
  to = new T.Vector3(),
  hits = [];
export function createBots(scene) {
  for (let i = 0; i < 10; i++) {
    const p = state.players[i],
      group = new T.Group();
    const body = new T.Mesh(new T.BoxGeometry(0.49, 0.68, 0.3), material("ink"));
    body.position.y = 1.05;
    body.userData = { id: i, head: false };
    const head = new T.Mesh(new T.SphereGeometry(0.155, 12, 10), material("rust"));
    head.position.y = 1.57;
    head.userData = { id: i, head: true };
    group.add(body, head);
    const vest = new T.Mesh(new T.BoxGeometry(0.52, 0.4, 0.34), material(p.team ? "brine" : "rust"));
    vest.position.y = 1.1;
    group.add(vest);
    for (let j = -1; j <= 1; j += 2) {
      const leg = new T.Mesh(new T.BoxGeometry(0.17, 0.65, 0.2), material("iron"));
      leg.position.set(j * 0.14, 0.36, 0);
      group.add(leg);
      const arm = new T.Mesh(new T.BoxGeometry(0.15, 0.5, 0.17), material("salt"));
      arm.position.set(j * 0.34, 1.06, -0.04);
      arm.rotation.x = -0.65;
      group.add(arm);
    }
    const gun = new T.Mesh(new T.BoxGeometry(0.09, 0.12, 0.6), material("iron"));
    gun.position.set(0.2, 1.1, -0.35);
    group.add(gun);
    group.traverse((o) => {
      o.castShadow = true;
    });
    scene.add(group);
    p.mesh = group;
    p.head = head;
    p.body = body;
  }
}
export function updateBotMeshes() {
  for (let i = 0; i < state.players.length; i++) {
    const p = state.players[i];
    p.mesh.visible = i > 0 && p.alive;
    p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.rotation.y = p.yaw;
    p.mesh.scale.y = p.crouch ? 0.7 : 1;
  }
}
export function canSee(a, b, map) {
  from.set(a.x, a.y + 1.5, a.z);
  to.set(b.x, b.y + (b.crouch ? 0.9 : 1.2), b.z).sub(from);
  const d = to.length();
  ray.set(from, to.normalize());
  ray.far = d - 0.25;
  hits.length = 0;
  ray.intersectObjects(map.shootables, false, hits);
  return hits.length === 0;
}
function setPath(p, map, dest) {
  p.path = route(map, p, dest);
  p.pathIndex = 0;
  p.state = "ROUTE";
  p.stuck = 0;
}
export function assignRoles(map) {
  const site = Math.floor(state.random() * 2);
  state.charge.carrier = state.round % 5;
  state.charge.site = -1;
  for (let i = 1; i < 10; i++) {
    const p = state.players[i];
    p.target = -1;
    p.channel = 0;
    p.noiseAt = state.time;
    p.hold = 0;
    p.role =
      i < 5
        ? i === state.charge.carrier
          ? "carrier"
          : i === 3
            ? "lurker"
            : "entry"
        : ["anchor", "anchor", "mid", "rotator", "dock"][i - 5];
    let dest;
    if (i < 5) {
      dest = i === 3 ? map.nodes.find((n) => n.name === "MID_HOLD") : map.sites[site];
    } else {
      const names = ["CRUSHER_HOLD", "PONDS_HOLD", "MID_HOLD", "TRESTLE", "DOCK_HOLD"];
      dest = map.nodes.find((n) => n.name === names[i - 5]);
    }
    p.objective = dest;
    p.site = site;
    setPath(p, map, dest);
    if (i < 5 && i !== 3) {
      const lane = map.nodes.find((n) => n.name === (site === 0 ? "EAST_ENTRY" : "WEST_ENTRY"));
      p.path = route(map, p, lane).concat(route(map, lane, dest));
    }
  }
  const carrier = state.players[state.charge.carrier];
  carrier.role = "carrier";
  if (carrier.id > 0) {
    carrier.objective = map.sites[site];
    setPath(carrier, map, carrier.objective);
    const lane = map.nodes.find((n) => n.name === (site === 0 ? "EAST_ENTRY" : "WEST_ENTRY"));
    carrier.path = route(map, carrier, lane).concat(route(map, lane, carrier.objective));
  }
}
export function hearNoise(p, map) {
  for (let i = state.noise.length - 1; i >= 0; i--) {
    const n = state.noise[i];
    if (n.time <= p.noiseAt) break;
    if (n.team === p.team || distance(p, n) > n.radius) continue;
    p.noiseAt = state.time;
    if (
      p.target < 0 &&
      !p.recover &&
      p.state !== "INVESTIGATE" &&
      p.state !== "PLANT" &&
      p.state !== "DEFUSE" &&
      state.charge.carrier !== p.id
    ) {
      p.resume = p.objective;
      p.investigateUntil = state.time + 2;
      p.yaw = Math.atan2(p.x - n.x, p.z - n.z);
      setPath(p, map, n);
      p.state = "INVESTIGATE";
    }
    return;
  }
  p.noiseAt = state.time;
}
function perceive(p, map) {
  let best = -1,
    nearest = Infinity;
  for (let i = 0; i < 10; i++) {
    const e = state.players[i];
    if (!e.alive || e.team === p.team) continue;
    const d = distance(p, e),
      yaw = Math.atan2(p.x - e.x, p.z - e.z);
    if (d > (e.crouch ? 20 : 33) || Math.abs(angle(yaw - p.yaw)) > 0.92) continue;
    if (d < nearest && canSee(p, e, map)) {
      best = i;
      nearest = d;
    }
  }
  if (best !== p.target) {
    p.target = best;
    p.reaction = state.time + 0.08 + (0.35 + state.random() * 0.3) / p.skill;
  }
  if (best >= 0) {
    p.state = "ENGAGE";
    p.seenAt = state.time;
  }
}
export function stepBots(map, dt, shoot) {
  state.perception -= dt;
  if (state.perception <= 0) {
    state.perception = 0.15;
    state.perceptionIndex = ((state.perceptionIndex || 0) % 9) + 1;
    const p = state.players[state.perceptionIndex];
    if (p.alive) perceive(p, map);
  }
  const charge = state.charge;
  for (let i = 1; i < 10; i++) {
    const p = state.players[i];
    if (!p.alive) continue;
    p.vx = p.vz = 0;
    p.crouch = p.hp < 35 && p.state === "HOLD";
    hearNoise(p, map);
    if (p.target >= 0) {
      const e = state.players[p.target];
      if (!e.alive || state.time - p.seenAt > 2.5 || distance(p, e) > 36) {
        p.target = -1;
        p.state = "ROUTE";
      } else {
        p.yaw = Math.atan2(p.x - e.x, p.z - e.z);
        if (state.time > p.reaction) {
          if (p.burst <= 0 && p.cooldown <= 0) {
            p.burst = 3 + Math.floor(state.random() * 3);
            p.reaction = state.time + 0.18;
          }
          if (p.burst > 0 && p.cooldown <= 0) {
            shoot(p, e);
            p.burst--;
            if (p.grenade && distance(p, e) > 7 && distance(p, e) < 18 && state.random() < 0.12)
              state.events.push({ type: "grenade", id: p.id });
            if (!p.burst) p.reaction = state.time + 0.5 + state.random() * 0.5;
          }
        }
        const strafe = Math.sin(state.time * 2 + p.id) > 0 ? 1 : -1;
        let dx = Math.cos(p.yaw) * strafe * 1.1,
          dz = -Math.sin(p.yaw) * strafe * 1.1;
        if (p.hp < 35) {
          if (!p.cover) {
            let best = Infinity;
            for (const node of map.coverNodes) {
              const score = distance(p, node) + (distance(node, e) < distance(p, e) ? 3 : 0);
              if (score < best) {
                p.cover = node;
                best = score;
              }
            }
          }
          const d = distance(p, p.cover);
          if (d > 0.6) {
            dx = ((p.cover.x - p.x) / d) * 2.8;
            dz = ((p.cover.z - p.z) / d) * 2.8;
          } else {
            dx = dz = 0;
            p.crouch = true;
          }
        }
        collide(p, dx * dt, dz * dt, map);
        p.vx = dx;
        p.vz = dz;
        p.y = floorAt(p, map);
        continue;
      }
    }
    if (charge.planted && p.team === 1 && p.state !== "DEFUSE" && p.rotateSite !== charge.site) {
      p.rotateSite = charge.site;
      p.objective = map.sites[charge.site];
      setPath(p, map, p.objective);
      p.state = "ROTATE";
    }
    if (!charge.planted && charge.carrier < 0 && p.team === 0) {
      let nearest = i,
        d = distance(p, charge);
      for (let j = 0; j < 5; j++)
        if (state.players[j].alive && distance(state.players[j], charge) < d) {
          nearest = j;
          d = distance(state.players[j], charge);
        }
      if (nearest === i && (p.recover !== true || p.pathIndex >= p.path.length)) {
        p.recover = true;
        setPath(p, map, charge);
        p.state = "ROTATE";
      }
    }
    if (charge.carrier === i && !charge.planted) {
      p.recover = false;
      const s = map.sites[p.site];
      if (distance(p, s) < 1.7) {
        p.state = "PLANT";
        continue;
      }
      if (p.objective !== s) {
        p.objective = s;
        setPath(p, map, s);
      }
    }
    if (!p.outnumbered && charge.carrier !== i && !charge.planted) {
      let allies = 0,
        enemies = 0;
      for (let j = 0; j < 10; j++) {
        const q = state.players[j];
        if (q.alive) {
          if (q.team === p.team) allies++;
          else enemies++;
        }
      }
      if (allies === 1 && enemies >= 3) {
        p.outnumbered = true;
        p.objective = p.team === 0 ? map.sites[p.site] : map.nodes.find((n) => n.name === "DOCK_HOLD");
        setPath(p, map, p.objective);
        p.state = "ROTATE";
      }
    }
    if (charge.planted && p.team === 1 && distance(p, charge) < 2.5) {
      p.state = "DEFUSE";
      continue;
    }
    if (p.state === "INVESTIGATE" && state.time > p.investigateUntil) {
      setPath(p, map, p.resume || p.objective);
    }
    if (p.pathIndex < p.path.length) {
      const n = p.path[p.pathIndex],
        dx = n.x - p.x,
        dz = n.z - p.z,
        d = Math.hypot(dx, dz);
      if (d < 0.5) {
        p.pathIndex++;
        p.stuck = 0;
      } else {
        const speed = 2.7;
        p.yaw = Math.atan2(-dx, -dz);
        const ox = p.x,
          oz = p.z;
        collide(p, (dx / d) * speed * dt, (dz / d) * speed * dt, map);
        p.vx = (p.x - ox) / dt;
        p.vz = (p.z - oz) / dt;
        if (Math.hypot(p.vx, p.vz) < 0.15) p.stuck += dt;
        else p.stuck = 0;
        if (p.stuck > 1) {
          collide(p, (-dz / d) * speed * dt, (dx / d) * speed * dt, map);
          if (p.stuck > 3) {
            p.pathIndex++;
            p.stuck = 0;
          }
        }
      }
    } else {
      if (p.state !== "HOLD") p.yaw = p.team ? Math.PI : 0;
      p.state = "HOLD";
      p.yaw += Math.sin(state.time * 0.8 + p.id) * dt * 0.35;
      if (p.team === 0 && charge.carrier !== i && !charge.planted && state.time > p.hold + 8) {
        p.hold = state.time;
        if (charge.carrier >= 0) setPath(p, map, map.sites[p.site]);
      }
    }
    p.y = floorAt(p, map);
  }
}
