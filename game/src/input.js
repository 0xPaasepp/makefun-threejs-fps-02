export function createInput(canvas, actions) {
  const input = { keys: {}, fire: false, click: false };
  window.addEventListener("keydown", (e) => {
    if (["Space", "Tab", "KeyB"].includes(e.code)) e.preventDefault();
    input.keys[e.code] = true;
    if (!e.repeat) {
      if (e.code === "KeyB") actions.buy();
      if (e.code === "Escape") actions.close();
      if (e.code === "KeyR") actions.reload();
      if (e.code === "KeyG") actions.grenade();
      if (e.code.startsWith("Digit")) actions.number(Number(e.code.slice(5)));
    }
  });
  window.addEventListener("keyup", (e) => (input.keys[e.code] = false));
  window.addEventListener("mousedown", (e) => {
    if (e.button === 0 && document.pointerLockElement === canvas) {
      input.fire = true;
      input.click = true;
    }
  });
  window.addEventListener("mouseup", () => (input.fire = false));
  window.addEventListener("mousemove", (e) => {
    if (document.pointerLockElement === canvas) actions.look(e.movementX, e.movementY);
  });
  window.addEventListener("blur", () => {
    input.fire = false;
    input.keys = {};
  });
  document.addEventListener("pointerlockchange", () => actions.lock(document.pointerLockElement === canvas));
  return input;
}
