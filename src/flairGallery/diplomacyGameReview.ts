/** Command-backed fixtures for inspecting the shipped modal without altering a save. */
import { createGame, dispatch } from '../sim/game';
import { createMap, getTileAt, tileIndex } from '../sim/map';
import { foundCityAt } from '../sim/cities';
import { bumpRevision } from '../sim/state';
import { resetVisibility } from '../sim/visibility';
import { seatName, seatPeople } from '../sim/leaderData';
import { type Command } from '../sim/commands';
import { type ResourceId } from '../sim/resourceData';
import { createDiplomacyScreen } from '../ui/diplomacyScreen';
import { createConfirmCard } from '../ui/confirmCard';
import { createWarDispatch } from '../ui/warDispatch';
import { createDiplomacyOffers } from '../ui/diplomacyOffers';
import { answerAudience } from '../ai/driver';
import { counterRefusal, counterTerms } from '../ai/diplomacy';
import { valueContext } from '../ai/bot';

export function drawDiplomacyGameReview(root:HTMLElement) {
  const game=createGame({seed:7,sizeName:'duel',players:[
    {name:'Inca',color:'#773e47',secondary:'#d3ad60',charge:'sun',leader:'pachacuti',isHuman:true},
    {name:'Pontus',color:'#705183',secondary:'#d0d1da',charge:'crescent',leader:'mithridates',isHuman:false},
  ]});
  const state=game.state;
  state.map=createMap({width:20,height:12,terrain:'grassland'});resetVisibility(state);
  state.tileOwner=new Array(240).fill(null);state.units=[];state.cities=[];state.camps=[];state.nextEntityId=1;
  const first=foundCityAt(state,0,getTileAt(state.map,3,3)!);
  foundCityAt(state,0,getTileAt(state.map,3,9)!);
  const other=foundCityAt(state,1,getTileAt(state.map,13,3)!);
  foundCityAt(state,1,getTileAt(state.map,13,9)!);
  for(const p of state.players){p.gold=240;p.metSeats=[0,1].filter(id=>id!==p.id);}
  const resources:Array<[number,number,ResourceId,number]>=[
    [2,3,'cotton',first.id],[3,2,'cotton',first.id],[4,3,'wine',first.id],
    [12,3,'silk',other.id],[13,2,'silk',other.id],[14,3,'pearls',other.id],
  ];
  for(const [col,row,id,owner] of resources){const tile=getTileAt(state.map,col,row)!;tile.resource=id;tile.improvement=id==='pearls'?'fishingBoats':'plantation';state.tileOwner[tileIndex(state.map,col,row)]=owner;}
  bumpRevision(state);
  root.innerHTML=`<h1>Diplomacy · shipped modal</h1><p>Isolated game-state fixture. Actions use real commands and AI responses; no saves are touched.</p><button id="court-open">Open diplomacy</button> <button id="court-war">Receive a war declaration</button> <button id="court-seat">Switch seat</button> <button id="court-proposal">Receive trade offer</button><div id="hud-end-turn"><button class="btn btn-primary btn-end">End Turn</button></div><p id="court-status" role="status"></p>
  <div id="diplomacy-overlay" class="statecraft-overlay" role="dialog" aria-modal="true" aria-label="Diplomacy" hidden><div class="statecraft-sheet"><header class="statecraft-head"><div class="statecraft-head-titles"><p class="eyebrow statecraft-eyebrow">the council</p><h2 class="statecraft-title">Foreign courts</h2></div><p class="statecraft-hint">Diplomacy — Esc to close</p><button id="diplomacy-close" class="statecraft-close" type="button" aria-label="Close">×</button></header><div id="diplomacy-body" class="statecraft-body"></div></div></div><div id="court-confirm" class="confirm-overlay" hidden></div>`;
  const el=(id:string)=>root.querySelector<HTMLElement>('#'+id)!;
  let seat=0;
  const confirm=createConfirmCard(el('court-confirm'));
  function command(c:Command){const r=dispatch(game,c);el('court-status').textContent=r.ok?'Command accepted':r.error;if(r.ok&&r.warDeclared?.onId===seat){const {byId,onId}=r.warDeclared;news.enqueue({byId,onId,turn:state.turn,name:seatName(state,byId),people:seatPeople(state,byId)});}screen.refresh();offers?.refresh();return r;}
  let offers: ReturnType<typeof createDiplomacyOffers> | undefined;
  const screen=createDiplomacyScreen({overlay:el('diplomacy-overlay'),body:el('diplomacy-body'),closeButton:el('diplomacy-close'),trigger:el('court-open'),getState:()=>state,getPlayerId:()=>seat,
    declareWar:targetId=>{command({type:'declareWar',playerId:seat,targetId});},
    offerPeace:(targetId,standing,offered)=>{command(standing?{type:'proposePeace',playerId:seat,targetId,...(offered?{give:offered.give,take:offered.take}:{})}:{type:'withdrawPeace',playerId:seat,targetId});},
    proposeDeal:(targetId,give,take)=>{command({type:'proposeDeal',playerId:seat,targetId,give,take});},
    answerDeal:(dealId,accept)=>{command({type:accept?'acceptDeal':'declineDeal',playerId:seat,dealId});},
    declinePeace:targetId=>{command({type:'declinePeace',playerId:seat,targetId});},
    withdrawDeal:dealId=>{command({type:'withdrawDeal',playerId:seat,dealId});},
    askConfirm:(request,run)=>confirm.ask(request,run),
    askAudience:(targetId,dealId)=>{const answer=answerAudience(game,{seatId:targetId,askerId:seat,...(dealId===undefined?{}:{dealId})});return answer?{accepted:answer.command.type==='acceptDeal'||answer.command.type==='proposePeace',sentence:answer.summary,reasons:[]}:null;},
    askCounter:(targetId,give,take)=>{const player=state.players.find(p=>p.id===targetId)!;if(player.isHuman)return null;const ctx=valueContext(state,player);const counter=counterTerms(state,targetId,seat,give,take,ctx);return {terms:counter?{give:counter.give,take:counter.take}:null,reasons:[],refusal:counterRefusal(state,targetId,seat,ctx)};},
  });
  const news=createWarDispatch({beforeOpen:()=>screen.close(),canShow:()=>!confirm.isOpen,relevant:n=>n.onId===seat,review:id=>screen.open(id)});
  offers=createDiplomacyOffers({host:el('hud-end-turn'),getState:()=>state,getPlayerId:()=>seat,review:id=>screen.open(id)});
  el('court-proposal').onclick=()=>{command({type:'proposeDeal',playerId:seat===0?1:0,targetId:seat,give:{gold:10},take:{}});};
  el('court-open').onclick=()=>screen.open();
  el('court-war').onclick=()=>{command({type:'declareWar',playerId:1, targetId:0});};
  el('court-seat').onclick=()=>{seat=seat===0?1:0;el('court-status').textContent=`Playing ${seatName(state,seat)}`;offers.refresh();screen.open();};
  screen.open();
}
