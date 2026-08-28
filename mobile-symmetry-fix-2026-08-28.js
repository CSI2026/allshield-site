(()=>{
'use strict';
const VERSION='2026.08.28.001';
function install(){
  if(document.getElementById('allshieldMobileSymmetry001'))return;
  const s=document.createElement('style');
  s.id='allshieldMobileSymmetry001';
  s.textContent=`
  @media(max-width:820px){
    /* Public homepage: keep the entire phone composition visually centered. */
    .shell main#top,
    .shell main#top .hero>div:first-child,
    .shell main#top .section>.wrap,
    .shell main#top .cta>.wrap,
    .shell footer .wrap,
    .shell footer .footer-inner{
      text-align:center!important;
    }
    .shell .hero .kicker,
    .shell .hero h1,
    .shell .hero .lead,
    .shell .section .kicker,
    .shell .section-title,
    .shell .section-copy,
    .shell .card,
    .shell .card h3,
    .shell .card p,
    .shell .promise-box,
    .shell .promise-box h3,
    .shell .promise-box p,
    .shell .quote,
    .shell .cta h2,
    .shell .cta p,
    .shell footer,
    .shell footer *{
      text-align:center!important;
    }
    .shell .hero h1,
    .shell .hero .lead,
    .shell .section-title,
    .shell .section-copy,
    .shell .promise-box p,
    .shell .quote,
    .shell .cta p{
      margin-left:auto!important;
      margin-right:auto!important;
    }
    .shell .hero .actions{
      width:100%!important;
      justify-content:center!important;
      justify-items:center!important;
      align-items:center!important;
    }
    .shell .hero .actions .btn{margin-left:auto!important;margin-right:auto!important}
    .shell .cards{justify-items:stretch!important}
    .shell .cards .card{width:100%!important}
    .shell .card .num{margin-left:auto!important;margin-right:auto!important}
    .shell .promise{justify-items:stretch!important;text-align:center!important}
    .shell .promise-box{width:100%!important}
    .shell .footer-inner{justify-content:center!important;align-items:center!important}
    .shell .footer-inner>*{flex:0 0 100%!important;width:100%!important;margin-left:auto!important;margin-right:auto!important}

    /* Careers: all narrative copy follows the same centerline on phone. */
    #careersPage .career-hero-copy,
    #careersPage .career-hero-copy .kicker,
    #careersPage .career-hero-copy h1,
    #careersPage .career-hero-copy p,
    #careersPage .career-statement,
    #careersPage .career-statement h2,
    #careersPage .career-statement p,
    #careersPage .career-system-head,
    #careersPage .career-system-head h2,
    #careersPage .career-system-card,
    #careersPage .career-system-card h3,
    #careersPage .career-system-card p,
    #careersPage .opportunity-strip-grid,
    #careersPage .opportunity-strip-grid h2,
    #careersPage .opportunity-points>div,
    #careersPage .career-origin-card,
    #careersPage .career-origin-card h2,
    #careersPage .career-origin-card p,
    #careersPage .career-final-card,
    #careersPage .career-final-card h2,
    #careersPage .career-final-card p,
    #careersPage .career-sizzle-card,
    #careersPage .career-sizzle-card h2,
    #careersPage .career-sizzle-card p,
    #careersPage .career-sizzle-frame,
    #careersPage .career-pulse-row>div{
      text-align:center!important;
    }
    #careersPage .career-hero-copy p,
    #careersPage .career-statement p,
    #careersPage .career-system-head,
    #careersPage .career-system-card p,
    #careersPage .career-origin-card p,
    #careersPage .career-final-card p,
    #careersPage .career-sizzle-card p{
      margin-left:auto!important;
      margin-right:auto!important;
    }
    #careersPage .career-actions{
      justify-content:center!important;
      justify-items:center!important;
      align-items:center!important;
      width:100%!important;
    }
    #careersPage .career-actions .btn,
    #careersPage .career-final-card>.btn{
      margin-left:auto!important;
      margin-right:auto!important;
    }
    #careersPage .career-system-card .sysnum{
      margin-left:auto!important;
      margin-right:auto!important;
    }
    #careersPage .career-system-card>span{
      display:block!important;
      text-align:center!important;
    }
    #careersPage .career-eyebrow{display:block!important;text-align:center!important}
    #careersPage .career-final-card{justify-items:center!important;align-items:center!important}
    #careersPage .opportunity-points{width:100%!important}

    /* Keep form controls usable while centering the form's introductory copy. */
    #careerModal .kicker,
    #careerModal .modal-card>h3,
    #careerModal .modal-card>p,
    #leadModal .kicker,
    #leadModal .modal-card>h3,
    #leadModal .modal-card>p{
      text-align:center!important;
    }
    #careerModal label,#leadModal label{text-align:left!important}
    #careerModal input,#careerModal select,#careerModal textarea,
    #leadModal input,#leadModal select,#leadModal textarea{text-align:left!important}
  }
  `;
  document.head.appendChild(s);
  window.ALLSHIELD_MOBILE_SYMMETRY_VERSION=VERSION;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
