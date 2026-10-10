/** Synthetic local-only WordPress fixture. Never run against production. */
import http from 'node:http';
import { readFileSync } from 'node:fs';
const {approval,...base}=JSON.parse(readFileSync(new URL('./fixtures/vehicle-facts.json',import.meta.url))).base;
let mode='confirmed', reads=0;
const projection={...base,vehicle_id:2001,status:'confirmed',reviewed_at:'2020-01-01T00:00:00Z'};
const wpVehicle=(id,type,facts)=>({id,slug:`synthetic-${id}`,title:{rendered:`SYNTHETIC ${type}`},content:{rendered:''},modified:'2020-01-01T00:00:00',meta:{so_cho:99,hinh_thuc_lai:'co_tai_xe',gallery_anh:[]},gocar_vehicle_facts:facts,_embedded:{'wp:term':[[{taxonomy:'vehicle_type',name:type,slug:type==='7 chỗ'?'7-cho':'4-cho'}]]}});
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');
 if(url.pathname==='/fixture-control'){
  if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;mode=JSON.parse(body).mode;}
  res.end(JSON.stringify({mode,reads}));return;
 }
 if(url.pathname==='/wp/v2/route'){res.end(JSON.stringify([{id:3001,status:'publish',slug:'synthetic-route',title:{rendered:'SYNTHETIC route'},modified:'2020-01-01T00:00:00',meta:{diem_di:'Sài Gòn',diem_den:'Vũng Tàu',pricing_by_vehicle:[{vehicle_id:2001,gia:0,loai_gia:'mot_chieu'}]},_embedded:{'wp:term':[[{id:1,taxonomy:'province',name:'Vũng Tàu',slug:'ba-ria-vung-tau'}]]}}]));return;}
 if(req.method!=='GET'){res.statusCode=405;res.end('{}');return;}
 if(url.pathname==='/wp/v2/vehicle'){
  reads++;
  if(mode==='error'){res.statusCode=503;res.end('{}');return;}
  if(mode==='delayed')await new Promise(r=>setTimeout(r,800));
  const facts=['withdrawn','legacy'].includes(mode)?null:projection;
  res.end(JSON.stringify(mode==='empty'?[]:[wpVehicle(2001,'7 chỗ',facts),wpVehicle(2002,'4 chỗ',null)]));return;
 }
 // Other resources use explicitly enabled mock data for UI fixtures only.
 res.end('[]');
});
server.listen(4199,'127.0.0.1',()=>console.log('SYNTHETIC fixture server on 4199; no booking writes.'));
