export type GameKind = 'baloot' | 'domino';
export type Suit = 'S' | 'H' | 'D' | 'C';
export const SUITS: Suit[] = ['S','H','D','C'];
export const SUIT_SYMBOL: Record<Suit,string> = { S:'♠', H:'♥', D:'♦', C:'♣' };
export type Piece = { id: string; a: number; b: number };
export type Card = { id: string; suit: Suit; rank: string };
export type Played = { seat: number; card: Card };
export type RoyalState = {
  game: GameKind; phase: 'bid'|'play'|'round'|'done'; turn: number; dealer: number;
  hands: (Card|Piece)[][]; scores: number[]; raw: number[]; round: number;
  board: Piece[]; passes: number; opening: string|null;
  trick: Played[]; lastTrick: Played[]; tricks: number[];
  bidRound: number; bidPasses: number; exposed: Card|null; stock: Card[];
  mode: 'sun'|'hokum'|null; trump: Suit|null; buyer: number|null;
  winner: number|null; log: string;
};
export type GameAction = { type:'bid'|'play'|'pass'|'next'; id?:string; mode?:'sun'|'hokum'; suit?:Suit; end?:'left'|'right' };
export type PublicState = Omit<RoyalState,'hands'|'stock'> & { counts:number[] };
export function shuffle<T>(values: T[]): T[] {
 const out=[...values]; for(let i=out.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=(n[0] ?? 0)%(i+1);const a=out[i],b=out[j];if(a!==undefined&&b!==undefined){out[i]=b;out[j]=a;}}return out;
}
export const cardDeck = ():Card[] => SUITS.flatMap(suit=>['7','8','9','J','Q','K','10','A'].map(rank=>({id:suit+rank,suit,rank})));
export const dominoDeck = ():Piece[] => Array.from({length:7},(_,a)=>Array.from({length:7-a},(_,i)=>({id:`${a}-${a+i}`,a,b:a+i}))).flat();
export function newRoyal(game:GameKind, scores=[0,0], round=1, dealer=3): RoyalState {
 const base:RoyalState={game,phase:game==='baloot'?'bid':'play',turn:(dealer+1)%4,dealer,hands:[[],[],[],[]],scores,raw:[0,0],round,board:[],passes:0,opening:null,trick:[],lastTrick:[],tricks:[0,0],bidRound:1,bidPasses:0,exposed:null,stock:[],mode:null,trump:null,buyer:null,winner:null,log:'بدأت الجولة'};
 if(game==='domino'){const deck=shuffle(dominoDeck());base.hands=Array.from({length:4},(_,i)=>deck.slice(i*7,i*7+7));if(round===1){base.opening='6-6';base.turn=base.hands.findIndex(h=>h.some(p=>p.id==='6-6'));}base.log='دور اللاعب '+(base.turn+1);}
 else {const deck=shuffle(cardDeck());base.hands=Array.from({length:4},(_,i)=>deck.slice(i*5,i*5+5));base.exposed=deck[20] ?? null;base.stock=deck.slice(21);base.log='الشراء — صن أو حكم أو بس';}return base;
}
export function publicRoyal(s:RoyalState):PublicState {const {hands,stock,...rest}=s;void stock;return {...rest,counts:hands.map(h=>h.length)};}
export function rankValue(c:Card,trump:Suit|null):number {return (c.suit===trump?['7','8','Q','K','10','A','9','J']:['7','8','9','J','Q','K','10','A']).indexOf(c.rank);}
export function cardPoints(c:Card,trump:Suit|null):number {if(c.suit===trump&&c.rank==='J')return 20;if(c.suit===trump&&c.rank==='9')return 14;return ({A:11,'10':10,K:4,Q:3,J:2} as Record<string,number>)[c.rank]??0;}
export function trickWinner(trick:Played[],trump:Suit|null):Played|undefined {let win=trick[0];for(const p of trick.slice(1)){if(!win)break;if(p.card.suit===win.card.suit?rankValue(p.card,trump)>rankValue(win.card,trump):p.card.suit===trump)win=p;}return win;}
export function legalCards(s:RoyalState,seat:number):string[] {
 const hand=(s.hands[seat]??[]).filter((p):p is Card=>'suit' in p);const lead=s.trick[0];if(!lead)return hand.map(c=>c.id);
 const following=hand.filter(c=>c.suit===lead.card.suit);const win=trickWinner(s.trick,s.trump);
 if(following.length){if(lead.card.suit===s.trump&&win){const higher=following.filter(c=>rankValue(c,s.trump)>rankValue(win.card,s.trump));if(higher.length)return higher.map(c=>c.id);}return following.map(c=>c.id);}
 if(s.trump&&win&&win.seat%2!==seat%2){const trumps=hand.filter(c=>c.suit===s.trump);if(trumps.length){const higher=win.card.suit===s.trump?trumps.filter(c=>rankValue(c,s.trump)>rankValue(win.card,s.trump)):trumps;return(higher.length?higher:trumps).map(c=>c.id);}}
 return hand.map(c=>c.id);
}
export function dominoEnds(s:Pick<RoyalState,'board'|'opening'>,p:Piece):('left'|'right')[]{
 if(!s.board.length)return !s.opening||s.opening===p.id?['right']:[];const l=s.board[0]?.a,r=s.board[s.board.length-1]?.b;return [...(p.a===l||p.b===l?['left' as const]:[]),...(p.a===r||p.b===r?['right' as const]:[])];
}
function finishDomino(s:RoyalState,team:number|null){s.winner=team;if(team!==null){const lost=s.hands.reduce((v,h,i)=>i%2!==team?v+h.reduce((n,p)=>n+('a'in p?p.a+p.b:0),0):v,0);s.scores[team]=(s.scores[team]??0)+lost;}s.phase=team!==null&&(s.scores[team]??0)>=100?'done':'round';s.log=team===null?'تعادل الجولة':`فاز فريق ${team+1} بالجولة`;}
export function applyRoyal(input:RoyalState,seat:number,a:GameAction):RoyalState {
 const s=structuredClone(input);if(a.type==='next'){if(s.phase!=='round')throw Error('الجولة لم تنتهِ');return newRoyal(s.game,s.scores,s.round+1,(s.dealer+1)%4);}
 if(s.phase==='round'||s.phase==='done'||s.turn!==seat)throw Error('ليس دورك');
 const hand=s.hands[seat];if(!hand)throw Error('مقعد غير صالح');
 if(s.game==='domino'){
 const tiles=hand.filter((p):p is Piece=>'a'in p);
 if(a.type==='pass'){if(tiles.some(p=>dominoEnds(s,p).length))throw Error('لديك قطعة قابلة للعب');s.passes++;if(s.passes===4){const total=[0,0];s.hands.forEach((h,i)=>{total[i%2]=(total[i%2]??0)+h.reduce((v,p)=>v+('a'in p?p.a+p.b:0),0);});finishDomino(s,total[0]===total[1]?null:(total[0]??0)<(total[1]??0)?0:1);}else{s.turn=(seat+1)%4;s.log=`اللاعب ${seat+1} مرّر الدور`;}return s;}
 if(a.type!=='play')throw Error('حركة غير صالحة');const idx=hand.findIndex(p=>p.id===a.id);const p=hand[idx];if(!p||!('a'in p)||!a.end||!dominoEnds(s,p).includes(a.end))throw Error('القطعة لا تطابق الطرف');
 if(!s.board.length)s.board.push(p);else if(a.end==='left'){const l=s.board[0]?.a;s.board.unshift(p.b===l?p:{...p,a:p.b,b:p.a});}else{const r=s.board[s.board.length-1]?.b;s.board.push(p.a===r?p:{...p,a:p.b,b:p.a});}
 hand.splice(idx,1);s.opening=null;s.passes=0;s.log=`اللاعب ${seat+1} لعب ${p.a} | ${p.b}`;if(!hand.length)finishDomino(s,seat%2);else s.turn=(seat+1)%4;return s;
 }
 if(s.phase==='bid'){
 if(a.type==='pass'){s.bidPasses++;s.turn=(seat+1)%4;if(s.bidPasses===4){if(s.bidRound===1){s.bidRound=2;s.bidPasses=0;s.turn=(s.dealer+1)%4;s.log='الشراء الثاني';}else return newRoyal('baloot',s.scores,s.round,(s.dealer+1)%4);}return s;}
 if(a.type!=='bid'||!a.mode||!s.exposed)throw Error('شراء غير صالح');if(a.mode==='hokum'&&(s.bidRound===1?a.suit!==s.exposed.suit:!a.suit||a.suit===s.exposed.suit))throw Error('نوع الحكم غير صالح');
 s.mode=a.mode;s.trump=a.mode==='hokum'?(a.suit??null):null;s.buyer=seat;hand.push(s.exposed);let pos=0;for(let i=0;i<4;i++){const target=s.hands[i];if(!target)continue;const take=8-target.length;target.push(...s.stock.slice(pos,pos+take));pos+=take;}s.stock=[];s.phase='play';s.turn=(s.dealer+1)%4;s.log=a.mode==='sun'?'صن':`حكم ${SUIT_SYMBOL[s.trump??'S']}`;return s;
 }
 if(a.type!=='play'||!a.id||!legalCards(s,seat).includes(a.id))throw Error('يجب اتباع النوع والحكم');const idx=hand.findIndex(c=>c.id===a.id);const c=hand[idx];if(!c||!('suit'in c))throw Error('ورقة غير صالحة');hand.splice(idx,1);s.trick.push({seat,card:c});s.turn=(seat+1)%4;s.log=`اللاعب ${seat+1} لعب ${c.rank} ${SUIT_SYMBOL[c.suit]}`;
 if(s.trick.length===4){const win=trickWinner(s.trick,s.trump);if(!win)throw Error('أكلة غير صالحة');const team=win.seat%2;s.raw[team]=(s.raw[team]??0)+s.trick.reduce((v,p)=>v+cardPoints(p.card,s.trump),0);s.tricks[team]=(s.tricks[team]??0)+1;s.turn=win.seat;s.lastTrick=s.trick;s.trick=[];s.log=`الأكلة للاعب ${win.seat+1}`;
 if(s.hands.every(h=>!h.length)){s.raw[team]=(s.raw[team]??0)+10;const buyer=(s.buyer??0)%2;const other=1-buyer;const total=s.mode==='sun'?26:16;let q=s.mode==='sun'?s.raw.map(v=>Math.round(v/5)):s.raw.map(v=>Math.round(v/10));if((s.raw[buyer]??0)<=(s.raw[other]??0)){q=[0,0];q[other]=total;}if(s.tricks[0]===8||s.tricks[1]===8){q=[0,0];q[team]=s.mode==='sun'?44:25;}s.scores=s.scores.map((v,i)=>v+(q[i]??0));s.winner=(s.scores[0]??0)>=(s.scores[1]??0)?0:1;s.phase=(s.scores[s.winner]??0)>=152?'done':'round';s.log=`انتهت الجولة — لنا ${q[0]} / لهم ${q[1]}`;}}
 return s;
}
