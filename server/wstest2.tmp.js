const WebSocket = require('ws');
const token = process.argv[2];
const t0 = Date.now();
const el = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
const ws = new WebSocket(`ws://localhost:3002/ws/coach?token=${token}`);
let chunks = 0, text = '';
const timer = setTimeout(() => { console.log(el(), 'TIMEOUT'); ws.terminate(); process.exit(1); }, 180000);
ws.on('open', () => { console.log(el(), 'open -> sending'); ws.send(JSON.stringify({ message: 'What should my long run look like this weekend?' })); });
ws.on('message', (d) => {
  const m = JSON.parse(d.toString());
  if (m.type === 'chunk') { if (chunks === 0) console.log(el(), 'first chunk'); chunks++; text += m.text; return; }
  console.log(el(), 'event:', JSON.stringify(m).slice(0, 160));
  if (m.type === 'done' || m.type === 'error') {
    clearTimeout(timer);
    console.log('chunks:', chunks, '| chars:', text.length);
    console.log('leaked tag:', text.includes('<context_update>'), '| leaked partial:', text.includes('<context'));
    console.log('tail:', JSON.stringify(text.slice(-100)));
    ws.close(); process.exit(0);
  }
});
ws.on('error', (e) => { console.log(el(), 'ws error', e.message); process.exit(1); });
