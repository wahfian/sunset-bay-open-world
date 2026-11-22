// Keyboard and pointer input for Sunset Bay. Held keys give movement and
// steering; one-shot presses (enter car, shoot, pause, confirm, mute) are
// queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;
export const ACTION_MUTE = 16;
export const ACTION_RUN = 32;
export const ACTION_PUNCH = 64;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const SHOOT = new Set(['KeyF']);
const PUNCH = new Set(['Space']);
const MUTE = new Set(['KeyM']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (ENTER.has(event.code)) actions |= ACTION_ENTER;
    else if (SHOOT.has(event.code)) actions |= ACTION_SHOOT;
    else if (PUNCH.has(event.code)) actions |= ACTION_PUNCH;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || SHOOT.has(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseDown = true;
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    actions |= ACTION_SHOOT;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });

  function axis(neg, pos) {
    let hasNeg = false;
    let hasPos = false;
    for (const code of neg) if (keys.has(code)) hasNeg = true;
    for (const code of pos) if (keys.has(code)) hasPos = true;
    return (hasPos ? 1 : 0) - (hasNeg ? 1 : 0);
  }

  return {
    /** Steering / movement axes: x is -1..1, y is -1..1. */
    axes() {
      return { x: axis(LEFT, RIGHT), y: axis(UP, DOWN) };
    },
    running() {
      for (const code of RUN) if (keys.has(code)) return true;
      return false;
    },
    mouse() {
      return { x: mouseX, y: mouseY, down: mouseDown };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
