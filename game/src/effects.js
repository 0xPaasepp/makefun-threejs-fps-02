import * as THREE from 'three';
import state,{on} from './state.js';
import {floorHeight} from './map.js';
import colors from './palette.js';
let scene,chargeMesh,progressRing,muzzleLight;const grenadeMeshes=[];
function transient(mesh,life,grow=0){scene.add(mesh);state.effects.push({mesh,life,total:life,grow});}
export function burst(x,y,z){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),new THREE.MeshBasicMaterial({color:colors.rust,transparent:true,opacity:.8}));mesh.position.set(x,y,z);transient(mesh,.4,8);}
export function initEffects(world){scene=world;muzzleLight=new THREE.PointLight(colors.ink,0,4,2);scene.add(muzzleLight);
  on('shot',shot=>{const geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(shot.x,shot.y-.05,shot.z),new THREE.Vector3(shot.ex,shot.ey,shot.ez)]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:colors.rust,transparent:true,opacity:.8}));transient(line,.08);const flash=new THREE.Mesh(new THREE.OctahedronGeometry(.10),new THREE.MeshBasicMaterial({color:colors.ink,transparent:true}));flash.position.set(shot.x-Math.sin(shot.p.yaw)*.6,shot.y-.1,shot.z-Math.cos(shot.p.yaw)*.6);transient(flash,.045);muzzleLight.position.copy(flash.position);muzzleLight.intensity=3;});
  on('impact',p=>{for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.025+i*.007),new THREE.MeshBasicMaterial({color:colors.sand,transparent:true,opacity:.7}));m.position.set(p.x+Math.sin(i*2.4)*.06,p.y+Math.cos(i*1.8)*.06,p.z);transient(m,.18+i*.03,1.2);}});on('burst',p=>burst(p.x,p.y,p.z));
  chargeMesh=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.4,.25,.3),new THREE.MeshStandardMaterial({color:colors.iron}));chargeMesh.add(body);const band=new THREE.Mesh(new THREE.BoxGeometry(.13,.27,.32),new THREE.MeshBasicMaterial({color:colors.rust}));chargeMesh.add(band);scene.add(chargeMesh);
  progressRing=new THREE.Mesh(new THREE.RingGeometry(.55,.62,48),new THREE.MeshBasicMaterial({color:colors.rust,transparent:true,side:THREE.DoubleSide}));progressRing.rotation.x=-Math.PI/2;scene.add(progressRing);
}
export function updateEffects(dt){for(let i=state.effects.length-1;i>=0;i--){const e=state.effects[i];e.life-=dt;e.mesh.material.opacity=Math.max(0,e.life/e.total);e.mesh.scale.addScalar(e.grow*dt);if(e.life<=0){scene.remove(e.mesh);e.mesh.geometry.dispose();e.mesh.material.dispose();state.effects.splice(i,1);}}if(muzzleLight)muzzleLight.intensity=Math.max(0,muzzleLight.intensity-dt*80);state.hitmarker=Math.max(0,state.hitmarker-dt);state.damageFlash=Math.max(0,state.damageFlash-dt);state.shake=Math.max(0,state.shake-dt);}
export function renderEffects(){if(!chargeMesh)return;const c=state.charge,height=floorHeight(c.x,c.z);chargeMesh.visible=c.planted||c.dropped||c.progress>0;chargeMesh.position.set(c.x,height+.18,c.z);progressRing.visible=c.planted||c.progress>0;progressRing.position.set(c.x,height+.05,c.z);progressRing.material.opacity=.5+Math.sin(state.time*6)*.2;
  while(grenadeMeshes.length<state.grenades.length){const m=new THREE.Mesh(new THREE.SphereGeometry(.12,10,6),new THREE.MeshStandardMaterial({color:colors.rust}));scene.add(m);grenadeMeshes.push(m);}for(let i=0;i<grenadeMeshes.length;i++){const g=state.grenades[i],m=grenadeMeshes[i];m.visible=!!g;if(g)m.position.set(g.x,g.y,g.z);}}
export const effect={burst};
