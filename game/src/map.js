import * as THREE from 'three';
import state from './state.js';
import colors,{material} from './palette.js';
export const nodes=[];
export const spawns=[[],[]];
export const colliders=state.colliders,shootables=state.shootables;
export const sites=[{id:0,name:'CRUSHER',letter:'A',x:17.4,y:.5,z:-9,w:5,d:4},{id:1,name:'PONDS',letter:'B',x:-17.4,y:0,z:-9,w:5,d:4}];
state.sites=sites;state.waypoints=nodes;
function node(name,x,z,yaw=0){nodes.push({name,x,z,yaw,edges:[]});return nodes.length-1;}
function link(a,b){a=typeof a==='string'?findNode(a):a;b=typeof b==='string'?findNode(b):b;nodes[a].edges.push(b);nodes[b].edges.push(a);}
for(let t=0;t<2;t++)for(let i=0;i<5;i++)spawns[t].push(node((t?'HALL_':'GATE_')+i,(i-2)*1.5,t?-14.8:14.8,t?Math.PI:0));
for(const row of [['GATE',0,11],['HALL',0,-14],['MID_S',0,7],['MID_HOLD',0,0],['MID_N',0,-5],['MID_SW',-7,7],['MID_SE',7,7],['MID_NW',-7,-5],['MID_NE',7,-5],['WEST_ENTRY',-17,11],['WEST_MID',-17,3],['WEST_EXIT',-17,-4],['EAST_ENTRY',17,11],['EAST_MID',17,3],['EAST_EXIT',17,-4],['TRESTLE_W',-11,-8],['TRESTLE_C',0,-8],['TRESTLE_E',11,-8],['CRUSHER_HOLD',19,-7],['CRUSHER_PLANT',17.4,-9],['PONDS_HOLD',-19,-7],['PONDS_PLANT',-17.4,-9],['DOCK_HOLD',0,-11]])node(...row);
for(let i=0;i<5;i++){link(spawns[0][i],'GATE');link(spawns[1][i],'HALL');}
for(const pair of [['GATE','MID_S'],['GATE','WEST_ENTRY'],['GATE','EAST_ENTRY'],['MID_S','MID_HOLD'],['MID_S','MID_SW'],['MID_S','MID_SE'],['MID_SW','MID_NW'],['MID_SE','MID_NE'],['MID_HOLD','MID_N'],['MID_N','MID_NW'],['MID_N','MID_NE'],['MID_N','TRESTLE_C'],['WEST_ENTRY','WEST_MID'],['WEST_MID','WEST_EXIT'],['WEST_EXIT','PONDS_HOLD'],['PONDS_HOLD','PONDS_PLANT'],['PONDS_PLANT','TRESTLE_W'],['TRESTLE_W','TRESTLE_C'],['TRESTLE_C','TRESTLE_E'],['TRESTLE_E','CRUSHER_PLANT'],['CRUSHER_PLANT','CRUSHER_HOLD'],['CRUSHER_HOLD','EAST_EXIT'],['EAST_EXIT','EAST_MID'],['EAST_MID','EAST_ENTRY'],['MID_NW','TRESTLE_W'],['MID_NE','TRESTLE_E'],['HALL','DOCK_HOLD'],['DOCK_HOLD','TRESTLE_C'],['HALL','PONDS_PLANT'],['HALL','CRUSHER_PLANT']])link(...pair);
export function findNode(name){return nodes.findIndex(n=>n.name===name);}
export function nearestNode(x,z){let best=0,d=Infinity;for(let i=0;i<nodes.length;i++){const n=nodes[i],q=(n.x-x)**2+(n.z-z)**2;if(q<d){d=q;best=i;}}return best;}
function resolve(value){if(typeof value==='number')return nodes[value]?value:0;if(Array.isArray(value))return nearestNode(value[0],value[1]);if(typeof value==='string')return Math.max(0,findNode(value));if(value?.name){const i=findNode(value.name);if(i>=0)return i;}return nearestNode(value?.x||0,value?.z||0);}
export function route(world,from,to){const start=resolve(from),goal=resolve(to),queue=[start],prev=new Int16Array(nodes.length).fill(-1);prev[start]=start;for(let k=0;k<queue.length;k++){const current=queue[k];if(current===goal)break;for(const next of nodes[current].edges)if(prev[next]===-1){prev[next]=current;queue.push(next);}}if(prev[goal]===-1)return[start];const path=[goal];while(path[0]!==start)path.unshift(prev[path[0]]);return path;}
export function spawnPositions(team){return spawns[team==='rust'?0:team==='brine'?1:team];}
export function floorHeight(x,z){if(Math.abs(x)<6&&z<-10&&z>-13)return .6;if(Math.abs(x)<6&&z<=-9.4&&z>=-10)return .3;if(x>14.8&&x<20&&z>-11&&z<-7)return .5;return 0;}
export function blocked(x,z,r=.3,y=0,height=1.7){for(let i=0;i<colliders.length;i++){const c=colliders[i];if(x+r>c.minX&&x-r<c.maxX&&z+r>c.minZ&&z-r<c.maxZ&&y<c.maxY-.05&&y+height>c.minY+.05)return true;}return false;}
const mats={},unitBox=new THREE.BoxGeometry(1,1,1),pipeGeometry=new THREE.CylinderGeometry(.13,.13,2.6,10);let world;
function box(x,y,z,w,h,d,color='salt',solid=true){const mesh=new THREE.Mesh(unitBox,mats[color]);mesh.scale.set(w,h,d);mesh.position.set(x,y+h/2,z);mesh.castShadow=true;mesh.receiveShadow=true;world.add(mesh);if(solid){colliders.push({minX:x-w/2,maxX:x+w/2,minY:y,maxY:y+h,minZ:z-d/2,maxZ:z+d/2});shootables.push(mesh);}return mesh;}
function label(text,x,y,z,size=1,color='iron'){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle=colors[color];ctx.font='700 82px system-ui';ctx.textAlign='center';ctx.fillText(text,256,94);const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size*4,size),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));mesh.position.set(x,y,z);world.add(mesh);return mesh;}
function sacks(x,z){for(let i=0;i<3;i++)for(let j=0;j<2;j++){const m=box(x+(i-1)*.55,j*.36,z,.58,.34,1,'salt',false);m.rotation.y=(i%2)*.06;}colliders.push({minX:x-.9,maxX:x+.9,minZ:z-.5,maxZ:z+.5,minY:0,maxY:.72});const stop=box(x,0,z,1.8,.72,1,'salt',false);stop.visible=false;shootables.push(stop);}
function rack(x,z){box(x-1,0,z,.12,2.4,.18,'iron');box(x+1,0,z,.12,2.4,.18,'iron');for(let j=0;j<4;j++){const tube=new THREE.Mesh(pipeGeometry,mats.iron);tube.rotation.z=Math.PI/2;tube.position.set(x,.6+j*.4,z);world.add(tube);tube.castShadow=true;}box(x,0,z,2.2,1,.45,'iron');}
// Batch static boxes without losing their independent bullet-stopping volumes.
function batchArchitecture(){world.updateMatrixWorld(true);for(const name in mats){const list=[];for(const mesh of world.children)if(mesh.geometry===unitBox&&mesh.material===mats[name]&&mesh.visible)list.push(mesh);if(!list.length)continue;const batch=new THREE.InstancedMesh(unitBox,mats[name],list.length);for(let i=0;i<list.length;i++){batch.setMatrixAt(i,list[i].matrix);list[i].visible=false;}batch.castShadow=batch.receiveShadow=true;batch.computeBoundingSphere();world.add(batch);}}
export function buildMap(scene){
  world=new THREE.Group();world.name='THE SALTWORKS';scene.add(world);state.world=world;for(const name in colors)mats[name]=material(name);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');ctx.fillStyle=colors.salt;ctx.fillRect(0,0,256,256);ctx.strokeStyle=colors.sand;ctx.lineWidth=2;ctx.strokeRect(0,0,256,256);for(let i=0;i<24;i++){ctx.fillStyle=colors.sand;ctx.fillRect((i*71)%256,(i*113)%256,2,1);}const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(22,17);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(44,34),material('salt',{map:texture}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;world.add(floor);box(0,-.5,0,44,.5,34,'salt',false);
  box(-22,0,0,.4,4.2,34);box(22,0,0,.4,4.2,34);box(0,0,-17,44,4.2,.4);box(0,0,17,44,4.2,.4);
  for(const x of [-10,10]){box(x,0,1,1,4.2,12);box(x,4.2,1,1.4,.18,12,'iron',false);for(let z=-4;z<7;z+=3)box(x-.51,1,z,.025,.08,1.4,'sand',false);}
  for(const x of [-7,7])for(const z of [-6,8])box(x,0,z,1.2,4.2,1.2,'iron');
  box(0,.005,2,14,.025,1.8,'brine',false);const mound=new THREE.Mesh(new THREE.ConeGeometry(3,.55,12),mats.salt);mound.position.set(0,.275,0);world.add(mound);mound.castShadow=mound.receiveShadow=true;
  for(const x of [-4.8,4.8])rack(x,2);for(const x of [-20,20])for(const z of [6,-1])sacks(x,z);for(const x of [-3.7,3.7])sacks(x,-2);for(const x of [-8,8])sacks(x,-9.7);
  const barrelGeometry=new THREE.CylinderGeometry(.42,.42,.9,14);for(const x of [-4,4])for(const z of [5,-4]){const barrel=new THREE.Mesh(barrelGeometry,mats.brine);barrel.position.set(x,.45,z);barrel.castShadow=true;world.add(barrel);colliders.push({minX:x-.42,maxX:x+.42,minZ:z-.42,maxZ:z+.42,minY:0,maxY:.9});shootables.push(barrel);}
  for(const x of [-6,6]){box(x,0,-8,.16,3.6,2.5,'iron');const glass=box(x+.1,.12,-8,.08,3.3,2.1,'salt');glass.material=material('salt',{transparent:true,opacity:.16,roughness:.08,metalness:.1,depthWrite:false});}
  box(0,0,-11.5,12,.6,3,'salt',false);box(0,0,-9.8,12,.3,.4,'salt',false);
  for(const site of sites){const color=site.id===0?'rust':'brine';box(site.x,0,site.z,5,site.y||.06,4,'salt',false);const ring=new THREE.Mesh(new THREE.RingGeometry(2.05,2.13,64),new THREE.MeshBasicMaterial({color:colors[color],side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(site.x,site.y+.03,site.z);world.add(ring);site.ring=ring;const mark=label(site.letter,site.x,site.y+.04,site.z,1.1,color);mark.rotation.x=-Math.PI/2;label(site.name,site.x,3,-16.75,1,color);rack(site.id===0?20:-20,-4.7);}
  box(20,0,-12.6,2.5,2.2,2,'iron');box(20,2.2,-12.6,3.2,.7,2.6,'sand',false);box(20,2.9,-12.6,1.2,2,1.2,'iron',false);for(let i=0;i<3;i++)box(-19+i*1.5,.04,-12.4,1.25,.05,2.4,'brine',false);
  for(let i=0;i<8;i++){box(-21+i*6,0,-16.8,.15,5,.15,'iron',false);box(-21+i*6,4.9,-16.8,4,.12,.25,'iron',false);}
  label('SALTWORKS / 07',0,3.1,-16.72,1.5);label('SOUTH GATE',0,3.1,16.72,1.2).rotation.y=Math.PI;
  for(let i=0;i<12;i++){const hill=new THREE.Mesh(new THREE.ConeGeometry(8+(i%3)*3,5+i%4,5),mats.sand);hill.position.set(-65+i*12,-2,-35-(i%2)*7);world.add(hill);}
  batchArchitecture();return map;
}
export const map={nodes,spawns,sites,colliders,shootables,buildMap,nearestNode,findNode,spawnPositions,floorHeight,blocked,route};
export default map;
