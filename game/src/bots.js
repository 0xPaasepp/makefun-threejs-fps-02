import * as THREE from 'three';
import state from './state.js';
import map,{nodes,nearestNode,findNode,route as mapRoute,floorHeight} from './map.js';
import {moveActor} from './player.js';
import {fireWeapon,equip,reload,guns} from './weapons.js';
import {material} from './palette.js';
import {angleDelta} from './utils.js';
export const AI_STATES=['BUY','ROUTE','HOLD','ENGAGE','PLANT','DEFUSE','ROTATE','INVESTIGATE','OUT'];
const ray=new THREE.Raycaster(),from=new THREE.Vector3(),toward=new THREE.Vector3(),hits=[];
export function route(start,end){return mapRoute(map,start,end);}
export function setRoute(b,goal){const index=typeof goal==='string'?findNode(goal):goal;b.path=route(nearestNode(b.x,b.z),index);b.pathIndex=0;b.objective=index;b.state='ROUTE';b.stuck=0;}
export function botBuy(b){const id=b.money>=2700?'longline':b.money>=1500?'squall':'duster';b.money-=guns[id].price;if(!b.owned.includes(id))b.owned.push(id);equip(b,id,true);b.grenade=false;b.armor=0;if(b.money>=300){b.money-=300;b.grenade=true;}if(b.money>=650){b.money-=650;b.armor=50;}}
export function assignRoles(){const site=state.site==='A'?'CRUSHER':'PONDS';for(let i=0;i<state.bots.length;i++){const b=state.bots[i];b.target=null;b.reaction=.4+state.rng()*.25;b.thinkAt=state.time+i*.025;b.skill=.8+state.rng()*.4;b.lastNoise=state.noiseId;b.investigate=0;b.burst=3;
  if(b.team===0){b.role=b.id===state.charge.carrier?'carrier':b.id===4?'lurker':'entry';setRoute(b,b.role==='lurker'?'MID_HOLD':site+'_PLANT');}
  else{b.role=['anchor','anchor','mid','rotator','dock'][b.id-5];setRoute(b,['CRUSHER_HOLD','PONDS_HOLD','MID_HOLD','TRESTLE_C','DOCK_HOLD'][b.id-5]);}
}}
export function hasLOS(a,b){const d=Math.hypot(a.x-b.x,a.z-b.z);if(d>(b.crouch?21:34))return false;from.set(a.x,a.y+1.55,a.z);toward.set(b.x-a.x,b.y+1.25-from.y,b.z-a.z).normalize();ray.set(from,toward);ray.far=d;hits.length=0;ray.intersectObjects(state.shootables,false,hits);return hits.length===0;}
export function hearNoise(b,world=map){if(b.target&&b.target!==-1&&b.target.alive)return;for(let i=state.noises.length-1;i>=0;i--){const noise=state.noises[i];if(noise.id<=b.lastNoise)break;if(noise.team===b.team||state.time-noise.time>=2||Math.hypot(b.x-noise.x,b.z-noise.z)>noise.radius)continue;b.lastNoise=noise.id;b.noiseAt=state.time;b.investigate=2;b.noiseX=noise.x;b.noiseZ=noise.z;b.yaw=Math.atan2(b.x-noise.x,b.z-noise.z);if(state.charge.carrier!==b.id&&!state.charge.planted){setRoute(b,nearestNode(noise.x,noise.z));b.state='INVESTIGATE';}return;}}
function perceive(b){let best=null,distance=Infinity;for(let i=0;i<state.players.length;i++){const p=state.players[i];if(!p.alive||p.team===b.team)continue;const dx=p.x-b.x,dz=p.z-b.z,d=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);if(d>distance||Math.abs(angleDelta(b.yaw,yaw))>1.05&&d>7)continue;if(hasLOS(b,p)){best=p;distance=d;}}if(best!==b.target)b.reaction=.35+state.rng()*.3;b.target=best;}
function stop(b){b.speed=b.vx=b.vz=0;b.stuck=0;}
function follow(b,dt,speed){if(b.pathIndex>=b.path.length){stop(b);return;}const n=nodes[b.path[b.pathIndex]],dx=n.x-b.x,dz=n.z-b.z,d=Math.hypot(dx,dz);if(d<.35){b.pathIndex++;b.stuck=0;return;}const oldX=b.x,oldZ=b.z;b.yaw=Math.atan2(-dx,-dz);moveActor(b,dx/d*speed*dt,dz/d*speed*dt);b.y=floorHeight(b.x,b.z);b.vx=(b.x-oldX)/dt;b.vz=(b.z-oldZ)/dt;b.speed=Math.hypot(b.vx,b.vz);if(b.speed<.3){b.stuck+=dt;const side=(b.id%2?1:-1);moveActor(b,-dz/d*dt*2*side,dx/d*dt*2*side);if(b.stuck>1.2){moveActor(b,dx/d*.22,dz/d*.22);b.pathIndex=Math.min(b.path.length-1,b.pathIndex+1);b.stuck=0;}}else b.stuck=0;}
export function updateBots(dt){if(state.phase!=='live')return;const c=state.charge;
  for(let i=0;i<state.bots.length;i++){const b=state.bots[i];if(!b.alive){b.stuck=0;continue;}
    if(b.thinkAt<=state.time){perceive(b);if(!b.target)hearNoise(b);b.thinkAt=state.time+.15;}
    if(b.target&&b.target!==-1&&b.target.alive&&hasLOS(b,b.target)){b.state='ENGAGE';b.stuck=0;const target=b.target;b.yaw=Math.atan2(b.x-target.x,b.z-target.z);b.reaction-=dt;stop(b);if(b.reaction<=0){if(b.mag===0)reload(b);else if(fireWeapon(b,target)){b.burst--;if(b.burst<=0){b.burst=3+Math.floor(state.rng()*3);b.reaction=.22+state.rng()*.25;}}}if(b.hp<35)moveActor(b,Math.cos(b.yaw)*dt*.8,-Math.sin(b.yaw)*dt*.8);continue;}
    b.target=null;b.investigate=Math.max(0,b.investigate-dt);
    if(c.planted){if(b.team===1){const goal=nearestNode(c.x,c.z);if(b.objective!==goal){setRoute(b,goal);b.state='ROTATE';}if(Math.hypot(b.x-c.x,b.z-c.z)<2.5){b.state='DEFUSE';stop(b);continue;}}else if(b.pathIndex>=b.path.length){b.state='HOLD';stop(b);b.yaw+=dt*.2;continue;}}
    else if(c.carrier<0&&b.team===0){const goal=nearestNode(c.x,c.z);if(b.objective!==goal)setRoute(b,goal);if(Math.hypot(b.x-c.x,b.z-c.z)<.8){stop(b);continue;}}
    else if(c.carrier===b.id){const site=state.sites[state.site==='A'?0:1];if(Math.abs(b.x-site.x)<2.3&&Math.abs(b.z-site.z)<1.8){b.state='PLANT';stop(b);continue;}const goal=findNode(site.name+'_PLANT');if(b.objective!==goal)setRoute(b,goal);}
    if(b.pathIndex<b.path.length)follow(b,dt,3.2);else{b.state=b.investigate>0?'INVESTIGATE':'HOLD';stop(b);b.yaw+=Math.sin(state.time*.7+b.id)*dt*.25;}
  }
}
export function initBots(){
  const torsoGeometry=new THREE.BoxGeometry(.48,.72,.28),headGeometry=new THREE.SphereGeometry(.155,14,10),legGeometry=new THREE.BoxGeometry(.17,.65,.21),armGeometry=new THREE.BoxGeometry(.14,.48,.17),iron=material('iron'),sand=material('sand');
  for(let i=0;i<state.players.length;i++){const b=state.players[i],g=new THREE.Group();g.name=b.name;
    const torso=new THREE.Mesh(torsoGeometry,material(b.team?'brine':'salt'));torso.position.y=1.04;g.add(torso);torso.userData.actor=b;
    const head=new THREE.Mesh(headGeometry,material(b.team?'brine':'rust'));head.position.y=1.63;g.add(head);head.userData={actor:b,head:true};b.head=head;b.torso=torso;
    if(!b.human){const helmet=new THREE.Mesh(new THREE.SphereGeometry(.17,12,8,0,Math.PI*2,0,Math.PI/2),iron);helmet.position.y=1.69;g.add(helmet);for(const x of [-.14,.14]){const leg=new THREE.Mesh(legGeometry,iron);leg.position.set(x,.34,0);g.add(leg);const arm=new THREE.Mesh(armGeometry,sand);arm.position.set(x*2.1,1.03,-.12);arm.rotation.x=-.55;g.add(arm);}const rifle=new THREE.Mesh(new THREE.BoxGeometry(.10,.10,.65),iron);rifle.position.set(.22,1.16,-.33);g.add(rifle);const vest=new THREE.Mesh(new THREE.BoxGeometry(.4,.42,.32),iron);vest.position.y=1.08;g.add(vest);for(const child of g.children)child.castShadow=true;}
    b.mesh=g;state.scene.add(g);state.hitMeshes.push(torso,head);
  }
}
export function renderBots(){for(let i=0;i<state.players.length;i++){const b=state.players[i];if(!b.mesh)continue;b.mesh.visible=b.alive&&!b.human;b.mesh.position.set(b.x,b.y,b.z);b.mesh.rotation.y=b.yaw;b.mesh.scale.y=b.crouch?.72:1;}state.scene?.updateMatrixWorld(true);}
