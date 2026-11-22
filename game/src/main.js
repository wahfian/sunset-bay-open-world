// Sunset Bay boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, play, paused, game over. Progress (cash, missions, best)
// saves to localStorage, so a run survives a reload.
//
// ?seed=N fixes the city. ?shot=start|chase|mission|heist (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, SAVE_KEY, BEST_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_SHOOT, ACTION_PUNCH, ACTION_MUTE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();
const missions = world.missions;

function readSave() {
  try {
    return JSON.parse(window.localStorage.getItem(SAVE_KEY) || 'null');
  } catch {
    return null;
  }
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveGame() {
  try {
    const s = world.state();
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: s.money,
      missions: missions.save(),
      best: Math.max(readBest(), s.money),
    }));
    window.localStorage.setItem(BEST_KEY, String(Math.max(readBest(), s.money)));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

function loadGame() {
  const saved = readSave();
  if (!saved) return;
  world.state().money = saved.money || 0;
  missions.load(saved.missions);
}

function runShot(name) {
  const screen = world.stageScene(name);
  const state = world.state();
  state.marker = missions.marker();
  let painted = 0;
  function paint() {
    renderer.draw(state, screen, readBest(), missions, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let muted = false;
  // One-shot combat flags queued by handleActions, consumed by the next step.
  const pending = { enter: false, shoot: false, punch: false };
  loadGame();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    loadGame();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce(`Playing Sunset Bay. ${missions.current() ? missions.current().title : 'Free roam'}.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    saveGame();
    announce(`Busted. Cash $${world.state().money}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      muted = audio.toggleMute();
    }
    if (actions & ACTION_ENTER) pending.enter = true;
    if (actions & ACTION_SHOOT) pending.shoot = true;
    if (actions & ACTION_PUNCH) pending.punch = true;
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      audio.unlock();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveGame();
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    const axes = input.axes();
    const actions = { enter: pending.enter, shoot: pending.shoot, punch: pending.punch };
    pending.enter = false;
    pending.shoot = false;
    pending.punch = false;
    if (actions.shoot) audio.shoot();
    if (actions.punch) audio.punch();
    const events = world.step(STEP, axes, input.running(), actions, screen === SCREEN_TITLE);
    for (const ev of events) {
      if (ev.kind === 'mission') {
        audio.missionComplete();
        saveGame();
      } else if (ev.kind === 'pickup') {
        audio.pickup();
      } else if (ev.kind === 'over') {
        endGame();
      }
    }
    // Shooting / punching are frame-rate actions: apply them in the frame
    // handler below via world helpers through the step's action flags.
    return events;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const state = world.state();
    state.marker = missions.marker();
    if (screen === SCREEN_PLAY) {
      const p = state.player;
      if (!p.onFoot && p.car) audio.engine(Math.abs(p.car.speed) / 520);
      else audio.stopEngine();
      audio.siren(STEP, state.wanted);
    } else {
      audio.stopEngine();
    }
    renderer.draw(state, screen, best, missions, muted);
    if (state.over && screen === SCREEN_PLAY) endGame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveGame();
      announce('Paused.');
    }
  });

  announce('Sunset Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
