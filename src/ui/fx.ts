/** Лёгкая система частиц на canvas: дождь, пепел, искры. Останавливается при смене экрана. */
export type FxKind = 'rain' | 'ash' | 'embers' | 'snow';

export function startFx(canvas: HTMLCanvasElement, kind: FxKind, reduce = false): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  let w = 0;
  let h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const fit = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  const N = reduce ? 0 : kind === 'rain' ? 90 : kind === 'ash' ? 60 : 36;
  const ps = Array.from({ length: N }, () => ({ x: Math.random() * (w || 400), y: Math.random() * (h || 700), v: 0.4 + Math.random(), s: Math.random(), p: Math.random() * 6 }));
  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (canvas.clientWidth !== w || canvas.clientHeight !== h) fit();
    if (!w || !h) {
      raf = requestAnimationFrame(loop);
      return;
    }
    ctx.clearRect(0, 0, w, h);
    for (const p of ps) {
      if (kind === 'rain') {
        p.y += (520 + p.v * 360) * dt;
        p.x -= 60 * dt;
        ctx.strokeStyle = `rgba(190,215,225,${0.1 + p.s * 0.18})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 5, p.y - 18 - p.v * 10);
        ctx.stroke();
      } else if (kind === 'ash') {
        p.y += (14 + p.v * 22) * dt;
        p.x += Math.sin(now / 1500 + p.p) * 14 * dt - 6 * dt;
        ctx.fillStyle = `rgba(210,200,185,${0.15 + p.s * 0.35})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.8 + p.s * 1.8, 0, 6.3);
        ctx.fill();
      } else if (kind === 'snow') {
        p.y += (10 + p.v * 14) * dt;
        p.x += Math.sin(now / 2000 + p.p) * 10 * dt;
        ctx.fillStyle = `rgba(200,220,245,${0.2 + p.s * 0.4})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.8 + p.s * 1.5, 0, 6.3);
        ctx.fill();
      } else {
        p.y -= (16 + p.v * 30) * dt;
        p.x += Math.sin(now / 1100 + p.p) * 18 * dt;
        const a = 0.25 + p.s * 0.6;
        ctx.fillStyle = `rgba(255,${150 + Math.floor(p.s * 70)},70,${a})`;
        ctx.shadowColor = 'rgba(255,170,80,.9)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.7 + p.s * 1.7, 0, 6.3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      if (p.y > h + 20) {
        p.y = -20;
        p.x = Math.random() * w;
      }
      if (p.y < -20 && kind === 'embers') {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -20) p.x = w + 10;
    }
    raf = requestAnimationFrame(loop);
  };
  if (N > 0) raf = requestAnimationFrame(loop);
  const onResize = () => fit();
  window.addEventListener('resize', onResize);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', onResize);
  };
}
