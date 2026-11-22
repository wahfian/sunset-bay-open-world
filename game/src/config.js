// Sunset Bay: every tuning number, colour and story beat in one place.
// Top-down open world, 3200 x 2400 world units; the renderer scales a 1280x720
// logical view to the window, so no rule below depends on the screen size.
export const WORLD = { width: 3200, height: 2400 };
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const ROAD_WIDTH = 96;
export const ROADS_X = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROADS_Y = [200, 600, 1000, 1400, 1800, 2200];

export const PLAYER = {
  radius: 14,
  walkSpeed: 210,
  runSpeed: 330,
  health: 100,
  punchRange: 34,
  punchDamage: 25,
  shootCooldown: 0.28,
  bulletSpeed: 720,
};

export const CAR = {
  length: 64,
  width: 30,
  accel: 420,
  brake: 620,
  maxSpeed: 520,
  reverseSpeed: 180,
  turnRate: 2.6,
  trafficSpeed: 150,
  policeSpeed: 560,
};

export const WANTED = {
  max: 5,
  decaySeconds: 26,
  policePerStar: 2,
  maxPolice: 8,
};

export const SAVE_KEY = 'sunset-bay.save.v1';
export const BEST_KEY = 'sunset-bay.best';

export const PALETTE = {
  grass: '#3d7a4a',
  grassDark: '#356b40',
  sand: '#d9c27a',
  water: '#2b6cb0',
  road: '#33373d',
  roadEdge: '#4a4f57',
  lane: '#e8d44d',
  sidewalk: '#9aa0a6',
  building: ['#b5654a', '#7a6a9b', '#4a7a9b', '#9b8a4a', '#8a4a5a', '#5a8a6a'],
  roof: '#2f333a',
  park: '#2f6b3a',
  player: '#ffd23f',
  playerCar: '#ffcf3f',
  police: '#2b4acb',
  policeLight: '#ff3b30',
  traffic: ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#e67e22', '#ecf0f1', '#16a085'],
  ped: ['#f1c40f', '#e74c3c', '#3498db', '#9b59b6', '#1abc9c', '#fd79a8'],
  hud: '#10141b',
  text: '#eef1f5',
  muted: '#9aa3b2',
  gold: '#f2c94c',
  danger: '#e5534b',
  mission: '#4fc3f7',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// The story: Mara Voss, a getaway driver new to Sunset Bay, takes jobs from
// fixer Dana Cole. Five missions, in order; each pays cash and unlocks the next.
export const MISSIONS = [
  {
    id: 'first-ride',
    title: 'First Ride',
    reward: 150,
    briefing: 'Dana needs a driver. Steal the yellow coupe by the marina and bring it to her garage.',
    steps: [
      { type: 'steal', text: 'Steal the yellow coupe near the marina', x: 2600, y: 2100 },
      { type: 'goto', text: 'Drive the coupe to Dana\u2019s garage', x: 1000, y: 600 },
    ],
  },
  {
    id: 'delivery-run',
    title: 'Delivery Run',
    reward: 250,
    briefing: 'A package for the pier. Pick it up downtown, deliver it in 90 seconds, and stay clean.',
    steps: [
      { type: 'goto', text: 'Pick up the package downtown', x: 1400, y: 1000, onFootOk: true },
      { type: 'deliver', text: 'Deliver the package to the pier', x: 600, y: 2200, time: 90 },
    ],
  },
  {
    id: 'getaway',
    title: 'Getaway',
    reward: 300,
    briefing: 'The cops saw the delivery. Lose a 2-star wanted level — hide, or outrun them.',
    steps: [
      { type: 'wanted', text: 'Reach wanted level 2, then lose the cops', stars: 2 },
    ],
  },
  {
    id: 'the-take',
    title: 'The Take',
    reward: 450,
    briefing: 'Three cash bags are stashed around the bay. Grab them all while the police close in.',
    steps: [
      { type: 'collect', text: 'Collect the cash bags (0/3)', x: 600, y: 600, count: 3 },
    ],
  },
  {
    id: 'sunset-heist',
    title: 'Sunset Heist',
    reward: 800,
    briefing: 'One last job: hit the Bay Bank, grab the loot, and escape to the safehouse with 3 stars on you.',
    steps: [
      { type: 'goto', text: 'Reach the Bay Bank', x: 1800, y: 1400, onFootOk: true },
      { type: 'collect', text: 'Grab the loot (0/1)', x: 1800, y: 1400, count: 1 },
      { type: 'escape', text: 'Escape to the safehouse with the loot', x: 3000, y: 200, stars: 3 },
    ],
  },
];

export const DISTRICTS = [
  { name: 'Marina', x: 2400, y: 2000, w: 800, h: 400 },
  { name: 'Downtown', x: 1200, y: 800, w: 800, h: 800 },
  { name: 'Bay Bank', x: 1700, y: 1300, w: 200, h: 200 },
  { name: 'The Pier', x: 400, y: 2000, w: 400, h: 400 },
  { name: 'Safehouse', x: 2900, y: 100, w: 200, h: 200 },
];
