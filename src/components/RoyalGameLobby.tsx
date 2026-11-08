import { useNavigate } from '@tanstack/react-router';
import { useQuery,useQueryClient } from '@tanstack/react-query';
import { useEffect,useState } from 'react';
import { Plus,Users,ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { DominoPiece,PlayingCard } from './RoyalPieces';
import roomImage from '@/assets/diwaniya-game-room.jpg';
import feltImage from '@/assets/royal-game-felt.jpg';
import type { GameKind } from '@/lib/royal-games';
export function RoyalGameLobby(){
 const navigate=useNavigate(),qc=useQueryClient();const [busy,setBusy]=useState(false);
 const list=useQuery({queryKey:['royal-lobby'],queryFn:async()=>{const {data,error}=await supabase.from('royal_tables').select('*').in('status',['waiting','playing']).order('created_at',{ascending:false}).limit(30);if(error)throw error;return data;},refetchInterval:5000});
 useEffect(()=>{const ch=supabase.channel(`royal-lobby-${crypto.randomUUID()}`).on('postgres_changes',{event:'*',schema:'public',table:'royal_tables'},()=>{void qc.invalidateQueries({queryKey:['royal-lobby']});}).subscribe();return()=>{void supabase.removeChannel(ch);};},[qc]);
 async function create(game:GameKind){setBusy(true);const {data,error}=await supabase.rpc('royal_lobby_action',{_action:'create',_game:game});setBusy(false);if(error||!data){toast.error(error?.message.includes('already')?'لديك طاولة بانتظار اللاعبين؛ افتحها من القائمة':'تعذر إنشاء الطاولة');return;}void navigate({to:'/play/$gameId',params:{gameId:data}});}
 return <section className="px-4 py-4"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black text-primary">طاولات المملكة</h2><span className="flex items-center gap-1 text-xs text-muted-foreground"><Users size={14}/> ٤ لاعبين • صوت ودردشة</span></div><div className="grid grid-cols-2 gap-3">{(['baloot','domino'] as const).map(game=><div className="royal-lobby-tile" key={game}><img src={game==='baloot'?roomImage:feltImage} alt="" width={1024} height={1536}/><div className="royal-lobby-art">{game==='baloot'?<><PlayingCard card={{id:'HA',suit:'H',rank:'A'}}/><PlayingCard card={{id:'SA',suit:'S',rank:'A'}}/></>:<><DominoPiece piece={{id:'6-6',a:6,b:6}}/><DominoPiece piece={{id:'5-3',a:5,b:3}}/></>}</div><div className="royal-lobby-label"><h3>{game==='baloot'?'بلوت سعودي':'دومينو المملكة'}</h3><Button disabled={busy} onClick={()=>create(game)} size="sm" className="w-full"><Plus/> طاولة جديدة</Button></div></div>)}</div><div className="mt-4 divide-y divide-border">{list.isError&&<p className="py-3 text-sm text-destructive">تعذر تحميل الطاولات <Button variant="link" onClick={()=>list.refetch()}>إعادة المحاولة</Button></p>}{list.isPending&&<p className="py-3 text-sm text-muted-foreground">جاري تحميل الطاولات…</p>}{list.data?.length===0&&<p className="py-3 text-sm text-muted-foreground">لا توجد طاولات مفتوحة الآن</p>}{list.data?.map(t=><Button key={t.id} variant="ghost" className="h-auto w-full justify-between rounded-none px-0 py-3" onClick={()=>navigate({to:'/play/$gameId',params:{gameId:t.id}})}><span>{t.game==='baloot'?'بلوت':'دومينو'} <small className="text-muted-foreground">{t.players.length}/4</small></span><span className="flex items-center gap-2 text-primary">{t.status==='waiting'?'دخول الطاولة':'مشاهدة'}<ArrowLeft size={14}/></span></Button>)}</div></section>;
}
