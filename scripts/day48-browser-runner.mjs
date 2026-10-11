import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('../evidence',{recursive:true});
let logs='';const children=[];
function child(cmd,args,env={},cwd=process.cwd()){const p=spawn(cmd,args,{cwd,env:{...process.env,...env},stdio:['ignore','pipe','pipe']});p.stdout.on('data',b=>{logs+=b;});p.stderr.on('data',b=>{logs+=b;});children.push(p);return p;}
const fixture=child(process.execPath,['scripts/day48-airport-fixture-server.mjs']);
const app=child(process.execPath,[`${process.cwd()}/node_modules/next/dist/bin/next`,process.env.DAY48_SERVER_MODE || 'dev',...(process.env.DAY48_SERVER_MODE === 'start' ? [] : ['--webpack']),'--hostname','127.0.0.1','--port','4188'],{WP_API_BASE_URL:'http://127.0.0.1:4199/wp/v2',GOCAR_ENABLE_MOCK_FALLBACK:'true'},process.env.DAY48_UI_CHECKOUT || process.cwd());
try{
 for(let i=0;i<60;i++){if(logs.includes('Ready in') && logs.includes('SYNTHETIC fixture server'))break;await new Promise(r=>setTimeout(r,500));if(i===59)throw new Error(logs);}
 const ui=child(process.execPath,[process.env.DAY48_BROWSER_SCRIPT || 'scripts/day48-airport-browser.mjs']);
 ui.stdout.on('data',b=>process.stdout.write(b));ui.stderr.on('data',b=>process.stderr.write(b));
 const code=await new Promise(r=>ui.on('exit',r));process.exitCode=code;
}finally{
 await writeFile('../evidence/browser-server.log',logs);
 fixture.kill();app.kill();
 // npm owns the Next.js child; stop it through the recorded local PID.
 for(const p of children)p.kill();
}
