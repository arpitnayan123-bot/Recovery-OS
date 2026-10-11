import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT_DIR = '/home/z/my-project/public/media';
const VIDEO_OUT = path.join(OUT_DIR, 'hero.mp4');
const POSTER_OUT = path.join(OUT_DIR, 'hero-poster.jpg');

const VIDEO_PROMPT =
  'Cinematic premium fintech brand film. Ultra slow dolly across a dark obsidian-black abstract landscape: flowing rivers of golden champagne light streams and luminous glass data ribbons rising like an upward curve, soft floating light particles with bokeh, faint emerald-green glints, deep volumetric haze, shallow depth of field, ultra-smooth slow motion, elegant minimal luxury aesthetic, high-end, no text, no people, no logos, seamless loop.';

const POSTER_PROMPT =
  'Cinematic dark premium fintech abstract background, wide banner: obsidian black landscape with flowing golden champagne light streams rising like a curve, glass ribbons, soft bokeh particles, faint emerald glints, volumetric haze, elegant minimal luxury, ultra high quality, no text, no people.';

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

async function generatePoster(zai) {
  log('Generating poster image...');
  const res = await zai.images.generations.create({
    prompt: POSTER_PROMPT,
    size: '1344x768',
  });
  const b64 = res.data?.[0]?.base64;
  if (!b64) throw new Error('No poster base64 returned');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(POSTER_OUT, Buffer.from(b64, 'base64'));
  log('Poster saved:', POSTER_OUT, fs.statSync(POSTER_OUT).size, 'bytes');
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function main() {
  const zai = await ZAI.create();

  // ---- 1) poster first (fast, also serves as fallback) ----
  if (fs.existsSync(POSTER_OUT)) {
    log('Poster already exists, skipping.');
  } else {
    try {
      await generatePoster(zai);
    } catch (e) {
      log('Poster generation failed (continuing):', e.message);
    }
  }

  // ---- 2) video task ----
  log('Creating video generation task...');
  const CONFIGS = [
    { prompt: VIDEO_PROMPT, quality: 'quality', with_audio: false, size: '1920x1080', fps: 30, duration: 5 },
    { prompt: VIDEO_PROMPT, quality: 'quality', with_audio: false, size: '1920x1080', duration: 5 },
    { prompt: VIDEO_PROMPT, quality: 'speed', with_audio: false, duration: 5 },
    { prompt: VIDEO_PROMPT },
  ];
  let task = null;
  let lastErr = null;
  outer: for (const cfg of CONFIGS) {
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        task = await zai.video.generations.create(cfg);
        log('Task created with config:', JSON.stringify(cfg).slice(0, 120));
        break outer;
      } catch (e) {
        lastErr = e;
        const msg = e.message || '';
        log(`Config rejected (attempt ${attempt}):`, msg.slice(0, 140));
        if (msg.includes('429') || msg.toLowerCase().includes('too many')) {
          const waitMs = 45000 * attempt;
          log(`Rate-limited — waiting ${waitMs / 1000}s before retry...`);
          await new Promise((r) => setTimeout(r, waitMs));
        } else {
          break; // config invalid → try next config
        }
      }
    }
  }
  if (!task) {
    log('FATAL: all video configs rejected. last =', lastErr?.message?.slice(0, 200));
    process.exitCode = 5;
    return;
  }
  log('Task:', task.id, task.task_status);

  // ---- 3) poll ----
  const maxPolls = 90; // x10s = 15 min ceiling
  let result = null;
  for (let i = 1; i <= maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 10000));
    try {
      result = await zai.async.result.query(task.id);
    } catch (e) {
      log(`poll ${i}: query error`, e.message);
      continue;
    }
    log(`poll ${i}/${maxPolls}: ${result.task_status}`);
    if (result.task_status !== 'PROCESSING') break;
  }

  if (!result || result.task_status !== 'SUCCESS') {
    log('VIDEO FAILED. status =', result?.task_status);
    process.exitCode = 2;
    return;
  }

  const url =
    result.video_result?.[0]?.url || result.video_url || result.url || result.video;
  if (!url) {
    log('No video URL in result:', JSON.stringify(result).slice(0, 800));
    process.exitCode = 3;
    return;
  }

  const bytes = await downloadFile(url, VIDEO_OUT);
  log('Video saved:', VIDEO_OUT, bytes, 'bytes');
  log('DONE');
}

main().catch((e) => {
  log('FATAL:', e?.message || e);
  process.exitCode = 1;
});
