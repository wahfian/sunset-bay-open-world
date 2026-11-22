// The screenshot scenes behind ?shot=start|chase|mission|heist. Each one
// stages the real world with a fixed seed — a title screen over the living
// city, a three-star police chase in a stolen car, a mission in progress,
// and the sunset heist escape — then paints it twice and sets
// window.__shotReady, so the frame is what a short game really looks like
// and the same seed always gives the same frame.
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any unknown name stages the title screen.
 */
export function stageShot(name, world) {
  if (name === 'chase' || name === 'play') {
    world.stageScene('chase');
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'mission') {
    world.stageScene('mission');
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'heist' || name === 'end') {
    world.stageScene('heist');
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  world.stageScene('title');
  return { screen: SCREEN_TITLE, best: 1250 };
}
