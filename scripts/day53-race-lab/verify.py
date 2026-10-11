import pathlib,json,subprocess,os,uuid,hashlib,http.client,concurrent.futures,time
ROOT=pathlib.Path(os.environ["DAY53_LAB_ROOT"]).resolve();KIT=ROOT/'runtime/testkit'
PHP=[str(ROOT/'runtime/system/usr/bin/php8.3'),'-c',str(ROOT/'runtime/php.ini')]
fixtures=json.loads((ROOT/'xemiennam/scripts/fixtures/promotion-snapshot.json').read_text())
results=[]
def request(route,payload=None,token=None,headers=None):
    port=18054 if (headers or {}).get('X-Lab-Worker')=='B' else 18053
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=20)
    h={'Content-Type':'application/json'}
    if token:h['Authorization']='Bearer '+token
    h.update(headers or {})
    path='/index.php?rest_route='+route
    c.request('POST' if payload is not None else 'GET',path,json.dumps(payload) if payload is not None else None,h)
    r=c.getresponse();raw=r.read();status=r.status;response_headers=dict(r.getheaders());c.close()
    try:data=json.loads(raw)
    except Exception:raise RuntimeError('Non-JSON response: '+raw.decode(errors='replace')[:500])
    return status,data,response_headers
def inspect(key):
    return json.loads(subprocess.run(PHP+[str(KIT/'inspect.php'),key],env=os.environ,text=True,capture_output=True,check=True).stdout)
def payload(mode='fixed',key=None):
    s=fixtures[mode];p=s['pricing']
    meta={'pricing_resolution_mode':p['mode'],'pricing_resolution_reason':p['reason'],'surcharge_mode':p['surcharge']['mode']}
    for k,v in {'base_price_snapshot':p['base_price'],'estimated_total':p['estimated_total'],'price_modifier_amount':p['modifier_amount'],'surcharge_amount':p['surcharge']['amount']}.items():
        if v:meta[k]=v
    if s['tuple']:meta.update(tuyen_quan_tam=s['tuple']['route_id'],loai_xe_dat=s['tuple']['vehicle_id'])
    key=key or str(uuid.uuid4())
    return {'idempotency_key':key,'intent_version':2,'intent_hash':hashlib.sha256(('synthetic-intent:'+key).encode()).hexdigest(),'promotion_snapshot':s,'booking':{'title':'DAY53 SYNTHETIC ONLY','status':'draft','meta':meta},'acquisition':{'consent_state':'unknown'}}
def check(name,condition,evidence):
    results.append({'case':name,'status':'PASS' if condition else 'FAIL','evidence':evidence});print(name,results[-1]['status'],flush=True)
def login(user):
    status,data,_=request('/jwt-auth/v1/token',{'username':user,'password':'synthetic-user-only'})
    assert status==200,(status,data)
    return data['token']
editor=login('lab_editor')
for n in range(3):
    b=payload();key=b['idempotency_key']
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures=[pool.submit(request,'/gocar/v1/leads',b,editor,{'X-Lab-Fault':'race','X-Lab-Worker':w}) for w in ['A','B']]
        responses=[f.result() for f in futures]
    rs,replay,_=request('/gocar/v1/leads/replay',b,editor);db=inspect(key)
    check('two_worker_race_'+str(n+1),db['count']==db['reservation_rows']==1 and rs==200 and all(x[0] in (200,409) for x in responses) and all(x[1].get('id',replay.get('id'))==replay.get('id') for x in responses) and db['reservation']['id']==replay.get('id') and db['reservation']['snapshot']==fixtures['fixed'] and all(db['records'][0][k]==1 for k in ['_gocar_promotion_snapshot_v1','_gocar_lead_attribution_v1','_gocar_lead_history_v1']) and db['records'][0]['snapshot']==fixtures['fixed'] and all((KIT/'barrier'/('_gocar_lead_key_'+hashlib.sha256(key.encode()).hexdigest()+'-'+w+'-sql')).exists() for w in ['A','B']),{'worker_status':[r[0] for r in responses],'worker_ids':[r[1].get('id') for r in responses],'replay_status':rs,'replay_id':replay.get('id'),'db':db})

# Targeted controls for branches changed by the reservation fix.
b=payload();key=b['idempotency_key'];status,first,_=request('/gocar/v1/leads',b,editor)
for endpoint in ['/gocar/v1/leads','/gocar/v1/leads/replay']:
    status,data,_=request(endpoint,b,editor,{'X-Lab-Fault':'stale_cache'});db=inspect(key)
    check('authoritative_sql_'+endpoint.rsplit('/',1)[-1],status==200 and data.get('id')==first.get('id') and db['count']==1,{'status':status,'id':data.get('id'),'count':db['count']})
b['intent_hash']='b'*64;status,data,_=request('/gocar/v1/leads',b,editor)
check('same_key_different_intent',status==409 and data.get('code')=='key_conflict' and inspect(key)['count']==1,{'status':status,'code':data.get('code')})
b=payload();key=b['idempotency_key'];status,first,_=request('/gocar/v1/leads',b,editor,{'X-Lab-Fault':'before_insert'})
rs,replay,_=request('/gocar/v1/leads/replay',b,editor);cs,retry,_=request('/gocar/v1/leads',b,editor);db=inspect(key)
check('pending_never_released',status==502 and rs==cs==409 and db['count']==0 and db['reservation_rows']==1,{'statuses':[status,rs,cs],'db':db})
b=payload();key=b['idempotency_key'];status,first,_=request('/gocar/v1/leads',b,editor,{'X-Lab-Fault':'lost_response'})
rs,replay,_=request('/gocar/v1/leads/replay',b,editor);cs,retry,_=request('/gocar/v1/leads',b,editor);db=inspect(key)
check('lost_response_replays_original',status==504 and rs==cs==200 and replay.get('id')==retry.get('id') and db['count']==1 and replay.get('promotion_snapshot')==fixtures['fixed'],{'statuses':[status,rs,cs],'db':db})
mysql=str(ROOT/'runtime/system/usr/bin/mysql')
def sql(q):
    return subprocess.run([mysql,'--protocol=TCP','--host=127.0.0.1','--port=33077','--user=root','-e',q],env=os.environ,text=True,capture_output=True,check=True)
b=payload();key=b['idempotency_key']
try:
    sql("REVOKE INSERT ON alodatxe_day53_lab.* FROM 'day53_lab'@'127.0.0.1'")
    status,data,_=request('/gocar/v1/leads',b,editor);db=inspect(key)
    check('database_write_error_is_503',status==503 and data.get('code')=='lead_reservation_failed' and db['count']==db['reservation_rows']==0,{'status':status,'code':data.get('code'),'db':db})
finally:
    sql("GRANT INSERT ON alodatxe_day53_lab.* TO 'day53_lab'@'127.0.0.1'")
summary={'executed_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'source_base':'36e20ea7939cadf78b578ccb05c34d84632fe4e1','plugin_version':'0.17.2','source':subprocess.check_output(['git','-C',str(ROOT/'xemiennam'),'rev-parse','HEAD'],text=True).strip(),'pass':sum(r['status']=='PASS' for r in results),'fail':sum(r['status']=='FAIL' for r in results),'results':results,'production_changed':False,'data':'synthetic only','auth':'Editor/subscriber JWT via separately installed test plugin','scope':'Real WordPress REST + MySQL; test-only CPT dependency and real hook fault injection; no frontend or production parity certification'}
(KIT/'results.json').write_text(json.dumps(summary,indent=2,ensure_ascii=False));print(json.dumps({'pass':summary['pass'],'fail':summary['fail']}))

if summary["fail"]: raise SystemExit(1)
