import {describe,expect,it} from 'vitest';
import {BufferAttribute,BufferGeometry,PlaneGeometry} from 'three';
import {indexGeometry} from '../../src/terrainStudy/indexGeometry.js';

describe('exact painted vertex indexing',()=>{
  it('shares identical vertices but retains coincident pigment, normal, UV and fog boundaries',()=>{
    const geometry=new BufferGeometry();
    const count=48;
    geometry.setAttribute('position',new BufferAttribute(new Float32Array(count*3),3));
    geometry.setAttribute('normal',new BufferAttribute(new Float32Array(count*3),3));
    geometry.setAttribute('color',new BufferAttribute(new Float32Array(count*3),3));
    geometry.setAttribute('uv',new BufferAttribute(new Float32Array(count*2),2));
    geometry.setAttribute('paintedCell',new BufferAttribute(new Uint16Array(count),1));
    geometry.setAttribute('paintedSuppress',new BufferAttribute(new Uint8Array(count),1));
    for(let i=0;i<count;i++){
      const variant=i%8;
      geometry.attributes.position!.setXYZ(i,variant===7?-0:0,0,0);
      geometry.attributes.normal!.setXYZ(i,0,variant===1?-1:1,0);
      geometry.attributes.color!.setXYZ(i,variant===2?.5:1,1,1);
      geometry.attributes.uv!.setXY(i,variant===3?.25:0,variant===4?.5:0);
      geometry.attributes.paintedCell!.setX(i,variant===5?7:0);
      geometry.attributes.paintedSuppress!.setX(i,variant===6?2:0);
    }
    const original=geometry.clone();indexGeometry(geometry);
    expect(geometry.attributes.position!.count).toBe(8);
    expect(geometry.index!.array).toBeInstanceOf(Uint16Array);
    for(const [name,attribute] of Object.entries(original.attributes)){
      const actual=geometry.getAttribute(name);
      for(let i=0;i<count;i++)for(let j=0;j<attribute.itemSize;j++)
        expect(actual.array[geometry.index!.getX(i)*attribute.itemSize+j]).toBe(attribute.array[i*attribute.itemSize+j]);
    }
    original.dispose();geometry.dispose();
  });

  it('keeps 32-bit indices for large shared meshes without changing triangle order',()=>{
    const geometry=new PlaneGeometry(20,20,260,260),source=geometry.toNonIndexed();
    const expected=source.getAttribute('position').array.slice();
    indexGeometry(source);
    expect(source.index!.array).toBeInstanceOf(Uint32Array);
    const restored=source.toNonIndexed();
    expect(restored.getAttribute('position').array).toEqual(expected);
    expect(indexGeometry(source)).toBe(source);
    restored.dispose();source.dispose();geometry.dispose();
  });

  it('leaves unshareable and morph geometry alone',()=>{
    const geometry=new PlaneGeometry().toNonIndexed();
    geometry.setAttribute('identity',new BufferAttribute(new Float32Array([0,1,2,3,4,5]),1));
    const positions=geometry.getAttribute('position');
    indexGeometry(geometry);
    expect(geometry.index).toBeNull();expect(geometry.getAttribute('position')).toBe(positions);
    geometry.deleteAttribute('identity');geometry.morphAttributes.position=[positions.clone()];
    indexGeometry(geometry);expect(geometry.index).toBeNull();geometry.dispose();
  });
});
