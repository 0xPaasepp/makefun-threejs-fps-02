import state from './state.js';
import {input,look,resetPlayer} from './player.js';
import {reload,selectWeapon,throwGrenade} from './weapons.js';
import {buy} from './rounds.js';
export {input};
export function bindInput(play,resume=play){
  document.addEventListener('keydown',event=>{
    if(['Space','Tab','KeyW','KeyA','KeyS','KeyD'].includes(event.code))event.preventDefault();
    input.keys[event.code]=true;if(event.repeat)return;
    if(event.code==='KeyB'&&state.phase==='buy')state.buyOpen=!state.buyOpen;
    if(/^Digit[1-5]$/.test(event.code)){const slot=Number(event.code.slice(-1));if(state.buyOpen)buy(state.player,slot);else if(slot<=3)selectWeapon(['duster','squall','longline'][slot-1]);}
    if(event.code==='KeyR')reload(state.player);if(event.code==='KeyG')throwGrenade(state.player);
    if(event.code==='Escape'){state.buyOpen=false;document.exitPointerLock?.();}
  });
  document.addEventListener('keyup',event=>{input.keys[event.code]=false;});
  document.addEventListener('mousemove',event=>{if(state.locked&&!state.buyOpen&&!state.paused)look(event.movementX,event.movementY);});
  document.addEventListener('mousedown',event=>{if(event.button===0&&state.locked&&!state.buyOpen&&!state.paused){input.fire=true;input.pressed=true;}});
  document.addEventListener('mouseup',()=>{input.fire=false;});
  window.addEventListener('blur',()=>{resetPlayer();if(state.started&&!state.shot)state.paused=true;});
  document.addEventListener('pointerlockchange',()=>{state.locked=!!document.pointerLockElement;if(state.started&&!state.shot){state.paused=!state.locked;if(!state.locked)resetPlayer();}});
  document.getElementById('play').onclick=play;document.getElementById('again').onclick=play;document.getElementById('resume').onclick=resume;
  for(const row of document.querySelectorAll('.buyrow'))row.onclick=()=>buy(state.player,row.dataset.buy);
  document.addEventListener('contextmenu',event=>event.preventDefault());
}
