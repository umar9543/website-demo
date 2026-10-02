import { spawn } from 'node:child_process'; import fs from 'node:fs';
const [,, base, outDir, w, h, mobile] = process.argv;
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new','--remote-debugging-port=9335',`--user-data-dir=${outDir}/prof`,'--enable-unsafe-swiftshader','--use-angle=swiftshader',`--window-size=${w},${h}`,'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms)); await sleep(2500);
const list = await (await fetch('http://127.0.0.1:9335/json')).json();
const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = {}; const logs = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend[m.id]) { pend[m.id](m.result || m.error); delete pend[m.id]; } if (m.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + JSON.stringify(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); };
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: !!mobile });
for (const T of process.env.TS.split(',')) {
  await send('Page.navigate', { url: `${base}?introAt=${T}` }); await sleep(+process.env.WAIT || 9000);
  const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 }); fs.writeFileSync(`${outDir}/t${T}.jpg`, Buffer.from(s.data, 'base64'));
}
console.log(logs.join(' ; ') || 'no errors'); ws.close(); chrome.kill();
