// Drawing only: the world's state and the current screen in, pixels out.
// A camera follows the player over the 3200x2400 city; the 1280x720 logical
// view is scaled to fit the window. Flat shapes and canvas text: HUD with
// health, money, wanted stars and a live minimap, plus title / pause /
// game-over panels. Nothing here loads a file or touches the network.
import { VIEW, WORLD, ROADS_X, ROADS_Y, ROAD_WIDTH, FONT, PALETTE, DISTRICTS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  let flash = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function drawCity(state, camX, camY) {
    // Ground: grass, then the beach and water along the south edge.
    context.fillStyle = PALETTE.grass;
    context.fillRect(camX - 40, camY - 40, VIEW.width + 80, VIEW.height + 80);
    context.fillStyle = PALETTE.sand;
    context.fillRect(0, 2280, WORLD.width, 120);
    context.fillStyle = PALETTE.water;
    context.fillRect(0, 2360, WORLD.width, 40);
    // Park block.
    context.fillStyle = PALETTE.park;
    context.fillRect(1448, 1048, 304, 304);
    // Roads.
    context.fillStyle = PALETTE.road;
    for (const rx of ROADS_X) context.fillRect(rx - ROAD_WIDTH / 2, 0, ROAD_WIDTH, WORLD.height);
    for (const ry of ROADS_Y) context.fillRect(0, ry - ROAD_WIDTH / 2, WORLD.width, ROAD_WIDTH);
    // Lane dashes.
    context.fillStyle = PALETTE.lane;
    for (const rx of ROADS_X) {
      for (let y = 0; y < WORLD.height; y += 80) context.fillRect(rx - 2, y, 4, 36);
    }
    for (const ry of ROADS_Y) {
      for (let x = 0; x < WORLD.width; x += 80) context.fillRect(x, ry - 2, 36, 4);
    }
    // Sidewalks.
    context.fillStyle = PALETTE.sidewalk;
    for (const rx of ROADS_X) {
      context.fillRect(rx - ROAD_WIDTH / 2 - 10, 0, 10, WORLD.height);
      context.fillRect(rx + ROAD_WIDTH / 2, 0, 10, WORLD.height);
    }
    // Buildings with roofs and windows.
    for (const b of state.buildings) {
      context.fillStyle = b.color;
      context.fillRect(b.x, b.y, b.w, b.h);
      context.fillStyle = PALETTE.roof;
      context.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      context.fillStyle = 'rgba(255, 240, 160, 0.85)';
      for (let wx = b.x + 14; wx < b.x + b.w - 10; wx += 26) {
        for (let wy = b.y + 14; wy < b.y + b.h - 10; wy += 26) context.fillRect(wx, wy, 10, 12);
      }
    }
    // Trees.
    for (const t of state.trees) {
      context.fillStyle = '#2f6b3a';
      context.beginPath();
      context.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#4a9a5a';
      context.beginPath();
      context.arc(t.x - 3, t.y - 3, t.r * 0.6, 0, Math.PI * 2);
      context.fill();
    }
    // District labels.
    context.font = `bold 26px ${FONT}`;
    context.fillStyle = 'rgba(255,255,255,0.55)';
    context.textAlign = 'center';
    for (const d of DISTRICTS) context.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
  }

  function drawCar(car) {
    context.save();
    context.translate(car.x, car.y);
    context.rotate(car.angle);
    context.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(-34, -16, 68, 34, 8);
    context.fill();
    context.fillStyle = car.color;
    roundRect(-32, -15, 64, 30, 8);
    context.fill();
    context.fillStyle = '#1b2a3a';
    roundRect(-8, -12, 18, 24, 4);
    context.fill();
    context.fillStyle = '#e8f4ff';
    context.fillRect(18, -11, 5, 22);
    if (car.police) {
      context.fillStyle = Math.floor(performance.now() / 300) % 2 === 0 ? '#ff3b30' : '#2b6cff';
      context.fillRect(-28, -11, 8, 8);
      context.fillRect(-28, 3, 8, 8);
    }
    context.restore();
  }

  function drawPed(ped) {
    if (ped.health <= 0) return;
    context.fillStyle = ped.cop ? '#1c2f6b' : ped.color;
    context.beginPath();
    context.arc(ped.x, ped.y, 10, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#222';
    context.beginPath();
    context.arc(ped.x + Math.cos(ped.angle) * 5, ped.y + Math.sin(ped.angle) * 5, 4, 0, Math.PI * 2);
    context.fill();
    if (ped.cop) {
      context.fillStyle = '#fff';
      context.font = `bold 10px ${FONT}`;
      context.textAlign = 'center';
      context.fillText('PD', ped.x, ped.y - 14);
    }
  }

  function drawField(state) {
    const camX = Math.max(0, Math.min(WORLD.width - VIEW.width, state.camera.x - VIEW.width / 2));
    const camY = Math.max(0, Math.min(WORLD.height - VIEW.height, state.camera.y - VIEW.height / 2));
    context.save();
    context.translate(-camX, -camY);
    drawCity(state, camX, camY);
    // Mission marker: pulsing beacon.
    const marker = state.marker;
    if (marker) {
      const pulse = 18 + Math.sin(performance.now() / 250) * 6;
      context.fillStyle = 'rgba(79,195,247,0.35)';
      context.beginPath();
      context.arc(marker.x, marker.y, pulse + 18, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.mission;
      context.beginPath();
      context.arc(marker.x, marker.y, 10, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#fff';
      context.font = `bold 14px ${FONT}`;
      context.textAlign = 'center';
      context.fillText('!', marker.x, marker.y + 5);
    }
    for (const pickup of state.pickups) {
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(pickup.x, pickup.y, 12, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#7a5b00';
      context.font = `bold 14px ${FONT}`;
      context.textAlign = 'center';
      context.fillText('$', pickup.x, pickup.y + 5);
    }
    for (const car of state.cars) drawCar(car);
    for (const ped of state.peds) drawPed(ped);
    const p = state.player;
    if (p.onFoot) {
      if (p.invulnerable <= 0 || Math.floor(p.invulnerable * 10) % 2 === 1) {
        context.fillStyle = PALETTE.player;
        context.beginPath();
        context.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#222';
        context.beginPath();
        context.arc(p.x + Math.cos(p.angle) * 8, p.y + Math.sin(p.angle) * 8, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
    for (const b of state.bullets) {
      context.fillStyle = '#ffe66d';
      context.beginPath();
      context.arc(b.x, b.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    for (const part of state.particles) {
      context.fillStyle = part.color;
      context.globalAlpha = Math.max(0, part.life * 2);
      context.beginPath();
      context.arc(part.x, part.y, part.r, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
    }
    context.restore();
    return { camX, camY };
  }

  function drawMinimap(state) {
    const mw = 200;
    const mh = 150;
    const mx = VIEW.width - mw - 16;
    const my = 16;
    const sx = mw / WORLD.width;
    const sy = mh / WORLD.height;
    context.fillStyle = 'rgba(16,20,27,0.85)';
    roundRect(mx - 6, my - 6, mw + 12, mh + 12, 8);
    context.fill();
    context.fillStyle = '#3d7a4a';
    context.fillRect(mx, my, mw, mh);
    context.fillStyle = '#33373d';
    for (const rx of ROADS_X) context.fillRect(mx + rx * sx - 2, my, 4, mh);
    for (const ry of ROADS_Y) context.fillRect(mx, my + ry * sy, mw, 4);
    context.fillStyle = PALETTE.mission;
    if (state.marker) {
      context.beginPath();
      context.arc(mx + state.marker.x * sx, my + state.marker.y * sy, 5, 0, Math.PI * 2);
      context.fill();
    }
    for (const car of state.police) {
      context.fillStyle = '#ff3b30';
      context.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
    }
    const p = state.player;
    context.fillStyle = '#fff';
    context.beginPath();
    context.arc(mx + p.x * sx, my + p.y * sy, 5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#ffd23f';
    context.lineWidth = 2;
    context.stroke();
    // Viewport box.
    context.strokeStyle = 'rgba(255,255,255,0.5)';
    context.lineWidth = 1;
    const camX = Math.max(0, Math.min(WORLD.width - VIEW.width, state.camera.x - VIEW.width / 2));
    const camY = Math.max(0, Math.min(WORLD.height - VIEW.height, state.camera.y - VIEW.height / 2));
    context.strokeRect(mx + camX * sx, my + camY * sy, VIEW.width * sx, VIEW.height * sy);
    text('SUNSET BAY', mx, my + mh + 22, 14, PALETTE.muted, 'left');
  }

  function drawHud(state, missions, best, muted) {
    const p = state.player;
    context.fillStyle = 'rgba(16,20,27,0.88)';
    roundRect(12, 12, 340, 118, 10);
    context.fill();
    text(`$${state.money}`, 28, 44, 26, PALETTE.gold, 'left');
    text(`Health ${Math.ceil(p.health)}`, 28, 72, 18, p.health > 40 ? PALETTE.text : PALETTE.danger, 'left');
    context.fillStyle = '#333';
    context.fillRect(28, 80, 180, 10);
    context.fillStyle = p.health > 40 ? '#4caf50' : '#e5534b';
    context.fillRect(28, 80, 180 * Math.max(0, p.health / 100), 10);
    // Wanted stars, on their own line below the health bar.
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < state.wanted ? '★' : '☆';
    text(stars, 28, 122, 24, state.wanted > 0 ? '#ffcf3f' : PALETTE.muted, 'left');
    // Mission objective.
    const obj = missions.objective();
    context.fillStyle = 'rgba(16,20,27,0.88)';
    roundRect(12, 142, 430, 44, 10);
    context.fill();
    text(`JOB: ${missions.current() ? missions.current().title : 'Free roam'}`, 28, 162, 16, PALETTE.mission, 'left');
    text(obj, 28, 180, 15, PALETTE.text, 'left');
    drawMinimap(state);
    if (!p.onFoot && p.car) {
      const mph = Math.round(Math.abs(p.car.speed) * 0.12);
      text(`${mph} mph`, VIEW.width - 24, VIEW.height - 24, 30, PALETTE.text, 'right');
      text('E — get out    F — (on foot) shoot', VIEW.width - 24, VIEW.height - 52, 14, PALETTE.muted, 'right');
    } else {
      text('WASD — move    Shift — run    E — steal car    F — shoot    Space — punch    P — pause    M — sound', 16, VIEW.height - 16, 14, PALETTE.muted, 'left');
    }
    if (muted) text('MUTED', VIEW.width - 24, 200, 14, PALETTE.muted, 'right');
    if (state.messageTimer > 0 && state.message) {
      context.fillStyle = 'rgba(16,20,27,0.85)';
      const w = Math.min(640, 24 + state.message.length * 9);
      roundRect((VIEW.width - w) / 2, VIEW.height - 110, w, 40, 10);
      context.fill();
      text(state.message, VIEW.width / 2, VIEW.height - 82, 18, PALETTE.text, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const width = 680;
    const height = 180 + lines.length * 32;
    const x = (VIEW.width - width) / 2;
    const y = (VIEW.height - height) / 2;
    context.fillStyle = 'rgba(16,20,27,0.94)';
    roundRect(x, y, width, height, 14);
    context.fill();
    context.strokeStyle = PALETTE.gold;
    context.lineWidth = 2;
    roundRect(x, y, width, height, 14);
    context.stroke();
    text(title, VIEW.width / 2, y + 72, 52, PALETTE.gold, 'center');
    lines.forEach((line, i) => {
      text(line, VIEW.width / 2, y + 122 + i * 32, 19, PALETTE.text, 'center');
    });
    text(prompt, VIEW.width / 2, y + height - 28, 20, PALETTE.mission, 'center');
  }

  const PLAYER_RADIUS = 14;

  function draw(state, screen, best, missions, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = '#11141b';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) {
      drawField(state);
      drawPanel('SUNSET BAY', [
        'An original open-world crime game — no Rockstar, no GTA.',
        'Mara Voss, getaway driver, takes jobs from fixer Dana Cole.',
        'Steal cars, lose the cops, run the jobs, own the bay.',
        `Missions done: ${missions.completedCount()} / 5    Best cash: $${best}`,
        'WASD move / drive · E steal car · F shoot · Space punch · P pause',
      ], 'Press Enter or click to start');
      return;
    }
    drawField(state);
    drawHud(state, missions, best, muted);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The bay will wait for you.', `Cash $${state.money} · Missions ${missions.completedCount()}/5`], 'Press P to resume · R to restart the run');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Busted', [`Mara is down. Cash kept: $${state.money}.`, 'The cops win this round.'], 'Press Enter to try again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
