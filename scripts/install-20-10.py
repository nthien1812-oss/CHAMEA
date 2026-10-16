#!/usr/bin/env python3
"""Install the user-supplied 20/10 image pack into the existing CHAMÉA static site."""
from pathlib import Path
from zipfile import ZipFile
import json, re

root=Path(__file__).resolve().parents[1]
bundle=root/"uploads/chamea-20-10.zip"
assets=root/"public/assets/20-10"
products_file=root/"public/products.json"
app_file=root/"public/app.js"
css_file=root/"public/style.css"
if not bundle.is_file():
    raise SystemExit("Missing uploads/chamea-20-10.zip")
families={
 "blushtheory":("Blush Theory","blush-theory","Hồng pastel","#d8a1b0","Túi xách tay"),
 "herrules":("Her Rules","her-rules","Hồng dusty rose","#bb8b98","Túi xách tay"),
 "pastelcore":("Pastel Core","pastel-core","Kem hồng","#e5c8bd","Túi xách tay"),
 "souls":("Souls","souls","Hồng","#cfa5ac","Túi xách tay"),
}
expected={"blushtheory":5,"herrules":5,"pastelcore":5,"souls":10}
groups={k:[] for k in families}
with ZipFile(bundle) as z:
    for name in z.namelist():
        if name.endswith("/"):continue
        path=Path(name)
        if len(path.parts)!=2 or path.suffix.lower() not in (".jpg",".jpeg"):
            raise SystemExit(f"Unexpected ZIP member: {name}")
        group=path.parts[0].lower()
        if group not in groups:raise SystemExit(f"Unexpected product: {name}")
        groups[group].append(name)
    for group,count in expected.items():
        if len(groups[group])!=count:raise SystemExit(f"Expected {count} photos for {group}, got {len(groups[group])}")
    assets.mkdir(parents=True,exist_ok=True)
    for group,files in groups.items():
        target=assets/group
        target.mkdir(exist_ok=True)
        for name in files:
            (target/Path(name).name).write_bytes(z.read(name))
def file_for(group,term):
    matches=[Path(p).name for p in groups[group] if term.lower() in Path(p).stem.lower()]
    if len(matches)!=1:raise SystemExit(f"Expected exactly one {group}/{term}, got {matches}")
    return "20-10/"+group+"/"+matches[0]
def gallery(group,prefix=""):
    terms=["ChinhDien","GocNghiengTrai","MatSau","CanChiTiet","HopQua"]
    return [file_for(group,(prefix+"_" if prefix else "")+t) for t in terms]
new=[
 ("blushtheory","blush-theory","Hồng pastel","#d8a1b0",gallery("blushtheory")),
 ("herrules","her-rules","Hồng dusty rose","#bb8b98",gallery("herrules")),
 ("pastelcore","pastel-core","Kem hồng","#e5c8bd",gallery("pastelcore")),
 ("souls","souls-hong","Hồng","#cfa5ac",gallery("souls","Mau1_Hong")),
 ("souls","souls-nau","Nâu","#806052",gallery("souls","Mau2_Nau")),
]
products=json.loads(products_file.read_text(encoding="utf-8"))
new_ids={x[1] for x in new}
products=[p for p in products if p.get("id") not in new_ids]
for group,pid,color,hexcolor,photos in new:
    family,_,_,_,shape=families[group]
    products.append({
       "id":pid,"code":"CM-2010-"+pid.upper(),"name":family+" · "+color,
       "family":family,"price":0,"priceStatus":"pending","color":color,
       "hex":hexcolor,"shape":shape,"styles":["Thanh lịch","Nữ tính"],
       "uses":["Đi chơi","Hẹn hò","Quà tặng"],"image":photos[0],"gallery":photos,
       "collection20":"20-10",
       "desc":"Thiết kế CHAMÉA "+family+" trong bộ sưu tập quà tặng 20/10. Hình ảnh gồm năm góc chụp; thông số và giá bán đang được cập nhật.",
       "details":{"body":"Đang cập nhật","lining":"Đang cập nhật","hardware":"Đang cập nhật",
          "handle":"Đang cập nhật","size":"Đang cập nhật","weight":"Đang cập nhật",
          "included":"Đang cập nhật","extras":"Có ảnh sản phẩm kèm hộp quà","care":"Đang cập nhật"}
    })
products_file.write_text(json.dumps(products,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
app=app_file.read_text(encoding="utf-8")
campaign='''function campaignLanding(){
 const families=['Blush Theory','Her Rules','Pastel Core','Souls'];
 const featured=families.map(f=>D.products.find(p=>p.family===f&&p.collection20==='20-10')).filter(Boolean);
 const souls=D.products.filter(p=>p.family==='Souls'&&p.collection20==='20-10');
 return \`<section class="chamea-2010 chamea-2010-shop">
 <div class="container chamea-2010-shop-intro"><p class="eyebrow">CHAMÉA · QUÀ TẶNG 20/10</p><h1>CHAMÉA – Những thiết kế dành riêng cho nàng</h1><p>Tháng Mười là dịp để trao gửi những điều dịu dàng. Khám phá những thiết kế túi xách CHAMÉA được tuyển chọn cho mùa quà tặng 20/10 – nơi mỗi đường nét, sắc màu và chi tiết đều mang theo một lời nhắn gửi tinh tế.</p><a class="btn" href="#chamea-2010-products">Khám phá bộ sưu tập ↗</a></div>
 <div class="container chamea-2010-shop-products" id="chamea-2010-products"><p class="eyebrow">THE 20/10 EDIT</p><h2>Chọn một thiết kế, gửi một lời thương</h2><div class="chamea-2010-shop-grid">\${featured.map(p=>card(p)).join('')}</div>
 <p class="chamea-2010-price-note">Giá bán và thông số đang cập nhật. Những sản phẩm chưa có giá xác nhận sẽ chưa thể đặt mua.</p></div>
 <div class="container chamea-2010-shop-souls"><div><p class="eyebrow">TWO SHADES · ONE STORY</p><h2>CHAMÉA Souls</h2><p>Một thiết kế, hai sắc thái. Khám phá phiên bản hồng dịu dàng và nâu ấm áp.</p><div class="chamea-2010-souls-links">\${souls.map(p=>\`<a href="/san-pham/\${p.id}"><span class="swatch" style="background:\${p.hex}"></span>\${esc(p.color)} ↗</a>\`).join('')}</div></div><img src="\${asset(souls[0]?.gallery?.[4]||featured[0]?.image||'')}" alt="CHAMÉA Souls cùng hộp quà" loading="lazy"></div>
 <div class="container chamea-2010-shop-gift"><p class="eyebrow">THE ART OF GIFTING</p><h2>Một món quà – Ngàn lời yêu thương</h2><p>Chọn một chiếc túi phù hợp với cá tính người nhận, và để những chi tiết nhỏ thay lời muốn nói.</p><a href="/goi-y-chon-qua" class="btn outline">Tìm món quà phù hợp ↗</a></div>
 </section>\`;
}'''
pattern=r'function campaignLanding\(\)\{.*?\}\s*(?=\nfunction collectionSpotlight\()'
app,count=re.subn(pattern,lambda m:campaign+"\n",app,count=1,flags=re.S)
if count!=1:raise SystemExit("Cannot locate campaignLanding()")
app_file.write_text(app,encoding="utf-8")
css=css_file.read_text(encoding="utf-8")
start="/* CHAMEA_2010_PACK_START */"
end="/* CHAMEA_2010_PACK_END */"
style='''/* CHAMEA_2010_PACK_START */
#main .chamea-2010-shop{background:#fffbf8;color:#442e3c}
.chamea-2010-shop-intro{padding:clamp(65px,8vw,125px) 20px;text-align:center;background:linear-gradient(125deg,#f8e8e7,#fffaf5);max-width:none}
.chamea-2010-shop-intro>p:not(.eyebrow){max-width:760px;margin:24px auto 28px;line-height:1.9;color:#745e69}
#main .chamea-2010-shop h1{font-size:clamp(34px,4.3vw,62px);max-width:850px;line-height:1.2;margin:20px auto}
#main .chamea-2010-shop h2{font-size:clamp(28px,3.4vw,46px);margin:14px 0 30px}
.chamea-2010-shop-products{padding-top:75px;padding-bottom:90px}
.chamea-2010-shop-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px}
.chamea-2010-shop-grid>.product{min-width:0}
.chamea-2010-shop-grid .product-visual img{aspect-ratio:4/5;object-fit:contain}
.chamea-2010-price-note{font-size:12px;color:#866c78;margin-top:25px}
.chamea-2010-shop-souls{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:45px;background:#f4e9e5;padding:40px}
.chamea-2010-shop-souls>div{padding:20px}
.chamea-2010-shop-souls>img{width:100%;max-height:520px;object-fit:contain}
.chamea-2010-souls-links{display:flex;gap:20px;flex-wrap:wrap;margin-top:25px}
.chamea-2010-souls-links a{display:inline-flex;align-items:center;gap:9px;color:#553847;text-decoration:none;font-weight:700;font-size:13px}
.chamea-2010-souls-links .swatch{width:17px;height:17px;border-radius:50%;border:1px solid #bda9b1}
.chamea-2010-shop-gift{text-align:center;padding-top:90px;padding-bottom:100px}
.chamea-2010-shop-gift>p:not(.eyebrow){max-width:630px;margin:0 auto 28px;line-height:1.9}
@media(max-width:1000px){.chamea-2010-shop-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.chamea-2010-shop-grid{gap:12px}.chamea-2010-shop-souls{grid-template-columns:1fr;padding:20px}.chamea-2010-shop-souls>div{padding:12px}.chamea-2010-shop-products{padding-top:45px;padding-bottom:55px}}
/* CHAMEA_2010_PACK_END */'''
if start in css:
    css=re.sub(re.escape(start)+r'.*?'+re.escape(end),lambda m:style,css,flags=re.S)
else:css+="\n"+style+"\n"
css_file.write_text(css,encoding="utf-8")
print("Integrated 25 image files, 5 color variants, 4 featured designs and campaign page.")
