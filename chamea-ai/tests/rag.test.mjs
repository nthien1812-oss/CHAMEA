import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,documents,budgetFrom,retrieveKnowledge,retrieveProducts,safeProduct,giftProfile,recipientFromText} from '../lib/rag.mjs';
import handler from '../api/chat.mjs';
test('knowledge and catalog are present',()=>{
 assert.ok(catalog.length>=20);
 assert.ok(documents.length>=10);
 assert.ok(documents.some(d=>d.id==='demo'));
});
test('budget parsing recognises VN price notation',()=>{
 assert.equal(budgetFrom('Tìm túi dưới 800k'),800000);
 assert.equal(budgetFrom('Ngân sách khoảng 1 triệu'),1000000);
});
test('RAG returns relevant shipping knowledge',()=>{
 assert.ok(retrieveKnowledge('phí ship giao hàng Hà Nội').some(d=>d.id==='shipping'));
});
test('returns only existing catalog products',()=>{
 const found=retrieveProducts('Tìm túi hồng dưới 800k',[],'',6);
 assert.ok(found.products.length>0);
 for(const p of found.products)assert.ok(catalog.some(x=>x.id===p.id));
});
test('safe product provides real item identifiers and reviewable price',()=>{
 const p=safeProduct(catalog[0]);
 assert.equal(p.id,catalog[0].id);
 assert.equal(p.priceStatus,catalog[0].priceStatus);
 assert.ok(p.url.startsWith('/san-pham/'));
});
test('API rejects untrusted sites',async()=>{
 const req=new Request('https://example.vercel.app/api/chat',{method:'POST',headers:{origin:'https://attacker.example','content-type':'application/json'},body:JSON.stringify({message:'hi'})});
 const res=await handler.fetch(req);
 assert.equal(res.status,403);
});
test('API is safe before a key has been configured',async()=>{
 const old=process.env.GEMINI_API_KEY;
 delete process.env.GEMINI_API_KEY;
 try{
  const req=new Request('https://example.vercel.app/api/chat',{method:'POST',headers:{origin:'https://nthien1812-oss.github.io','content-type':'application/json'},body:JSON.stringify({message:'Hi'})});
  const res=await handler.fetch(req);
  assert.equal(res.status,503);
 }finally{
  if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old;
 }
});
test('Gemini output product ids are validated against retrieved catalog',async()=>{
 const oldKey=process.env.GEMINI_API_KEY;
 const oldFetch=globalThis.fetch;
 process.env.GEMINI_API_KEY='test-only';
 globalThis.fetch=async url=>{
  if(String(url).includes('/products.json'))return new Response(JSON.stringify(catalog),{status:200});
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({reply:'Đây là gợi ý sản phẩm phù hợp.',productIds:['nina-hong-dat','does-not-exist']})}]}}]}),{status:200});
 };
 try{
  const req=new Request('https://example.vercel.app/api/chat',{method:'POST',headers:{origin:'https://nthien1812-oss.github.io','content-type':'application/json','x-forwarded-for':'test-client'},body:JSON.stringify({message:'Tư vấn Nina hồng đất',productId:'nina-hong-dat'})});
  const res=await handler.fetch(req),answer=await res.json();
  assert.equal(res.status,200);
  assert.equal(answer.products.length,1);
  assert.equal(answer.products[0].id,'nina-hong-dat');
 }finally{
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
 }
});

test('brief gift inquiry understands recipient and progressively gathers preferences',()=>{
 const first=giftProfile('T muốn mua túi tặng mẹ',[]);
 assert.equal(first.gift,true);assert.equal(first.recipient,'mẹ');assert.equal(first.budget,null);
 const history=[{role:'user',content:'T muốn mua túi tặng mẹ'},{role:'model',content:'Bạn dự định dành bao nhiêu?'},{role:'user',content:'Dưới 800k'}];
 const second=giftProfile('Mẹ thích phong cách thanh lịch',history);
 assert.equal(second.gift,true);assert.equal(second.recipient,'mẹ');assert.equal(second.budget,800000);assert.equal(second.style,'thanh lịch');
 const matches=retrieveProducts('Mẹ thích phong cách thanh lịch',history,'',6);
 assert.ok(matches.products.length>0);
 assert.ok(matches.products.every(p=>p.price<=800000),'Do not count unconfirmed discounts toward a stated budget');
});
test('short gift chat asks budget first, style next, then calls Gemini with context',async()=>{
 const originalKey=process.env.GEMINI_API_KEY,originalFetch=globalThis.fetch;
 process.env.GEMINI_API_KEY='mock-test-key';
 let geminiCalls=0;
 globalThis.fetch=async url=>{
  if(String(url).includes('/products.json'))return new Response(JSON.stringify(catalog),{status:200});
  geminiCalls++;
  return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({reply:'Mẫu túi này phù hợp với phong cách thanh lịch của mẹ bạn.',productIds:[]})}]}}]}),{status:200});
 };
 const ask=async(message,history,ip)=>{
  const request=new Request('https://example.vercel.app/api/chat',{method:'POST',headers:{origin:'https://nthien1812-oss.github.io','content-type':'application/json','x-forwarded-for':ip},body:JSON.stringify({message,history})});
  const response=await handler.fetch(request);
  return {status:response.status,...await response.json()};
 };
 try{
  const first=await ask('t muốn mua túi tặng mẹ',[],'gift-unit-client-a');
  assert.equal(first.status,200);assert.match(first.reply,/mẹ/i);assert.match(first.reply,/bao nhiêu tiền/i);
  assert.equal(first.products.length,0);assert.equal(geminiCalls,0);
  const history=[{role:'user',content:'t muốn mua túi tặng mẹ'},{role:'model',content:first.reply}];
  const second=await ask('dưới 800k',history,'gift-unit-client-b');
  assert.equal(second.status,200);assert.match(second.reply,/phong cách/i);assert.equal(second.products.length,0);assert.equal(geminiCalls,0);
  history.push({role:'user',content:'dưới 800k'},{role:'model',content:second.reply});
  const third=await ask('mẹ thích thanh lịch',history,'gift-unit-client-c');
  assert.equal(third.status,200);assert.match(third.reply,/thanh lịch/i);assert.equal(geminiCalls,1);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=originalKey;
 }
});

test('recognizes named gift recipients instead of asking who the gift is for',()=>{
 const fixtures=[
  ['T muốn mua túi tặng cô giáo','cô giáo'],
  ['tôi muốn mua túi để tặng cô chủ nhiệm','cô giáo'],
  ['Mình muốn mua túi cho cô giáo nhân ngày 20/11','cô giáo'],
  ['Mình muốn tặng thầy giáo','thầy giáo'],
  ['Tôi muốn mua quà tặng đồng nghiệp','đồng nghiệp'],
  ['Cho mình chọn quà tặng sếp','sếp'],
  ['Mình muốn mua túi tặng chị gái','chị gái'],
  ['T muốn mua túi tặng mẹ','mẹ'],
  ['Tôi muốn tặng người hướng dẫn','nguoi huong dan']
 ];
 for(const [question,expected] of fixtures){
  const profile=giftProfile(question,[]);
  assert.equal(profile.gift,true,question);
  assert.equal(profile.recipient,expected,question);
 }
});
test('gift recipient persists from teacher request through short follow-ups',()=>{
 const first=giftProfile('Tặng cô giáo',[]);
 assert.equal(first.recipient,'cô giáo');
 const history=[
  {role:'user',content:'Tặng cô giáo'},
  {role:'model',content:'Bạn dự định dành bao nhiêu tiền?'},
  {role:'user',content:'800k'},
  {role:'model',content:'Cô giáo thường thích phong cách nào?'}
 ];
 const last=giftProfile('đơn giản',history);
 assert.equal(last.recipient,'cô giáo');
 assert.equal(last.budget,800000);
 assert.equal(last.style,'đơn giản');
});
test('API teacher-gifting first turn asks about budget, never recipient again',async()=>{
 const oldKey=process.env.GEMINI_API_KEY;
 process.env.GEMINI_API_KEY='mock-test-key';
 try{
  for(const message of ['Mình muốn tặng cô giáo','T muốn mua túi tặng cô giáo','Mua túi cho cô giáo','Tặng đồng nghiệp']){
   const req=new Request('https://example.vercel.app/api/chat',{method:'POST',headers:{origin:'https://nthien1812-oss.github.io','content-type':'application/json','x-forwarded-for':'test-teacher-'+message.length+'-'+message.charCodeAt(0)},body:JSON.stringify({message,history:[]})});
   const res=await handler.fetch(req),out=await res.json();
   assert.equal(res.status,200,message);
   assert.equal(out.needsMoreInfo,true,message);
   assert.match(out.reply,/bao nhiêu tiền|ngân sách/i,message);
   assert.doesNotMatch(out.reply,/tặng ai|cho ai/i,message);
  }
 }finally{if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});

test('polished consultation for 500k never implies a matching bag exists without evidence',async()=>{
 const old=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='mock';
 const ask=async (message,history,id)=>{
  const req=new Request('https://mock.vercel.app/api/chat',{
   method:'POST',headers:{origin:'https://nthien1812-oss.github.io','content-type':'application/json','x-forwarded-for':id},
   body:JSON.stringify({message,history})
  });
  const r=await handler.fetch(req);return {status:r.status,...await r.json()};
 };
 try{
  assert.equal(budgetFrom('500'),500000);
  assert.equal(budgetFrom('Ngân sách 500'),500000);
  const a=await ask('Mình muốn mua túi tặng cô giáo',[],'luxury-a');
  assert.equal(a.status,200);assert.match(a.reply,/cô giáo/i);assert.match(a.reply,/bao nhiêu/i);
  const h=[{role:'user',content:'Mình muốn mua túi tặng cô giáo'},{role:'model',content:a.reply}];
  const b=await ask('500',h,'luxury-b');
  assert.equal(b.status,200);assert.equal(b.needsMoreInfo,true);
  assert.match(b.reply,/500\.000đ/);assert.match(b.reply,/chưa có thiết kế/i);
  assert.doesNotMatch(b.reply,/đã có thể lọc|lọc túi|người bạn muốn tặng|ban hay hoi ve/i);
  assert.equal(b.products.length,0);
  assert.doesNotMatch(b.reply,/ngân sách thấp|giá rẻ/i);
 }finally{if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old}
});
test('random recipient phrase is not repeated as a person',()=>{
 assert.equal(recipientFromText('Tôi muốn mua túi tặng bạn hay hỏi về'),'một người bạn');
 assert.equal(recipientFromText('Bạn hay hỏi về là gì'),'');
 const hist=[{role:'user',content:'Muốn tặng cô giáo'},{role:'model',content:'Bạn dự định dành bao nhiêu?'},{role:'user',content:'500k'}];
 const p=giftProfile('Bạn hay hỏi về là gì',hist);
 assert.equal(p.recipient,'cô giáo');
 assert.equal(p.budget,500000);
});
test('storefront chat greeting is conditional on existing demo session and avoids transmitting a name',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../../public/app.js',import.meta.url),'utf8');
 assert.match(source,/const signedInGivenName=\(\)=>/);
 assert.match(source,/const session=demoSession\(\)/);
 assert.match(source,/const account=demoAccounts\(\)\[session\.email\]/);
 assert.match(source,/if\(!session\|\|typeof session\.email!=='string'\)return ''/);
 assert.match(source,/welcome\.textContent=greetingReply\(\)/);
 assert.match(source,/body:JSON\.stringify\(\{message:prompt,history:aiHistory\.slice\(-8\),productId:current\}\)/);
});
