import '@fontsource/handjet/cyrillic-400.css';
import '@fontsource/handjet/cyrillic-600.css';
import '@fontsource/handjet/latin-400.css';
import '@fontsource/handjet/latin-600.css';
import '@fontsource/press-start-2p/cyrillic-400.css';
import '@fontsource/press-start-2p/latin-400.css';
import '@fontsource/eb-garamond/cyrillic-400.css';
import '@fontsource/eb-garamond/cyrillic-400-italic.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { boot } from './app.ts';

/** Сцена всегда 390 дизайн-пикселей по высоте. Ширина подстраивается под экран, пустых полос нет. */
const stage = document.getElementById('stage')!;
const rot = document.createElement('div');
rot.className = 'rotate';
rot.innerHTML = '<div><b>↻</b>Поверните телефон горизонтально</div>';
document.body.append(rot);
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight;
  document.body.classList.toggle('portrait', vh > vw);
  const k = vh / 390;
  stage.style.width = `${Math.round(vw / k)}px`;
  stage.style.transform = `scale(${k})`;
}
fit();
window.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 50));
registerSW({ immediate: true });
boot();
