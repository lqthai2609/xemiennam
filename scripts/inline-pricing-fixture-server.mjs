/** Local synthetic transport only. No production WordPress, booking or mail. */
import http from "node:http";
let version = 1;
const writes = [];
const rows = ["outbound", "inbound"].flatMap(direction => [2001, 2002, 2003].flatMap(vehicle_id => ["one_way", "round_trip_day", "2d1n", "3d2n"].map(package_key => ({ direction, vehicle_id, package_key, pricing_mode: vehicle_id === 2003 || package_key === "3d2n" ? "contact" : "fixed", ...(vehicle_id === 2003 || package_key === "3d2n" ? {} : { price: (direction === "outbound" ? 1000000 : 900000) + vehicle_id - 2001 }) }))));
const route = { id: 1001, status: "publish", slug: "synthetic-route", title: { rendered: "SYNTHETIC Sài Gòn Vũng Tàu" }, modified: "2026-10-13T00:00:00", meta: { diem_di: "Sài Gòn", diem_den: "Vũng Tàu", route_model_version: 2, origin_location_id: 3001, destination_location_id: 3002, outbound_enabled: true, inbound_enabled: true, pricing_model_version: 2, outbound_featured_package: "one_way", inbound_featured_package: "one_way", pricing_packages_v2: rows }, _embedded: { "wp:term": [[{id:1,taxonomy:"province",slug:"ba-ria-vung-tau",name:"Vũng Tàu"}]] } };
const vehicles = ["4 chỗ", "7 chỗ", "16 chỗ"].map((type, i) => ({id:2001+i,slug:`synthetic-${i}`,title:{rendered:`SYNTHETIC ${type}`},content:{rendered:""},meta:{so_cho:parseInt(type),hinh_thuc_lai:"co_tai_xe"},_embedded:{"wp:term":[[{id:i+1,taxonomy:"vehicle_type",slug:`${parseInt(type)}-cho`,name:type}]]}}));
const locations = ["TP. Hồ Chí Minh", "Vũng Tàu"].map((name,i) => ({id:3001+i,slug:`synthetic-location-${i}`,title:{rendered:name},meta:{}}));
const json = (res,data,status=200) => {res.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify(data));};
http.createServer(async(req,res) => {
  const url = new URL(req.url,"http://localhost");
  if (url.pathname === "/fixture/status") return json(res,{version,writes,rows});
  if (/^\/fixture\/(admin|editor|guest)$/.test(url.pathname)) {
    const role = url.pathname.split("/").at(-1);
    res.writeHead(302,{"Set-Cookie":[`alo_admin_session=synthetic-${role}; Path=/; SameSite=Strict; HttpOnly`,`alo_admin_csrf=synthetic-csrf; Path=/; SameSite=Strict`],Location:"http://localhost:4388/bang-gia"});return res.end();
  }
  const token = req.headers.authorization;
  const admin = token === "Bearer synthetic-admin";
  if(url.pathname === "/wp-json/gocar/v1/admin/session") return json(res,{id:7,name:"SYNTHETIC",contract:1,canPublish:true,canEditPricing:admin},token?.startsWith("Bearer synthetic-") && token !== "Bearer synthetic-guest" ? 200 : 401);
  if(url.pathname === "/wp-json/gocar/v1/admin/routes/1001/pricing") {
    if(!admin) return json(res,{message:"Chỉ quản trị viên được sửa giá."},403);
    if(req.method === "POST") {
      let body=""; for await(const chunk of req) body+=chunk;
      const data=JSON.parse(body);
      if(data.baseVersion !== String(version)) return json(res,{message:"Dữ liệu tuyến đã thay đổi; hãy tải lại trước khi tiếp tục."},409);
      const row=rows.find(row=>row.vehicle_id===data.vehicleId && row.direction===data.pricingDirection && row.package_key===data.packageKey);
      if(!row) return json(res,{message:"Không có tổ hợp."},409);
      row.pricing_mode=data.priceMode; delete row.price; if(data.priceMode === "fixed") row.price=data.priceAmount;
      writes.push(data); version++; return json(res,{routeId:1001,auditId:version});
    }
    return json(res,{id:"1001",locked:false,backendVersion:String(version),pricingRows:rows.map(row=>({direction:row.direction,vehicleId:String(row.vehicle_id),packageKey:row.package_key,mode:row.pricing_mode,price:row.price??null}))});
  }
  if(req.method !== "GET") return json(res,{message:"Fixture blocks unrelated writes."},405);
  if(url.pathname === "/wp/v2/route") return json(res,url.searchParams.has("slug") && url.searchParams.get("slug") !== route.slug ? [] : [route]);
  if(url.pathname === "/wp/v2/vehicle") return json(res,vehicles);
  if(url.pathname === "/wp/v2/location") return json(res,locations);
  return json(res,[]);
}).listen(4399,"0.0.0.0",()=>console.log("SYNTHETIC inline-pricing transport ready on 4399"));
