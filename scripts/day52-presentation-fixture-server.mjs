/** Synthetic transport; not WordPress/MySQL/Operations evidence. Read-only. */
import http from 'node:http';
let mode='normal', until=Date.now()+60000;const writes=[];
const send=(res,data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
const iso=n=>new Date(n).toISOString().replace(/\.\d{3}Z$/,'Z');
http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;let body='';for await(const c of req)body+=c;
 if(path==='/fixture-control'){if(body){const p=JSON.parse(body);mode=p.mode;until=Date.now()+(p.duration??60000);}return send(res,{mode,writes});}
 if(req.method!=='GET'){writes.push(path);return send(res,{},405);}
 if(path==='/wp-json/gocar/v1/admin/session')return send(res,{id:7,name:'SYNTHETIC',contract:1,canPublish:true});
 if(path==='/wp-json/gocar/v1/admin/empty-legs/presentation'){
  if(!req.headers.authorization?.startsWith('Bearer synthetic-'))return send(res,{},403);
  if(mode==='error')return send(res,{message:'SYNTHETIC outage'},503);
  if(mode==='hang')return;
  const now=Date.now();const d=new Date(until+60000+7*3600000);
  const card={id:5001,revision:2,origin:'TP. Hồ Chí Minh',destination:'Vũng Tàu',vehicle:'Xe 7 chỗ · Dữ liệu mô phỏng',direction:'outbound',package_key:'one_way',departure:{date:d.toISOString().slice(0,10),time:d.toISOString().slice(11,16),timezone:'Asia/Ho_Chi_Minh'},valid_from:iso(now-60000),expires_at:iso(until),normal_price_vnd:1000000,special_price_vnd:700000,currency:'VND',basis:'base_price'};
  return send(res,{contract_version:1,server_now:iso(now),lease_ms:15000,commercial_enabled:false,sellable:false,items:mode==='withdrawn'||until<=now?[]:[card]});
 }
 return send(res,[]);
}).listen(4399,'127.0.0.1',()=>console.log('Day52 SYNTHETIC fixture ready'));
