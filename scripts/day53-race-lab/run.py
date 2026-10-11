import os, pathlib, subprocess, json, time, secrets, socket, zipfile, signal, hashlib

ROOT=pathlib.Path(os.environ["DAY53_LAB_ROOT"]).resolve()
LAB=ROOT/'runtime'; WP=LAB/'wordpress'; KIT=LAB/'testkit'; SYS=LAB/'system'
env=os.environ.copy(); env['LD_LIBRARY_PATH']=str(SYS/'usr/lib/x86_64-linux-gnu')
PHP=[str(SYS/'usr/bin/php8.3'),'-c',str(LAB/'php.ini')]
def run(args,**kw):
    return subprocess.run(args,env=env,text=True,capture_output=True,check=True,**kw)
def wp(*args):
    result=run(PHP+[str(ROOT/'downloads/wp-cli.phar'),'--allow-root','--path='+str(WP),*args])
    return result.stdout.strip()
def sql(query):
    return run([str(SYS/'usr/bin/mysql'),'--protocol=TCP','--host=127.0.0.1','--port=33077','--user=root','--batch','--skip-column-names','-e',query]).stdout.strip()

def plugin_hashes(path):
    return {str(p.relative_to(path)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(path.rglob('*')) if p.is_file()}
source_hashes=plugin_hashes(ROOT/'xemiennam/wordpress/gocar-core')
if source_hashes != plugin_hashes(WP/'wp-content/plugins/gocar-core'):
    raise RuntimeError('Lab plugin bytes differ from the source checkout')
(KIT/'plugin-source-hashes.json').write_text(json.dumps(source_hashes,indent=2))

processes=[]
try:
    datadir=LAB/'mysql-data';datadir.mkdir(exist_ok=True)
    mysqld=SYS/'usr/sbin/mysqld'
    if not (datadir/'auto.cnf').exists():
        result=run([str(mysqld),'--no-defaults','--initialize-insecure','--user=root','--basedir='+str(SYS/'usr'),'--datadir='+str(datadir)])
        (KIT/'mysql-initialize.log').write_text(result.stderr)
    logfile=(KIT/'mysql.log').open('a')
    db=subprocess.Popen([str(mysqld),'--no-defaults','--user=root','--basedir='+str(SYS/'usr'),'--datadir='+str(datadir),'--bind-address=127.0.0.1','--port=33077','--socket=','--pid-file='+str(LAB/'mysql.pid'),'--mysqlx=OFF','--secure-file-priv=NULL','--skip-log-bin'],env=env,stdout=logfile,stderr=logfile)
    processes.append(db)
    for _ in range(100):
        if db.poll() is not None: raise RuntimeError('MySQL exited; inspect mysql.log')
        try: sql('SELECT 1');break
        except subprocess.CalledProcessError: time.sleep(.1)
    sql("CREATE DATABASE IF NOT EXISTS alodatxe_day53_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'day53_lab'@'127.0.0.1' IDENTIFIED BY 'synthetic-local-only'; GRANT ALL PRIVILEGES ON alodatxe_day53_lab.* TO 'day53_lab'@'127.0.0.1';")
    config="""<?php
define('DB_NAME','alodatxe_day53_lab');define('DB_USER','day53_lab');define('DB_PASSWORD','synthetic-local-only');define('DB_HOST','127.0.0.1:33077');define('DB_CHARSET','utf8mb4');define('DB_COLLATE','');
define('WP_ENVIRONMENT_TYPE','local');define('WP_HOME','http://127.0.0.1:18053');define('WP_SITEURL','http://127.0.0.1:18053');define('WP_HTTP_BLOCK_EXTERNAL',true);define('DISABLE_WP_CRON',true);define('AUTOMATIC_UPDATER_DISABLED',true);define('DISALLOW_FILE_MODS',true);define('WP_DEBUG',true);define('WP_DEBUG_LOG',true);define('WP_DEBUG_DISPLAY',false);
$table_prefix='lab53_';
"""
    for name in ['AUTH_KEY','SECURE_AUTH_KEY','LOGGED_IN_KEY','NONCE_KEY','AUTH_SALT','SECURE_AUTH_SALT','LOGGED_IN_SALT','NONCE_SALT','JWT_AUTH_SECRET_KEY']:
        config+=f"define('{name}','{secrets.token_hex(32)}');\n"
    config+="if(!defined('ABSPATH'))define('ABSPATH',__DIR__.'/');require_once ABSPATH.'wp-settings.php';\n"
    (WP/'wp-config.php').write_text(config);(WP/'wp-config.php').chmod(0o600)
    mu=WP/'wp-content/mu-plugins';mu.mkdir(exist_ok=True)
    (mu/'day53-lab-safety.php').write_bytes((KIT/'lab-safety.php').read_bytes())
    with zipfile.ZipFile(ROOT/'downloads/jwt.zip') as z:z.extractall(WP/'wp-content/plugins')
    installed=(datadir/'alodatxe_day53_lab/lab53_options.ibd').exists()
    if not installed:
        wp('core','install','--url=http://127.0.0.1:18053','--title=Day53 Synthetic Lab','--admin_user=lab_admin','--admin_password=synthetic-admin-only','--admin_email=admin@example.invalid','--skip-email')
    wp('option','update','blog_public','0')
    wp('plugin','activate','gocar-core','jwt-authentication-for-wp-rest-api')
    for user,role in [('lab_editor','editor'),('lab_viewer','subscriber')]:
        try:wp('user','get',user,'--field=ID')
        except subprocess.CalledProcessError:wp('user','create',user,user+'@example.invalid','--role='+role,'--user_pass=synthetic-user-only')
    versions={'wordpress':wp('core','version'),'php':run(PHP+['-r','echo PHP_VERSION;']).stdout,'mysql':sql('SELECT VERSION()'),'plugin':wp('plugin','get','gocar-core','--field=version'),'jwt_plugin':wp('plugin','get','jwt-authentication-for-wp-rest-api','--field=version'),'plugin_tree_sha256':hashlib.sha256(json.dumps(source_hashes,sort_keys=True).encode()).hexdigest(),'source':run(['git','-C',str(ROOT/'xemiennam'),'rev-parse','HEAD']).stdout.strip(),'db_binding':'127.0.0.1:33077','http_bindings':['127.0.0.1:18053','127.0.0.1:18054'],'db_name':'alodatxe_day53_lab','external_http':'blocked','cron':'disabled','sendmail':'/bin/false','workers':'two independent PHP server processes'}
    (KIT/'versions.json').write_text(json.dumps(versions,indent=2))
    serverenv=env.copy();serverenv.pop('PHP_CLI_SERVER_WORKERS',None)
    router=KIT/'router.php';router.write_text("<?php if(parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH)==='/') { require '"+str(WP/ 'index.php')+"'; } else { return false; }\n")
    httplog=(KIT/'http.log').open('w')
    server=subprocess.Popen(PHP+['-S','127.0.0.1:18053','-t',str(WP)],env=serverenv,stdout=httplog,stderr=httplog,start_new_session=True)
    processes.append(server)
    server_b=subprocess.Popen(PHP+['-S','127.0.0.1:18054','-t',str(WP)],env=serverenv,stdout=httplog,stderr=httplog,start_new_session=True)
    processes.append(server_b)
    for _ in range(100):
        try:
            with socket.create_connection(('127.0.0.1',18053),timeout=.1):break
        except OSError:time.sleep(.1)
    result=run(['python3',str(KIT/'verify.py')]);print(result.stdout,flush=True)
    # Independently verify that a call to wp_mail cannot reach any transport.
    result=wp('eval',"echo wp_mail('sink@example.invalid','Synthetic','Synthetic') ? 'UNSAFE' : 'BLOCKED';")
    assert result=='BLOCKED',result
    (KIT/'email-proof.json').write_text(json.dumps({'wp_mail_probe':'BLOCKED','blocked_calls':(KIT/'mail-blocked.log').read_text().count('blocked'),'sendmail_path':'/bin/false','real_emails_sent':0},indent=2))
    print('Email transport: BLOCKED. Processes will be stopped.',flush=True)
except subprocess.CalledProcessError as exc:
    print('COMMAND FAILED',exc.stdout[-2000:],exc.stderr[-4000:],flush=True);raise
finally:
    for p in reversed(processes):
        if p.poll() is None:
            if p is not processes[0]:os.killpg(p.pid,signal.SIGTERM)
            else:p.terminate()
            try:p.wait(timeout=10)
            except subprocess.TimeoutExpired:p.kill()
