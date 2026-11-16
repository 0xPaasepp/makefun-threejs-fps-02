import * as THREE from 'three';
import state,{damage,emit,emitNoise} from './state.js';
import {input} from './player.js';
import map,{floorHeight} from './map.js';
import {material} from './palette.js';
export const guns={
  duster:{id:'duster',name:'DUSTER',damage:34,head:102,rpm:300,mag:12,reserve:48,still:.004,moving:.030,speed:5.2,price:0,reload:1.4,auto:false},
  squall:{id:'squall',name:'SQUALL',damage:26,head:78,rpm:750,mag:28,reserve:84,still:.008,moving:.035,speed:5.6,price:1500,reload:1.6,auto:true},
  longline:{id:'longline',name:'LONGLINE',damage:36,head:144,rpm:600,mag:25,reserve:75,still:.002,moving:.030,speed:5,price:2700,reload:1.9,auto:true}
};
export const WEAPONS=guns;
const ray=new THREE.Raycaster(),origin=new THREE.Vector3(),direction=new THREE.Vector3(),end=new THREE.Vector3();
const intersections=[];
// Switching retains ammunition per gun; purchases and round starts explicitly refill.
export function equip(p,id,refill=false){
  const g=guns[id];if(!g)return false;p.ammo ||= {};
  if(p.gun)p.ammo[p.gun]={mag:p.mag,reserve:p.reserve};
  p.gun=p.weapon=id;const stored=p.ammo[id];
  if(refill||!stored){p.mag=g.mag;p.reserve=g.reserve;}else{p.mag=stored.mag;p.reserve=stored.reserve;}
  p.reload=0;p.cooldown=0;p.bloom=0;return true;
}
export function selectWeapon(id){const p=state.player;if(id!=='duster'&&!p.owned.includes(id))return false;return equip(p,id);}
export function spread(p=state.player){const g=guns[p.gun],moving=Math.max(p.speed||0,Math.hypot(p.vx||0,p.vz||0))>.2;return(moving?g.moving:g.still)*(p.crouch?.7:1)+p.bloom;}
export function reload(p=state.player){const g=guns[p.gun];if(!p.alive||p.reload>0||p.mag>=g.mag||p.reserve<=0)return false;p.reload=p.reloadTotal=g.reload;emit('reload',p);return true;}
export function tickWeapon(p,dt){p.cooldown=Math.max(0,p.cooldown-dt);p.bloom=Math.max(0,p.bloom-dt*.017);p.kick=Math.max(0,p.kick-dt*.15);if(p.reload>0){p.reload=Math.max(0,p.reload-dt);if(p.reload===0){const n=Math.min(guns[p.gun].mag-p.mag,p.reserve);p.mag+=n;p.reserve-=n;}}}
function shot(p,target){
  const g=guns[p.gun];p.mag--;p.cooldown=60/g.rpm;p.bloom=Math.min(.035,p.bloom+.0015);p.kick=Math.min(.10,p.kick+.014);emitNoise(p.x,p.z,28,'gunshot',p.team);
  origin.set(p.x,p.y+(p.crouch?1.02:1.6),p.z);
  if(target){direction.set(target.x-origin.x,target.y+1.2-origin.y,target.z-origin.z).normalize();const error=(.035+Math.hypot(target.vx,target.vz)*.002)/p.skill;direction.x+=(state.rng()-.5)*error*2;direction.y+=(state.rng()-.5)*error*2;direction.z+=(state.rng()-.5)*error*2;direction.normalize();}
  else{const s=spread(p);direction.set(-Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),-Math.cos(p.yaw)*Math.cos(p.pitch));direction.x+=(state.rng()-.5)*s;direction.y+=(state.rng()-.5)*s;direction.normalize();}
  ray.set(origin,direction);ray.far=65;intersections.length=0;
  ray.intersectObjects(state.shootables,false,intersections);ray.intersectObjects(state.hitMeshes,false,intersections);intersections.sort((a,b)=>a.distance-b.distance);
  let hit=null;for(let i=0;i<intersections.length;i++){const q=intersections[i],victim=q.object.userData.actor;if(victim&&(!victim.alive||victim===p))continue;hit=q;break;}
  end.copy(origin).addScaledVector(direction,hit?hit.distance:60);
  if(hit){const victim=hit.object.userData.actor;if(victim&&victim.team!==p.team){const head=!!hit.object.userData.head,amount=(head?g.head:g.damage)*(hit.distance>45?.6:hit.distance>30?.75:1);const killed=damage(victim,amount,p,head);if(p.human){state.hitmarker=.18;state.hitKill=killed;}}emit('impact',{x:end.x,y:end.y,z:end.z});}
  emit('shot',{p,x:origin.x,y:origin.y,z:origin.z,ex:end.x,ey:end.y,ez:end.z});return true;
}
// This low-level primitive also supports range checks during requisition.
export function fired(p=state.player){if(!p.alive||p.reload>0||p.cooldown>0||!['live','buy'].includes(state.phase)||p.mag<=0)return false;return shot(p,null);}
export function fireWeapon(p=state.player,target=null){if(!p.alive||p.reload>0||p.cooldown>0||state.phase!=='live')return false;if(p.mag<=0){reload(p);return false;}return shot(p,target);}
export function throwGrenade(p=state.player){if(!p.alive||!p.grenade||state.phase!=='live')return false;p.grenade=0;state.grenades.push({x:p.x,y:p.y+1.4,z:p.z,vx:-Math.sin(p.yaw)*9,vy:4.5,vz:-Math.cos(p.yaw)*9,t:1.6,owner:p});emit('throw',p);return true;}
export function stepGrenades(dt,world,effect,applyDamage,onBlast){
  for(let i=state.grenades.length-1;i>=0;i--){const g=state.grenades[i];g.t-=dt;g.vy-=12*dt;const nx=g.x+g.vx*dt,nz=g.z+g.vz*dt;if(world.blocked(nx,nz,.12,g.y,.24)){g.vx*=-.4;g.vz*=-.4;}else{g.x=nx;g.z=nz;}g.y+=g.vy*dt;const floor=floorHeight(g.x,g.z)+.12;if(g.y<floor){g.y=floor;g.vy=Math.abs(g.vy)*.4;g.vx*=.7;g.vz*=.7;}if(g.t<=0){for(let j=0;j<state.players.length;j++){const p=state.players[j],d=Math.hypot(p.x-g.x,p.z-g.z);if(p.alive&&d<6)applyDamage(p,90-70*d/6,g.owner);}emitNoise(g.x,g.z,40,'blast',g.owner.team);effect?.burst?.(g.x,g.y,g.z);onBlast?.(g);state.grenades.splice(i,1);}}
}
const grenadeEffect={burst:(x,y,z)=>emit('burst',{x,y,z})};
function onBlast(g){if(Math.hypot(g.x-state.player.x,g.z-state.player.z)<8)state.shake=.5;}
export function updateWeapons(dt){for(let i=0;i<state.players.length;i++)tickWeapon(state.players[i],dt);const p=state.player;if(state.phase==='live'&&!state.buyOpen&&(input.pressed||(input.fire&&guns[p.gun].auto)))fireWeapon(p);input.pressed=false;stepGrenades(dt,map,grenadeEffect,damage,onBlast);}
export function makeView(camera){
  const group=new THREE.Group();group.name='FIRST PERSON';camera.add(group);state.view=group;
  function part(x,y,z,w,h,d,color){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);group.add(m);return m;}
  part(.25,-.23,-.43,.14,.16,.46,'iron');part(.25,-.18,-.72,.055,.055,.27,'iron');part(.25,-.36,-.32,.085,.22,.1,'iron').rotation.x=-.15;
  part(.25,-.2,-.41,.145,.028,.13,'rust');part(.25,-.12,-.52,.04,.045,.055,'sand');part(.25,-.11,-.77,.025,.04,.03,'salt');part(.25,-.34,-.48,.065,.19,.12,'iron');
  for(let i=0;i<6;i++)part(.25,-.13,-.38-i*.035,.075,.018,.016,'sand');
  part(.37,-.34,-.25,.13,.13,.32,'sand').rotation.z=-.3;part(.15,-.37,-.5,.13,.13,.25,'sand').rotation.z=.35;
  return group;
}
export function updateView(){const p=state.player,v=state.view;if(!v)return;v.visible=p.alive;v.position.z=p.kick*.6;v.position.y=(p.reload>0?-.2*Math.sin(Math.PI*p.reload/p.reloadTotal):0)+Math.sin(state.time*9)*p.speed*.0018;v.rotation.z=p.reload>0?-.2:0;v.scale.z=p.gun==='duster'?.75:p.gun==='squall'?.9:1.2;}
export const weapon={spread,reload,fire:fireWeapon};
