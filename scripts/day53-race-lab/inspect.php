<?php
require __DIR__.'/../wordpress/wp-load.php';
$key=$argv[1]??''; $hash=hash('sha256',$key); $option='_gocar_lead_key_'.$hash;
$ids=$wpdb->get_col($wpdb->prepare("SELECT p.ID FROM {$wpdb->posts} p JOIN {$wpdb->postmeta} m ON p.ID=m.post_id WHERE p.post_type='booking_request' AND m.meta_key='_gocar_lead_request_key_hash' AND m.meta_value=%s ORDER BY p.ID",$hash));
$rows=[];
foreach($ids as $id) {
    $row=['id'=>(int)$id];
    foreach(['_gocar_promotion_snapshot_v1','_gocar_lead_attribution_v1','_gocar_lead_history_v1'] as $meta) $row[$meta]=count(get_post_meta($id,$meta,false));
    $row['snapshot']=Gocar_Promotion_Snapshot::read((int)$id); $rows[]=$row;
}
echo json_encode(['count'=>count($ids),'records'=>$rows,'reservation'=>get_option($option),'reservation_rows'=>(int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->options} WHERE option_name=%s",$option)),'reservation_autoload'=>$wpdb->get_var($wpdb->prepare("SELECT autoload FROM {$wpdb->options} WHERE option_name=%s",$option)),'total_leads'=>(int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type='booking_request'")],JSON_UNESCAPED_SLASHES);
