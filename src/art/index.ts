import { silSprite, SIL_NAMES } from './sil.ts';
import type { Sprite } from './pixel.ts';
export { drawSprite } from './pixel.ts';
export { cardArt, bannerArt, iconArt, eventKey } from './cardart.ts';
export { sceneCanvas, fogTexture, type SceneKind } from './scenes.ts';
export const NAMES = SIL_NAMES;

/** Спрайты строятся один раз при первом обращении. */
export const sprite = (id: string): Sprite => silSprite(id);
