import { buildCast, NAMES } from './cast.ts';
import type { Sprite } from './pixel.ts';
export { drawSprite } from './pixel.ts';
export { cardArt, bannerArt, iconArt, eventKey } from './cardart.ts';
export { sceneCanvas, fogTexture, type SceneKind } from './scenes.ts';
export { NAMES };

let cast: Record<string, Sprite> | null = null;
/** Спрайты строятся один раз при первом обращении. */
export function sprite(id: string): Sprite {
  cast ??= buildCast();
  return cast[id] ?? cast.reaper;
}
