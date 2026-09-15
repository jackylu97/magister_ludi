/** Fresh command news only. The war register is never swept to replay old alerts. */
import { element } from './dom';
import { createModalShell } from './modalShell';
import './warDispatch.css';

export interface WarDispatchNotice {
  byId: number;
  onId: number;
  turn: number;
  name: string;
  people: string;
}

/** Duplicate delivery is coalesced; distinct attackers each keep their dispatch. */
export function warDispatchKey(notice: WarDispatchNotice): string {
  return `${notice.onId}:${notice.byId}:${notice.turn}`;
}

export function createWarDispatchQueue() {
  let pending: WarDispatchNotice[]=[];
  const seen=new Set<string>();
  return {
    get length(){return pending.length;},
    enqueue(notice:WarDispatchNotice){const key=warDispatchKey(notice);if(seen.has(key))return;seen.add(key);pending.push(notice);},
    next(relevant:(notice:WarDispatchNotice)=>boolean){while(pending.length){const notice=pending.shift()!;if(relevant(notice))return notice;}return null;},
    clear(){pending=[];seen.clear();},
  };
}

export interface WarDispatch {
  readonly isOpen: boolean;
  enqueue(notice: WarDispatchNotice): void;
  clear(): void;
  dispose(): void;
}

export function createWarDispatch(options: {
  beforeOpen(): void;
  canShow(): boolean;
  relevant(notice: WarDispatchNotice): boolean;
  review(byId: number): void;
}): WarDispatch {
  const overlay=element('div','statecraft-overlay war-dispatch-overlay');
  overlay.hidden=true;overlay.setAttribute('role','alertdialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','war-dispatch-title');
  const card=element('div','war-dispatch-card');
  const body=element('div','war-dispatch-body');
  const actions=element('div','war-dispatch-actions');
  const acknowledge=element('button','btn btn-quiet','Acknowledge') as HTMLButtonElement;
  acknowledge.type='button';
  const review=element('button','btn btn-primary','Review diplomacy') as HTMLButtonElement;
  review.type='button';actions.append(acknowledge,review);card.append(body,actions);overlay.append(card);document.body.append(overlay);
  const queue=createWarDispatchQueue();
  let current: WarDispatchNotice|null=null;
  let timer=0, stopped=false;
  function schedule() {
    if(stopped||timer||!queue.length)return;
    timer=window.setTimeout(()=>{timer=0;pump();},250);
  }
  function pump() {
    if(stopped||shell.isOpen)return;
    if(!queue.length)return;
    if(!options.canShow()){schedule();return;}
    current=queue.next(options.relevant);if(current)shell.open();
  }
  const shell=createModalShell({overlay,body,closeButton:acknowledge,
    onOpen:options.beforeOpen,
    draw:()=>{
      if(!current)return;
      body.replaceChildren();
      body.append(element('p','eyebrow',`Urgent dispatch · Turn ${current.turn}`));
      const title=element('h2','',`${current.name} has declared war on you.`);title.id='war-dispatch-title';body.append(title);
      body.append(element('blockquote','','“The time for bargaining is over.”'));
      body.append(element('p','','Hostilities begin immediately. Enemy units already inside your borders can attack.'));
      body.append(element('p','',`Any existing deals and trade routes with the ${current.people} end when war begins. Peace must be negotiated.`));
    },
    onClose:()=>{current=null;schedule();},
    onKey:event=>{
      if(event.key!=='Tab')return false;
      if(event.shiftKey&&document.activeElement===acknowledge){event.preventDefault();review.focus();return true;}
      if(!event.shiftKey&&document.activeElement===review){event.preventDefault();acknowledge.focus();return true;}
      return false;
    },
  });
  review.addEventListener('click',()=>{const byId=current?.byId;shell.close();if(byId!==undefined)options.review(byId);});
  function clear() {queue.clear();if(timer)window.clearTimeout(timer);timer=0;shell.close();current=null;}
  return {
    get isOpen(){return shell.isOpen;},
    enqueue(notice){if(stopped||!options.relevant(notice))return;queue.enqueue(notice);schedule();},
    clear,
    dispose(){stopped=true;clear();shell.dispose();overlay.remove();},
  };
}
