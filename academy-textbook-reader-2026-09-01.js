(()=>{
'use strict';
const VERSION='2026.09.01.004';
let pageIndex=0,lastBookKey='';
function portal(){return document.getElementById('agentPortal')}
function guided(){return portal()?.classList.contains('as-guided-active')}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function styles(){if(document.getElementById('asTextbookStyles'))return;const s=document.createElement('style');s.id='asTextbookStyles';s.textContent=`
.as-textbook{max-width:940px;margin:20px auto 38px;position:relative}
.as-textbook-top{max-width:850px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 auto 11px;padding:0 5px}
.as-textbook-label{font-size:10px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:#2476a9}
.as-textbook-count{font-size:12px;font-weight:850;color:#657887}
.as-textbook-frame{max-width:850px;margin:0 auto;overflow:hidden;border-radius:18px;background:#e9eef2;border:1px solid #d6e0e7;box-shadow:0 16px 38px rgba(26,52,70,.10);position:relative;transition:height .24s ease}
.as-textbook-track{display:flex;align-items:flex-start;transition:transform .32s ease;will-change:transform}
.as-textbook-page{min-width:100%;box-sizing:border-box;background:#fff;min-height:640px;padding:58px 72px 68px;position:relative;color:#263a49!important;visibility:visible!important;opacity:1!important;display:flex;align-items:center;justify-content:center}
.as-textbook-page.as-book-page-long{align-items:flex-start}
.as-textbook-page:after{content:attr(data-page);position:absolute;left:50%;transform:translateX(-50%);bottom:21px;font:700 11px/1.2 Georgia,'Times New Roman',serif;color:#94a1aa}
.as-book-content{display:block!important;visibility:visible!important;opacity:1!important;color:#263a49!important;width:min(100%,650px);margin:0 auto!important;text-align:left}
.as-book-content h2,.as-book-content h3{font-family:Georgia,'Times New Roman',serif!important;color:#16344a!important;margin:0 0 18px!important}
.as-book-content h3{font-size:28px!important;line-height:1.24!important}
.as-book-content p{display:block!important;visibility:visible!important;opacity:1!important;font-size:18px!important;line-height:1.82!important;color:#263a49!important;margin:0!important;white-space:pre-line;max-width:65ch}
.as-book-content ul{color:#314b5f!important;font-size:17px;line-height:1.7;padding-left:24px;margin-left:0;margin-right:0}
.as-book-content li{margin:8px 0}
.as-book-objectives{background:#f3f8fb;border:1px solid #dbe9f1;border-radius:12px;padding:24px 28px}
.as-book-callout{padding:24px 28px;border-radius:12px}
.as-book-callout.example{background:#f7f9fb;border-left:4px solid #8fb7d3}
.as-book-callout.alert{background:#fff8e8;border:1px solid #f1dca2}
.as-book-callout.memory{background:#eff7fb;border:1px solid #d3e7f2}
.as-book-callout strong{display:block;color:#23435b;font-size:17px;margin-bottom:8px}
.as-book-terms{display:grid!important;grid-template-columns:1fr 1fr;gap:14px;width:100%}
.as-book-term{display:block!important;padding:16px;border:1px solid #e0e7ed;border-radius:11px;background:#fafcfd}
.as-book-term b{display:block;color:#1f668f;margin-bottom:5px}
.as-book-term span{display:block;color:#576b7b;line-height:1.5;font-size:14px}
.as-book-check{display:flex!important;visibility:visible!important;opacity:1!important;min-height:380px;flex-direction:column;justify-content:center;text-align:center;padding:24px;align-self:center}
.as-book-check strong{display:block;color:#1d3b51;font-size:18px}
.as-book-check p{font-size:14px!important;line-height:1.55!important;margin:8px auto 14px!important;max-width:46ch}
.as-textbook-nav{max-width:850px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;margin:14px auto 0}
.as-book-btn{appearance:none;border:1px solid #c8d5de;background:#fff;color:#25455c;border-radius:12px;min-height:48px;padding:10px 17px;font-weight:900;font-size:13px;cursor:pointer}
.as-book-btn.next{justify-self:end;background:#1f6fa9;border-color:#1f6fa9;color:#fff}
.as-book-btn:disabled{opacity:.32;cursor:default}
.as-book-dots{display:flex;gap:5px;justify-content:center;max-width:320px;overflow:hidden}
.as-book-dot{width:7px;height:7px;border-radius:50%;background:#cbd6dd;flex:0 0 auto}
.as-book-dot.active{background:#277eb5;transform:scale(1.3)}
@media(min-width:1180px){.as-textbook-frame,.as-textbook-top,.as-textbook-nav{max-width:880px}.as-textbook-page{padding:64px 94px 74px;min-height:660px}.as-book-content{width:min(100%,660px)}}
@media(max-width:680px){
 .as-textbook{margin:8px -8px 24px}.as-textbook-top{padding:0 12px;max-width:none}.as-textbook-frame{border-radius:12px;max-width:none}
 .as-textbook-page{min-height:calc(100dvh - 225px);padding:34px 24px 58px;display:flex;align-items:center;justify-content:center}
 .as-textbook-page.as-book-page-long{align-items:flex-start}
 .as-book-content{width:min(100%,560px);max-width:none;margin:0 auto!important}
 .as-book-content h3{font-size:24px!important}.as-book-content p{font-size:17px!important;line-height:1.72!important;max-width:none}
 .as-book-terms{grid-template-columns:1fr!important}.as-textbook-nav{padding:0 8px;grid-template-columns:1fr 1fr;max-width:none}.as-book-dots{display:none}
 .as-book-btn{width:100%;min-height:52px}.as-book-btn.next{justify-self:stretch}.as-textbook-count{font-size:11px}
}
`;document.head.appendChild(s)}
function bookKey(){const head=document.querySelector('.as-lesson-head');const title=head?.querySelector('h1,h2')?.textContent||head?.textContent||'lesson';return `as-book-page:${title.trim().slice(0,100)}`}
function savePage(){try{if(lastBookKey)localStorage.setItem(lastBookKey,String(pageIndex))}catch{}}
function sizeActivePage(book,pages){const frame=book?.querySelector('.as-textbook-frame');const page=pages?.[pageIndex];if(!frame||!page)return;requestAnimationFrame(()=>{const h=Math.max(page.scrollHeight,page.offsetHeight);if(h>0)frame.style.height=`${h}px`})}
function updateBook(){const book=document.getElementById('asTextbook');if(!book)return;const pages=[...book.querySelectorAll('.as-textbook-page')];if(!pages.length)return;pageIndex=Math.max(0,Math.min(pageIndex,pages.length-1));const track=book.querySelector('.as-textbook-track');if(track)track.style.transform=`translateX(-${pageIndex*100}%)`;const count=book.querySelector('.as-textbook-count');if(count)count.textContent=`Page ${pageIndex+1} of ${pages.length}`;const prev=book.querySelector('#asBookPrev'),next=book.querySelector('#asBookNext');if(prev)prev.disabled=pageIndex===0;if(next){next.disabled=false;next.textContent=pageIndex===pages.length-1?'Finish Review':'Next Page →'};book.querySelectorAll('.as-book-dot').forEach((d,i)=>d.classList.toggle('active',i===pageIndex));sizeActivePage(book,pages);savePage();window.scrollTo({top:Math.max(0,book.getBoundingClientRect().top+window.scrollY-82),behavior:'smooth'})}
window.asBookPrev=()=>{if(pageIndex>0){pageIndex--;updateBook()}};
window.asBookNext=()=>{const book=document.getElementById('asTextbook');if(!book)return;const pages=book.querySelectorAll('.as-textbook-page');if(pageIndex<pages.length-1){pageIndex++;updateBook();return}const check=document.getElementById('asKnowledgeButton');if(check&&!check.disabled){check.click();return}const lock=book.querySelector('.as-book-check');if(lock)lock.scrollIntoView({behavior:'smooth',block:'center'})};
function topLevelBlocks(card){const selectors=['.as-objectives','.as-lesson-section','.as-callout','.as-check-lock'];const all=[...card.querySelectorAll(selectors.join(','))];return all.filter(el=>!all.some(other=>other!==el&&other.contains(el))&&!el.closest('.as-textbook')&&((el.textContent||'').trim().length>0||el.querySelector('button')))}
function cleanSnapshot(node){const clone=node.cloneNode(true);clone.querySelectorAll('[style]').forEach(el=>el.removeAttribute('style'));clone.querySelectorAll('.as-terms').forEach(el=>el.className='as-book-terms');clone.querySelectorAll('.as-term').forEach(el=>el.className='as-book-term');return clone.innerHTML||esc(node.textContent||'')}
function pageClass(node){if(node.classList.contains('as-objectives'))return'as-book-content as-book-objectives';if(node.classList.contains('as-check-lock'))return'as-book-content as-book-check';if(node.classList.contains('as-callout')){const kind=node.classList.contains('alert')?'alert':node.classList.contains('memory')?'memory':'example';return`as-book-content as-book-callout ${kind}`}return'as-book-content'}
function isLongPage(body){const mobile=window.matchMedia?.('(max-width:680px)')?.matches;const chars=String(body.textContent||'').trim().length;const hasTerms=!!body.querySelector('.as-book-terms');const hasManyItems=body.querySelectorAll('li,.as-book-term').length>8;return hasTerms||hasManyItems||chars>(mobile?760:1350)}
function paginate(){if(!guided()||portal()?.classList.contains('as-ava-instructor-mode'))return;const head=document.querySelector('.as-lesson-head');if(!head||document.querySelector('.as-qprompt')||document.getElementById('asTextbook'))return;const card=head.closest('.as-guide-card');if(!card)return;const blocks=topLevelBlocks(card);if(blocks.length<2)return;styles();const snapshots=blocks.map(node=>({html:cleanSnapshot(node),cls:pageClass(node)}));if(!snapshots.some(x=>x.html.replace(/<[^>]+>/g,'').trim().length>0))return;const book=document.createElement('section');book.id='asTextbook';book.className='as-textbook';const top=document.createElement('div');top.className='as-textbook-top';top.innerHTML='<span class="as-textbook-label">Digital Textbook</span><span class="as-textbook-count"></span>';const frame=document.createElement('div');frame.className='as-textbook-frame';const track=document.createElement('div');track.className='as-textbook-track';frame.appendChild(track);snapshots.forEach((snap,i)=>{const page=document.createElement('article');page.className='as-textbook-page';page.dataset.page=String(i+1);const body=document.createElement('div');body.className=snap.cls;body.innerHTML=snap.html;if(isLongPage(body))page.classList.add('as-book-page-long');page.appendChild(body);track.appendChild(page)});const nav=document.createElement('div');nav.className='as-textbook-nav';nav.innerHTML='<button id="asBookPrev" class="as-book-btn" onclick="asBookPrev()">← Previous Page</button><div class="as-book-dots">'+snapshots.map((_,i)=>`<span class="as-book-dot${i===0?' active':''}"></span>`).join('')+'</div><button id="asBookNext" class="as-book-btn next" onclick="asBookNext()">Next Page →</button>';book.append(top,frame,nav);blocks.forEach(node=>node.remove());head.after(book);lastBookKey=bookKey();try{pageIndex=Math.max(0,parseInt(localStorage.getItem(lastBookKey)||'0')||0)}catch{pageIndex=0}let startX=0,startY=0;frame.addEventListener('touchstart',e=>{const t=e.touches[0];startX=t.clientX;startY=t.clientY},{passive:true});frame.addEventListener('touchend',e=>{const t=e.changedTouches[0],dx=t.clientX-startX,dy=t.clientY-startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25){if(dx<0)asBookNext();else asBookPrev()}},{passive:true});updateBook()}
function wrapReview(){if(window.__asTextbookReviewWrapped||typeof window.asAvaShowReviewNotes!=='function')return;const old=window.asAvaShowReviewNotes;window.asAvaShowReviewNotes=(...a)=>{const r=old(...a);setTimeout(paginate,100);return r};window.__asTextbookReviewWrapped=true}
function boot(){styles();wrapReview();const poll=setInterval(()=>{wrapReview();paginate()},700);window.addEventListener('resize',()=>{const book=document.getElementById('asTextbook');if(book){book.querySelectorAll('.as-textbook-page').forEach(p=>{p.classList.toggle('as-book-page-long',isLongPage(p.querySelector('.as-book-content')||p))});updateBook()}},{passive:true});document.addEventListener('keydown',e=>{if(!document.getElementById('asTextbook')||document.querySelector('.as-qprompt'))return;if(/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||''))return;if(e.key==='ArrowRight'){e.preventDefault();asBookNext()}else if(e.key==='ArrowLeft'){e.preventDefault();asBookPrev()}});window.__asTextbookPoll=poll}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.ALLSHIELD_TEXTBOOK_READER_VERSION=VERSION;
})();