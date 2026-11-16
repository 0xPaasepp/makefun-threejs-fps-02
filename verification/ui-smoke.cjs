const { chromium } = require("playwright");
const fs = require("node:fs");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: "/home/hatch/.cache/ms-playwright/chromium-1187/chrome-linux/chrome",
    args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await p.goto("http://127.0.0.1:8080/");
  await p.waitForFunction(() => window.__saltline);
  await p.click("#play");
  await p.waitForTimeout(500);
  const locked = await p.evaluate(() => !!document.pointerLockElement);
  await p.keyboard.press("b");
  await p.evaluate(() => (__saltline.state.players[0].money = 5000));
  await p.keyboard.press("3");
  await p.keyboard.press("b");
  await p.evaluate(() => {
    __saltline.state.timer = 0.01;
  });
  await p.waitForFunction(()=>__saltline.state.phase==="live");
  const start = await p.evaluate(() => ({ z: __saltline.state.players[0].z, mag: __saltline.state.players[0].mag }));
  await p.keyboard.down("w");
  await p.waitForFunction(z=>__saltline.state.players[0].z<z-1,start.z);
  await p.keyboard.up("w");
  await p.keyboard.down("c");
  await p.waitForFunction(() => __saltline.state.players[0].crouch);
  const crouch = await p.evaluate(() => __saltline.state.players[0].crouch);
  await p.keyboard.up("c");
  await p.mouse.down();
  await p.waitForFunction(mag=>__saltline.state.players[0].mag<mag,start.mag);
  await p.mouse.up();
  const after = await p.evaluate(() => ({
    z: __saltline.state.players[0].z,
    mag: __saltline.state.players[0].mag,
    gun: __saltline.state.players[0].gun,
  }));
  await p.keyboard.press("r");
  await p.waitForFunction(()=>document.getElementById("reloadLabel").textContent==="RELOADING");
  const reload = await p.locator("#reloadLabel").textContent();
  await p.waitForFunction(() => !__saltline.state.players[0].reload, { timeout: 20000 });
  const mag = await p.evaluate(() => __saltline.state.players[0].mag);
  await p.evaluate(() => document.exitPointerLock());
  await p.waitForTimeout(100);
  const paused = await p.evaluate(() => __saltline.state.paused);
  const report = {
    locked,
    bought: after.gun === "longline",
    moved: after.z < start.z,
    crouch,
    fired: after.mag < start.mag,
    reload: reload === "RELOADING",
    refilled: mag === 25,
    paused,
    errors,
  };
  fs.writeFileSync("verification/ui-smoke.json", JSON.stringify(report, null, 2) + "\n");
  console.log(report);
  if (Object.entries(report).some(([k, v]) => k !== "errors" && !v) || errors.length) process.exitCode = 1;
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
