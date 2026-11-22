// Sunset Bay's world: the city, its traffic, its people, its police, and the
// player — on foot or behind the wheel. Fixed-step simulation, 60 updates a
// second. The city is a grid of roads with blocks of buildings, a park, a
// beach and a marina; everything is generated from the seeded random, so the
// same seed always builds the same bay.
import { WORLD, ROADS_X, ROADS_Y, ROAD_WIDTH, PLAYER, CAR, WANTED, PALETTE, MISSIONS } from './config.js';
import { createRandom, pick, range } from './random.js';
import { createMissions } from './missions.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;

const COLLECT_SPOTS = [
  { x: 600, y: 600 },
  { x: 2600, y: 1000 },
  { x: 1000, y: 2200 },
];

function resolveCircleRect(p, r, rect) {
  const nx = Math.max(rect.x, Math.min(p.x, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(p.y, rect.y + rect.h));
  const dx = p.x - nx;
  const dy = p.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r || d2 === 0) return;
  const d = Math.sqrt(d2);
  p.x = nx + (dx / d) * r;
  p.y = ny + (dy / d) * r;
}

export function createWorld(random) {
  const missions = createMissions();
  let state = null;

  function buildCity() {
    const buildings = [];
    const trees = [];
    for (let ix = 0; ix < ROADS_X.length - 1; ix += 1) {
      for (let iy = 0; iy < ROADS_Y.length - 1; iy += 1) {
        const x0 = ROADS_X[ix] + ROAD_WIDTH / 2 + 14;
        const y0 = ROADS_Y[iy] + ROAD_WIDTH / 2 + 14;
        const x1 = ROADS_X[ix + 1] - ROAD_WIDTH / 2 - 14;
        const y1 = ROADS_Y[iy + 1] - ROAD_WIDTH / 2 - 14;
        if (ix === 3 && iy === 2) {
          for (let t = 0; t < 14; t += 1) trees.push({ x: range(random, x0, x1), y: range(random, y0, y1), r: 12 + random() * 8 });
          continue;
        }
        const bw = (x1 - x0) / 2 - 16;
        const bh = (y1 - y0) / 2 - 16;
        buildings.push({ x: x0 + 8, y: y0 + 8, w: bw, h: bh, color: pick(random, PALETTE.building), h: 30 + random() * 50 });
        buildings.push({ x: x0 + bw + 24, y: y0 + 8, w: bw, h: bh, color: pick(random, PALETTE.building), h: 30 + random() * 50 });
        buildings.push({ x: x0 + 8, y: y0 + bh + 24, w: bw, h: bh, color: pick(random, PALETTE.building), h: 30 + random() * 50 });
        buildings.push({ x: x0 + bw + 24, y: y0 + bh + 24, w: bw, h: bh, color: pick(random, PALETTE.building), h: 30 + random() * 50 });
        for (let t = 0; t < 3; t += 1) trees.push({ x: range(random, x0, x1), y: range(random, y0, y1), r: 10 + random() * 6 });
      }
    }
    return { buildings, trees };
  }

  function makeCar(x, y, angle, kind, color) {
    return {
      x, y, angle, speed: 0, kind, color: color || pick(random, PALETTE.traffic),
      health: 100, driver: kind === 'traffic', police: kind === 'police',
      axis: Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) ? 'h' : 'v',
      dir: Math.cos(angle) >= 0 ? 1 : -1, turnCooldown: 0, smoke: 0,
    };
  }

  function spawnTraffic(count) {
    const cars = [];
    for (let i = 0; i < count; i += 1) {
      const vertical = random() < 0.5;
      const road = vertical ? pick(random, ROADS_X) : pick(random, ROADS_Y);
      const along = range(random, 100, vertical ? WORLD.height - 100 : WORLD.width - 100);
      const angle = vertical ? (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (random() < 0.5 ? 0 : Math.PI);
      const car = makeCar(vertical ? road + (random() < 0.5 ? -22 : 22) : along, vertical ? along : road + (random() < 0.5 ? -22 : 22), angle, 'traffic');
      car.speed = CAR.trafficSpeed * (0.8 + random() * 0.4);
      cars.push(car);
    }
    return cars;
  }

  function spawnPeds(count) {
    const peds = [];
    for (let i = 0; i < count; i += 1) {
      peds.push({
        x: range(random, 150, WORLD.width - 150),
        y: range(random, 150, WORLD.height - 150),
        angle: random() * Math.PI * 2,
        speed: 40 + random() * 40,
        color: pick(random, PALETTE.ped),
        flee: 0, health: 50, cop: false, punchCooldown: 0,
      });
    }
    return peds;
  }

  function reset() {
    const city = buildCity();
    state = {
      time: 0,
      player: {
        x: 1000, y: 800, angle: -Math.PI / 2, speed: 0, health: PLAYER.health,
        onFoot: true, car: null, shootCooldown: 0, punchCooldown: 0, invulnerable: 0,
      },
      cars: spawnTraffic(16),
      peds: spawnPeds(26),
      police: [],
      bullets: [],
      particles: [],
      pickups: [],
      buildings: city.buildings,
      trees: city.trees,
      wanted: 0,
      wantedTimer: 0,
      crimeTimer: 0,
      money: 0,
      message: '',
      messageTimer: 0,
      camera: { x: 1000, y: 800 },
      busted: false,
      over: false,
    };
    const coupe = makeCar(2600, 2100, 0, 'parked', '#ffd23f');
    state.cars.push(coupe);
    for (let i = 0; i < 5; i += 1) {
      state.cars.push(makeCar(range(random, 300, WORLD.width - 300), range(random, 300, WORLD.height - 300), random() * Math.PI * 2, 'parked'));
    }
    missions.reset();
  }

  function say(text, seconds) {
    state.message = text;
    state.messageTimer = seconds || 3;
  }

  function raiseWanted(n) {
    const before = state.wanted;
    state.wanted = Math.min(WANTED.max, state.wanted + n);
    state.crimeTimer = 0;
    return state.wanted > before;
  }

  function nearestCar(x, y, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of state.cars) {
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  function enterCar() {
    const p = state.player;
    if (!p.onFoot) {
      const car = p.car;
      p.car = null;
      p.onFoot = true;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 46;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 46;
      p.angle = car.angle;
      p.speed = 0;
      say('On foot. Press E near a car to steal it.');
      return 'exit';
    }
    const car = nearestCar(p.x, p.y, 70);
    if (!car) return null;
    p.car = car;
    p.onFoot = false;
    car.driver = false;
    if (raiseWanted(1)) say('Car stolen! Wanted level up.');
    const ev = missions.stolen(state);
    if (ev) return ev.kind === 'mission' ? { kind: 'mission', reward: ev.reward, title: ev.title } : 'steal-step';
    return 'enter';
  }

  function shoot() {
    const p = state.player;
    if (p.shootCooldown > 0 || !p.onFoot) return;
    p.shootCooldown = PLAYER.shootCooldown;
    const a = p.angle;
    state.bullets.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, angle: a, speed: PLAYER.bulletSpeed, life: 0.9, fromPlayer: true });
  }

  function punch() {
    const p = state.player;
    if (p.punchCooldown > 0) return;
    p.punchCooldown = 0.45;
    for (const ped of state.peds) {
      const d = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (d < PLAYER.punchRange + 14) {
        ped.health -= PLAYER.punchDamage;
        ped.flee = 2;
        if (ped.cop) raiseWanted(1);
        if (ped.health <= 0) {
          state.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: 0, life: 0.5, color: '#fff', r: 6 });
        }
        return;
      }
    }
  }

  function updatePlayer(dt, axes, running, actions) {
    const p = state.player;
    if (p.shootCooldown > 0) p.shootCooldown -= dt;
    if (p.punchCooldown > 0) p.punchCooldown -= dt;
    if (p.invulnerable > 0) p.invulnerable -= dt;
    if (p.onFoot) {
      const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const mx = axes.x;
      const my = axes.y;
      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        p.angle = Math.atan2(my / len, mx / len);
        p.x += (mx / len) * speed * dt;
        p.y += (my / len) * speed * dt;
      }
      p.x = Math.max(20, Math.min(WORLD.width - 20, p.x));
      p.y = Math.max(20, Math.min(WORLD.height - 20, p.y));
      for (const b of state.buildings) resolveCircleRect(p, PLAYER.radius, b);
      if (actions.shoot) shoot();
      if (actions.punch) punch();
    } else if (p.car) {
      const car = p.car;
      const throttle = -axes.y;
      const steer = axes.x;
      if (throttle > 0) car.speed = Math.min(CAR.maxSpeed, car.speed + CAR.accel * dt);
      else if (throttle < 0) car.speed = Math.max(-CAR.reverseSpeed, car.speed - CAR.brake * dt);
      else car.speed *= Math.max(0, 1 - 0.8 * dt);
      if (Math.abs(car.speed) > 20) car.angle += steer * CAR.turnRate * dt * (car.speed / CAR.maxSpeed) * (car.speed < 0 ? -1 : 1);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      car.x = Math.max(30, Math.min(WORLD.width - 30, car.x));
      car.y = Math.max(30, Math.min(WORLD.height - 30, car.y));
      for (const b of state.buildings) resolveCircleRect(car, 26, b);
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      p.speed = car.speed;
      if (Math.abs(car.speed) > 300 && Math.random() < 0.02) {
        state.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.4, color: '#888', r: 5 });
      }
    }
  }

  function updateTraffic(dt) {
    for (const car of state.cars) {
      if (car === state.player.car) continue;
      if (car.kind === 'parked' || car.kind === 'police') continue;
      car.turnCooldown -= dt;
      const onRoadX = ROADS_X.some((rx) => Math.abs(car.x - rx) < ROAD_WIDTH / 2);
      const onRoadY = ROADS_Y.some((ry) => Math.abs(car.y - ry) < ROAD_WIDTH / 2);
      if (car.turnCooldown <= 0 && onRoadX && onRoadY && random() < 0.02) {
        car.axis = car.axis === 'h' ? 'v' : 'h';
        car.angle = car.axis === 'h' ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
        car.turnCooldown = 2;
      }
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      if (car.x < 60 || car.x > WORLD.width - 60 || car.y < 60 || car.y > WORLD.height - 60) {
        car.angle += Math.PI;
        car.x = Math.max(60, Math.min(WORLD.width - 60, car.x));
        car.y = Math.max(60, Math.min(WORLD.height - 60, car.y));
      }
      // Rear-end a car ahead: slow down.
      for (const other of state.cars) {
        if (other === car) continue;
        const d = Math.hypot(other.x - car.x, other.y - car.y);
        if (d < 70 && d > 0) {
          const ahead = (other.x - car.x) * Math.cos(car.angle) + (other.y - car.y) * Math.sin(car.angle);
          if (ahead > 0) car.speed = Math.min(car.speed, CAR.trafficSpeed * 0.4);
        }
      }
      // Run over a pedestrian: a crime, and the ped flees.
      for (const ped of state.peds) {
        if (ped.health <= 0) continue;
        if (Math.hypot(ped.x - car.x, ped.y - car.y) < 34 && Math.abs(car.speed) > 60) {
          ped.health = 0;
          ped.flee = 0;
          if (car === state.player.car && raiseWanted(1)) say('You hit a pedestrian! Wanted level up.');
        }
      }
    }
  }

  function updatePeds(dt) {
    for (const ped of state.peds) {
      if (ped.health <= 0) continue;
      const p = state.player;
      const dPlayer = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (ped.cop) {
        // Police on foot chase the player.
        const a = Math.atan2(p.y - ped.y, p.x - ped.x);
        ped.angle = a;
        ped.x += Math.cos(a) * 150 * dt;
        ped.y += Math.sin(a) * 150 * dt;
        if (dPlayer < 30 && p.invulnerable <= 0) {
          p.health -= 12;
          p.invulnerable = 0.8;
          if (p.health <= 0) {
            p.health = 0;
            state.over = true;
          }
        }
        continue;
      }
      if (dPlayer < 160 && state.wanted > 0) ped.flee = 1.5;
      if (ped.flee > 0) {
        ped.flee -= dt;
        const a = Math.atan2(ped.y - p.y, ped.x - p.x);
        ped.x += Math.cos(a) * 160 * dt;
        ped.y += Math.sin(a) * 160 * dt;
      } else {
        if (random() < 0.005) ped.angle = random() * Math.PI * 2;
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
      }
      ped.x = Math.max(20, Math.min(WORLD.width - 20, ped.x));
      ped.y = Math.max(20, Math.min(WORLD.height - 20, ped.y));
      for (const b of state.buildings) resolveCircleRect(ped, 10, b);
    }
  }

  function updatePolice(dt) {
    const want = Math.min(WANTED.policePerStar * state.wanted, WANTED.maxPolice);
    // Spawn police cars near the player until the wanted level is matched.
    let policeCars = state.police.filter((c) => c.kind === 'police');
    if (policeCars.length < want && state.wanted > 0) {
      const a = random() * Math.PI * 2;
      const car = makeCar(
        Math.max(80, Math.min(WORLD.width - 80, state.player.x + Math.cos(a) * 500)),
        Math.max(80, Math.min(WORLD.height - 80, state.player.y + Math.sin(a) * 500)),
        a, 'police', PALETTE.police,
      );
      state.police.push(car);
      state.cars.push(car);
      policeCars = state.police.filter((c) => c.kind === 'police');
    }
    for (const car of [...state.police]) {
      const p = state.player;
      const d = Math.hypot(p.x - car.x, p.y - car.y);
      if (state.wanted === 0 && d > 600) {
        state.police = state.police.filter((c) => c !== car);
        state.cars = state.cars.filter((c) => c !== car);
        continue;
      }
      const target = Math.atan2(p.y - car.y, p.x - car.x);
      let diff = target - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-3 * dt, Math.min(3 * dt, diff));
      car.speed = Math.min(CAR.policeSpeed, car.speed + CAR.accel * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      // A police car ramming the player hurts them (and their car).
      if (d < 46) {
        if (p.onFoot && p.invulnerable <= 0) {
          p.health -= 10;
          p.invulnerable = 0.8;
          if (p.health <= 0) {
            p.health = 0;
            state.over = true;
          }
        } else if (!p.onFoot && p.car) {
          p.car.speed *= 0.6;
          p.car.health -= 8;
          if (p.car.health <= 0) {
            state.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.6, color: '#f80', r: 12 });
            p.car.health = 100;
            p.car.speed = 0;
          }
        }
        car.speed *= 0.5;
      }
    }
    // On-foot cops when the player is on foot and wanted.
    const cops = state.peds.filter((ped) => ped.cop && ped.health > 0).length;
    if (!state.player.onFoot) {
      // no foot cops while driving
    } else if (state.wanted >= 2 && cops < state.wanted && random() < 0.01) {
      const a = random() * Math.PI * 2;
      state.peds.push({
        x: state.player.x + Math.cos(a) * 300, y: state.player.y + Math.sin(a) * 300,
        angle: a, speed: 150, color: PALETTE.police, flee: 0, health: 50, cop: true, punchCooldown: 0,
      });
    }
  }

  function updateBullets(dt) {
    for (const b of [...state.bullets]) {
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > WORLD.width || b.y < 0 || b.y > WORLD.height) {
        state.bullets = state.bullets.filter((x) => x !== b);
        continue;
      }
      for (const ped of state.peds) {
        if (ped.health <= 0) continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
          ped.health -= 34;
          state.bullets = state.bullets.filter((x) => x !== b);
          if (ped.cop || !ped.cop) raiseWanted(1);
          break;
        }
      }
      for (const car of state.cars) {
        if (car === state.player.car) continue;
        if (Math.hypot(car.x - b.x, car.y - b.y) < 30) {
          car.health -= 20;
          state.bullets = state.bullets.filter((x) => x !== b);
          break;
        }
      }
    }
  }

  function ensureCollectPickups() {
    const s = missions.step();
    if (!s || s.type !== 'collect') return;
    if (state.pickups.length > 0) return;
    const spots = s.count > 1 ? COLLECT_SPOTS : [{ x: s.x, y: s.y }];
    for (const spot of spots) state.pickups.push({ x: spot.x, y: spot.y, kind: 'cash', taken: false });
  }

  function checkMission(dt) {
    ensureCollectPickups();
    const s = missions.step();
    if (!s) return [];
    const events = [];
    const p = state.player;
    if (s.type === 'goto' || s.type === 'deliver' || s.type === 'escape') {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < 80) {
        const ev = missions.arrive(state);
        if (ev) events.push(ev);
      }
    } else if (s.type === 'wanted') {
      if (state.wanted >= (s.stars || 2) && missions.wantedAtStart() === 0) missions.beginWanted(state);
      if (missions.wantedAtStart() > 0 && state.wanted === 0) {
        const ev = missions.advance(state);
        if (ev) events.push(ev);
      }
    }
    for (const pickup of [...state.pickups]) {
      if (pickup.taken) continue;
      if (Math.hypot(p.x - pickup.x, p.y - pickup.y) < 50) {
        pickup.taken = true;
        state.pickups = state.pickups.filter((x) => x !== pickup);
        const ev = missions.collect(state);
        if (ev) events.push(ev);
        else events.push({ kind: 'pickup' });
      }
    }
    const timed = missions.tick(dt, state);
    if (timed && timed.kind === 'timeout') events.push({ kind: 'timeout', title: timed.title });
    return events;
  }

  /** One fixed step. Returns an array of event objects for the caller. */
  function step(dt, axes, running, actions, harmless) {
    if (!state) reset();
    state.time += dt;
    const events = [];
    if (harmless) {
      updateTraffic(dt);
      updatePeds(dt);
      return events;
    }
    if (actions.enter) {
      const ev = enterCar();
      if (ev && typeof ev === 'object') events.push(ev);
      else if (ev) events.push({ kind: ev });
    }
    if (actions.punch) punch();
    updatePlayer(dt, axes, running, actions);
    updateTraffic(dt);
    updatePeds(dt);
    updatePolice(dt);
    updateBullets(dt);
    // Wanted decay: lay low and the heat fades.
    state.crimeTimer += dt;
    if (state.wanted > 0 && state.crimeTimer > WANTED.decaySeconds) {
      state.wanted -= 1;
      state.crimeTimer = 0;
      say(state.wanted === 0 ? 'You lost the cops.' : `Wanted level down to ${state.wanted} star${state.wanted > 1 ? 's' : ''}.`);
    }
    if (state.player.health < PLAYER.health && state.wanted === 0) {
      state.player.health = Math.min(PLAYER.health, state.player.health + 2 * dt);
    }
    for (const part of [...state.particles]) {
      part.life -= dt;
      if (part.life <= 0) state.particles = state.particles.filter((x) => x !== part);
    }
    if (state.messageTimer > 0) state.messageTimer -= dt;
    events.push(...checkMission(dt));
    for (const ev of events) {
      if (ev.kind === 'mission') {
        state.money += ev.reward;
        say(`${ev.title} complete! +$${ev.reward}`);
      } else if (ev.kind === 'step') {
        say('Objective updated.');
      } else if (ev.kind === 'timeout') {
        say('Too slow — the job failed. Try again from the pause menu.');
      } else if (ev.kind === 'pickup') {
        state.money += 25;
      }
    }
    // Camera follows the player.
    const p = state.player;
    state.camera.x += (p.x - state.camera.x) * Math.min(1, dt * 5);
    state.camera.y += (p.y - state.camera.y) * Math.min(1, dt * 5);
    if (state.over) events.push({ kind: 'over' });
    return events;
  }

  reset();
  return {
    state: () => state,
    missions,
    reset,
    step,
    say,
    raiseWanted,
    makeCar,
    spawnPickup(x, y, kind) {
      state.pickups.push({ x, y, kind: kind || 'cash', taken: false });
    },
    /** Stage a scene for screenshots: put the player in a car, cops chasing. */
    stageScene(name) {
      reset();
      if (name === 'chase' || name === 'play') {
        const p = state.player;
        const car = nearestCar(1000, 800, 500) || state.cars[0];
        p.car = car;
        p.onFoot = false;
        car.driver = false;
        p.x = car.x;
        p.y = car.y;
        car.speed = 380;
        car.angle = 0;
        state.wanted = 3;
        state.crimeTimer = 0;
        state.camera.x = p.x;
        state.camera.y = p.y;
        updatePolice(0.5);
        updatePolice(0.5);
        say('WANTED — 3 stars. Lose the cops!');
        return 'play';
      }
      if (name === 'mission') {
        missions.load({ index: 1, stepIndex: 0, done: false });
        const p = state.player;
        p.x = 1400;
        p.y = 1000;
        state.money = 400;
        state.camera.x = p.x;
        state.camera.y = p.y;
        ensureCollectPickups();
        say('Delivery Run: take the package to the pier.');
        return 'play';
      }
      if (name === 'heist') {
        missions.load({ index: 4, stepIndex: 2, done: false });
        const p = state.player;
        const car = state.cars.find((c) => c.kind === 'parked');
        if (car) {
          p.car = car;
          p.onFoot = false;
          car.driver = false;
          p.x = car.x;
          p.y = car.y;
        }
        state.wanted = 3;
        state.money = 1250;
        state.camera.x = p.x;
        state.camera.y = p.y;
        say('Sunset Heist: escape to the safehouse!');
        return 'play';
      }
      return 'title';
    },
  };
}
