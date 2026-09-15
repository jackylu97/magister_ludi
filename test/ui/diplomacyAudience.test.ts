import { describe, expect, it } from 'vitest';
import { audienceCopy, trimTownTerms } from '../../src/ui/diplomacyScreen';
import { createWarDispatchQueue, type WarDispatchNotice } from '../../src/ui/warDispatch';
import type { DealTerms } from '../../src/sim/deals';

describe('the audience speaks to the player',()=>{
  it('keeps the AI score ledger out of the voiced response',()=>{
    const copy=audienceCopy({accepted:false,sentence:'net score -30',reasons:['weight 20'],lastCopy:'Silk'});
    expect(copy.quote).toContain('last silk');expect(copy.detail).toContain('one copy of Silk');
    expect(JSON.stringify(copy)).not.toContain('score');
  });
  it('distinguishes signed peace from an exchange, and a refusal from either',()=>{
    const accepted={accepted:true,sentence:'',reasons:[]};
    expect(audienceCopy({...accepted,peace:true}).detail).toContain('war has ended');
    expect(audienceCopy(accepted).detail).toContain('Agreement signed');
    expect(audienceCopy({...accepted,accepted:false,peace:true}).detail).toContain('remain at war');
  });
  it('removes unofferable towns without discarding other draft terms',()=>{
    const draft:DealTerms={gold:12,luxuries:['silk'],cities:[1,2,3]};
    trimTownTerms(draft,[{cityId:1,label:'Capital',note:null,error:'Seat of government'},{cityId:2,label:'Town',note:null,error:null}]);
    expect(draft).toEqual({gold:12,luxuries:['silk'],cities:[2]});
    trimTownTerms(draft,[]);expect(draft).toEqual({gold:12,luxuries:['silk']});
  });
});

describe('fresh war dispatches',()=>{
  const notice:WarDispatchNotice={byId:1,onId:0,turn:84,name:'Leader',people:'Nation'};
  it('coalesces duplicate delivery, but retains each attacker and later war',()=>{
    const queue=createWarDispatchQueue();queue.enqueue(notice);queue.enqueue({...notice});queue.enqueue({...notice,byId:2});queue.enqueue({...notice,turn:99});
    expect(queue.length).toBe(3);expect(queue.next(()=>true)).toEqual(notice);
    queue.enqueue(notice);expect(queue.length).toBe(2);
    expect(queue.next(()=>true)?.byId).toBe(2);expect(queue.next(()=>true)?.turn).toBe(99);
  });
  it('discards another local seat’s pending notice and clears on replacement',()=>{
    const queue=createWarDispatchQueue();queue.enqueue(notice);queue.enqueue({...notice,onId:2});
    expect(queue.next(n=>n.onId===2)?.onId).toBe(2);expect(queue.next(()=>true)).toBeNull();
    queue.enqueue({...notice,turn:85});queue.clear();expect(queue.length).toBe(0);
    queue.enqueue(notice);expect(queue.next(()=>true)).toEqual(notice);
  });
});
