import bundledCatalog from '../data/catalog.json' with { type: 'json' };
import knowledge from '../data/knowledge.json' with { type: 'json' };

const STOP=new Set('va la co cho toi ban minh cua nen duoc trong theo mot hay khi den gi voi de duoc khong khau can loai nhung nay kia nao cai tui xach san pham gia'.split(' '));
const COLORS=['den','hong','do','tim','trang','kem','be','nau','xanh','xam','vang'];
const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const words=s=>normalize(s).split(' ').filter(x=>x.length>1&&!STOP.has(x));
const has=(sentence,phrase)=>(' '+normalize(sentence)+' ').includes(' '+normalize(phrase)+' ');
export const catalog=Array.isArray(bundledCatalog)?bundledCatalog:[];
export const documents=knowledge;
export const formatVnd=n=>Number(n).toLocaleString('vi-VN')+'đ';

export function budgetFrom(text){
 const q=normalize(text);
 let m=q.match(/(?:duoi|khong qua|toi da|tam|khoang|ngan sach|gia|chi|toi|tu)\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan|dong)?\b/);
 if(!m)m=q.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan)\b/);
 if(!m)return null;
 let n=Number(m[1].replace(',','.')),unit=m[2]||'';
 if(unit==='trieu'||unit==='tr')n*=1e6;
 else if(['k','nghin','ngan'].includes(unit))n*=1e3;
 else if(unit==='dong' || n>=100000){} else if(n<=20)n*=1e6;else if(n<10000)n*=1e3;
 return n>=100000 && n<=10000000?Math.round(n):null;
}
function docScore(doc,q,tokens){
 const phrase=normalize(doc.title+' '+doc.keywords.join(' ')+' '+doc.text);
 let score=0;
 for(const w of tokens)if(phrase.includes(w))score+=w.length>=5?2:1;
 for(const keyword of doc.keywords)if(has(q,keyword))score+=5;
 if(has(q,doc.title))score+=12;
 return score;
}
export function retrieveKnowledge(question,limit=4){
 const q=normalize(question),tokens=words(question);
 const matches=documents.map(d=>({d,score:docScore(d,q,tokens)})).sort((a,b)=>b.score-a.score);
 const items=matches.filter(x=>x.score>0).slice(0,limit).map(x=>x.d);
 if(!items.some(x=>x.id==='demo'))items.push(documents.find(x=>x.id==='demo'));
 return items.filter(Boolean);
}
function findExplicitFamily(q,all){
 const families=[...new Set(all.map(p=>p.family).filter(Boolean))].sort((a,b)=>b.length-a.length);
 return families.find(f=>has(q,f))||'';
}
function pickColor(q){
 return COLORS.find(c=>has(q,c))||'';
}
function productScore(p,q,tokens,filters,ctxId){
 const hay=normalize([p.name,p.family,p.color,p.shape,p.desc,...(p.styles||[]),...(p.uses||[])].join(' '));
 let score=0;
 for(const w of tokens)if(hay.includes(w))score+=1;
 if(ctxId===p.id)score+=8;
 if(q.includes(normalize(p.name)))score+=18;
 if(q.includes(normalize(p.id).replace(/ /g,' ')))score+=20;
 if(filters.family&&normalize(p.family)===normalize(filters.family))score+=12;
 if(filters.color && has(p.color,filters.color))score+=7;
 if(filters.shape && has(p.shape,filters.shape))score+=7;
 if(filters.use && (p.uses||[]).some(u=>has(u,filters.use)))score+=6;
 if(filters.budget && Number(p.price)*0.8<=filters.budget)score+=4;
 return score;
}
export function retrieveProducts(question,history=[],ctxId='',limit=6,list=catalog){
 const q=normalize(question);
 const recent=history.filter(x=>x.role==='user').slice(-2).map(x=>x.content).join(' ');
 const combined=normalize(recent+' '+question);
 const family=findExplicitFamily(combined,list);
 const color=pickColor(combined);
 const negative=combined.match(/(?:khong thich|tranh|khong muon|bo mau)\s+(?:mau\s+)?(den|hong|do|tim|trang|kem|be|nau|xanh|xam|vang)/);
 const budget=budgetFrom(question)||budgetFrom(recent);
 const shape=['tote','deo vai','deo cheo','xach tay'].find(x=>has(combined,x))||'';
 const use=['di lam','di choi','di hoc','hen ho','du tiec'].find(x=>has(combined,x))||'';
 const filters={budget,color:negative?null:color,excludeColor:negative?.[1]||null,shape,use,family};
 const all=list.filter(p=>p?.id&&p.name);
 const strict=all.filter(p=>(!budget||Number(p.price)*.8<=budget)&&(!filters.color||has(p.color,filters.color))&&(!filters.excludeColor||!has(p.color,filters.excludeColor))&&(!shape||has(p.shape,shape))&&(!family||normalize(p.family)===normalize(family)));
 const exact=strict.length>0;
 const pool=exact?strict:all.filter(p=>!filters.excludeColor||!has(p.color,filters.excludeColor));
 const tokens=words(combined);
 const ranked=pool.map(p=>({p,score:productScore(p,q,tokens,filters,ctxId)})).sort((a,b)=>b.score-a.score||Number(a.p.price)-Number(b.p.price));
 const named=Boolean(family||ctxId||all.some(p=>has(q,p.name)));
 const dedup=new Set();
 const picks=ranked.filter(({p})=>{if(!named && dedup.has(p.family))return false;dedup.add(p.family);return true}).slice(0,limit).map(x=>x.p);
 return {products:picks,filters,exact,hasConstraints:!!(budget||color||shape||family||use)};
}
export function safeProduct(p,discount=.2){
 const p0=Number(p.price||0),sale=Math.round(p0*(1-discount));
 return {id:p.id,name:p.name,family:p.family,color:p.color,shape:p.shape,styles:p.styles||[],uses:p.uses||[],listPrice:p0,illustrativeSalePrice:sale,priceStatus:p.priceStatus||'unknown',summary:p.desc||'',details:p.details||{},url:'/san-pham/'+encodeURIComponent(p.id),image:'/CHAMEA/assets/'+encodeURI(p.image||'')};
}
