import Matter from 'matter-js';
export type Ball = { id: number; x: number; y: number; kind: 'white'|'black'|'queen'|'cue'|'solid'|'stripe'|'eight' };
export type Shot = { angle: number; power: number; position?: number|undefined };
export function rack(game: 'carrom'|'billiards'): Ball[] {
 if(game==='billiards')return [{id:0,x:25,y:50,kind:'cue'},...Array.from({length:15},(_,i)=>{let row=0;while(i>=(row+1)*(row+2)/2)row++;const col=i-row*(row+1)/2;const number=[1,9,2,10,8,3,11,4,12,5,13,6,14,7,15][i]??i+1;return {id:number,x:67+row*3.6,y:50+(col-row/2)*4.2,kind:number===8?'eight' as const:number<8?'solid' as const:'stripe' as const};})];
 const coins:Ball[]=[{id:19,x:50,y:50,kind:'queen'}];
 for(let ring=1;ring<=2;ring++)for(let i=0;i<ring*6;i++){const angle=i*Math.PI*2/(ring*6);coins.push({id:coins.length,x:50+Math.cos(angle)*ring*4.1,y:50+Math.sin(angle)*ring*4.1,kind:i%2?'black':'white'});}
 return coins;
}
export function simulateShot(game:'carrom'|'billiards',input:Ball[],seat:number,shot:Shot){
 if(!Number.isFinite(shot.angle)||!Number.isFinite(shot.power)||shot.power<1||shot.power>100)throw Error('قوة التصويب غير صالحة');
 const engine=Matter.Engine.create({gravity:{x:0,y:0,scale:0}});engine.positionIterations=8;engine.velocityIterations=8;
 const width=game==='billiards'?1000:600,height=600,radius=game==='billiards'?12:11;
 const pockets=game==='billiards'?[[0,0],[width/2,0],[width,0],[0,height],[width/2,height],[width,height]]:[[0,0],[width,0],[0,height],[width,height]];
 const balls=input.map(b=>({...b}));let cue=balls.find(b=>b.id===0);
 if(game==='carrom'){const p=Math.max(20,Math.min(80,shot.position??50));const xy=seat===0?[p,84]:seat===1?[84,p]:seat===2?[p,16]:[16,p];cue={id:0,x:xy[0]??50,y:xy[1]??84,kind:'cue'};balls.push(cue);}
 if(!cue)throw Error('الكرة البيضاء غير موجودة');
 const bodies=balls.map(b=>Matter.Bodies.circle(b.x*width/100,b.y*height/100,b.id===0&&game==='carrom'?14:radius,{label:String(b.id),restitution:.94,friction:0,frictionAir:.013,slop:.01}));
 Matter.Composite.add(engine.world,[...bodies,Matter.Bodies.rectangle(width/2,-20,width+80,40,{isStatic:true,restitution:.95}),Matter.Bodies.rectangle(width/2,height+20,width+80,40,{isStatic:true,restitution:.95}),Matter.Bodies.rectangle(-20,height/2,40,height+80,{isStatic:true,restitution:.95}),Matter.Bodies.rectangle(width+20,height/2,40,height+80,{isStatic:true,restitution:.95})]);
 const striker=bodies.find(b=>b.label==='0');if(!striker)throw Error('لا يوجد مضرب');
 let firstHit:number|null=null;Matter.Events.on(engine,'collisionStart',(event)=>{for(const pair of event.pairs){if(firstHit!==null)break;const other=pair.bodyA===striker?pair.bodyB:pair.bodyB===striker?pair.bodyA:null;if(other&&!other.isStatic)firstHit=Number(other.label);}});
 const a=shot.angle*Math.PI/180;Matter.Body.setVelocity(striker,{x:Math.cos(a)*shot.power*.23,y:Math.sin(a)*shot.power*.23});
 const pocketed:number[]=[],frames:Ball[][]=[];
 for(let tick=0;tick<720;tick++){
  Matter.Engine.update(engine,1000/60);
  for(const b of bodies){if(pocketed.includes(Number(b.label)))continue;if(pockets.some(([x,y])=>Math.hypot(b.position.x-(x??0),b.position.y-(y??0))<(game==='carrom'?25:29))){pocketed.push(Number(b.label));Matter.Composite.remove(engine.world,b);}}
  if(tick%24===0)frames.push(bodies.filter(b=>!pocketed.includes(Number(b.label))).map(b=>({...(balls.find(v=>v.id===Number(b.label))??cue),x:b.position.x/width*100,y:b.position.y/height*100})));
  if(tick>50&&bodies.filter(b=>!pocketed.includes(Number(b.label))).every(b=>b.speed<.06))break;
 }
 const result=bodies.filter(b=>!pocketed.includes(Number(b.label))&&(game!=='carrom'||b.label!=='0')).map(b=>({...(balls.find(v=>v.id===Number(b.label))??cue),x:Number((b.position.x/width*100).toFixed(3)),y:Number((b.position.y/height*100).toFixed(3))}));
 Matter.Engine.clear(engine);return {balls:result,pocketed,firstHit,frames};
}