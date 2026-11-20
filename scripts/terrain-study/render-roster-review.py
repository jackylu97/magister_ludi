"""Draw the GLBs on a common scale. Pass the reference directory printed by the builder."""
import json
import struct
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

out = Path('art/terrain-study/unit-roster-review')
refs = Path(sys.argv[1])
eye = np.array([.32,.48,1.])
eye /= np.linalg.norm(eye)
right = np.cross([0,1,0], eye)
right /= np.linalg.norm(right)
up = np.cross(eye,right)
basis = np.array([right, up, eye])
light = np.array([-.45,.75,.48])
paper = '#f5efe2'
ink = '#343934'

def render(path):
    data = path.read_bytes()
    size = struct.unpack_from('<I',data,12)[0]
    gltf = json.loads(data[20:20+size])
    binary = data[28+size:]
    faces = []
    def read(index):
        a = gltf['accessors'][index]
        v = gltf['bufferViews'][a['bufferView']]
        buf = np.frombuffer(binary, {5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[a['componentType']],
                            count=a['count'] * {'VEC3':3,'SCALAR':1}[a['type']],
                            offset=v.get('byteOffset',0)+a.get('byteOffset',0))
        return buf.reshape(a['count'],-1)
    def walk(index,parent):
        node = gltf['nodes'][index]
        local = np.array(node.get('matrix',np.eye(4).T.flatten())).reshape(4,4).T
        world = parent @ local
        if 'mesh' in node:
            for p in gltf['meshes'][node['mesh']]['primitives']:
                raw = read(p['attributes']['POSITION'])
                pos = (raw @ world[:3,:3].T + world[:3,3]) @ basis.T
                ids = read(p['indices']).reshape(-1,3) if 'indices' in p else np.arange(len(pos)).reshape(-1,3)
                tri = pos[ids]
                norm = np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
                visible = norm[:,2]>1e-10
                norm = norm[visible];tri=tri[visible]
                norm /= np.linalg.norm(norm,axis=1)[:,None]
                material = gltf['materials'][p['material']]
                color=np.array(material['pbrMetallicRoughness'].get('baseColorFactor',[1.,1.,1.,1.])[:3])
                if material['name'].startswith('Owner'): color *= [.025,.203,.176]
                shade = .66+.43*np.maximum(0,norm@(basis@light))
                rgb=(np.clip(color*shade[:,None],0,1)**(1/2.2)*255).astype('uint8')
                for t,c in zip(tri,rgb):
                    faces.append((t[:,2].mean(),t[:,:2],tuple(c)))
        for child in node.get('children',[]):walk(child,world)
    for root in gltf['scenes'][0]['nodes']:walk(root,np.eye(4))
    canvas=Image.new('RGB',(480,500),paper)
    draw=ImageDraw.Draw(canvas)
    for _,points,color in sorted(faces,key=lambda t:t[0]):
        coords=points*np.array([324,-324])+[237,442]
        draw.polygon([tuple(v) for v in coords],fill=color)
    return canvas.resize((240,250),Image.Resampling.LANCZOS)

rows=[
 ('Current pieces',[('swordsman','Swordsman'),('horseman','Horseman'),('catapult','Catapult')]),
 ('Leader units',[('hypaspist','Hypaspist'),('janissary','Janissary'),('condottiere','Condottiere'),('qinCrossbowman','Qin Crossbowman'),('sparabara','Sparabara'),('hwacha','Hwacha')]),
 ('Deck units and existing models',[('numidianCavalry','Numidian Cavalry'),('companyGuard','Company Guard'),('ballistaElephant','Ballista Elephant'),('keshig','Keshig')])]
font='/System/Library/Fonts/Supplemental/GillSans.ttc'
sheet=Image.new('RGB',(1472,910),paper);draw=ImageDraw.Draw(sheet)
for r,(heading,items) in enumerate(rows):
    y=r*300+12
    draw.text((20,y),heading,font=ImageFont.truetype(font,25),fill=ink)
    draw.line((20,y+34,1450,y+34),fill='#c7bfae')
    for i,(id,label) in enumerate(items):
        image=render((refs if r==0 else out)/(id+'.glb'))
        x=14+i*242
        sheet.paste(image.crop((0,13,240,242)),(x,y+36))
        draw.text((x+120,y+277),label,font=ImageFont.truetype(font,21),fill=ink,anchor='mm')
sheet.save(out/'roster.jpg',quality=95)
