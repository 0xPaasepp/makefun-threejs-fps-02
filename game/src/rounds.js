import { state, emit } from "./state.js";
import { distance } from "./utils.js";
import { guns, equip } from "./weapons.js";
import { assignRoles } from "./bots.js";
// Economy is shared by human and bots; loss streaks reset only on a win.
export const economy = {
  start: 800,
  win: 3250,
  loss: 1900,
  lossStep: 500,
  lossCap: 3400,
  kill: 300,
  plant: 300,
  defuse: 300,
  vest: 650,
  grenade: 300,
};
export function buy(p, n) {
  if (state.phase !== "buy" || !p.alive) return false;
  const key = ["", "duster", "squall", "longline"][n];
  if (key) {
    if (!p.owned.includes(key)) {
      if (p.money < guns[key].price) return false;
      p.money -= guns[key].price;
      p.owned.push(key);
    }
    equip(p, key);
    return true;
  }
  if (n === 4 && p.grenade === 0 && p.money >= 300) {
    p.money -= 300;
    p.grenade = 1;
    return true;
  }
  if (n === 5 && p.armor < 50 && p.money >= 650) {
    p.money -= 650;
    p.armor = 50;
    return true;
  }
  return false;
}
export function startRound(map) {
  state.round++;
  state.phase = "buy";
  state.timer = 12;
  state.buy = false;
  state.winner = -1;
  state.message = "";
  Object.assign(state.charge, {
    carrier: 0,
    planted: false,
    x: 0,
    y: 0,
    z: 14,
    fuse: 35,
    site: -1,
    pickup: 0,
  });
  state.grenades.length = 0;
  for (let i = 0; i < 10; i++) {
    const p = state.players[i],
      spawn = map.spawns[p.team][i % 5];
    if (!p.alive) {
      p.owned = ["duster"];
      p.gun = "duster";
      p.armor = 0;
    }
    Object.assign(p, {
      x: spawn.x,
      y: 0,
      z: spawn.z,
      yaw: p.team ? Math.PI : 0,
      pitch: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      hp: 100,
      alive: true,
      crouch: false,
      channel: 0,
      target: -1,
      reload: 0,
      cooldown: 0,
      bloom: 0,
      kick: 0,
      grenade: 0,
      rotateSite: -1,
      recover: false,
      cover: null,
      outnumbered: false,
      damagedAt: -10,
    });
    p.ammo = {};
    p.mag = guns[p.gun].mag;
    p.reserve = guns[p.gun].reserve;
    equip(p, p.gun);
    if (i) {
      buy(p, p.money >= 2700 ? 3 : p.money >= 1500 ? 2 : 1);
      buy(p, 4);
      buy(p, 5);
    }
  }
  assignRoles(map);
  emit("round");
}
export function endRound(team, reason) {
  if (state.phase !== "live") return;
  state.phase = "end";
  state.timer = 4;
  state.winner = team;
  state.score[team]++;
  state.losses[team] = 0;
  state.losses[1 - team]++;
  for (const p of state.players)
    p.money = Math.min(
      16000,
      p.money +
        (p.team === team ? economy.win : Math.min(economy.lossCap, economy.loss + 500 * (state.losses[p.team] - 1))),
    );
  state.message = reason;
  emit("win", { team });
}
export function damage(victim, amount, attacker, head = false) {
  if (!victim.alive || state.phase !== "live") return;
  let absorbed = Math.min(victim.armor, amount * 0.5);
  victim.armor -= absorbed;
  victim.hp = Math.max(0, victim.hp - (amount - absorbed));
  victim.damagedAt = state.time;
  victim.channel = 0;
  if (victim.id === 0) {
    state.damageFlash = 1;
    state.shake = 0.15;
  }
  if (attacker?.id === 0) state.hit = head ? 0.25 : 0.16;
  if (!victim.hp) {
    victim.alive = false;
    if (attacker?.id === 0) {
      state.hit = 0.35;
      state.killHit = 0.35;
    }
    victim.state = "DEAD";
    if (attacker) {
      attacker.money += 300;
      attacker.kills++;
      state.feed.unshift({
        text: attacker.name + "  /  " + victim.name + (head ? " · HEADSHOT" : ""),
        own: attacker.id === 0,
        time: state.time,
      });
      if (state.feed.length > 3) state.feed.pop();
    }
    if (state.charge.carrier === victim.id) {
      Object.assign(state.charge, {
        carrier: -1,
        x: victim.x,
        z: victim.z,
        y: victim.y,
        pickup: 0,
      });
      emit("drop");
    }
    emit("death", { id: victim.id });
  }
}
export function stepRounds(map, dt, input) {
  if (state.phase === "match") return;
  state.timer -= dt;
  if (state.phase === "buy") {
    if (state.timer <= 0) {
      state.phase = "live";
      state.timer = 100;
      state.buy = false;
      emit("live");
    }
    return;
  }
  if (state.phase === "end") {
    if (state.timer <= 0) {
      if (state.score[state.winner] >= 5) {
        state.phase = "match";
        emit("match");
      } else startRound(map);
    }
    return;
  }
  const c = state.charge;
  if (!c.planted && c.carrier < 0) {
    for (let i = 0; i < 5; i++) {
      const p = state.players[i];
      if (p.alive && distance(p, c) < 1) {
        c.pickup += dt;
        if (c.pickup >= 1) {
          c.carrier = i;
          c.pickup = 0;
          p.objective = null;
          emit("pickup");
        }
        break;
      }
    }
  }
  if (c.carrier >= 0 && !c.planted) {
    const carrier = state.players[c.carrier];
    let siteIndex = -1;
    for (let s = 0; s < 2; s++) {
      const site = map.sites[s];
      if (Math.abs(carrier.x - site.x) < 2.5 && Math.abs(carrier.z - site.z) < 2) {
        siteIndex = s;
        break;
      }
    }
    if (
      siteIndex >= 0 &&
      (carrier.id ? carrier.state === "PLANT" : input.keys.KeyE) &&
      Math.hypot(carrier.vx, carrier.vz) < 0.6 &&
      state.time - carrier.damagedAt > 0.12
    ) {
      carrier.channel += dt;
      if (Math.floor(carrier.channel * 2) !== Math.floor((carrier.channel - dt) * 2)) {
        state.emitNoise(carrier.x, carrier.z, 18, "plant", 0);
        emit("beep");
      }
      if (carrier.channel >= 3.5) {
        const site = map.sites[siteIndex];
        Object.assign(c, {
          planted: true,
          x: site.x,
          y: site.y,
          z: site.z,
          site: siteIndex,
          carrier: -1,
          fuse: 35,
        });
        carrier.money += 300;
        carrier.channel = 0;
        emit("plant");
      }
    } else carrier.channel = 0;
  }
  if (c.planted) {
    c.fuse -= dt;
    for (let i = 5; i < 10; i++) {
      const p = state.players[i];
      if (!p.alive || distance(p, c) > 2.7 || p.state !== "DEFUSE") {
        p.channel = 0;
        continue;
      }
      if (state.time - p.damagedAt > 0.12) {
        p.channel += dt;
        if (Math.floor(p.channel * 2) !== Math.floor((p.channel - dt) * 2)) {
          state.emitNoise(p.x, p.z, 18, "defuse", 1);
          emit("beep");
        }
      }
      if (p.channel >= 5) {
        p.money += 300;
        endRound(1, "THE CHARGE IS DEFUSED");
        return;
      }
    }
    if (c.fuse <= 0) {
      emit("detonate");
      endRound(0, "RUST TAKES " + map.sites[c.site].name);
      return;
    }
  }
  let rust = 0,
    brine = 0;
  for (let i = 0; i < 10; i++)
    if (state.players[i].alive) {
      if (i < 5) rust++;
      else brine++;
    }
  if (!brine) endRound(0, "RUST SECURES THE SALTWORKS");
  else if (!rust && !c.planted) endRound(1, "BRINE HOLDS THE LINE");
  else if (state.timer <= 0) endRound(c.planted ? 0 : 1, c.planted ? "RUST TAKES THE SITE" : "BRINE HOLDS THE LINE");
}
