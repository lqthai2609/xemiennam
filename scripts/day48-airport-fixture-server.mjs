/** Synthetic read-only fixtures. No production, bookings or real Operations facts. */
import http from 'node:http';
import {readFileSync} from 'node:fs';
let mode='confirmed';let reads=0;
const rules=JSON.parse(readFileSync(new URL('./fixtures/airport-timing.json',import.meta.url))).base.rules;
const locations=[{id:8001,slug:'synthetic-airport',title:{rendered:'SYNTHETIC sân bay'},meta:{location_type:'airport'}},{id:8002,slug:'synthetic-city',title:{rendered:'SYNTHETIC thành phố'},meta:{location_type:'city'}}];
const route={id:1001,status:'publish',slug:'synthetic-airport-route',title:{rendered:'SYNTHETIC airport route'},meta:{diem_di:'Sài Gòn',diem_den:'SYNTHETIC sân bay',origin_location_id:8002,destination_location_id:8001,route_model_version:2,outbound_enabled:true,inbound_enabled:true,pricing_model_version:2,pricing_packages_v2:[{direction:'outbound',vehicle_id:2001,package_key:'one_way',pricing_mode:'contact'},{direction:'inbound',vehicle_id:2001,package_key:'one_way',pricing_mode:'contact'}]},_embedded:{'wp:term':[[{id:1,taxonomy:'province',name:'SYNTHETIC tỉnh',slug:'synthetic-province'}]]}};
const vehicle={id:2001,slug:'synthetic-7-cho',title:{rendered:'SYNTHETIC xe'},content:{rendered:''},meta:{},_embedded:{'wp:term':[[{taxonomy:'vehicle_type',name:'7 chỗ',slug:'7-cho'}]]}};
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');res.setHeader('Content-Type','application/json');
 if(url.pathname==='/fixture-control') {if(req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;mode=JSON.parse(body).mode;}res.end(JSON.stringify({mode,reads}));return;}
 if(req.method!=='GET'){res.statusCode=405;res.end('{}');return;}
 if(url.pathname==='/wp/v2/route'){res.end(JSON.stringify([route]));return;}
 if(url.pathname==='/wp/v2/vehicle'){res.end(JSON.stringify([vehicle]));return;}
 if(url.pathname==='/wp/v2/location'){res.end(JSON.stringify(locations));return;}
 if(url.pathname==='/gocar/v1/routes/1001/airport-timing'){
  reads++;if(mode==='delayed')await new Promise(r=>setTimeout(r,1200));if(mode==='timeout')await new Promise(r=>setTimeout(r,6000));
  if(mode==='error'){res.statusCode=503;res.end('{}');return;}
  if(mode==='legacy'){res.statusCode=404;res.end('{}');return;}
  const departure=rules[0];const arrival={...departure,direction:'inbound',movement:'arrival',travel_minutes:null};
  res.end(JSON.stringify({model_version:1,route_id:1001,revision:mode==='revised'?4:3,rules:mode==='withdrawn'?[]:[departure,arrival]}));return;
 }
 res.end('[]');
}).listen(4199,'127.0.0.1',()=>console.log('SYNTHETIC fixture server on 4199; no booking writes.'));
