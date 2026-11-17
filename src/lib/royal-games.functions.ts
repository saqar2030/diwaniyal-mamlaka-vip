import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { applyRoyal,newRoyal,publicRoyal,type GameKind,type RoyalState } from './royal-games';
import { unoLegal } from './royal-extra-games';
const idSchema=z.object({id:z.string().uuid()});
export const readRoyalTable=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>idSchema.parse(input)).handler(async({data,context})=>{
 const {data:table,error}=await context.supabase.from('royal_tables').select('*').eq('id',data.id).single();if(error)throw Error('الطاولة غير موجودة');
 let hand:RoyalState['hands'][number]=[];let legal:string[]=[];
 const seat=table.players.indexOf(context.userId);
 if(seat>=0&&table.status!=='waiting'&&table.status!=='closed'){
  const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
  const {data:privateRow,error:privateError}=await supabaseAdmin.from('royal_game_states').select('state').eq('table_id',data.id).single();
  if(privateError)throw Error('تعذر قراءة الجولة');
  const s=privateRow.state as unknown as RoyalState;hand=s.hands[seat]??[];
  if(s.game==='uno'&&s.turn===seat)legal=unoLegal(s,seat);
  if(s.game==='basra'&&s.turn===seat)legal=hand.map(p=>p.id);
  if(s.phase==='play'&&s.turn===seat&&s.game==='baloot'){const {legalCards}=await import('./royal-games');legal=legalCards(s,seat);}
 }
 return {table,hand,legal};
});
const actionSchema=z.object({id:z.string().uuid(),version:z.number().int().nonnegative(),action:z.object({type:z.enum(['start','bid','play','pass','next','draw','roll','chess','shot']),id:z.string().max(12).optional(),mode:z.enum(['sun','hokum']).optional(),suit:z.enum(['S','H','D','C']).optional(),end:z.enum(['left','right']).optional(),color:z.enum(['S','H','D','C']).optional(),from:z.string().regex(/^[a-h][1-8]$/).optional(),to:z.string().regex(/^[a-h][1-8]$/).optional(),promotion:z.enum(['q','r','b','n']).optional(),angle:z.number().finite().min(-360).max(360).optional(),power:z.number().min(1).max(100).optional(),position:z.number().min(20).max(80).optional(),x:z.number().min(4).max(96).optional(),y:z.number().min(6).max(94).optional()})});
export const actRoyalTable=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator(input=>actionSchema.parse(input)).handler(async({data,context})=>{
 const {data:t,error}=await context.supabase.from('royal_tables').select('*').eq('id',data.id).single();if(error)throw Error('الطاولة غير موجودة');
 const seat=t.players.indexOf(context.userId);if(seat<0)throw Error('اجلس على الطاولة أولًا');if(t.version!==data.version)throw Error('تغيرت الطاولة، حاول مجددًا');
 if(data.action.type==='start'&&(t.host_id!==context.userId||t.status!=='waiting'||t.players.length!==4||t.ready.length!==4))throw Error('تحتاج أربعة لاعبين مستعدين');
 if(data.action.type!=='start'&&t.status!=='playing')throw Error('اللعبة غير نشطة');
 if(data.action.type==='next'&&t.host_id!==context.userId)throw Error('صاحب الطاولة يبدأ الجولة');
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');let state:RoyalState;
 if(data.action.type==='start')state=newRoyal(t.game as GameKind);
 else {const {data:p,error:e}=await supabaseAdmin.from('royal_game_states').select('state').eq('table_id',data.id).single();if(e)throw Error('تعذر قراءة الجولة');let dice:number|undefined;if(data.action.type==='roll'){const bytes=new Uint32Array(1);do{crypto.getRandomValues(bytes);}while((bytes[0]??0)>=4294967292);dice=(bytes[0]??0)%6+1;}state=applyRoyal(p.state as unknown as RoyalState,seat,{...data.action,type:data.action.type,dice});}
 const {data:ok,error:commitError}=await supabaseAdmin.rpc('royal_commit_state',{_table:t.id,_version:t.version,_actor:context.userId,_state:JSON.parse(JSON.stringify(state)),_public:JSON.parse(JSON.stringify(publicRoyal(state))),_status:state.phase==='done'?'done':'playing'});
 if(commitError||!ok)throw Error('تغيرت الطاولة، حاول مجددًا');return {ok:true};
});
