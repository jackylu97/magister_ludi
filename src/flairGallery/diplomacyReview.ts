/** An isolated interaction prototype. Fixtures only: no state, AI or command imports. */
import './diplomacyReview.css';

type Luxury = { name: string; copies: number; mark: string };
type Court = { id: string; name: string; realm: string; color: string; secondary: string; crest: string; greeting: string; goods: Luxury[] };
const courts: Court[] = [
  {id:'mithridates',name:'Mithridates VI',realm:'Pontus',color:'#675076',secondary:'#d0d1da',crest:'☾',
    greeting:'There is room for both our ambitions. Let us begin with trade.',
    goods:[{name:'Silk',copies:3,mark:'≋'},{name:'Spices',copies:2,mark:'✦'},{name:'Pearls',copies:1,mark:'◌'},{name:'Marble',copies:2,mark:'▱'}]},
  {id:'mansa',name:'Mansa Musa',realm:'Mali',color:'#ad8137',secondary:'#343d68',crest:'☀',
    greeting:'A road is worth more when someone waits at the other end. What shall we exchange?',
    goods:[{name:'Gold',copies:2,mark:'◇'},{name:'Salt',copies:3,mark:'◈'},{name:'Coffee',copies:2,mark:'❧'}]},
  {id:'taizong',name:'Emperor Taizong',realm:'Tang',color:'#427668',secondary:'#f0e5ca',crest:'✶',
    greeting:'Let us put something useful on the table.',
    goods:[{name:'Tea',copies:3,mark:'❧'},{name:'Jade',copies:1,mark:'◇'},{name:'Silk',copies:2,mark:'≋'}]},
];
const home: Luxury[] = [{name:'Cotton',copies:2,mark:'❋'},{name:'Wine',copies:1,mark:'♧'},{name:'Dyes',copies:2,mark:'◒'},{name:'Silver',copies:2,mark:'◇'}];
type Town = { name: string; population: number; capital?: boolean };
const towns: Record<string, Town[]> = {
  home:[{name:'Cusco',population:12,capital:true},{name:'Ollantaytambo',population:6},{name:'Pisac',population:4}],
  mithridates:[{name:'Sinope',population:11,capital:true},{name:'Amaseia',population:7},{name:'Trapezus',population:5}],
  mansa:[{name:'Niani',population:12,capital:true},{name:'Timbuktu',population:8},{name:'Gao',population:6}],
  taizong:[{name:'Chang’an',population:14,capital:true},{name:'Luoyang',population:9},{name:'Chengdu',population:7}],
};
const total = (goods: Luxury[]) => goods.reduce((sum,g)=>sum+g.copies,0);
const crest = (court: Court, large=false) => `<span class="dp-crest ${large?'dp-crest-large':''}" style="--court:${court.color};--metal:${court.secondary}" aria-hidden="true"><span>${court.crest}</span></span>`;

export function drawDiplomacyReview(root: HTMLElement): void {
  document.title = 'Diplomacy study · Magister Ludi';
  let selected = courts[0]!, give = 'Cotton', take = 'Silk';
  let goldGive = 0, goldTake = 0, view: 'audience'|'agreements' = 'audience';
  let war = false, acknowledged = false, declaredByUs = false;
  let warCourt = courts[0]!;
  const wars = new Set<string>();
  const townsGive = new Set<string>(), townsTake = new Set<string>();
  function clearTowns() { townsGive.clear(); townsTake.clear(); }
  let yourGold = 240;
  const courtGold: Record<string, number> = {mithridates:180,mansa:320,taizong:210};
  let reply: {kind:string; quote:string; detail:string} | null = null;
  let signed: {court:string; give:string; take:string; goldGive:number; goldTake:number}[] = [];
  const atWar = () => wars.has(selected.id);
  const ownGoods = () => holdings(home, true);
  function holdings(base: Luxury[], own: boolean): Luxury[] {
    const goods = base.map(g=>({...g}));
    for (const deal of signed.filter(d=>own || d.court === selected.id)) {
      const outgoing = own ? deal.give : deal.take, incoming = own ? deal.take : deal.give;
      const lost = goods.find(g=>g.name===outgoing); if(lost) lost.copies--;
      if(incoming) {
        const existing=goods.find(g=>g.name===incoming);
        const resource=[...home,...courts.flatMap(c=>c.goods)].find(g=>g.name===incoming)!;
        if(existing) existing.copies++; else goods.push({...resource,copies:1});
      }
    }
    return goods.filter(g=>g.copies>0);
  }
  function counts(goods: Luxury[]) { return `<strong>${goods.length}</strong> kinds <span>·</span> <strong>${total(goods)}</strong> copies`; }
  function resourceRows(goods: Luxury[], side: 'give'|'take') {
    return goods.map(g=>`<button class="dp-resource" data-${side}="${g.name}" aria-pressed="${(side==='give'?give:take)===g.name}">
      <span class="dp-resource-icon" aria-hidden="true">${g.mark}</span><span><b>${g.name}</b><small>${g.copies>1?`${g.copies-1} spare`:'Last copy'}</small></span>
      <span class="dp-copy"><b>${g.copies}</b><small>held</small></span><span class="dp-check" aria-hidden="true">${(side==='give'?give:take)===g.name?'✓':'+'}</span></button>`).join('');
  }
  function terms(resource:string,gold:number, townNames: Iterable<string> = []) { return [...townNames,resource?`1 ${resource}`:'',gold?`${gold} gold`:''].filter(Boolean).join(' + ') || 'Nothing selected'; }
  function townRows(side: 'give'|'take') {
    if (!atWar()) return '';
    const choices = towns[side==='give'?'home':selected.id]!;
    const picked = side==='give'?townsGive:townsTake;
    return `<div class="dp-town-list"><p class="dp-eyebrow">TOWNS <span>Permanent transfer</span></p>${choices.map(t=>`<button class="dp-town" data-town-side="${side}" data-town="${t.name}" aria-pressed="${picked.has(t.name)}" ${t.capital?'disabled':''}>
      <span class="dp-town-mark" aria-hidden="true">♜</span><span><b>${t.name}</b><small>${t.capital?'Seat of government · Cannot be offered':'Population '+t.population}</small></span><span class="dp-town-check" aria-hidden="true">${t.capital?'—':picked.has(t.name)?'✓':'+'}</span></button>`).join('')}</div>`;
  }
  function inventory(goods: Luxury[], side: 'give'|'take') {
    const rows=`<div class="dp-resource-list">${resourceRows(goods,side)}</div>`;
    return atWar()?`${townRows(side)}<details class="dp-peace-luxuries" data-luxuries="${side}"><summary>Include luxuries <span>${total(goods)} copies available</span></summary>${rows}</details>`:rows;
  }
  function peacePreview() {
    selected=courts[0]!; wars.add(selected.id); war=true;warCourt=selected;declaredByUs=false;acknowledged=true;
    signed=signed.filter(d=>d.court!==selected.id);give='';take='';goldGive=0;goldTake=0;clearTowns();reply=null;view='audience';
  }
  function render(focus?: string) {
    const expandedLuxuries=Array.from(root.querySelectorAll<HTMLDetailsElement>('[data-luxuries][open]')).map(el=>el.dataset.luxuries!);
    const ours=ownGoods(), theirs=holdings(selected.goods,false);
    const active=signed.filter(d=>d.court===selected.id);
    root.innerHTML=`<div class="dp-reviewbar"><span><b>Design study</b> / Diplomacy</span><span>Sample turn 84 · scripted responses · no game changes</span><div><button data-demo="reset">Reset</button><button data-demo="refusal">Try a refusal</button><button data-demo="peace">Try peace terms</button><button class="dp-demo-war" data-demo="war">Preview war alert</button></div></div>
    <div class="dp-shell">
      <header class="dp-header"><div><p class="dp-eyebrow">MAGISTER LUDI <span>✧</span> THE COUNCIL</p><h1>Foreign courts</h1></div><div class="dp-home"><span class="dp-home-seal" aria-hidden="true">✺</span><div><b>Pachacuti</b><small>Your empire · Turn 84</small></div></div></header>
      ${war?`<div class="dp-war-banner" role="status"><span aria-hidden="true">⚔</span><div><b>${declaredByUs?'You declared war on '+warCourt.name+'.':warCourt.name+' has declared war on you.'}</b><span>Turn 84 · ${acknowledged?'Acknowledged':'New declaration'} · Your forces may be attacked immediately.</span></div><button data-action="review-war">Review war</button></div>`:''}
      <div class="dp-layout"><aside class="dp-roster"><p class="dp-eyebrow">KNOWN COURTS <span>03</span></p>
      ${courts.map(c=>`<button class="dp-court" data-court="${c.id}" aria-pressed="${selected.id===c.id}">${crest(c)}<span><b>${c.name}</b><small>${c.realm}</small><span class="dp-relation ${wars.has(c.id)?'is-war':''}">${wars.has(c.id)?'At war · Turn 84':'At peace'}</span></span><span class="dp-court-arrow" aria-hidden="true">›</span></button>`).join('')}
      <div class="dp-roster-note"><span aria-hidden="true">✧</span><p>Only courts you have met appear here.</p></div>
      <div class="dp-your-stock"><p class="dp-eyebrow">YOUR LUXURIES</p><p>${counts(ours)}</p><small>Counts include active exchanges.<br>A spare is a copy you can offer while keeping one.</small></div></aside>
      <section class="dp-courtroom" aria-label="Audience with ${selected.name}">
        <div class="dp-audience-head">${crest(selected,true)}<div><p class="dp-eyebrow">THE COURT OF ${selected.realm.toUpperCase()}</p><h2>${selected.name}</h2><p class="dp-relation ${atWar()?'is-war':''}">${atWar()?'At war since turn 84':'At peace'} <span>·</span> ${active.length} active ${active.length===1?'agreement':'agreements'}</p></div><button class="dp-war-link" data-action="declare" ${atWar()?'hidden':''}>Declare war</button></div>
        <nav class="dp-tabs" aria-label="Diplomacy sections"><button data-view="audience" aria-current="${view==='audience'?'page':'false'}">${atWar()?'Peace negotiations':'Audience & trade'}</button><button data-view="agreements" aria-current="${view==='agreements'?'page':'false'}">Agreements <span>${active.length}</span></button></nav>
        ${view==='audience'?`
        <div class="dp-dialogue ${reply?.kind==='refused'?'is-refusal':''}" role="status" aria-live="polite"><div class="dp-dialogue-label">${reply?reply.kind==='signed'?'AGREEMENT REACHED':reply.kind==='refused'?'OFFER DECLINED':reply.kind==='peaceRefused'?'PEACE DECLINED':reply.kind==='war'?'WAR DECLARED':'A COUNTEROFFER':atWar()?'AT WAR':'IN AUDIENCE'}<span aria-hidden="true">✦</span></div><blockquote>“${reply?.quote ?? (atWar()?'You have my attention. Speak.':selected.greeting)}”</blockquote><p>${reply?.detail ?? (atWar()?'You may propose peace. Until both sides agree, the war continues.':'Choose a luxury on either side to add one copy to the offer.')}</p></div>
        <div class="dp-trade-head"><h3>${atWar()?'Terms for peace':'Build an exchange'}</h3><span>${atWar()?'Towns change hands permanently · Only if peace is agreed':'Luxuries last 20 turns · Gold is paid once'}</span></div>
        <div class="dp-inventories"><section><header><div><p class="dp-eyebrow">YOU OFFER</p><h4>Pachacuti</h4></div><p>${counts(ours)}${atWar()?' of luxuries':''}</p></header>${inventory(ours,'give')}<label class="dp-gold"><span>Gold <small>paid once</small></span><input aria-label="Gold you offer" data-gold="give" type="number" min="0" max="${yourGold}" step="5" value="${goldGive}"><span class="dp-bank">${yourGold} available</span></label></section>
        <section><header><div><p class="dp-eyebrow">YOU RECEIVE</p><h4>${selected.name}</h4></div><p>${counts(theirs)}${atWar()?' of luxuries':''}</p></header>${inventory(theirs,'take')}<label class="dp-gold"><span>Gold <small>paid once</small></span><input aria-label="Gold you request" data-gold="take" type="number" min="0" max="${courtGold[selected.id]}" step="5" value="${goldTake}"><span class="dp-bank">${courtGold[selected.id]} available</span></label></section></div>
        <div class="dp-offer"><div class="dp-offer-title"><p class="dp-eyebrow">ON THE TABLE</p><button data-action="clear">Clear offer</button></div><div class="dp-exchange"><div><small>You give</small><b data-summary="give">${terms(give,goldGive,townsGive)}</b></div><span aria-hidden="true">⇄</span><div><small>You receive</small><b data-summary="take">${terms(take,goldTake,townsTake)}</b></div></div>
        ${give&&ours.find(g=>g.name===give)?.copies===1?'<p class="dp-last-copy">You are offering your last copy. You will lose access to this luxury for the duration of the deal.</p>':''}
        ${atWar()?`<p class="dp-peace-clause"><b>Peace is part of this offer.</b> ${townsGive.size||townsTake.size?'Selected towns and their territory change owner permanently if accepted.':give||take||goldGive||goldTake?'Luxuries last 20 turns; gold is paid once. Hostilities continue until agreement.':'You can propose peace without concessions.'}</p>`:''}
        <div class="dp-offer-actions"><button class="dp-secondary" data-action="counter">What would you agree to?</button><button class="dp-primary" data-action="send" ${!atWar()&&!give&&!take&&!goldGive&&!goldTake?'disabled':''}>${atWar()?'Propose peace':'Propose exchange'} <span aria-hidden="true">→</span></button></div></div>`:
        `<div class="dp-agreements"><p class="dp-eyebrow">BETWEEN YOUR EMPIRES</p><h3>Agreements with ${selected.name}</h3>${active.length?active.map(d=>`<article><span class="dp-agreement-seal" aria-hidden="true">✧</span><div><b>${d.give||'Gold'} ${d.take?'for '+d.take:''}</b><p>You give ${terms(d.give,d.goldGive)}; you receive ${terms(d.take,d.goldTake)}.</p><small>Signed turn 84 · Luxury access ends turn 104 · Gold paid on signing</small></div><span class="dp-term">20 turns left</span></article>`).join(''):`<div class="dp-empty"><span aria-hidden="true">◇</span><h4>${atWar()?'Agreements ended at war':'No agreements yet'}</h4><p>${atWar()?'Peace must be agreed before ordinary trade resumes.':'An exchange you sign will appear here, with its terms and time remaining.'}</p><button class="dp-secondary" data-view="audience">${atWar()?'Return to audience':'Build an exchange'}</button></div>`}</div>`}
      </section></div><footer class="dp-footer"><span>✧ Foreign courts · Turn 84</span><span>Prototype · scripted responses · Towns are available only in wartime peace terms.</span></footer>
    </div><dialog class="dp-alert" aria-labelledby="dp-alert-title"></dialog>`;
    for(const side of expandedLuxuries) {
      const section=root.querySelector<HTMLDetailsElement>(`[data-luxuries="${side}"]`);
      if(section)section.open=true;
    }
    if(focus) root.querySelector<HTMLElement>(focus)?.focus({preventScroll:true});
  }
  function warAlert(confirm=false) {
    const dialog=root.querySelector<HTMLDialogElement>('dialog')!;
    const leader=confirm?selected:courts[0]!;
    dialog.innerHTML=`<div class="dp-alert-top"><span>TURN 84</span><span>${confirm?'A DECLARATION':'URGENT DISPATCH'}</span></div><div class="dp-alert-body">${crest(leader,true)}<p class="dp-eyebrow">${confirm?'END THE PEACE':'WAR HAS BEEN DECLARED'}</p><h2 id="dp-alert-title">${confirm?`Declare war on<br>${leader.name}?`:'Mithridates VI<br>has declared war on you.'}</h2>${confirm?'':'<blockquote>“The time for bargaining is over.”</blockquote>'}<div class="dp-alert-facts"><p><b>Hostilities begin immediately.</b> Units already inside your borders can attack.</p><p>Your deals and trade routes with ${leader.realm} end when war begins.</p></div><div class="dp-alert-actions">${confirm?'<button class="dp-secondary" data-modal="cancel">Keep the peace</button><button class="dp-danger" data-modal="confirm-war">Declare war</button>':'<button class="dp-secondary" data-modal="acknowledge">Acknowledge</button><button class="dp-danger" data-modal="review">Review diplomacy →</button>'}</div></div>`;
    dialog.showModal();
    dialog.addEventListener('cancel',()=>{acknowledged=true;setTimeout(()=>render(),0);},{once:true});
  }
  function declareIncoming() {
    war=true; warCourt=courts[0]!; wars.add(warCourt.id); declaredByUs=false; acknowledged=false; signed=signed.filter(d=>d.court!==warCourt.id); reply=null;give='';take='';goldGive=0;goldTake=0;clearTowns();render();warAlert();
  }
  function answer() {
    if (atWar()) {
      const named=[...townsGive,...townsTake];
      reply={kind:'peaceRefused',quote:named.length?'Those towns will not settle this war. We have more to discuss.':'Not yet. I am not ready to end this war.',detail:`Peace declined. ${named.length?'The proposed transfer of '+named.join(', ')+' did not take place. ':''}You remain at war; your draft is kept below. This is a scripted preview response.`};
      render('[data-action="send"]');return;
    }
    clearTowns();
    const last=holdings(selected.goods,false).find(g=>g.name===take&&g.copies===1);
    if(last) reply={kind:'refused',quote:`I will not part with our last ${last.name.toLowerCase()}. Ask for something we can spare.`,detail:`${selected.name} has only 1 copy of ${last.name}. Choose another luxury or ask for a counteroffer.`};
    else if((take?1:0)>(give?1:0) || goldTake>goldGive) reply={kind:'refused',quote:'You ask more than you offer. Bring me something I can use.',detail:'Your offer does not cover what you are asking for. Add something to the offer, or ask for revised terms.'};
    else if(!give&&!take&&!goldGive&&!goldTake) return;
    else {
      reply={kind:'signed',quote:selected.id==='mansa'?'Then we both leave richer. Let the caravans carry the news.':selected.id==='taizong'?'These terms are sound. You have my agreement.':'A fair exchange. My merchants will see it done.',detail:`Agreed: ${terms(give,goldGive)} for ${terms(take,goldTake)}. Review the terms in Agreements.`};
      yourGold+=goldTake-goldGive;courtGold[selected.id]!+=goldGive-goldTake;
      signed.push({court:selected.id,give,take,goldGive,goldTake});give='';take='';goldGive=0;goldTake=0;
    }
    render('[data-action="send"]');
  }
  root.addEventListener('click',event=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button||button.disabled)return;
    const d=button.dataset;
    if(d.modal) {
      root.querySelector<HTMLDialogElement>('dialog')!.close();
      if(d.modal==='confirm-war') {clearTowns();give='';take='';goldGive=0;goldTake=0;war=true;warCourt=selected;wars.add(warCourt.id);declaredByUs=true;signed=signed.filter(s=>s.court!==warCourt.id);reply={kind:'war',quote:'So be it. We will meet on the field.',detail:`You declared war on ${selected.name}. Trade has ended.`};}
      if(d.modal==='review') {clearTowns();selected=warCourt;view='audience';reply=null;}
      acknowledged=true;render(war?'[data-action="review-war"]':'[data-action="declare"]');return;
    }
    if(d.demo==='war') {declareIncoming();return;}
    if(d.demo==='peace') {peacePreview();render();return;}
    if(d.demo==='reset') {clearTowns();selected=courts[0]!;give='Cotton';take='Silk';goldGive=0;goldTake=0;war=false;wars.clear();acknowledged=false;reply=null;signed=[];yourGold=240;Object.assign(courtGold,{mithridates:180,mansa:320,taizong:210});view='audience';}
    else if(d.demo==='refusal') {clearTowns();selected=courts[0]!;war=false;wars.clear();signed=[];view='audience';give='Cotton';take='Pearls';goldGive=0;goldTake=0;answer();return;}
    else if(d.court) {clearTowns();selected=courts.find(c=>c.id===d.court)!;give='';take='';goldGive=0;goldTake=0;reply=null;view='audience';}
    else if(d.town && d.townSide) {
      if(!atWar())return;
      const side=d.townSide==='give'?'give':'take';
      const town=towns[side==='give'?'home':selected.id]!.find(t=>t.name===d.town);
      if(!town||town.capital)return;
      const picked=side==='give'?townsGive:townsTake;
      if(picked.has(town.name))picked.delete(town.name);else picked.add(town.name);
      reply=null;
    }
    else if(d.view) view=d.view as typeof view;
    else if(d.give) {give=give===d.give?'':d.give;reply=null;}
    else if(d.take) {take=take===d.take?'':d.take;reply=null;}
    else if(d.action==='send') {answer();return;}
    else if(d.action==='clear') {clearTowns();give='';take='';goldGive=0;goldTake=0;reply=null;}
    else if(d.action==='counter') {
      if(atWar()) {reply={kind:'peaceRefused',quote:'I am not ready to offer terms.',detail:'No counteroffer. You remain at war; you can revise the peace terms below. This is a scripted preview response.'};render('[data-action="counter"]');return;}
      const spare=holdings(selected.goods,false).find(g=>g.copies>1&&!ownGoods().some(o=>o.name===g.name));
      const ours=ownGoods().find(g=>g.copies>1&&!holdings(selected.goods,false).some(o=>o.name===g.name));
      if(spare&&ours) {give=ours.name;take=spare.name;goldGive=0;goldTake=0;reply={kind:'counter',quote:`Your ${give.toLowerCase()} for our ${take.toLowerCase()}. Would that suit you?`,detail:'The proposed terms are on the table. You can edit them before agreeing.'};}
      else reply={kind:'refused',quote:'There is no exchange I can offer you today.',detail:'Neither side has a suitable spare luxury for this sample exchange.'};
    }
    else if(d.action==='review-war') {clearTowns();give='';take='';goldGive=0;goldTake=0;selected=warCourt;view='audience';reply=null;}
    else if(d.action==='declare') {warAlert(true);return;}
    render(d.town?`[data-town-side="${d.townSide}"][data-town="${d.town}"]`:d.give?`[data-give="${d.give}"]`:d.take?`[data-take="${d.take}"]`:d.view?`[data-view="${d.view}"]`:d.court?`[data-court="${d.court}"]`:undefined);
  });
  root.addEventListener('input',event=>{
    const input=event.target as HTMLInputElement;if(!input.dataset.gold)return;
    const value=Math.max(0,Math.min(Number(input.max),Math.floor(Number(input.value)||0)));
    if(input.dataset.gold==='give')goldGive=value;else goldTake=value;
    input.value=String(value);
    root.querySelector('[data-summary="give"]')!.textContent=terms(give,goldGive,townsGive);
    root.querySelector('[data-summary="take"]')!.textContent=terms(take,goldTake,townsTake);
    root.querySelector<HTMLButtonElement>('[data-action="send"]')!.disabled=!atWar()&&!give&&!take&&!goldGive&&!goldTake;
  });
  if(new URLSearchParams(location.search).get('scenario')==='peace')peacePreview();
  render();
}
