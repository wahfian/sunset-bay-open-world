// The mission system for Sunset Bay: five story jobs from fixer Dana Cole.
// Each mission is a list of steps; a step completes when the player reaches
// its marker, steals / collects what it names, or loses the wanted level.
// The tracker owns the current mission, the objective text, the marker
// position and the timer, and reports events the world turns into rewards.
import { MISSIONS } from './config.js';

export function createMissions() {
  let index = 0;
  let stepIndex = 0;
  let stepTimer = 0;
  let collected = 0;
  let wantedAtStart = 0;
  let done = false;

  function current() {
    return MISSIONS[index] || null;
  }
  function step() {
    const m = current();
    return m ? m.steps[stepIndex] : null;
  }

  return {
    index() {
      return index;
    },
    current,
    step,
    completedCount() {
      return index;
    },
    isDone() {
      return done;
    },
    /** Text shown on the HUD for the current objective. */
    objective() {
      if (done) return 'All jobs done — free roam Sunset Bay. Press R for a new run.';
      const m = current();
      const s = step();
      if (!m || !s) return '';
      if (s.type === 'collect') return `${s.text.replace(/\(0\/\d+\)/, `(${collected}/${s.count})`)}`;
      return s.text;
    },
    /** World position of the objective marker, or null. */
    marker() {
      const s = step();
      if (!s) return null;
      if (s.type === 'wanted') return null;
      return { x: s.x, y: s.y };
    },
    /** Start the next mission after a reward was paid. */
    next() {
      index += 1;
      stepIndex = 0;
      stepTimer = 0;
      collected = 0;
      if (index >= MISSIONS.length) done = true;
    },
    /** Called when the player reaches a marker; returns 'step' | 'mission' | null. */
    arrive(state) {
      const s = step();
      if (!s) return null;
      if (s.type === 'goto' || s.type === 'deliver' || s.type === 'steal' || s.type === 'escape') {
        return this.advance(state);
      }
      return null;
    },
    advance(state) {
      const m = current();
      if (!m) return null;
      stepIndex += 1;
      stepTimer = 0;
      collected = 0;
      if (stepIndex >= m.steps.length) {
        const reward = m.reward;
        this.next();
        return { kind: 'mission', reward, title: m.title };
      }
      return { kind: 'step', title: m.title };
    },
    /** A collectible was picked up; returns 'step' | 'mission' | null. */
    collect(state) {
      const s = step();
      if (!s || s.type !== 'collect') return null;
      collected += 1;
      if (collected >= (s.count || 1)) return this.advance(state);
      return { kind: 'step', title: current().title };
    },
    /** A car was stolen; completes a 'steal' step if it is the current one. */
    stolen(state) {
      const s = step();
      if (s && s.type === 'steal') return this.advance(state);
      return null;
    },
    /** Begin a wanted step: remember the wanted level to beat. */
    beginWanted(state) {
      wantedAtStart = state.wanted;
    },
    wantedAtStart() {
      return wantedAtStart;
    },
    /** Timer for timed steps (delivery). Returns seconds left, or null. */
    tick(dt, state) {
      const s = step();
      if (!s) return null;
      if (s.time) {
        if (stepTimer === 0) stepTimer = s.time;
        stepTimer -= dt;
        if (stepTimer <= 0) {
          stepTimer = s.time;
          return { kind: 'timeout', title: current().title };
        }
        return { kind: 'timer', left: Math.ceil(stepTimer) };
      }
      return null;
    },
    timeLeft() {
      const s = step();
      if (!s || !s.time) return null;
      return Math.ceil(stepTimer || s.time);
    },
    /** Reset to the first mission (new run). */
    reset() {
      index = 0;
      stepIndex = 0;
      stepTimer = 0;
      collected = 0;
      done = false;
    },
    /** Save / load the mission progress. */
    save() {
      return { index, stepIndex, done };
    },
    load(saved) {
      if (!saved) return;
      index = saved.index || 0;
      stepIndex = saved.stepIndex || 0;
      done = !!saved.done;
      collected = 0;
      stepTimer = 0;
    },
  };
}
