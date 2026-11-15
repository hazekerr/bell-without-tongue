import '@fontsource/forum/cyrillic-400.css';
import '@fontsource/forum/latin-400.css';
import '@fontsource/eb-garamond/cyrillic-400.css';
import '@fontsource/eb-garamond/cyrillic-500.css';
import '@fontsource/eb-garamond/cyrillic-400-italic.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-400-italic.css';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { SVG_DEFS } from './art.ts';
import { boot } from './app.ts';

document.body.insertAdjacentHTML('afterbegin', SVG_DEFS);
registerSW({ immediate: true });
boot();
