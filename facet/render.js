// Renders facet-film.html to facet-launch.mp4: every frame drawn at an exact time, the score rendered offline.
// usage: NODE_PATH=$(npm root -g) node facet/render.js [fps=30]
const { chromium } = require('playwright'), { spawn, execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const FFMPEG = execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const FPS = +(process.argv[2] || 30), DIR = __dirname, WAV = path.join(DIR, '.score.wav'), OUT = path.join(DIR, 'facet-launch.mp4');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => { console.error('page error', e.message); process.exit(1); });
  await p.addInitScript(() => { window.FILM_EXPORT = true; });
  await p.goto('file://' + path.join(DIR, 'facet-film.html')); await p.waitForFunction(() => window.FILM && FILM.ready);
  fs.writeFileSync(WAV, Buffer.from(await p.evaluate(() => FILM.renderAudio(48000)), 'base64'));
  const dur = await p.evaluate(() => FILM.DUR), n = Math.round(dur * FPS);
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', WAV,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '256k', '-shortest', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    const d = await p.evaluate(t => { FILM.render(t); return document.getElementById('film').toDataURL('image/jpeg', 0.95); }, i / FPS);
    if (!ff.stdin.write(Buffer.from(d.slice(d.indexOf(',') + 1), 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log('frame', i, '/', n);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); fs.unlinkSync(WAV);
  await b.close(); console.log('wrote', OUT, (fs.statSync(OUT).size / 1e6).toFixed(1) + ' MB');
})();
