import {seeded} from './utils.js';
const listeners=Object.create(null);
export function on(name,handler){(listeners[name] ||= []).push(handler);return handler;}
export function emit(name,payload){const list=listeners[name];if(list)for(let i=0;i<list.length;i++)list[i](payload);}
export function actor(id,team,name,human=false){
  return {id,team,name,human,x:0,y:0,z:0,yaw:0,pitch:0,vx:0,vy:0,vz:0,hp:100,armor:0,alive:true,money:800,gun:'duster',weapon:'duster',owned:['duster'],mag:12,reserve:48,ammo:{},grenade:false,kills:0,deaths:0,crouch:false,grounded:true,onGround:true,speed:0,bloom:0,cooldown:0,reload:0,reloadTotal:0,kick:0,damageAt:-10,state:'BUY',role:'',path:[],pathIndex:0,target:null,reaction:0,skill:1,thinkAt:0,channel:0,pickup:0,stuck:0,lastX:0,lastZ:0,mesh:null,head:null,torso:null,objective:null,investigate:0,burst:0,lastNoise:-1,noiseAt:0,recover:false,footstep:0};
}
export const state={started:false,paused:false,locked:false,shot:false,time:0,phase:'buy',timer:12,round:1,score:[0,0],losses:[0,0],winner:'',reason:'',message:'',site:'A',rng:seeded(1),players:[],bots:[],player:null,colliders:[],shootables:[],hitMeshes:[],waypoints:[],sites:[],noises:[],noiseId:0,feed:[],hitmarker:0,hitKill:false,shake:0,buyOpen:false,damageFlash:0,channelText:'',channelProgress:0,grenades:[],effects:[],charge:{carrier:1,planted:false,dropped:false,site:'',x:0,z:14,fuse:35,progress:0,defuse:0,defused:false,actor:-1,pickupBot:-1},scene:null,camera:null,world:null,view:null,roundSerial:0};
const names=['YOU','FLINT','CINDER','ROOK','VEIL','TIDE','SILT','WELL','REEF','DELTA'];
for(let i=0;i<10;i++)state.players.push(actor(i,i<5?0:1,names[i],i===0));
state.player=state.players[0];state.bots=state.players.slice(1);
export function emitNoise(x,z,radius,kind,team){
  const noise={id:++state.noiseId,x,z,radius,kind,team,time:state.time};
  state.noises.push(noise);if(state.noises.length>24)state.noises.shift();
  if(kind==='step')emit('footstep',noise);return noise;
}
state.emitNoise=emitNoise;
export function damage(victim,amount,attacker=null,head=false){
  if(state.phase!=='live'||!victim.alive||amount<=0||(attacker&&attacker.team===victim.team))return false;
  const soak=Math.min(victim.armor,amount*.5);victim.armor-=soak;victim.hp=Math.max(0,victim.hp-amount+soak);
  victim.damageAt=state.time;victim.channel=0;
  if(state.charge.carrier===victim.id)state.charge.progress=0;
  if(state.charge.actor===victim.id)state.charge.defuse=0;
  if(victim.human){state.damageFlash=.35;state.shake=.15;}
  emit('hurt',victim);if(victim.hp>0)return false;
  victim.alive=false;victim.deaths++;victim.target=null;victim.state='OUT';victim.vx=victim.vz=victim.speed=0;
  if(attacker){attacker.kills++;attacker.money=Math.min(16000,attacker.money+300);}
  if(state.charge.carrier===victim.id)Object.assign(state.charge,{carrier:-1,dropped:true,x:victim.x,z:victim.z});
  state.feed.unshift({killer:attacker?.name||'FLASH',victim:victim.name,head,time:state.time,human:attacker?.human});
  if(state.feed.length>3)state.feed.pop();emit('death',{victim,attacker,head});return true;
}
export const S=state;
export default state;
