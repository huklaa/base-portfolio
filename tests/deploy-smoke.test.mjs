import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync('index.html','utf8');
const share=fs.readFileSync('share-tools.js','utf8');
const fixes=fs.readFileSync('production-fixes.js','utf8');
const exportJs=fs.readFileSync('public-export.js','utf8');
const schema=JSON.parse(fs.readFileSync('profile.schema.json','utf8'));

for(const asset of ['./styles.css','./mobile.css','./app.js','./share-tools.js']){
  assert.match(index,new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`index.html must reference ${asset}`);
}
for(const asset of ['./product-polish.css','./product-polish.js','./compare.js']){
  assert.match(share,new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`share-tools.js must load ${asset}`);
  const local=asset.replace('./','');
  assert.equal(fs.existsSync(local),true,`${local} must exist`);
}
for(const asset of ['./wallet-health.css?v=20260823-1','./wallet-health.js?v=20260823-1']){
  assert.match(fixes,new RegExp(asset.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`production-fixes.js must load ${asset}`);
}
assert.equal(fs.existsSync('wallet-health.css'),true,'wallet-health.css must exist');
assert.equal(fs.existsSync('wallet-health.js'),true,'wallet-health.js must exist');
assert.match(exportJs,/https:\/\/base-portfolio\.xyz\/profile\.schema\.json/);
assert.equal(schema.$id,'https://base-portfolio.xyz/profile.schema.json');
assert.match(index,/id="addressInput"/);
assert.match(index,/id="dashboard"/);
console.log('deploy smoke tests passed');
