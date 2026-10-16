#!/usr/bin/env python3
"""Import the 50 provided CHAMÉA tote photos without modifying existing collections."""
from pathlib import Path
from zipfile import ZipFile
import json,re
root=Path(__file__).resolve().parents[1]
archives=sorted((root/'uploads').glob('*Tote*.zip'))+sorted((root/'uploads').glob('*tote*.zip'))
if not archives:raise SystemExit('Upload the original BST Túi Tote ZIP into uploads/')
archive=archives[0]
families={
 'iconic': [('grey','Xám','#929395'),('pink','Hồng','#c89ba9')],
 'velvet': [('beige','Be','#d5c2a7'),('burgundy','Đỏ burgundy','#713142')],
 'heritage': [('pink','Hồng','#d2a1ad'),('burgundy','Đỏ burgundy','#713142')],
 'allure': [('cream','Kem','#e5d9c5'),('burgundy','Đỏ burgundy','#713142')],
 'muse': [('cream','Kem','#e5d9c5'),('pink','Hồng','#d2a1ad')],
}
dest=root/'public/assets/tote'
items=json.loads((root/'public/products.json').read_text(encoding='utf-8'))
items=[p for p in items if p.get('collectionTote')!='tui-tote']
with ZipFile(archive) as z:
    photos=[x for x in z.namelist() if not x.endswith('/') and x.lower().endswith('.png')]
    if len(photos)!=50:raise SystemExit(f'Expected 50 PNG photos, got {len(photos)}')
    for family,variants in families.items():
        files=[p for p in photos if ('chaméa_'+family+'/').casefold() in p.casefold()]
        if len(files)!=10:raise SystemExit(f'{family}: expected 10, got {len(files)}')
        for color,color_name,hexcode in variants:
            chosen=[p for p in files if color in Path(p).name.lower()]
            if len(chosen)!=5:raise SystemExit(f'{family}/{color}: expected 5, got {len(chosen)}')
            gallery=[]
            for index in range(1,6):
                matched=[p for p in chosen if re.search(r'(?<!\\d)0'+str(index)+r'(?!\\d)',Path(p).stem)]
                if len(matched)!=1:raise SystemExit(f'{family}/{color} photo {index}: {matched}')
                relative=f'tote/{family}/{color}/{index:02d}.png'
                output=root/'public/assets'/relative
                output.parent.mkdir(parents=True,exist_ok=True)
                output.write_bytes(z.read(matched[0]))
                gallery.append(relative)
            label=family.title()
            items.append({
                'id':f'tote-{family}-{color}','code':f'CM-TOTE-{family.upper()}-{color.upper()}',
                'name':f'{label} · {color_name}','family':label,'price':0,
                'priceStatus':'pending','color':color_name,'hex':hexcode,
                'shape':'Túi tote','styles':['Thanh lịch','Hiện đại'],
                'uses':['Đi làm','Đi học','Đi chơi'],
                'image':gallery[0],'gallery':gallery,'collectionTote':'tui-tote',
                'desc':f'Túi tote CHAMÉA {label}, phiên bản {color_name.lower()}. Bộ ảnh gồm chính diện, góc nghiêng, mặt sau, cận chi tiết và hộp quà. Giá và thông số kỹ thuật đang cập nhật.',
                'details':{'body':'Đang cập nhật','lining':'Đang cập nhật',
                  'hardware':'Đang cập nhật','handle':'Đang cập nhật',
                  'size':'Đang cập nhật','weight':'Đang cập nhật',
                  'included':'Đang cập nhật','extras':'Có ảnh kèm hộp quà',
                  'care':'Đang cập nhật'}
            })
(root/'public/products.json').write_text(json.dumps(items,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Installed 50 tote photos and 10 variants across 5 families')
