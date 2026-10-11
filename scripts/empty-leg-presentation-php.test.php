<?php
// Pure server projection with synthetic model/reference; no business records or CMS writes.
define('ABSPATH',__DIR__);
function add_action(...$a){} function add_filter(...$a){}
require __DIR__.'/../wordpress/gocar-core/includes/class-gocar-empty-leg.php';
$f=json_decode(file_get_contents(__DIR__.'/fixtures/empty-leg.json'),true);
$now=strtotime($f['base']['valid_from']);$checks=0;
function check($ok,$name){global $checks;$checks++;if(!$ok){fwrite(STDERR,"FAIL: $name\n");exit(1);}}
$stamp=array('actor'=>7,'at'=>gmdate('Y-m-d\TH:i:s\Z',$now),'revision'=>1,'source_ref'=>$f['base']['approval']['source_ref']);
$stored=array('model'=>$f['base'],'confirmation'=>$stamp,'history'=>array('PRIVATE'));
$ref=fn($s)=>$f['reference'];$title=fn($id)=>'Synthetic public label';
$project=fn($s,$r=null,$t=null)=>Gocar_Empty_Leg::presentation(4001,$s,$r??$ref,$t??$now,$title);
$c=$project($stored);check(is_array($c),'confirmed eligible card');
check($c['normal_price_vnd']===1000000 && $c['special_price_vnd']===700000 && $c['direction']==='inbound','exact price and direction');
check(!isset($c['confirmation']) && !isset($c['history']) && !isset($c['source_ref']) && !isset($c['scope']),'minimal projection no private fields');
foreach(array('draft','inactive','reserved','completed','cancelled') as $status){$s=$stored;$s['model']['status']=$status;check($project($s)===null,'hide '.$status);}
check($project($stored,null,$now-1)===null,'not yet valid');check($project($stored,null,strtotime($f['base']['expires_at']))===null,'exact expiry');
foreach(array(null,array(),array_merge($stamp,array('revision'=>2)),array_merge($stamp,array('actor'=>0)),array_merge($stamp,array('source_ref'=>'other')),array_merge($stamp,array('at'=>'2030-02-30T00:00:00Z')),array_merge($stamp,array('at'=>gmdate('Y-m-d\TH:i:s\Z',$now+1)))) as $stampBad){$s=$stored;$s['confirmation']=$stampBad;check($project($s)===null,'missing or mismatched server stamp');}
foreach(array('normalPriceVnd'=>999999,'pricingMode'=>'contact','activationReady'=>false,'mappingBlocked'=>true,'prelaunch'=>true,'readinessVersion'=>2,'exists'=>false) as $k=>$v){$r=$f['reference'];$r[$k]=$v;check($project($stored,fn($s)=>$r)===null,'fresh gate '.$k);}
check($project($stored,fn($s)=>throw new Exception('offline'))===null,'unavailable reference');
check(Gocar_Empty_Leg::presentation(1,$stored,$ref,$now,fn($id)=>'<script>')===null,'invalid labels');
check(Gocar_Empty_Leg::COMMERCIAL_ENABLED===false,'commercial flag off');
echo "PASS: $checks server presentation checks; isolated fixtures only.\n";
