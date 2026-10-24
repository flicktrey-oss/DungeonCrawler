import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
assert(!/<script\b[^>]*\bsrc=|<link\b[^>]*\brel="stylesheet"/.test(html),'Published page must not depend on external scripts or styles');
const broken=html.replace(/<script type="module">[\s\S]*?<\/script>/,'');
const server=createServer((request,response)=>{const path=new URL(request.url,'http://localhost').pathname;if(['/','/DungeonCrawler','/DungeonCrawler/','/broken/'].includes(path)){response.writeHead(200,{'Content-Type':'text/html'});response.end(path==='/broken/'?broken:html);}else{response.writeHead(404);response.end('No external assets are available');}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
 for(const phone of [false,true])for(const path of ['/','/DungeonCrawler','/DungeonCrawler/']){
  const context=await browser.newContext(phone?{viewport:{width:390,height:844},isMobile:true,hasTouch:true}:{viewport:{width:1366,height:768}}),page=await context.newPage(),errors=[],assets=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(['script','stylesheet'].includes(request.resourceType()))assets.push(request.url());});
  await page.goto(base+path+'?v=production-check');await page.getByRole('button',{name:'New Game',exact:true}).waitFor();assert.equal(await page.locator('#load-failure').isVisible(),false);assert.notEqual(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--panel')),'');
  await page.getByRole('button',{name:'New Game',exact:true}).click();assert.match(await page.locator('.floor').innerText(),/TURN 0/);await page.waitForTimeout(150);assert.match(await page.locator('.floor').innerText(),/TURN 0/);
  if(phone)await page.getByRole('button',{name:'Move east',exact:true}).tap();else await page.keyboard.press('d');assert.match(await page.locator('.floor').innerText(),/TURN 1/);assert.deepEqual(errors,[]);assert.deepEqual(assets,[]);
  console.log(`PASS ${phone?'phone':'desktop'} ${path}: styles, startup, movement, no external assets`);await context.close();
 }
 const page=await browser.newPage();await page.clock.install();await page.goto(base+'/broken/');await page.clock.runFor(13000);assert.equal(await page.locator('#load-failure').isVisible(),true);assert.match(await page.locator('#load-status').innerText(),/could not finish loading/);assert.equal(await page.locator('#app').isVisible(),false);assert.match(await page.locator('#reload-game').getAttribute('href'),/reload=\d+/);await page.close();console.log('PASS failed startup: clear recovery screen, no unstyled controls');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
