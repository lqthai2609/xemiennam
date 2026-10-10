<?php
// SQL/WordPress doubles inherited from Day 51; synthetic records only.
require __DIR__.'/empty-leg-admin-php.test.php';
$actor=7;$publisher=true;$editor=true;
$wpdb->refs[1001]['origin_location_id']=3001;
$wpdb->refs[1001]['destination_location_id']=3002;
$now=time();$model=$f['base'];
$model['valid_from']=gmdate('Y-m-d\TH:i:s\Z',$now-60);
$model['expires_at']=gmdate('Y-m-d\TH:i:s\Z',$now+600);
$model['departure']=array('date'=>gmdate('Y-m-d',$now+7200+7*3600),'time'=>gmdate('H:i',$now+7200+7*3600),'timezone'=>'Asia/Ho_Chi_Minh');
$stamp=array('actor'=>7,'at'=>gmdate('Y-m-d\TH:i:s\Z',$now-30),'revision'=>1,'source_ref'=>$model['approval']['source_ref']);
$id=6001;$wpdb->records[$id]=(object)array('ID'=>$id,'post_type'=>Gocar_Empty_Leg::POST_TYPE,'post_status'=>'private','post_author'=>7);
$wpdb->rows[]=array('post_id'=>$id,'meta_key'=>Gocar_Empty_Leg::META_KEY,'meta_value'=>json_encode($model));
$wpdb->rows[]=array('post_id'=>$id,'meta_key'=>Gocar_Empty_Leg::HISTORY_KEY,'meta_value'=>json_encode(array('after'=>$model,'confirmation'=>$stamp)));
$before=serialize(array($wpdb->records,$wpdb->rows));$out=Gocar_Empty_Leg_Admin::presentation();
check(count($out['items'])===1 && $out['items'][0]['id']===$id,'presentation current SQL snapshot');
check(!str_contains(json_encode($out),'source_ref') && !str_contains(json_encode($out),'history'),'API projection strips internal source/history');
check($out['lease_ms']===15000 && $out['commercial_enabled']===false && $out['sellable']===false,'API stays private and inactive');
check($before===serialize(array($wpdb->records,$wpdb->rows)),'projection never writes model/history');
$publisher=false;$actor=8;check(count(Gocar_Empty_Leg_Admin::presentation()['items'])===0,'foreign author hidden');
$editor=false;err(Gocar_Empty_Leg_Admin::presentation(),'forbidden','API callback checks permission');$editor=true;$publisher=true;$actor=7;
$wpdb->refs[1001]['pricing_packages_v2'][0]['price']='999999';check(count(Gocar_Empty_Leg_Admin::presentation()['items'])===0,'live price change hides stale trip');
echo "PASS: $checks combined private API projection checks (SQL doubles only).\n";
