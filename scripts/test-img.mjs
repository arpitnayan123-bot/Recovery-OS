import ZAI from 'z-ai-web-dev-sdk';
const zai = await ZAI.create();
console.log('requesting...', new Date().toISOString());
const t = setTimeout(() => { console.log('TIMEOUT 90s'); process.exit(4); }, 90000);
const res = await zai.images.generations.create({ prompt: 'dark obsidian abstract with golden light streams, cinematic, premium', size: '1344x768' });
clearTimeout(t);
const b64 = res.data?.[0]?.base64;
console.log('OK base64 length:', b64?.length ?? 'NONE');
if (b64) { const fs = await import('fs'); fs.writeFileSync('/home/z/my-project/public/media/hero-poster.jpg', Buffer.from(b64, 'base64')); console.log('poster saved'); }
