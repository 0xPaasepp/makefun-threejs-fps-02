import state,{damage,emit,emitNoise} from './state.js';
import map,{nodes,spawns,floorHeight} from './map.js';
import {equip,guns} from './weapons.js';
import {input as globalInput} from './player.js';
import {assignRoles,botBuy} from './bots.js';
import {teamIndex} from './utils.js';
export {damage};
export const economy={start:800,win:3250,loss:1900,lossStep:500,lossCap:3400,kill:300,plant:300,defuse:300};
export const ECONOMY=economy;
export const items=['duster','squall','longline','flashpan','rig'];
export function buy(player,value){if(typeof player!=='object'){value=player;player=state.player;}const id=typeof value==='number'?items[value-1]:value,price=guns[id]?.price??({flashpan:300,rig:650})[id];if(state.phase!=='buy'||!player.alive||price===undefined||player.money<price||id==='flashpan'&&player.grenade||id==='rig'&&player.armor>=50)return false;player.money-=price;if(guns[id]){if(!player.owned.includes(id))player.owned.push(id);equip(player,id,true);}else if(id==='rig')player.armor=50;else player.grenade=true;emit('buy',player);return true;}
export function endRound(team,reason='ROUND SECURED'){if(state.phase!=='live')return false;const t=teamIndex(team);if(t!==0&&t!==1)return false;state.score[t]++;state.winner=t;state.reason=state.message=reason;state.losses[t]=0;state.losses[1-t]++;for(let i=0;i<state.players.length;i++){const p=state.players[i];p.money=Math.min(16000,p.money+(p.team===t?economy.win:Math.min(economy.lossCap,economy.loss+economy.lossStep*(state.losses[1-t]-1))));}state.phase=state.score[t]>=5?'match':'end';state.timer=4;state.buyOpen=false;state.channelText='';state.channelProgress=0;emit('roundEnd',t);return true;}
export function beginRound(){state.phase='buy';state.timer=12;state.roundSerial++;state.buyOpen=false;state.winner='';state.reason=state.message='';state.site=state.rng()<.5?'A':'B';state.noises.length=0;state.grenades.length=0;state.channelText='';state.channelProgress=0;globalInput.fire=globalInput.pressed=false;
  Object.assign(state.charge,{carrier:1,planted:false,dropped:false,site:'',x:0,z:14,fuse:35,progress:0,defuse:0,defused:false,actor:-1,pickupBot:-1});
  for(let i=0;i<state.players.length;i++){const p=state.players[i],n=nodes[spawns[p.team][i%5]];if(!p.alive){p.gun=p.weapon='duster';p.owned=['duster'];p.ammo={};}Object.assign(p,{x:n.x,y:floorHeight(n.x,n.z),z:n.z,yaw:n.yaw,pitch:0,vx:0,vy:0,vz:0,hp:100,alive:true,channel:0,pickup:0,speed:0,stuck:0,damageAt:state.time-10,grounded:true,onGround:true,target:null,state:'BUY',kick:0});if(p.human){p.armor=0;p.grenade=false;equip(p,p.gun,true);}else botBuy(p);}
  assignRoles();emit('roundStart',state.round);
}
export function startMatch(){state.started=true;state.paused=false;state.round=1;state.score=[0,0];state.losses=[0,0];state.feed=[];for(const p of state.players){p.money=800;p.kills=0;p.deaths=0;p.gun=p.weapon='duster';p.owned=['duster'];p.ammo={};}beginRound();}
export const resetMatch=startMatch,startRound=beginRound;
export function plant(p,site){const c=state.charge;if(c.planted)return false;Object.assign(c,{planted:true,dropped:false,carrier:-1,site:site.id,x:site.x,z:site.z,fuse:35,progress:0,actor:-1});p.money=Math.min(16000,p.money+300);p.channel=0;emitNoise(c.x,c.z,18,'plant',p.team);emit('plant',c);return true;}
export function stepRounds(world,dt,input){
  if(state.phase==='match')return;state.timer-=dt;
  if(state.phase==='buy'){if(state.timer<=0){state.phase='live';state.timer=100;state.buyOpen=false;emit('live',null);}return;}
  if(state.phase==='end'){if(state.timer<=0){state.round++;beginRound();}return;}
  if(state.phase!=='live')return;const c=state.charge;state.channelText='';state.channelProgress=0;
  if(c.carrier<0&&!c.planted){for(let i=0;i<5;i++){const p=state.players[i];if(!p.alive)continue;if(Math.hypot(p.x-c.x,p.z-c.z)<1){p.pickup+=dt;if(p.pickup>=1){c.carrier=p.id;c.dropped=false;p.pickup=0;emit('pickup',p);break;}}else p.pickup=0;}}
  if(!c.planted&&c.carrier>=0){const p=state.players[c.carrier];let site=null;for(let i=0;i<world.sites.length;i++){const s=world.sites[i];if(Math.abs(p.x-s.x)<=s.w/2&&Math.abs(p.z-s.z)<=s.d/2)site=s;}const held=p.human?input?.keys?.KeyE:p.state==='PLANT';if(p.alive&&site&&held&&Math.hypot(p.vx,p.vz)<.8&&state.time-p.damageAt>=.12){p.channel+=dt;c.progress=p.channel;c.x=p.x;c.z=p.z;if(p.human){state.channelText='ARMING THE CHARGE';state.channelProgress=p.channel/3.5;}if(p.channel>=3.5)plant(p,site);}else{p.channel=0;c.progress=0;}}
  if(c.planted){c.fuse-=dt;let defuser=null;for(let i=0;i<state.players.length;i++){const p=state.players[i];if(p.team===1&&p.alive&&Math.hypot(p.x-c.x,p.z-c.z)<2.7&&state.time-p.damageAt>=.12&&(p.state==='DEFUSE'||p.human&&input?.keys?.KeyE)){defuser=p;break;}}if(defuser){if(c.actor!==defuser.id){c.actor=defuser.id;c.defuse=0;}c.defuse+=dt;defuser.channel=c.defuse;if(defuser.human){state.channelText='DEFUSING THE CHARGE';state.channelProgress=c.defuse/5;}if(c.defuse>=5){defuser.money=Math.min(16000,defuser.money+300);c.defused=true;endRound(1,'CHARGE DEFUSED');return;}}else{c.actor=-1;c.defuse=0;}if(c.fuse<=0){emit('burst',{x:c.x,y:.4,z:c.z});endRound(0,'CHARGE DETONATED');return;}}
  let rust=0,brine=0;for(let i=0;i<state.players.length;i++){const p=state.players[i];if(p.alive){if(p.team===0)rust++;else brine++;}}
  if(!brine)endRound(0,'BRINE ELIMINATED');else if(!rust&&!c.planted)endRound(1,'RUST ELIMINATED');else if(state.timer<=0&&!c.planted)endRound(1,'SALTWORKS HELD');
}
export function updateRounds(dt){stepRounds(map,dt,globalInput);}
