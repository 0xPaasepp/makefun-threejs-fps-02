const { chromium } = require("playwright");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome",
    args: [
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const assertions = [];
  function check(name, result) {
    assertions.push({ name, result });
    if (!result) throw Error(name);
  }
  for (const [name, file] of [
    ["start", "1-cover.jpg"],
    ["mid", "2-causeway.jpg"],
    ["plant", "3-crusher.jpg"],
    ["end", "4-round-end.jpg"],
  ]) {
    await page.goto("http://127.0.0.1:8080/?shot=" + name + "&seed=1");
    await page.waitForFunction(() => window.__shotReady);
    await page.screenshot({
      path: "screenshots/" + file,
      type: "jpeg",
      quality: 80,
    });
    check("shot " + name, true);
  }
  const mechanics = await page.evaluate(async () => {
    const g = window.__saltline,
      s = g.state,
      W = await import("./src/weapons.js"),
      P = await import("./src/player.js"),
      R = await import("./src/rounds.js"),
      B = await import("./src/bots.js"),
      M = await import("./src/map.js");
    const results = {};
    results.graph = g.map.nodes.every(
      (n) => M.route(g.map, g.map.spawns[0][0], n).length > 0,
    );
    const p = s.players[0];
    g.startRound();
    p.money = 8000;
    results.buy =
      R.buy(p, 3) &&
      p.gun === "longline" &&
      p.money === 5300 &&
      R.buy(p, 5) &&
      p.armor === 50 &&
      R.buy(p, 4) &&
      !R.buy(p, 4);
    for (const key of ["duster", "squall", "longline"]) {
      if (!p.owned.includes(key)) p.owned.push(key);
      W.equip(p, key);
      p.mag = W.guns[key].mag;
      p.reserve = W.guns[key].reserve;
      p.cooldown = 0;
      p.reload = 0;
      let n = 0;
      while (p.mag) {
        if (W.fired(p)) n++;
        W.tickWeapon(p, 1);
      }
      W.reload(p);
      W.tickWeapon(p, 3);
      results["ammo_" + key] =
        n === W.guns[key].mag &&
        p.mag === W.guns[key].mag &&
        p.reserve === W.guns[key].reserve - W.guns[key].mag;
    }
    p.mag = 7;
    W.equip(p, "duster");
    W.equip(p, "longline");
    results.noRefill = p.mag === 7;
    const still = W.spread(p);
    p.vx = 5;
    results.spread = W.spread(p) > still;
    p.vx = 0;
    Object.assign(p, { x: 8, y: 0, z: 0, crouch: false });
    P.collide(p, 5, 0, g.map);
    results.wallCollision = p.x < 9.5;
    Object.assign(p, {
      x: 18,
      y: 0,
      z: 13,
      vx: 0,
      vy: 0,
      vz: 0,
      onGround: true,
    });
    const input = { keys: { KeyW: true } };
    for (let i = 0; i < 60; i++) P.movePlayer(p, input, g.map, 1 / 60, 5.2);
    results.move = p.z < 9;
    input.keys = { KeyC: true };
    P.movePlayer(p, input, g.map, 1 / 60, 5.2);
    results.crouch = p.crouch;
    input.keys = { Space: true };
    p.crouch = false;
    P.movePlayer(p, input, g.map, 1 / 60, 5.2);
    results.jump = p.y > 0;
    input.keys = {};
    for (let i = 0; i < 90; i++) P.movePlayer(p, input, g.map, 1 / 60, 5.2);
    results.land = p.onGround;
    s.phase = "live";
    s.timer = 100;
    for (let i = 1; i < 10; i++) s.players[i].alive = false;
    const e = s.players[5];
    Object.assign(e, {
      alive: true,
      hp: 100,
      armor: 0,
      x: 12,
      y: 0,
      z: 0,
      crouch: false,
    });
    Object.assign(p, {
      alive: true,
      x: 8,
      y: 0,
      z: 0,
      yaw: -Math.PI / 2,
      pitch: 0,
      hp: 100,
      mag: 25,
      cooldown: 0,
      reload: 0,
      bloom: 0,
      kick: 0,
    });
    g.render();
    g.shoot(p);
    results.wallShot = e.hp === 100;
    Object.assign(p, {
      x: 18,
      z: 12,
      yaw: 0,
      pitch: Math.atan2(-0.03, 4),
      mag: 25,
      cooldown: 0,
      reload: 0,
      bloom: 0,
      kick: 0,
    });
    Object.assign(e, { x: 18, z: 8, hp: 100 });
    g.render();
    g.shoot(p);
    results.headshot = !e.alive;
    Object.assign(e, { alive: true, hp: 100, armor: 50 });
    R.damage(e, 40, p);
    results.armor = e.hp === 80 && e.armor === 30;
    function reset() {
      g.startRound();
      s.phase = "live";
      s.timer = 100;
      for (const q of s.players) {
        q.alive = true;
        q.hp = 100;
        q.channel = 0;
        q.damagedAt = -100;
      }
      s.charge.carrier = 0;
      s.charge.planted = false;
    }
    for (let site = 0; site < 2; site++) {
      reset();
      const spot = g.map.sites[site];
      Object.assign(p, { x: spot.x, z: spot.z, y: spot.y, vx: 0, vz: 0 });
      input.keys = { KeyE: true };
      for (let i = 0; i < 120; i++) {
        s.time += 1 / 60;
        R.stepRounds(g.map, 1 / 60, input);
      }
      const before = p.channel;
      R.damage(p, 1, e);
      results["interrupt_" + site] = before > 1 && p.channel === 0;
      for (let i = 0; i < 225; i++) {
        s.time += 1 / 60;
        R.stepRounds(g.map, 1 / 60, input);
      }
      results["plant_" + site] = s.charge.planted && s.charge.site === site;
    }
    Object.assign(e, {
      alive: true,
      hp: 100,
      x: s.charge.x,
      z: s.charge.z,
      state: "DEFUSE",
      damagedAt: -100,
      channel: 0,
    });
    for (let i = 0; i < 305; i++) {
      s.time += 1 / 60;
      R.stepRounds(g.map, 1 / 60, input);
    }
    results.defuse = s.phase === "end" && s.winner === 1;
    reset();
    Object.assign(s.charge, {
      carrier: -1,
      planted: true,
      x: 17.4,
      z: -9,
      site: 0,
      fuse: 0.1,
    });
    for (const q of s.players) q.z = 14;
    R.stepRounds(g.map, 0.2, input);
    results.detonation = s.phase === "end" && s.winner === 0;
    reset();
    s.timer = 0.1;
    R.stepRounds(g.map, 0.2, input);
    results.timeout = s.phase === "end" && s.winner === 1;
    reset();
    for (let i = 5; i < 10; i++) s.players[i].alive = false;
    R.stepRounds(g.map, 0.01, input);
    results.elimination = s.phase === "end" && s.winner === 0;
    reset();
    Object.assign(s.charge, { carrier: -1, x: p.x, z: p.z, pickup: 0 });
    for (let i = 0; i < 61; i++) R.stepRounds(g.map, 1 / 60, input);
    results.pickup = s.charge.carrier === 0;
    reset();
    const bot = s.players[6];
    bot.target = -1;
    bot.recover = false;
    bot.state = "HOLD";
    bot.noiseAt = s.time - 1;
    s.emitNoise(bot.x + 2, bot.z, 28, "gunshot", 0);
    B.hearNoise(bot, g.map);
    results.hearing = bot.state === "INVESTIGATE";
    reset();p.money=0;s.losses=[0,0];R.endRound(1,"TEST");results.lossAward=p.money===1900;s.phase="live";R.endRound(1,"TEST");results.lossStreak=p.money===4300;s.phase="live";R.endRound(0,"TEST");results.winAward=p.money===7550&&s.losses[0]===0;
    reset();Object.assign(p,{x:18,z:12,y:0,yaw:0,pitch:0,grenade:1});W.throwGrenade(p);results.grenadeInventory=p.grenade===0&&s.grenades.length===1;
    const effect={burst(){}};for(let i=0;i<90;i++)W.stepGrenades(1/60,g.map,effect,R.damage,()=>{});const grenade=s.grenades[0];Object.assign(e,{alive:true,hp:100,armor:0,x:grenade.x,z:grenade.z});for(let i=0;i<10;i++)W.stepGrenades(1/60,g.map,effect,R.damage,()=>{});results.grenadeBlast=s.grenades.length===0&&e.hp<100;
    return results;
  });
  for (const [name, result] of Object.entries(mechanics)) check(name, result);
  await page.goto("http://127.0.0.1:8080/?shot=start");
  await page.waitForFunction(() => window.__shotReady);
  const match = await page.evaluate(() => {
    const g = __saltline,
      s = g.state;
    s.round = 0;
    s.score = [0, 0];
    s.phase = "buy";
    s.started = true;
    g.startRound();
    const rounds = [],
      violations = [];
    let last = "",
      stuckMax = 0;
    for (let i = 0; i < 80000; i++) {
      g.sync();
      g.step(1 / 60);
      for (let j = 1; j < 10; j++) {
        const p = s.players[j];
        stuckMax = Math.max(stuckMax, p.stuck);
        if (p.stuck > 5) violations.push(p.id);
      }
      if (s.phase === "end" && last !== "end")
        rounds.push({
          round: s.round,
          score: s.score.slice(),
          reason: s.message,
        });
      last = s.phase;
      if (s.phase === "match")
        return { rounds, score: s.score, stuckMax, violations, time: s.time };
    }
    return { rounds, failed: true };
  });
  check("3+ full simulated rounds", match.rounds.length >= 3);
  check("match ends first to five", match.score.includes(5));
  check("no path stuck over five seconds", match.violations.length === 0);
  const replay = await page.evaluate(() => {
    const g = __saltline;
    g.play();
    return (
      g.state.phase === "buy" &&
      g.state.round === 1 &&
      g.state.score[0] === 0 &&
      g.state.score[1] === 0
    );
  });
  check("play again", replay);
  console.log("BROWSER ERRORS", errors);
  check("zero browser errors", errors.length === 0);
  const report = { assertions, match, errors };
  fs.writeFileSync(
    "verification/playtest.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
