import state,{emitNoise} from './state.js';
import {blocked,floorHeight} from './map.js';
import {clamp} from './utils.js';
export const input={keys:{},fire:false,pressed:false,interact:false};
// Small substeps prevent tunnelling even when a caller supplies a long displacement.
export function moveActor(p,dx,dz){
  const count=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.18)),sx=dx/count,sz=dz/count;
  for(let i=0;i<count;i++){const height=p.crouch?1.05:1.7;if(!blocked(p.x+sx,p.z,.28,p.y,height))p.x+=sx;if(!blocked(p.x,p.z+sz,.28,p.y,height))p.z+=sz;}
  p.x=clamp(p.x,-21.5,21.5);p.z=clamp(p.z,-16.5,16.5);
}
export function collide(p,dx,dz,map){moveActor(p,dx,dz);}
export function movePlayer(p,controls,map,dt,speed=5.2){
  if(!p.alive)return;const k=controls.keys||{};p.crouch=!!(k.KeyC||k.ControlLeft||k.ControlRight);
  let x=(k.KeyD?1:0)-(k.KeyA?1:0),z=(k.KeyS?1:0)-(k.KeyW?1:0);const len=Math.hypot(x,z);if(len){x/=len;z/=len;}
  const max=p.crouch?Math.min(2.4,speed):speed,tx=(Math.cos(p.yaw)*x+Math.sin(p.yaw)*z)*max,tz=(-Math.sin(p.yaw)*x+Math.cos(p.yaw)*z)*max;
  const rate=p.grounded?42:9;p.vx+=clamp(tx-p.vx,-rate*dt,rate*dt);p.vz+=clamp(tz-p.vz,-rate*dt,rate*dt);
  if(!len){p.vx*=Math.max(0,1-9*dt);p.vz*=Math.max(0,1-9*dt);}
  // Diagonal acceleration must respect the weapon's movement cap as well.
  const velocity=Math.hypot(p.vx,p.vz);if(velocity>max){p.vx*=max/velocity;p.vz*=max/velocity;}
  p.speed=Math.hypot(p.vx,p.vz);moveActor(p,p.vx*dt,p.vz*dt);
  const ground=floorHeight(p.x,p.z);if(p.y<ground&&ground-p.y<=.65){p.y=ground;p.grounded=p.onGround=true;}
  if(k.Space&&(p.grounded||p.onGround)){p.vy=6.2;p.grounded=p.onGround=false;}
  p.vy-=20*dt;p.y+=p.vy*dt;if(p.y<=ground){p.y=ground;p.vy=0;p.grounded=p.onGround=true;}
  if(p.speed>3&&!p.crouch){p.footstep-=dt;if(p.footstep<=0){p.footstep=.42;emitNoise(p.x,p.z,10,'step',p.team);}}
}
export function updatePlayer(dt){if(state.phase==='live')movePlayer(state.player,input,null,dt,({duster:5.2,squall:5.6,longline:5})[state.player.gun]);}
export function look(dx,dy){const p=state.player;p.yaw-=dx*.0022;p.pitch=clamp(p.pitch-dy*.0022,-1.48,1.48);}
export function resetPlayer(){input.keys={};input.fire=false;input.pressed=false;state.player.vx=state.player.vz=0;}
