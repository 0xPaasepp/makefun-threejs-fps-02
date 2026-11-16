import { state } from "./state.js";
import { guns, spread } from "./weapons.js";
import { palette } from "./palette.js";
const ids = [
  "score",
  "feed",
  "health",
  "hpbar",
  "armor",
  "weapon",
  "mag",
  "reserve",
  "reload",
  "reloadLabel",
  "objective",
  "spectate",
  "overlay",
  "title",
  "subtitle",
  "play",
  "controls",
  "eyebrow",
  "buy",
  "money",
  "cross",
  "hit",
  "damage",
];
const el = {},
  cache = {};
for (const id of ids) el[id] = document.getElementById(id);
function text(k, v) {
  if (cache[k] !== v) {
    el[k].textContent = v;
    cache[k] = v;
  }
}
function style(k, p, v) {
  const key = k + p;
  if (cache[key] !== v) {
    el[k].style[p] = v;
    cache[key] = v;
  }
}
const feedNodes = [],
  feedCache = [];
for (let i = 0; i < 3; i++) {
  const line = document.createElement("div");
  el.feed.appendChild(line);
  feedNodes.push(line);
}
export function createHUD(actions) {
  el.play.onclick = actions.play;
  document.querySelectorAll("[data-buy]").forEach((b) => (b.onclick = () => actions.buy(Number(b.dataset.buy))));
}
export function updateHUD(map) {
  const p = state.players[0],
    g = guns[p.gun],
    c = state.charge,
    t = Math.max(0, Math.ceil(c.planted ? c.fuse : state.timer)),
    clock = String(Math.floor(t / 60)).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0");
  text(
    "score",
    "RUST  " +
      state.score[0] +
      "    |    " +
      (state.phase === "buy" ? "BUY  " : state.phase === "match" ? "FINAL  " : "R" + state.round + "  ") +
      clock +
      "    |    " +
      state.score[1] +
      "  BRINE",
  );
  text("health", Math.ceil(p.hp));
  style("hpbar", "width", p.hp + "%");
  style("armor", "width", p.armor * 2 + "%");
  text("weapon", g.name + " · $" + p.money);
  text("mag", p.mag);
  text("reserve", " / " + p.reserve);
  text("reloadLabel", p.reload ? "RELOADING" : "");
  style("reload", "width", p.reload ? (1 - p.reload / g.reload) * 100 + "%" : "0%");
  const gap = (7 + spread(p) * 600).toFixed(1) + "px";
  if (cache.gap !== gap) {
    el.cross.style.setProperty("--gap", gap);
    cache.gap = gap;
  }
  style("hit", "opacity", state.hit > 0 ? "1" : "0");
  style(
    "hit",
    "transform",
    state.killHit > 0 ? "translate(-50%,-50%) rotate(45deg) scale(1.5)" : "translate(-50%,-50%) rotate(45deg)",
  );
  style("damage", "opacity", String(state.damageFlash * 0.5));
  style("buy", "display", state.buy ? "block" : "none");
  text("money", "$" + p.money);
  let objective =
    state.phase === "buy"
      ? "BUY PHASE · B TO REQUISITION"
      : c.planted
        ? "CHARGE LIVE · " + map.sites[c.site].name + " · " + Math.ceil(c.fuse) + "s"
        : c.carrier === 0
          ? "YOU CARRY THE CHARGE · HOLD E AT A SITE"
          : c.carrier < 0
            ? "CHARGE DROPPED · RECOVER IT"
            : "ESCORT THE CHARGE TO A SITE";
  if (p.channel > 0) objective = "PLANTING THE CHARGE · " + Math.floor((p.channel / 3.5) * 100) + "%";
  text("objective", objective);
  style("objective", "borderBottom", p.channel > 0 ? "3px solid var(--rust)" : "0px solid var(--rust)");
  style("objective", "paddingBottom", p.channel > 0 ? "10px" : "0px");
  let spectator = "";
  if (!p.alive) {
    let n = "the saltworks";
    for (let i = 1; i < 5; i++)
      if (state.players[i].alive) {
        n = state.players[i].name;
        break;
      }
    spectator = "You are out — watching " + n + " · bots finish at ×2";
  }
  text("spectate", spectator);
  for (let i = 0; i < 3; i++) {
    const f = state.feed[i],
      value = f && state.time - f.time < 4 ? f.text : "";
    if (feedCache[i] !== value) {
      feedNodes[i].textContent = value;
      feedNodes[i].style.color = f?.own ? palette.rust : palette.sand;
      feedCache[i] = value;
    }
  }
  const show = !state.started || state.paused || state.phase === "end" || state.phase === "match";
  style("overlay", "display", show ? "flex" : "none");
  if (show) {
    const start = !state.started,
      match = state.phase === "match",
      end = state.phase === "end";
    text(
      "title",
      start
        ? "SALTLINE"
        : match
          ? state.score[0] >= 5
            ? "SALT IS OURS"
            : "BRINE HOLDS"
          : end
            ? state.winner === 0
              ? "ROUND WON"
              : "ROUND LOST"
            : "PAUSED",
    );
    style("title", "fontSize", start ? "clamp(70px,10vw,140px)" : "64px");
    text(
      "subtitle",
      start
        ? "Dusk falls. The brine holds. Take the saltworks before the light goes."
        : match
          ? "Final score " + state.score[0] + " — " + state.score[1]
          : end
            ? state.message
            : "The saltworks can wait. Resume when ready.",
    );
    text("play", match ? "PLAY AGAIN →" : start ? "ENTER THE SALTWORKS →" : "RESUME →");
    style("play", "display", end ? "none" : "inline-block");
    style("controls", "display", start ? "block" : "none");
    text(
      "eyebrow",
      start
        ? "THE SALTWORKS · 5 V 5 · TACTICAL FPS"
        : end
          ? "NEXT ROUND IN " + Math.ceil(state.timer) + " · $" + p.money
          : "SALTLINE / THE SALTWORKS",
    );
  }
}
const ctx = document.getElementById("radar").getContext("2d");
let radarTick = -1;
export function minimap(map) {
  const tick = Math.floor(state.time * 8);
  if (tick === radarTick) return;
  radarTick = tick;
  ctx.fillStyle = palette.dusk;
  ctx.fillRect(0, 0, 360, 280);
  const sx = 7.6,
    sz = 7.6;
  ctx.strokeStyle = palette.iron;
  ctx.lineWidth = 2;
  for (const c of map.colliders)
    ctx.strokeRect(180 + c.minX * sx, 140 + c.minZ * sz, (c.maxX - c.minX) * sx, (c.maxZ - c.minZ) * sz);
  for (const s of map.sites) {
    ctx.strokeStyle = palette[s.color];
    ctx.strokeRect(180 + (s.x - 2.5) * sx, 140 + (s.z - 2) * sz, 5 * sx, 4 * sz);
    ctx.fillStyle = palette[s.color];
    ctx.font = "16px system-ui";
    ctx.fillText(s.letter, 180 + s.x * sx - 5, 140 + s.z * sz + 5);
  }
  for (const p of state.players) {
    if (!p.alive) continue;
    if (p.team && !state.shot) continue;
    ctx.fillStyle = palette[p.id === 0 ? "ink" : p.team ? "brine" : "rust"];
    ctx.beginPath();
    ctx.arc(180 + p.x * sx, 140 + p.z * sz, p.id === 0 ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
