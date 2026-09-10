import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/database.js';
import { createProfileStore } from '../src/profile-store.js';
import { createAuth } from '../src/auth.js';
import { readConfig } from '../src/config.js';
import { createCampaignStore } from '../src/campaign-store.js';
import { deleteCampaignImage } from '../src/uploads.js';
import sharp from 'sharp';
import type { AuthMail } from '../src/mail.js';

test('real PostgreSQL: auth lifecycle, isolated profiles, CSRF, role protection and session revocation', async t => {
  const config = { ...readConfig(), NODE_ENV: 'test' as const };
  const schema = `cfc_test_${randomUUID().replaceAll('-','')}`;
  const admin = new pg.Client({ connectionString: config.DATABASE_URL });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL, options: `-c search_path=${schema}`, max: 8 });
  const mail: AuthMail[] = [];
  t.after(async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });
  const directory = new URL('../migrations/',import.meta.url);
  for(const filename of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort()) await pool.query(await readFile(new URL(filename,directory),'utf8'));
  const auth = createAuth(pool, config, async message => { mail.push(message); });
  const origin = config.CORS_ORIGINS.split(',')[0]!;
  const app = buildApp({ database: createDatabase(config.DATABASE_URL,pool), origins:[origin], auth, campaigns:createCampaignStore(pool), profiles:createProfileStore(pool), authBaseUrl:config.AUTH_BASE_URL });
  const post = (path:string, body:Record<string,unknown>, cookie?:string) => app.inject({method:'POST',url:`/api/auth/${path}`,headers:{origin,...(cookie?{cookie}:{})},payload:body});
  const me = (cookie?:string) => app.inject({url:'/v1/me',headers:cookie?{cookie}:{}});
  const save = (cookie:string,body:Record<string,unknown>,requestOrigin=origin) => app.inject({method:'PUT',url:'/v1/me/profile',headers:{cookie,origin:requestOrigin},payload:body});
  function cookieOf(response:Awaited<ReturnType<typeof post>>) {
    const value=response.headers['set-cookie'];
    return (Array.isArray(value)?value:[value??'']).map(item=>item.split(';')[0]).join('; ');
  }
  const password='A-local-test-password-123';
  const creatorEmail='creator@example.test',brandEmail='brand@example.test';
  async function signUp(email:string) {
    const response=await post('sign-up/email',{name:'Test account',email,password,callbackURL:`${config.AUTH_BASE_URL}/auth/verified`});
    assert.equal(response.statusCode,200,response.body);
    const message=[...mail].reverse().find(item=>item.to===email&&item.subject.includes('bestätigen'));
    assert.ok(message,'verification email enqueued');
    return new URL(message.text.match(/https?:\/\/[^\s]+/)![0]);
  }
  async function verify(url:URL) {
    const response=await app.inject(url.pathname+url.search);
    assert.ok([200,302].includes(response.statusCode),response.body);
  }
  const creatorLink=await signUp(creatorEmail);
  await t.test('unverified account cannot log in or read private data',async()=>{
    assert.equal((await post('sign-in/email',{email:creatorEmail,password})).statusCode,403);
    assert.equal((await me()).statusCode,401);
    assert.equal((await save('',{role:'creator'})).statusCode,401);
  });
  await verify(creatorLink);
  const creatorLogin=await post('sign-in/email',{email:creatorEmail,password});
  assert.equal(creatorLogin.statusCode,200,creatorLogin.body);
  const creatorCookie=cookieOf(creatorLogin);
  assert.ok(creatorCookie.includes('session_token'));
  const brandLink=await signUp(brandEmail);await verify(brandLink);
  const brandLogin=await post('sign-in/email',{email:brandEmail,password});
  assert.equal(brandLogin.statusCode,200,brandLogin.body);
  const brandCookie=cookieOf(brandLogin);
  const creator={role:'creator',displayName:'Creator',bio:'Reels',instagramHandle:'creator.test',location:'Berlin',languages:['Deutsch'],topics:['Food'],dealPreferences:['barter','paid'],portfolioUrls:[]};
  const brand={role:'brand',displayName:'Contact',brandName:'Test Brand',description:'A small brand',website:'https://example.test',industry:'Food',location:'Hamburg'};
  let creatorId:string;
  await t.test('onboarding is idempotent and roles own distinct profiles',async()=>{
    assert.equal((await me(creatorCookie)).json().profile,null);
    const results=await Promise.all([save(creatorCookie,creator),save(creatorCookie,creator)]);
    for(const response of results)assert.equal(response.statusCode,200,response.body);
    creatorId=results[0]!.json().id;
    assert.equal(results[1]!.json().id,creatorId);
    assert.equal((await save(brandCookie,brand)).statusCode,200);
    const own=(await me(brandCookie)).json().profile;
    assert.notEqual(own.id,creatorId);
    assert.equal(own.details.role,'brand');
    assert.equal((await pool.query('SELECT count(*) FROM profiles')).rows[0].count,'2');
  });
  await t.test('ownership cannot be injected, roles cannot be switched, and writes require a trusted origin',async()=>{
    assert.equal((await save(brandCookie,{...brand,id:creatorId})).statusCode,400);
    assert.equal((await save(creatorCookie,brand)).statusCode,409);
    assert.equal((await save(creatorCookie,creator,'https://evil.example')).statusCode,403);
    assert.equal((await save(creatorCookie,{...creator,dealPreferences:[]})).statusCode,400);
    assert.equal((await save(creatorCookie,{...creator,portfolioUrls:['https://evil.example/reel/abc/']})).statusCode,400);
    assert.equal((await save(brandCookie,{...brand,brandName:'Updated Brand'})).statusCode,200);
    assert.equal((await me(creatorCookie)).json().profile.details.displayName,'Creator');
    assert.equal((await app.inject({url:`/v1/profiles/${creatorId}`,headers:{cookie:brandCookie}})).statusCode,404);
  });
  await t.test('campaign ownership, bodyless publishing, upload validation and feed lifecycle', async () => {
    const input = { title:'Test campaign',productName:'Product',description:'Create a Reel',compensation:{type:'barter',productValueMinor:1200},currency:'EUR',reelCount:1,reelLengthSeconds:30,creatorSlots:2,contentDeadline:null,shippingRequired:true,shippingNotes:'',requiredMentions:[],minPostingDurationDays:null,usageDurationDays:null,usageChannels:[],usagePaidAdsAllowed:false };
    const request = (method:'GET'|'POST'|'PUT',url:string,payload?:object,cookie=brandCookie) => app.inject({method,url,headers:{origin,cookie},...(payload ? {payload} : {})});
    assert.equal((await request('POST','/v1/brand/campaigns',input,creatorCookie)).statusCode,403);
    assert.equal((await request('POST','/v1/brand/campaigns',{...input,brandId:randomUUID()})).statusCode,400);
    const created=await request('POST','/v1/brand/campaigns',input);
    assert.equal(created.statusCode,200,created.body);
    const id=created.json().id, url=`/v1/brand/campaigns/${id}`;
    await verify(await signUp('other-brand@example.test'));
    const otherCookie=cookieOf(await post('sign-in/email',{email:'other-brand@example.test',password}));
    assert.equal((await save(otherCookie,{...brand,brandName:'Other Brand'})).statusCode,200);
    for (const action of ['/publish','/close','/image']) {
      const payload=action==='/image'?{mimeType:'image/png',data:Buffer.from('invalid').toString('base64')}:undefined;
      assert.equal((await request('POST',url+action,payload,otherCookie)).statusCode,404);
    }
    assert.equal((await request('PUT',url,input,otherCookie)).statusCode,404);

    assert.equal((await app.inject('/v1/campaigns')).json().campaigns.length,0);
    let invoked=false;
    await assert.rejects(createCampaignStore(pool).setProductImage((await me(brandCookie)).json().user.id,randomUUID(),async()=>{invoked=true;return '/invalid';}));
    assert.equal(invoked,false,'unauthorized/missing campaign must not write a file');
    assert.equal((await request('POST',`${url}/image`,{mimeType:'image/png',data:Buffer.from('<svg/>').toString('base64')})).statusCode,400);
    assert.equal((await request('POST',`${url}/image`,{mimeType:'image/png',data:'!!!'})).statusCode,400);
    const bytes=await sharp({create:{width:2000,height:10,channels:3,background:'#123456'}}).png().toBuffer();
    const uploaded=await request('POST',`${url}/image`,{mimeType:'image/png',data:bytes.toString('base64')});
    assert.equal(uploaded.statusCode,200,uploaded.body);
    const imageUrl=uploaded.json().productImageUrl;
    try {
      const image=await app.inject(imageUrl);
      assert.equal(image.statusCode,200);
      assert.equal(image.headers['x-content-type-options'],'nosniff');
      assert.equal((await sharp(image.rawPayload).metadata()).width,1600);
      assert.equal((await request('POST',`${url}/publish`)).statusCode,200);
      assert.equal((await request('POST',`${url}/publish`)).statusCode,409);
      const feed=(await app.inject('/v1/campaigns')).json().campaigns;
      assert.equal(feed[0].productImageUrl,imageUrl);
      assert.equal((await request('POST',`${url}/close`)).statusCode,200);
      assert.equal((await request('PUT',url,input)).statusCode,409);
      assert.equal((await request('POST',`${url}/image`,{mimeType:'image/png',data:bytes.toString('base64')})).statusCode,409);
      assert.equal((await app.inject('/v1/campaigns')).json().campaigns.length,0);
    } finally { await deleteCampaignImage(imageUrl); }
  });
  await t.test('logout revokes the server-side session',async()=>{
    assert.equal((await post('sign-out',{},brandCookie)).statusCode,200);
    assert.equal((await me(brandCookie)).statusCode,401);
  });
  await t.test('password reset is one-time, rejects bad tokens, and revokes old sessions',async()=>{
    const redirectTo=`${config.AUTH_BASE_URL}/auth/reset-password`;
    const known=await post('request-password-reset',{email:creatorEmail,redirectTo});
    const unknown=await post('request-password-reset',{email:'unknown@example.test',redirectTo});
    assert.equal(known.statusCode,200,known.body);assert.deepEqual(known.json(),unknown.json());
    const message=[...mail].reverse().find(item=>item.to===creatorEmail&&item.subject.includes('zurücksetzen'))!;
    const link=new URL(message.text.match(/https?:\/\/[^\s]+/)![0]);
    const redirect=await app.inject(link.pathname+link.search);
    assert.equal(redirect.statusCode,302,redirect.body);
    const token=new URL(String(redirect.headers.location)).searchParams.get('token');assert.ok(token);
    const newPassword='A-new-local-password-456';
    assert.equal((await post('reset-password',{token:'invalid',newPassword})).statusCode,400);
    assert.equal((await post('reset-password',{token,newPassword})).statusCode,200);
    assert.equal((await post('reset-password',{token,newPassword})).statusCode,400);
    assert.equal((await me(creatorCookie)).statusCode,401);
    assert.equal((await post('sign-in/email',{email:creatorEmail,password})).statusCode,401);
    const login=await post('sign-in/email',{email:creatorEmail,password:newPassword});
    assert.equal(login.statusCode,200,login.body);
    assert.equal((await me(cookieOf(login))).json().profile.id,creatorId);
  });
});
