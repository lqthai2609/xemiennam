<?php
/** Test dependency and fault injection; never install on a real site. */
if (!defined('ABSPATH') || wp_get_environment_type() !== 'local') { exit; }
add_filter('pre_wp_mail', function($return, $atts) {
    file_put_contents(ABSPATH . '../testkit/mail-blocked.log', "blocked\n", FILE_APPEND | LOCK_EX);
    return false;
}, PHP_INT_MAX, 2);
add_filter('pre_http_request', fn() => new WP_Error('lab_network_blocked', 'External HTTP disabled.'), PHP_INT_MAX);
add_action('init', function() {
    register_post_type('booking_request', ['public'=>false,'show_in_rest'=>true,'rest_base'=>'booking_request','supports'=>['title','custom-fields'],'capability_type'=>'post','map_meta_cap'=>true]);
    foreach (['tuyen_quan_tam','loai_xe_dat'] as $key) {
        register_post_meta('booking_request',$key,['type'=>'integer','single'=>true,'show_in_rest'=>true,'auth_callback'=>fn($allowed,$key,$id)=>current_user_can('edit_post',$id)]);
    }
}, 5);
function lab_fault() { return $_SERVER['HTTP_X_LAB_FAULT'] ?? ''; }
add_filter('rest_pre_insert_booking_request', function($post) {
    return lab_fault()==='before_insert' ? new WP_Error('lab_before_insert','Synthetic failure',['status'=>502]) : $post;
}, 99);
add_filter('rest_request_after_callbacks', function($response,$handler,$request) {
    if ($request->get_route() !== '/wp/v2/booking_request' || is_wp_error($response)) return $response;
    if (lab_fault()==='malformed') return new WP_REST_Response([],200);
    if (lab_fault()==='error_after_insert') return new WP_Error('lab_after_insert','Synthetic response error',['status'=>502]);
    return $response;
}, 99, 3);
add_filter('add_post_metadata', function($check,$id,$key) {
    return lab_fault()==='snapshot_failure' && $key==='_gocar_promotion_snapshot_v1' ? false : $check;
}, 99, 3);
add_filter('rest_pre_serve_request', function($served,$response,$request) {
    if (lab_fault()==='lost_response' && $request->get_route()==='/gocar/v1/leads') {
        status_header(504); echo '{"code":"lab_response_lost"}'; return true;
    }
    return $served;
},99,3);
add_filter('query', function($sql) {
    // Observe and delay the real INSERT; never replace SQL or its return value.
    if (lab_fault() !== 'race' || !preg_match("/INSERT INTO [`]?lab53_options[`]?.*'(_gocar_lead_key_[a-f0-9]{64})'/s",$sql,$match)) return $sql;
    $option=$match[1]; $worker=$_SERVER['HTTP_X_LAB_WORKER'] ?? '';
    if (!in_array($worker,['A','B'],true)) return $sql;
    $dir=ABSPATH.'../testkit/barrier/'; if (!is_dir($dir)) mkdir($dir,0700,true);
    file_put_contents($dir.$option.'-'.$worker,'ready');
    $deadline=microtime(true)+10;
    while (!(file_exists($dir.$option.'-A') && file_exists($dir.$option.'-B'))) {
        if(microtime(true)>$deadline) throw new RuntimeException('Race barrier timed out');
        usleep(10000);
    }
    if($worker==='B') usleep(1000000);
    file_put_contents($dir.$option.'-'.$worker.'-sql',$sql);
    return $sql;
},10,1);

add_filter('rest_request_before_callbacks', function($response,$handler,$request) {
    if (lab_fault() !== 'stale_cache') return $response;
    $key=$request->get_param('idempotency_key');
    if (!is_string($key)) return $response;
    $option='_gocar_lead_key_'.hash('sha256',$key);
    wp_cache_set($option,serialize(['fingerprint'=>'obsolete-cache','intent_version'=>1,'id'=>999999]),'options');
    wp_cache_set('notoptions',[$option=>true],'options');
    return $response;
},99,3);
