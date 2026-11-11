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
 // A visitor may answer the budget question with only "500" (meaning 500k).
 if(!m)m=q.match(/^(\d{3,7})(?:\s*(k|tr|trieu|nghin|ngan))?$/);
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
// Recognise real gift recipients in Vietnamese (with or without diacritics).
// Extract from the newest turn first, then inherit previously stated recipients.
const giftWords=/\b(tang|qua tang|qua cho|chon qua|mua qua|mua tui cho|tim tui cho|tui tang|tui cho|chuan bi qua|lam qua|mua qua cho)\b/;
const RECIPIENT_ALIASES=[
 [['co giao','co chu nhiem','co day hoc','co day','co gia su','co day kem'],'cô giáo'],
 [['thay giao','thay chu nhiem','thay day hoc','thay day','thay gia su'],'thầy giáo'],
 [['thay co','giao vien','nguoi day'],'thầy/cô giáo'],
 [['me chong'],'mẹ chồng'],[['me vo'],'mẹ vợ'],
 [['me','ma','mom','mama'],'mẹ'],[['bo','ba ruot','cha'],'bố'],
 [['chi gai'],'chị gái'],[['em gai'],'em gái'],[['anh trai'],'anh trai'],[['em trai'],'em trai'],
 [['ba ngoai'],'bà ngoại'],[['ba noi'],'bà nội'],[['ong ngoai'],'ông ngoại'],[['ong noi'],'ông nội'],
 [['nguoi yeu','ban gai'],'bạn gái'],[['ban trai'],'bạn trai'],
 [['vo'],'vợ'],[['chong'],'chồng'],
 [['sep nu','sep'],'sếp'],[['dong nghiep'],'đồng nghiệp'],[['quan ly'],'quản lý'],
 [['ban than'],'bạn thân'],[['ban cung lop','ban hoc'],'bạn học'],
 [['co hang xom'],'cô hàng xóm'],[['di','co ruot'],'cô/dì'],[['bac gai'],'bác gái'],
 [['ban be','mot nguoi ban','nguoi ban'],'bạn bè']
];
export function recipientFromText(input){
 const q=normalize(input);
 for(const [aliases,recipient] of RECIPIENT_ALIASES){
  if(aliases.some(a=>has(q,a)))return recipient;
 }
 // For a previously unseen relationship, still recognise the object of "tặng"
 // rather than repeating "Bạn định tặng ai?".
 const m=q.match(/\b(?:tang|qua cho|lam qua cho|mua tui cho|mua qua cho|chon qua cho)\s+(?:cho\s+)?([a-z]+(?:\s+[a-z]+){0,3})/);
 if(!m)return '';
 const stop=new Set(['qua','tui','xach','mua','tang','cho','vao','nhan','dip','de','voi','ngan','sach','gia','khoang','tam','duoi','tren','bao','nhieu','muon','tim','hay','hoi','ve','la','j','gi','nhe','a','nha','nua','bang']);
 const candidates=m[1].split(' ');
 if(candidates[0]==='ban')return 'một người bạn'; // Never repeat accidental text such as "ban hay hoi ve".
 // Avoid treating conversational filler as a person's name. For unfamiliar recipients,
 // require a relationship/person noun rather than echoing arbitrary words after "tặng".
 const relationHeads=new Set(['nguoi','co','thay','bac','di','chu','cau','anh','chi','em','ong','ba','me','bo','sep','dong']);
 if(!relationHeads.has(candidates[0]))return '';
 const extracted=[];
 for(const w of candidates){if(stop.has(w)||/\d/.test(w))break;extracted.push(w);}
 return extracted.length?extracted.join(' '):'';
}
// Classify the current customer message BEFORE using conversation memory.
// This stops old gift questions from hijacking a greeting, new product request or policy question.
export function currentTurnKind(message){
 const q=normalize(message);
 if(!q)return 'empty';
 if(/^(?:xin chao|chao|chao ban|chao shop|chao chamea|chao em|chao a|hi|hii|hello|hey|alo|a lo|good morning|chao buoi sang|chao buoi chieu|chao buoi toi|hello shop)(?: nhe| nha| a| em)?$/.test(q))return 'greeting';
 if(/^(?:cam on|cam on ban|cam on shop|cam on nhe|cam on nha|thanks|thank you|thank you so much|tks|thank u|da cam on|oke cam on|ok cam on)$/.test(q))return 'thanks';
 if(/^(?:tam biet|hen gap lai|bye|bye bye|goodbye|chao tam biet|hen gap|bai bai)$/.test(q))return 'goodbye';
 if(/^(?:bat dau lai|tu van lai|lam lai|xoa loc|bo loc|doi chu de|lam moi cuoc tro chuyen)$/.test(q))return 'reset';
 if(/\b(doi tra|bao hanh|giao hang|phi ship|ship|phi van chuyen|thanh toan|cod|chuyen khoan|hotline|lien he|so dien thoai|email|dia chi|kiem tra don|don hang|chinh sach|bao quan|ve sinh|doi hang|hoan tien|phieu bao hanh|thoi gian giao)\b/.test(q))return 'support';
 if(giftWords.test(q))return 'gift';
 if(/\b(so sanh|khac nhau|chat lieu|lam bang gi|kich thuoc|trong luong|co mau|mau sac|san pham|bo suu tap|mau tui|kieu tui|tui nao|tim tui|chon tui|tu van tui|mua tui|muon tui|tui xach|tote|deo vai|deo cheo|xach tay|bao nhieu tien|gia bao nhieu|gia mau|xem tui|cho xem|mau nao|co nhung mau nao|gia cua)\b/.test(q))return 'product';
 return 'other';
}
export function giftProfile(question,history=[]){
 const userTurns=[...(Array.isArray(history)?history:[]).filter(x=>x.role==='user').slice(-8).map(x=>x.content),question];
 const lastGiftIndex=userTurns.findLastIndex(x=>giftWords.test(normalize(x)));
 const active=lastGiftIndex>=0?userTurns.slice(lastGiftIndex):[question];
 const previous=active.slice(0,-1);
 const combined=normalize(active.join(' '));
 const recipient=[question,...previous.slice().reverse()].map(recipientFromText).find(Boolean)||'';
 const gift=giftWords.test(combined);
 const budget=budgetFrom(question)||previous.slice().reverse().map(budgetFrom).find(x=>x!==null)||null;
 const style=[['thanh lich','thanh lịch'],['toi gian','tối giản'],['nu tinh','nữ tính'],['nhe nhang','nhẹ nhàng'],['don gian','đơn giản'],['ca tinh','cá tính'],['noi bat','nổi bật'],['tre trung','trẻ trung']].find(x=>has(combined,x[0]))?.[1]||'';
 const shape=['tote','deo vai','deo cheo','xach tay'].find(x=>has(combined,x))||'';
 const color=pickColor(combined);
 const use=['di lam','di choi','di hoc','hen ho','du tiec','hang ngay','di cho'].find(x=>has(combined,x))||'';
 return {gift,recipient,budget,style,shape,color,use};
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
 if(filters.budget && Number(p.price)<=filters.budget)score+=4;
 if(filters.style&&(p.styles||[]).some(x=>has(x,filters.style)||has(filters.style,x)))score+=10;
 return score;
}
export function retrieveProducts(question,history=[],ctxId='',limit=6,list=catalog){
 const q=normalize(question);
 const recent=history.filter(x=>x.role==='user').slice(-6).map(x=>x.content).join(' ');
 const combined=normalize(recent+' '+question);
 const family=findExplicitFamily(combined,list);
 const color=pickColor(combined);
 const negative=combined.match(/(?:khong thich|tranh|khong muon|bo mau)\s+(?:mau\s+)?(den|hong|do|tim|trang|kem|be|nau|xanh|xam|vang)/);
 const budget=budgetFrom(question)||budgetFrom(recent);
 const shape=['tote','deo vai','deo cheo','xach tay'].find(x=>has(combined,x))||'';
 const use=['di lam','di choi','di hoc','hen ho','du tiec'].find(x=>has(combined,x))||'';
 const style=giftProfile(question,history).style;
 const filters={budget,color:negative?null:color,excludeColor:negative?.[1]||null,shape,use,style,family};
 const all=list.filter(p=>p?.id&&p.name);
 const strict=all.filter(p=>(!budget||Number(p.price)<=budget)&&(!filters.color||has(p.color,filters.color))&&(!filters.excludeColor||!has(p.color,filters.excludeColor))&&(!shape||has(p.shape,shape))&&(!family||normalize(p.family)===normalize(family)));
 const exact=strict.length>0;
 const pool=exact?strict:all.filter(p=>!filters.excludeColor||!has(p.color,filters.excludeColor));
 const tokens=words(combined);
 const ranked=pool.map(p=>({p,score:productScore(p,q,tokens,filters,ctxId)})).sort((a,b)=>b.score-a.score||Number(a.p.price)-Number(b.p.price));
 const named=Boolean(family||ctxId||all.some(p=>has(q,p.name)));
 const dedup=new Set();
 const picks=ranked.filter(({p})=>{if(!named && dedup.has(p.family))return false;dedup.add(p.family);return true}).slice(0,limit).map(x=>x.p);
 return {products:picks,filters,exact,hasConstraints:!!(budget||color||shape||family||use||style)};
}
export function safeProduct(p,discount=.2){
 const p0=Number(p.price||0),sale=Math.round(p0*(1-discount));
 return {id:p.id,name:p.name,family:p.family,color:p.color,shape:p.shape,styles:p.styles||[],uses:p.uses||[],listPrice:p0,illustrativeSalePrice:sale,priceStatus:p.priceStatus||'unknown',summary:p.desc||'',details:p.details||{},url:'/san-pham/'+encodeURIComponent(p.id),image:'/CHAMEA/assets/'+encodeURI(p.image||'')};
}
