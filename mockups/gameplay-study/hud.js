// Real game CSS and icon assets; representative values, no simulation dispatch.
import {yieldMarkNode} from '../../src/ui/yieldMark';
import {statecraftMarkDataUri,diplomacyMarkDataUri,tradeMarkDataUri} from '../../src/art/dockMarks';
import {yieldMarkDataUri} from '../../src/art/yieldMarks';
import units from '../../data/units.json';
for(const [key,value]of [['food','+8'],['production','+5'],['gold','42 (+3)'],['science','+6'],['culture','+4'],['faith','12 (+2)']]){const chip=document.createElement('span');chip.className=`civ-yield is-${key}`;chip.title=`Sample ${key}`;chip.append(yieldMarkNode(key),document.createTextNode(value));document.querySelector('#civ-yields').append(chip)}
let timer;function preview(name){const el=document.querySelector('#preview-message');el.textContent=`${name}: appearance preview only. Game actions are not connected in this study.`;el.hidden=false;clearTimeout(timer);timer=setTimeout(()=>el.hidden=true,3500)}
for(const [name,uri]of [['Statecraft',statecraftMarkDataUri()],['Religion',yieldMarkDataUri('faith')],['Diplomacy',diplomacyMarkDataUri()],['Trade',tradeMarkDataUri()]]){const button=document.createElement('button');button.className='hud-dock-btn';button.title=name;button.setAttribute('aria-label',name);const icon=document.createElement('span');icon.className='hud-dock-icon';icon.style.maskImage=`url("${uri}")`;icon.style.webkitMaskImage=`url("${uri}")`;button.append(icon);button.onclick=()=>preview(name);document.querySelector('#hud-dock').append(button)}
document.querySelectorAll('[data-preview]').forEach(el=>el.onclick=()=>preview(el.dataset.preview));
document.querySelector('#close-unit').onclick=()=>document.querySelector('#unit-panel').hidden=true;
document.querySelector('#unit-label').onclick=()=>document.querySelector('#unit-panel').hidden=false;
document.querySelector('#toggle-ui').onclick=e=>{const hud=document.querySelector('#study-hud');hud.hidden=!hud.hidden;e.target.textContent=hud.hidden?'Show HUD':'Hide HUD'};
document.querySelector('#moves').textContent=`${units.units.warrior.movement}/${units.units.warrior.movement}`;
document.querySelector('#strength').textContent=units.units.warrior.combatStrength;
