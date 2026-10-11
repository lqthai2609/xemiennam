"""Rebuild only this local lab; refuses changed download bytes or a different plugin source."""
import pathlib,json,subprocess,hashlib,tarfile,shutil,concurrent.futures,os
ROOT=pathlib.Path(os.environ["DAY53_LAB_ROOT"]).resolve();KIT=ROOT/'runtime/testkit'
PIN=json.loads((KIT/'download-pins.json').read_text());DOWN=ROOT/'downloads';DOWN.mkdir(exist_ok=True)
def fetch(item):
    path=DOWN/item['filename']
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:
        subprocess.run(['curl','-fsSL','--max-time','60',item['url'],'-o',str(path)],check=True)
    if hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:raise RuntimeError('Download checksum changed: '+item['filename'])
    return path
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:paths=list(pool.map(fetch,PIN))
system=ROOT/'runtime/system';system.mkdir(exist_ok=True)
for p in paths:
    if p.suffix=='.deb':subprocess.run(['dpkg-deb','-x',str(p),str(system)],check=True)
with tarfile.open(DOWN/'wordpress.tar.gz') as archive:archive.extractall(ROOT/'runtime',filter='data')
head=subprocess.check_output(['git','-C',str(ROOT/'xemiennam'),'rev-parse','HEAD'],text=True).strip()
if not (ROOT/'xemiennam/wordpress/gocar-core/gocar-core.php').read_text().count("'0.17.2'"):raise RuntimeError('Expected plugin 0.17.2 source')
source=ROOT/'xemiennam/wordpress/gocar-core'
dirty=subprocess.check_output(['git','-C',str(ROOT/'xemiennam'),'status','--porcelain','--','wordpress/gocar-core'],text=True)
if dirty:raise RuntimeError('Plugin source contains local changes')
shutil.copytree(source,ROOT/'runtime/wordpress/wp-content/plugins/gocar-core',dirs_exist_ok=True)
ext=system/'usr/lib/php/20230831'
(ROOT/'runtime/php.ini').write_text('[PHP]\nextension_dir='+str(ext)+'\n'+''.join('extension='+x+'\n' for x in ['mysqlnd','mysqli','pdo','pdo_mysql','mbstring','ctype','tokenizer','iconv','dom','xml','phar','fileinfo'])+'sendmail_path=/bin/false\nallow_url_fopen=0\nmemory_limit=256M\n')
print('Pinned runtime prepared. Run python3 runtime/testkit/run.py in the same workspace.')
