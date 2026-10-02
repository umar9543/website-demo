import { spawn } from 'node:child_process';
import fs from 'node:fs';
const [,, url, outDir, w, h, mobile] = process.argv;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--remote-debugging-port=9333',`--user-data-dir=${outDir}/prof`,'--enable-unsafe-swiftshader','--use-angle=swiftshader',`--window-size=${w},${h}`,'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(2500);
const list = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const logs = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; }
  if (m.method === 'Runtime.consoleAPICalled' && ['error','warning'].includes(m.params.type)) logs.push(m.params.type+': '+m.params.args.map(a=>a.value||a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown') logs.push('EXC: '+JSON.stringify(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
if (mobile) await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: true });
else await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url }); await sleep(+process.env.WAIT0||20000);
const ev = async ex => (await send('Runtime.evaluate', { expression: ex, returnByValue: true })).result?.value;
const trackH = await ev("(document.getElementById('journey')||document.getElementById('track')).offsetHeight - innerHeight");
const fr = (process.env.FR||'0,.5,1').split(',').map(Number);
const marks = fr.map(f => ['p'+Math.round(f*1000), Math.round(trackH*f)+(process.env.OFF?0:0)]);
const total=0, story=trackH;
for (const [name, y] of marks) {
  await ev(`window.scrollTo(0, ${y})`); await sleep(+process.env.WAIT||5000);
  const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 70 });
  fs.writeFileSync(`${outDir}/${name}.jpg`, Buffer.from(s.data, 'base64'));
}
console.log('docH', total, 'storyH', story); console.log(logs.join('\n') || 'no errors');
ws.close(); chrome.kill();
