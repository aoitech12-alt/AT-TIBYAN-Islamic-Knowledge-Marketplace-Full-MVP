import { useState, useEffect, useRef, useCallback, useMemo, Fragment } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// AT-TIBYAN — Islamic Knowledge Marketplace (Full MVP + Monetization)
// ═══════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";

// ─── Platform Fee Config ─────────────────────────────────────────────────────
const PLATFORM = {
  feePercent: 10,        // 10% on every transaction
  proMonthly: 14.99,     // Pro subscription /month
  proYearly: 119.99,     // Pro subscription /year
  featuredGig: 9.99,     // Feature a gig for 7 days
  boostGig: 4.99,        // Boost gig visibility for 3 days
  verifyBadge: 29.99,    // One-time verification badge
  urgentJob: 7.99,       // Mark job request as urgent
  certExam: 19.99,       // Take a certification exam
  tipOptions: [2, 5, 10, 20], // Tip amounts
  barakahFundPercent: 1, // 1% of all transactions go to Barakah Fund
};

// ─── Supabase Helper ─────────────────────────────────────────────────────────
const supabase = {
  url: SUPABASE_URL, key: SUPABASE_ANON_KEY,
  headers() { const h={"apikey":this.key,"Content-Type":"application/json"}; const t=typeof localStorage!=="undefined"&&localStorage.getItem("sb_token"); if(t)h["Authorization"]=`Bearer ${t}`; return h; },
  async auth(action,body){try{const r=await fetch(`${this.url}/auth/v1/${action}`,{method:"POST",headers:{"apikey":this.key,"Content-Type":"application/json"},body:JSON.stringify(body)});return await r.json();}catch(e){return null;}},
  async uploadFile(bucket,path,file){try{const r=await fetch(`${this.url}/storage/v1/object/${bucket}/${path}`,{method:"POST",headers:{"apikey":this.key},body:file});return r.ok?{data:{path},error:null}:{data:null,error:"fail"};}catch(e){return{data:null,error:e};}},
  getPublicUrl(bucket,path){return`${this.url}/storage/v1/object/public/${bucket}/${path}`;}
};

// ─── Currency ────────────────────────────────────────────────────────────────
const CUR={US:{code:"USD",symbol:"$",rate:1},NG:{code:"NGN",symbol:"₦",rate:1550},GB:{code:"GBP",symbol:"£",rate:0.79},SA:{code:"SAR",symbol:"﷼",rate:3.75},AE:{code:"AED",symbol:"د.إ",rate:3.67},EG:{code:"EGP",symbol:"E£",rate:50.5},MY:{code:"MYR",symbol:"RM",rate:4.47},PK:{code:"PKR",symbol:"Rs",rate:278},ID:{code:"IDR",symbol:"Rp",rate:15800},TR:{code:"TRY",symbol:"₺",rate:36.2},IN:{code:"INR",symbol:"₹",rate:85.5},BD:{code:"BDT",symbol:"৳",rate:119},DE:{code:"EUR",symbol:"€",rate:0.92},FR:{code:"EUR",symbol:"€",rate:0.92},CA:{code:"CAD",symbol:"C$",rate:1.44},AU:{code:"AUD",symbol:"A$",rate:1.57},KE:{code:"KES",symbol:"KSh",rate:129},ZA:{code:"ZAR",symbol:"R",rate:18.2},MA:{code:"MAD",symbol:"MAD",rate:10},JO:{code:"JOD",symbol:"JD",rate:0.71},KW:{code:"KWD",symbol:"KD",rate:0.31},QA:{code:"QAR",symbol:"QR",rate:3.64}};

function fmtPrice(usd,cur){if(usd===0)return"Free";const v=Math.round(usd*cur.rate*100)/100;return cur.rate>=100?`${cur.symbol}${Math.round(v).toLocaleString()}`:`${cur.symbol}${v.toFixed(2)}`;}

// ─── Icons ───────────────────────────────────────────────────────────────────
const ic=(d,w=18,h=18,f="none",sw="1.5")=>(props)=><svg viewBox="0 0 24 24" fill={props?.f?"currentColor":f} stroke="currentColor" strokeWidth={sw} width={w} height={h}><path d={d}/></svg>;
const I={
  Moon:ic("M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"),
  Sun:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  Search:ic("M21 21l-4.35-4.35 M11 19a8 8 0 100-16 8 8 0 000 16z"),
  Star:({f})=><svg viewBox="0 0 24 24" fill={f?"currentColor":"none"} stroke="currentColor" strokeWidth="1.5" width="14" height="14"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Chat:ic("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"),
  Calendar:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  User:ic("M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 3a4 4 0 100 8 4 4 0 000-8z"),
  Check:ic("M20 6L9 17l-5-5",14,14,"none","2"),
  Globe:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
  Book:ic("M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"),
  Mic:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>,
  Shield:ic("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),
  Clock:ic("M12 6v6l4 2 M12 2a10 10 0 100 20 10 10 0 000-20z",14,14),
  Send:ic("M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"),
  X:ic("M18 6L6 18M6 6l12 12",18,18,"none","2"),
  Plus:ic("M12 5v14M5 12h14",18,18,"none","2"),
  Home:ic("M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"),
  Briefcase:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
  Gift:ic("M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"),
  Camera:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  Upload:ic("M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"),
  Dollar:ic("M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"),
  LogOut:ic("M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"),
  Settings:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Crown:ic("M2 4l3 12h14l3-12-5 4-5-4-5 4z"),
  Zap:ic("M13 2L3 14h9l-1 8 10-12h-9l1-8z"),
  Award:()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="12" cy="8" r="7"/><path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12"/></svg>,
  TrendingUp:ic("M23 6l-9.5 9.5-5-5L1 18"),
  Heart:({f})=><svg viewBox="0 0 24 24" fill={f?"currentColor":"none"} stroke="currentColor" strokeWidth="1.5" width="16" height="16"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  Coffee:ic("M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"),
};

// ─── Data ────────────────────────────────────────────────────────────────────
const CATEGORIES=[
  {id:"quran",name:"Quran Studies",nameAr:"دراسات القرآن",icon:"📖",desc:"Tajweed, Memorization, Tafseer",count:234},
  {id:"arabic",name:"Arabic Language",nameAr:"اللغة العربية",icon:"✍️",desc:"Nahwu, Sarf, Balagha",count:189},
  {id:"fiqh",name:"Islamic Jurisprudence",nameAr:"الفقه",icon:"⚖️",desc:"Fiqh, Usul al-Fiqh",count:156},
  {id:"aqeedah",name:"Aqeedah & Theology",nameAr:"العقيدة",icon:"🕌",desc:"Creed, Islamic theology",count:98},
  {id:"content",name:"Islamic Content",nameAr:"المحتوى الإسلامي",icon:"🎬",desc:"Writing, Translation, Media",count:145},
  {id:"tutoring",name:"Tutoring & Consulting",nameAr:"التدريس والاستشارات",icon:"👨‍🏫",desc:"One-on-one education",count:201},
];

const TEACHERS=[
  {id:1,name:"Sheikh Ahmad Al-Farsi",avatar:"👳",specialty:["Tajweed","Hifz"],rating:4.9,reviews:127,price:25,badge:true,barakah:true,bio:"Hafiz with ijazah in the ten qira'at. 15 years teaching globally.",location:"Madinah, KSA",languages:["Arabic","English"],completedOrders:312,online:true,pro:true},
  {id:2,name:"Ustadha Maryam Hassan",avatar:"🧕",specialty:["Nahwu","Sarf"],rating:4.8,reviews:89,price:20,badge:true,barakah:false,bio:"MA in Arabic Linguistics from Al-Azhar. Ajurrumiyyah & Alfiyyah specialist.",location:"Cairo, Egypt",languages:["Arabic","English","French"],completedOrders:198,online:true,pro:false},
  {id:3,name:"Dr. Yusuf Ibrahim",avatar:"👨‍🏫",specialty:["Fiqh","Aqeedah"],rating:4.95,reviews:203,price:35,badge:true,barakah:false,bio:"PhD from Umm al-Qura. Author of 5 published works on Fiqh.",location:"Istanbul, Turkey",languages:["Arabic","English","Turkish"],completedOrders:456,online:false,pro:true},
  {id:4,name:"Ustadh Bilal Okonkwo",avatar:"🧔",specialty:["Tajweed","Recitation"],rating:4.7,reviews:64,price:15,badge:false,barakah:true,bio:"Certified Quran teacher. 8 years experience. Patient with beginners.",location:"Lagos, Nigeria",languages:["Arabic","English","Yoruba"],completedOrders:145,online:true,pro:false},
  {id:5,name:"Ustadha Fatima Al-Zahra",avatar:"🧕",specialty:["Tafseer","Translation"],rating:4.85,reviews:112,price:30,badge:true,barakah:false,bio:"Islamic content creator & translator. Classical tafseer specialist.",location:"Amman, Jordan",languages:["Arabic","English"],completedOrders:267,online:false,pro:true},
  {id:6,name:"Sheikh Omar Deen",avatar:"👳",specialty:["Aqeedah","History"],rating:4.6,reviews:45,price:18,badge:false,barakah:true,bio:"Islamic University of Madinah graduate. Teaches foundations of faith.",location:"London, UK",languages:["Arabic","English"],completedOrders:89,online:true,pro:false},
];

const GIGS=[
  {id:1,teacherId:1,title:"Master Tajweed Rules with Personalized Quran Recitation Coaching",category:"quran",tier:{basic:25,standard:45,premium:80},delivery:"Ongoing",image:"📖",tags:["Tajweed","Quran"],orders:312,isSadaqah:false,featured:true,promoted:false},
  {id:2,teacherId:2,title:"Learn Arabic Grammar (Nahwu) from Ajurrumiyyah to Alfiyyah",category:"arabic",tier:{basic:20,standard:40,premium:70},delivery:"4 weeks",image:"✍️",tags:["Nahwu","Grammar"],orders:198,isSadaqah:false,featured:false,promoted:true},
  {id:3,teacherId:3,title:"In-Depth Fiqh Lessons Based on Your Madhab Preference",category:"fiqh",tier:{basic:35,standard:60,premium:100},delivery:"Ongoing",image:"⚖️",tags:["Fiqh"],orders:456,isSadaqah:false,featured:true,promoted:false},
  {id:4,teacherId:4,title:"Free Quran Recitation Correction for New Muslims",category:"quran",tier:{basic:0,standard:10,premium:15},delivery:"1 week",image:"🤲",tags:["Barakah","New Muslims"],orders:145,isSadaqah:true,featured:false,promoted:false},
  {id:5,teacherId:5,title:"Professional Islamic Content Translation (Arabic ↔ English)",category:"content",tier:{basic:30,standard:55,premium:90},delivery:"3 days",image:"🌐",tags:["Translation","Content"],orders:267,isSadaqah:false,featured:false,promoted:true},
  {id:6,teacherId:6,title:"Foundations of Aqeedah — Build Your Islamic Creed Knowledge",category:"aqeedah",tier:{basic:18,standard:35,premium:60},delivery:"2 weeks",image:"🕌",tags:["Aqeedah","Creed"],orders:89,isSadaqah:true,featured:false,promoted:false},
  {id:7,teacherId:1,title:"Quran Memorization Program with Structured Revision Plan",category:"quran",tier:{basic:30,standard:55,premium:95},delivery:"Ongoing",image:"📚",tags:["Hifz","Memorization"],orders:189,isSadaqah:false,featured:true,promoted:false},
  {id:8,teacherId:2,title:"Arabic Balagha & Rhetoric for Advanced Students",category:"arabic",tier:{basic:25,standard:45,premium:75},delivery:"6 weeks",image:"🖋️",tags:["Balagha","Rhetoric"],orders:76,isSadaqah:false,featured:false,promoted:false},
];

const initTracks=()=>[
  {id:"c1",title:"Learn Nahwu from Scratch",titleAr:"تعلم النحو من الصفر",desc:"A comprehensive journey through Arabic grammar from Ajurrumiyyah to intermediate Nahwu.",steps:12,enrolled:1340,teachers:8,icon:"✍️",color:"#2D6A4F",price:0,isPublished:true,rating:4.8,category:"arabic",
    sections:[
      {id:"s1",title:"Introduction to Nahwu",order:1,lectures:[
        {id:"l1",title:"What is Nahwu and why study it?",duration:"12:30",order:1,isPreview:true,type:"video"},
        {id:"l2",title:"The Arabic sentence structure",duration:"18:45",order:2,isPreview:true,type:"video"},
        {id:"l3",title:"Quiz: Basic Concepts",duration:"5:00",order:3,isPreview:false,type:"quiz"},
      ]},
      {id:"s2",title:"Al-Kalimah (The Word)",order:2,lectures:[
        {id:"l4",title:"Ism, Fi'l, and Harf",duration:"22:10",order:1,isPreview:false,type:"video"},
        {id:"l5",title:"Signs of each word type",duration:"15:30",order:2,isPreview:false,type:"video"},
        {id:"l6",title:"Practice exercises",duration:"10:00",order:3,isPreview:false,type:"exercise"},
      ]},
      {id:"s3",title:"I'raab Foundations",order:3,lectures:[
        {id:"l7",title:"What is I'raab?",duration:"20:00",order:1,isPreview:false,type:"video"},
        {id:"l8",title:"Raf', Nasb, Jarr, Jazm",duration:"25:15",order:2,isPreview:false,type:"video"},
      ]},
    ]
  },
  {id:"c2",title:"Tajweed Mastery Path",titleAr:"مسار إتقان التجويد",desc:"Master the rules of Quran recitation from basic pronunciation to advanced techniques.",steps:8,enrolled:2100,teachers:12,icon:"📖",color:"#8B6914",price:49.99,isPublished:true,rating:4.9,category:"quran",
    sections:[
      {id:"s4",title:"Foundations of Tajweed",order:1,lectures:[
        {id:"l9",title:"Introduction to Tajweed rules",duration:"15:00",order:1,isPreview:true,type:"video"},
        {id:"l10",title:"Makhaarij al-Huroof",duration:"30:00",order:2,isPreview:true,type:"video"},
      ]},
      {id:"s5",title:"Noon Saakinah Rules",order:2,lectures:[
        {id:"l11",title:"Izhaar, Idghaam, Iqlaab, Ikhfaa",duration:"28:00",order:1,isPreview:false,type:"video"},
        {id:"l12",title:"Practice with Surah Al-Baqarah",duration:"20:00",order:2,isPreview:false,type:"video"},
      ]},
    ]
  },
  {id:"c3",title:"Foundations of Fiqh",titleAr:"أسس الفقه",desc:"Learn Islamic jurisprudence from its foundational texts covering major schools of thought.",steps:10,enrolled:890,teachers:6,icon:"⚖️",color:"#4A6741",price:39.99,isPublished:true,rating:4.7,category:"fiqh",
    sections:[
      {id:"s6",title:"What is Fiqh?",order:1,lectures:[
        {id:"l13",title:"Introduction to Islamic Jurisprudence",duration:"20:00",order:1,isPreview:true,type:"video"},
        {id:"l14",title:"Sources: Quran, Sunnah, Ijma, Qiyas",duration:"35:00",order:2,isPreview:false,type:"video"},
      ]},
    ]
  },
  {id:"c4",title:"Quranic Arabic Vocabulary",titleAr:"مفردات القرآن",desc:"Build your Quranic vocabulary. Understand 80% of the Quran's words through structured learning.",steps:15,enrolled:1780,teachers:5,icon:"📚",color:"#6B5B3E",price:0,isPublished:true,rating:4.6,category:"arabic",
    sections:[
      {id:"s7",title:"Most Common Quran Words",order:1,lectures:[
        {id:"l15",title:"Top 50 words in the Quran",duration:"25:00",order:1,isPreview:true,type:"video"},
        {id:"l16",title:"Word families and root letters",duration:"18:00",order:2,isPreview:false,type:"video"},
      ]},
    ]
  },
];

const INIT_JOBS=[
  {id:1,student:"Abdullah M.",title:"Need Tajweed teacher for my 10-year-old daughter",budget:"$15-25/hr",category:"quran",proposals:8,posted:"2 hours ago",desc:"Looking for a patient female teacher who can teach basic tajweed via Zoom. 2x/week.",urgent:false,status:"approved"},
  {id:2,student:"Sarah K.",title:"Looking for Arabic Nahwu tutor (beginner level)",budget:"$20-30/hr",category:"arabic",proposals:12,posted:"5 hours ago",desc:"I'm a revert wanting to learn Arabic grammar from scratch. English instruction needed.",urgent:true,status:"approved"},
  {id:3,student:"Omar J.",title:"Need Fiqh consultation on Islamic finance topic",budget:"$40-60/session",category:"fiqh",proposals:5,posted:"1 day ago",desc:"I need a scholar specializing in Islamic finance to advise on a business structure.",urgent:false,status:"approved"},
];

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({message,type="success",onClose}){
  useEffect(()=>{const t=setTimeout(onClose,3500);return()=>clearTimeout(t)},[]);
  return(<div style={{position:"fixed",top:20,right:20,zIndex:10000,padding:"13px 22px",borderRadius:14,background:type==="success"?"#2D6A4F":type==="error"?"#C0392B":"var(--accent)",color:"white",fontSize:13,fontWeight:500,boxShadow:"0 8px 32px rgba(0,0,0,0.25)",animation:"slideDown 0.3s ease",display:"flex",alignItems:"center",gap:10,maxWidth:420}}>
    <span>{type==="success"?"✅":type==="error"?"❌":"ℹ️"}</span><span style={{flex:1}}>{message}</span><button onClick={onClose} style={{background:"none",border:"none",color:"white",cursor:"pointer",opacity:0.7}}>✕</button>
  </div>);
}

// ─── Modal Shell ─────────────────────────────────────────────────────────────
function Modal({close,title,children,wide}){
  return(<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.55)",backdropFilter:"blur(10px)"}} onClick={close}>
    <div style={{background:"var(--card)",borderRadius:22,padding:"30px 26px",width:wide?600:460,maxWidth:"94vw",border:"1px solid var(--border)",boxShadow:"var(--shadow)",animation:"scaleIn 0.3s ease",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <h2 style={{fontSize:18,fontWeight:700}}>{title}</h2>
        <button onClick={close} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer"}}><I.X/></button>
      </div>
      {children}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App(){
  const [dark,setDark]=useState(false);
  const [lang,setLang]=useState("en");
  const [page,setPage]=useState("home");
  const [selGig,setSelGig]=useState(null);
  const [selTeacher,setSelTeacher]=useState(null);
  const [showAuth,setShowAuth]=useState(false);
  const [authMode,setAuthMode]=useState("login");
  const [showChat,setShowChat]=useState(false);
  const [chatTarget,setChatTarget]=useState(null);
  const [showBooking,setShowBooking]=useState(false);
  const [showPayment,setShowPayment]=useState(false);
  const [payData,setPayData]=useState(null);
  const [showProModal,setShowProModal]=useState(false);
  const [showTipModal,setShowTipModal]=useState(false);
  const [tipTarget,setTipTarget]=useState(null);
  const [showBoostModal,setShowBoostModal]=useState(false);
  const [showCurrencyPicker,setShowCurrencyPicker]=useState(false);
  const [showIntention,setShowIntention]=useState(true);
  const [searchQuery,setSearchQuery]=useState("");
  const [selCategory,setSelCategory]=useState(null);

  const [isLoggedIn,setIsLoggedIn]=useState(false);
  const [user,setUser]=useState(null);
  const [profilePic,setProfilePic]=useState(null);
  const [isPro,setIsPro]=useState(false);

  const [cc,setCc]=useState("US");
  const cur=CUR[cc]||CUR.US;

  const [toasts,setToasts]=useState([]);
  const toast=(m,ty="success")=>setToasts(p=>[...p,{id:Date.now(),message:m,type:ty}]);
  const rmToast=id=>setToasts(p=>p.filter(x=>x.id!==id));

  const [favorites,setFavorites]=useState([]);
  const toggleFav=gid=>{setFavorites(p=>p.includes(gid)?p.filter(x=>x!==gid):[...p,gid]);toast(favorites.includes(gid)?"Removed from favorites":"Added to favorites ❤️");};

  const [orders,setOrders]=useState([]);
  const [bookings,setBookings]=useState([]);
  const [revenue,setRevenue]=useState({platform:0,barakahFund:0,teacherPayouts:0});

  // ─── Shared Jobs State (for admin approval) ───
  const [jobs,setJobs]=useState(INIT_JOBS);

  // ─── Course/Track System ───
  const [tracks,setTracks]=useState(initTracks);
  const [enrollments,setEnrollments]=useState([]);
  const [selTrack,setSelTrack]=useState(null);
  const [curLecture,setCurLecture]=useState(null);

  const isEnrolled=cid=>enrollments.some(e=>e.courseId===cid);
  const getEnrollment=cid=>enrollments.find(e=>e.courseId===cid);

  const enrollTrack=course=>{
    if(!isLoggedIn){setShowAuth(true);return;}
    if(isEnrolled(course.id)){setSelTrack(course);nav("learn-track");return;}
    setEnrollments(p=>[...p,{id:Date.now(),courseId:course.id,progress:0,completedLectures:[]}]);
    setTracks(p=>p.map(c=>c.id===course.id?{...c,enrolled:c.enrolled+1}:c));
    toast(`Enrolled in "${course.title}"! 🎉`);
    setSelTrack(course);nav("learn-track");
  };

  const completeLecture=(courseId,lectureId)=>{
    setEnrollments(p=>p.map(e=>{
      if(e.courseId!==courseId)return e;
      const done=e.completedLectures.includes(lectureId)?e.completedLectures:[...e.completedLectures,lectureId];
      const course=tracks.find(c=>c.id===courseId);
      const total=course?.sections?.reduce((s,sec)=>s+sec.lectures.length,0)||1;
      return{...e,completedLectures:done,progress:Math.round(done.length/total*100)};
    }));
  };

  // Admin course management
  const addTrackCourse=data=>{
    setTracks(p=>[...p,{...data,id:`c${Date.now()}`,enrolled:0,rating:0,sections:[],isPublished:false}]);
    toast("Course created! 📚");
  };
  const updateTrackCourse=(id,data)=>{setTracks(p=>p.map(c=>c.id===id?{...c,...data}:c));toast("Course updated ✅");};
  const deleteTrackCourse=id=>{setTracks(p=>p.filter(c=>c.id!==id));toast("Course deleted","info");};
  const addSection=(cid,title)=>{
    setTracks(p=>p.map(c=>{if(c.id!==cid)return c;const o=(c.sections?.length||0)+1;return{...c,sections:[...(c.sections||[]),{id:`s${Date.now()}`,title,order:o,lectures:[]}]};}));
    toast("Section added 📁");
  };
  const addLecture=(cid,sid,data)=>{
    setTracks(p=>p.map(c=>{if(c.id!==cid)return c;return{...c,sections:c.sections.map(s=>{if(s.id!==sid)return s;return{...s,lectures:[...s.lectures,{...data,id:`l${Date.now()}`,order:s.lectures.length+1}]}}),stepsCount:(c.sections?.reduce((sum,s)=>sum+s.lectures.length,0)||0)+1};}));
    toast("Lecture added 🎬");
  };
  const deleteLecture=(cid,sid,lid)=>{setTracks(p=>p.map(c=>c.id!==cid?c:{...c,sections:c.sections.map(s=>s.id!==sid?s:{...s,lectures:s.lectures.filter(l=>l.id!==lid)})}));};
  const deleteSection=(cid,sid)=>{setTracks(p=>p.map(c=>c.id!==cid?c:{...c,sections:c.sections.filter(s=>s.id!==sid)}));};

  useEffect(()=>{try{const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";const m={"Lagos":"NG","London":"GB","Riyadh":"SA","Dubai":"AE","Cairo":"EG","Kuala_Lumpur":"MY","Karachi":"PK","Jakarta":"ID","Istanbul":"TR","Kolkata":"IN","Dhaka":"BD","Berlin":"DE","Paris":"FR","Toronto":"CA","Sydney":"AU","Nairobi":"KE","Johannesburg":"ZA","Casablanca":"MA","Amman":"JO","Kuwait":"KW","Qatar":"QA"};for(const[z,c]of Object.entries(m)){if(tz.includes(z)){setCc(c);break;}}}catch(e){}},[]);

  const isAr=lang==="ar";
  const t=(en,ar)=>isAr?ar:en;
  const P=usd=>fmtPrice(usd,cur);

  const tv=dark?{"--bg":"#0F1410","--bg2":"#1A2019","--bg3":"#243023","--text":"#E8E4DD","--text2":"#A8A498","--text3":"#6B6960","--accent":"#C9A94E","--accent2":"#2D6A4F","--border":"#2A352A","--card":"#1A2019","--shadow":"0 4px 24px rgba(0,0,0,0.4)","--glow":"0 0 40px rgba(201,169,78,0.1)"}:{"--bg":"#FAFAF5","--bg2":"#F5F0E8","--bg3":"#EDE7DA","--text":"#1A1A18","--text2":"#5C5A52","--text3":"#8C8A82","--accent":"#8B6914","--accent2":"#2D6A4F","--border":"#E0D9CC","--card":"#FFFFFF","--shadow":"0 4px 24px rgba(0,0,0,0.06)","--glow":"0 0 40px rgba(139,105,20,0.06)"};

  const nav=(pg,g,te)=>{setPage(pg);if(g!==undefined)setSelGig(g);if(te!==undefined)setSelTeacher(te);window.scrollTo?.(0,0);};
  const openChat=te=>{setChatTarget(te);setShowChat(true);};
  const openBooking=te=>{setSelTeacher(te);setShowBooking(true);};
  const openTip=te=>{setTipTarget(te);setShowTipModal(true);};

  const handleOrder=(gig,tier,priceUsd)=>{
    if(!isLoggedIn){setShowAuth(true);return;}
    const fee=Math.round(priceUsd*PLATFORM.feePercent)/100;
    const barakah=Math.round(priceUsd*PLATFORM.barakahFundPercent)/100;
    setPayData({gig,tier,priceUsd,fee,barakah,total:priceUsd+fee,teacher:TEACHERS.find(x=>x.id===gig.teacherId),type:"order"});
    setShowPayment(true);
  };

  const handleTip=(teacher,amount)=>{
    if(!isLoggedIn){setShowAuth(true);return;}
    const fee=Math.round(amount*5)/100; // 5% on tips
    setPayData({teacher,priceUsd:amount,fee,barakah:0,total:amount+fee,type:"tip",gig:null,tier:null});
    setShowPayment(true);
    setShowTipModal(false);
  };

  const handleBoost=(type,price)=>{
    if(!isLoggedIn){setShowAuth(true);return;}
    setPayData({priceUsd:price,fee:0,barakah:0,total:price,type,gig:null,tier:null,teacher:null});
    setShowPayment(true);
    setShowBoostModal(false);
  };

  const handleProSubscribe=(plan)=>{
    if(!isLoggedIn){setShowAuth(true);return;}
    const price=plan==="monthly"?PLATFORM.proMonthly:PLATFORM.proYearly;
    setPayData({priceUsd:price,fee:0,barakah:0,total:price,type:"pro_subscription",gig:null,tier:null,teacher:null,plan});
    setShowPayment(true);
    setShowProModal(false);
  };

  const confirmPayment=()=>{
    if(!payData)return;
    const pd=payData;
    if(pd.type==="order"){
      setOrders(p=>[...p,{id:Date.now(),gig:pd.gig,tier:pd.tier,priceUsd:pd.priceUsd,fee:pd.fee,total:pd.total,status:"active",date:new Date().toLocaleDateString()}]);
      setRevenue(r=>({platform:r.platform+pd.fee,barakahFund:r.barakahFund+pd.barakah,teacherPayouts:r.teacherPayouts+(pd.priceUsd-pd.barakah)}));
      toast(`Order confirmed! ${P(pd.total)} paid (incl. ${P(pd.fee)} platform fee). 🎉`);
    } else if(pd.type==="tip"){
      toast(`Tip of ${P(pd.priceUsd)} sent to ${pd.teacher?.name}! JazakAllahu khairan 💚`);
    } else if(pd.type==="pro_subscription"){
      setIsPro(true);
      toast(`AT-TIBYAN Pro activated! 0% platform fees unlocked. 👑`);
    } else if(pd.type==="featured"||pd.type==="boost"||pd.type==="urgent_job"||pd.type==="verify_badge"||pd.type==="cert_exam"){
      toast(`${pd.type.replace(/_/g," ")} purchased for ${P(pd.total)}! ✨`);
    }
    setShowPayment(false);
    if(pd.type==="order")nav("dashboard");
  };

  const confirmBooking=(teacher,day,slot)=>{
    setBookings(p=>[...p,{id:Date.now(),teacher,day,slot,status:"confirmed"}]);
    setShowBooking(false);
    toast(`Session booked with ${teacher.name} on ${day} at ${slot} ✅`);
  };

  const handleLogout=()=>{setIsLoggedIn(false);setUser(null);setProfilePic(null);setIsPro(false);setOrders([]);setBookings([]);setFavorites([]);nav("home");toast("Logged out","info");};

  return(
  <div style={{background:"var(--bg)",color:"var(--text)",minHeight:"100vh",fontFamily:"'Outfit',sans-serif",transition:"all 0.35s ease",direction:isAr?"rtl":"ltr",...tv}}>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Amiri:wght@400;700&display=swap" rel="stylesheet"/>
    <style>{`
      *{margin:0;padding:0;box-sizing:border-box}::selection{background:var(--accent);color:white}
      ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
      input,textarea,select,button{font-family:inherit}button{cursor:pointer}
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes slideDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
      @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
      .lift{transition:transform 0.3s,box-shadow 0.3s}.lift:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
      .bp{background:linear-gradient(135deg,var(--accent),var(--accent2));color:white;border:none;padding:11px 26px;border-radius:12px;font-weight:600;font-size:14px;transition:all 0.3s}.bp:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(139,105,20,0.25)}.bp:disabled{opacity:0.5;cursor:not-allowed;transform:none}
      .bs{background:transparent;color:var(--text);border:1.5px solid var(--border);padding:10px 24px;border-radius:12px;font-weight:500;font-size:14px;transition:all 0.3s}.bs:hover{border-color:var(--accent);color:var(--accent)}
      .cd{background:var(--card);border:1px solid var(--border);border-radius:16px;transition:all 0.3s;overflow:hidden}.cd:hover{border-color:var(--accent);box-shadow:var(--glow)}
      .tg{display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:500;background:var(--bg2);color:var(--text2);border:1px solid var(--border);transition:all 0.2s;cursor:pointer;white-space:nowrap}.tg:hover,.tg.act{background:var(--accent);color:white;border-color:var(--accent)}
      .inp{background:var(--bg2);border:1.5px solid var(--border);border-radius:12px;padding:11px 15px;color:var(--text);font-size:14px;width:100%;transition:all 0.3s;outline:none}.inp:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(139,105,20,0.1)}.inp::placeholder{color:var(--text3)}
      .vb{background:linear-gradient(135deg,#8B6914,#D4AF37);color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
      .bb{background:linear-gradient(135deg,#2D6A4F,#4A8C6A);color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
      .pro-badge{background:linear-gradient(135deg,#8B6914,#C9A94E);color:white;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:3px}
      .promoted-label{position:absolute;top:10px;left:10px;background:linear-gradient(135deg,#E67E22,#F39C12);color:white;padding:3px 10px;border-radius:10px;font-size:10px;font-weight:700;display:flex;align-items:center;gap:3px;z-index:2}
      .featured-border{border:1.5px solid var(--accent)!important;box-shadow:var(--glow)}
      .amiri{font-family:'Amiri',serif}
      .fee-line{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:var(--text2)}
      .fee-line.total{font-weight:700;font-size:15px;color:var(--text);border-top:1.5px solid var(--border);padding-top:10px;margin-top:4px}
      @media(max-width:768px){.hm{display:none!important}.mg{grid-template-columns:1fr!important}}
    `}</style>

    {toasts.map(t=><Toast key={t.id} message={t.message} type={t.type} onClose={()=>rmToast(t.id)}/>)}

    {/* Intention */}
    {showIntention&&<div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.55)",backdropFilter:"blur(10px)"}} onClick={()=>setShowIntention(false)}>
      <div style={{background:"var(--card)",borderRadius:24,padding:"38px 42px",maxWidth:400,textAlign:"center",border:"1px solid var(--border)",boxShadow:"var(--shadow)",animation:"scaleIn 0.35s ease"}} onClick={e=>e.stopPropagation()}>
        <div className="amiri" style={{fontSize:26,color:"var(--accent)",marginBottom:12,lineHeight:1.6}}>بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</div>
        <div style={{width:40,height:1,background:"var(--accent)",margin:"12px auto",opacity:0.4}}/>
        <p style={{fontSize:14,color:"var(--text)",lineHeight:1.7,marginBottom:22}}>{t("Renew your intention — may your pursuit of knowledge be sincere and beneficial.","جدّد نيّتك — جعل الله طلبك للعلم خالصاً ونافعاً.")}</p>
        <button className="bp" onClick={()=>setShowIntention(false)} style={{width:"100%"}}>{t("Begin with Barakah","ابدأ بالبركة")} ✨</button>
      </div>
    </div>}

    {showAuth&&<AuthModal t={t} authMode={authMode} setAuthMode={setAuthMode} setShowAuth={setShowAuth} setIsLoggedIn={setIsLoggedIn} setUser={setUser} setProfilePic={setProfilePic} toast={toast}/>}
    {showChat&&<ChatDrawer t={t} setShowChat={setShowChat} target={chatTarget} toast={toast} openTip={openTip}/>}
    {showBooking&&<BookingModal t={t} P={P} setShowBooking={setShowBooking} teacher={selTeacher} confirmBooking={confirmBooking} cur={cur}/>}
    {showPayment&&<PaymentModal t={t} P={P} data={payData} setShowPayment={setShowPayment} confirmPayment={confirmPayment} cur={cur} isPro={isPro}/>}
    {showProModal&&<ProModal t={t} P={P} close={()=>setShowProModal(false)} handleProSubscribe={handleProSubscribe}/>}
    {showTipModal&&<TipModal t={t} P={P} teacher={tipTarget} close={()=>setShowTipModal(false)} handleTip={handleTip}/>}
    {showCurrencyPicker&&<CurrencyPicker t={t} current={cc} setCurrent={setCc} close={()=>setShowCurrencyPicker(false)}/>}

    {/* NAV */}
    <nav style={{position:"sticky",top:0,zIndex:100,background:"var(--bg)",borderBottom:"1px solid var(--border)",backdropFilter:"blur(16px)",padding:"0 24px"}}>
      <div style={{maxWidth:1280,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:58}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>nav("home")}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>📿</div>
          <div><div style={{fontWeight:700,fontSize:16,letterSpacing:"-0.3px",lineHeight:1}}>AT-TIBYAN</div>
          <div style={{fontSize:9,color:"var(--text3)",fontWeight:500,letterSpacing:"1px"}}>{t("Islamic Knowledge Hub","منصة العلم")}</div></div>
        </div>
        <div className="hm" style={{display:"flex",alignItems:"center",gap:2}}>
          {[{k:"home",l:t("Home","الرئيسية"),ic:<I.Home/>},{k:"explore",l:t("Explore","استكشف"),ic:<I.Search/>},{k:"tracks",l:t("Tracks","مسارات"),ic:<I.Book/>},{k:"jobs",l:t("Jobs","طلبات"),ic:<I.Briefcase/>},{k:"pricing",l:t("Pro","برو"),ic:<I.Crown/>},{k:"admin-tracks",l:t("Admin","إدارة"),ic:<I.Settings/>}].map(n=>(
            <button key={n.k} onClick={()=>nav(n.k)} style={{display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:9,border:"none",background:(page===n.k||(n.k==="admin-tracks"&&page==="admin-track-edit"))?"var(--bg3)":"transparent",color:(page===n.k||(n.k==="admin-tracks"&&page==="admin-track-edit"))?"var(--accent)":"var(--text2)",fontSize:12,fontWeight:(page===n.k||(n.k==="admin-tracks"&&page==="admin-track-edit"))?600:500,transition:"all 0.2s"}}>{n.ic}<span>{n.l}</span></button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <button onClick={()=>setShowCurrencyPicker(true)} style={{height:32,padding:"0 8px",borderRadius:9,border:"1px solid var(--border)",background:"var(--bg2)",display:"flex",alignItems:"center",gap:3,color:"var(--text2)",fontSize:11,fontWeight:600}}><I.Dollar/>{cur.code}</button>
          <button onClick={()=>setLang(lang==="en"?"ar":"en")} style={{width:32,height:32,borderRadius:9,border:"1px solid var(--border)",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text2)",fontSize:11,fontWeight:600}}>{lang==="en"?"عر":"EN"}</button>
          <button onClick={()=>setDark(!dark)} style={{width:32,height:32,borderRadius:9,border:"1px solid var(--border)",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text2)"}}>{dark?<I.Sun/>:<I.Moon/>}</button>
          {isLoggedIn?<>
            <button onClick={()=>openChat(TEACHERS[0])} style={{width:32,height:32,borderRadius:9,border:"1px solid var(--border)",background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--text2)",position:"relative"}}><I.Chat/><div style={{position:"absolute",top:-2,right:-2,width:7,height:7,borderRadius:4,background:"#E74C3C"}}/></button>
            <button onClick={()=>nav("dashboard")} style={{width:32,height:32,borderRadius:9,background:profilePic?`url(${profilePic}) center/cover`:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",color:"white",border:isPro?"2px solid #D4AF37":"none",overflow:"hidden"}}>{!profilePic&&<I.User/>}</button>
          </>:<button className="bp" onClick={()=>setShowAuth(true)} style={{padding:"6px 16px",fontSize:12}}>{t("Join Now","انضم")}</button>}
        </div>
      </div>
    </nav>

    {/* PAGES */}
    {page==="home"&&<HomePage t={t} P={P} nav={nav} searchQuery={searchQuery} setSearchQuery={setSearchQuery} cur={cur} toggleFav={toggleFav} favorites={favorites} isLoggedIn={isLoggedIn} setShowAuth={setShowAuth} setShowProModal={setShowProModal} isPro={isPro} openTip={openTip}/>}
    {page==="explore"&&<ExplorePage t={t} P={P} nav={nav} selCategory={selCategory} setSelCategory={setSelCategory} searchQuery={searchQuery} setSearchQuery={setSearchQuery} toggleFav={toggleFav} favorites={favorites}/>}
    {page==="gig"&&selGig&&<GigPage t={t} P={P} gig={selGig} nav={nav} openChat={openChat} openBooking={openBooking} handleOrder={handleOrder} toggleFav={toggleFav} favorites={favorites} cur={cur} isPro={isPro} openTip={openTip}/>}
    {page==="teacher"&&selTeacher&&<TeacherPage t={t} P={P} teacher={selTeacher} nav={nav} openChat={openChat} openBooking={openBooking} openTip={openTip}/>}
    {page==="tracks"&&<TracksPage t={t} P={P} nav={nav} toast={toast} isLoggedIn={isLoggedIn} setShowAuth={setShowAuth} tracks={tracks} enrollTrack={enrollTrack} isEnrolled={isEnrolled} getEnrollment={getEnrollment} setSelTrack={setSelTrack} user={user}/>}
    {page==="track-detail"&&selTrack&&<TrackDetailPage t={t} P={P} nav={nav} track={selTrack} enrollTrack={enrollTrack} isEnrolled={isEnrolled} getEnrollment={getEnrollment}/>}
    {page==="learn-track"&&selTrack&&<LearnTrackPage t={t} P={P} nav={nav} track={selTrack} getEnrollment={getEnrollment} completeLecture={completeLecture} toast={toast} tracks={tracks}/>}
    {page==="admin-tracks"&&<AdminTracksPage t={t} P={P} nav={nav} toast={toast} tracks={tracks} addTrackCourse={addTrackCourse} updateTrackCourse={updateTrackCourse} deleteTrackCourse={deleteTrackCourse} setSelTrack={setSelTrack} user={user}/>}
    {page==="admin-track-edit"&&selTrack&&<AdminTrackEditor t={t} P={P} nav={nav} toast={toast} track={selTrack} updateTrackCourse={updateTrackCourse} addSection={addSection} addLecture={addLecture} deleteLecture={deleteLecture} deleteSection={deleteSection} tracks={tracks}/>}
    {page==="jobs"&&<JobsPage t={t} P={P} nav={nav} toast={toast} isLoggedIn={isLoggedIn} setShowAuth={setShowAuth} handleBoost={handleBoost} jobs={jobs} setJobs={setJobs}/>}
    {page==="admin-jobs"&&<AdminJobsPage t={t} P={P} nav={nav} toast={toast} jobs={jobs} setJobs={setJobs}/>}
    {page==="pricing"&&<PricingPage t={t} P={P} isPro={isPro} handleProSubscribe={handleProSubscribe} handleBoost={handleBoost} isLoggedIn={isLoggedIn} setShowAuth={setShowAuth}/>}
    {page==="dashboard"&&<DashboardPage t={t} P={P} nav={nav} isLoggedIn={isLoggedIn} setShowAuth={setShowAuth} user={user} setUser={setUser} profilePic={profilePic} setProfilePic={setProfilePic} orders={orders} bookings={bookings} cur={cur} handleLogout={handleLogout} toast={toast} favorites={favorites} toggleFav={toggleFav} isPro={isPro} setShowProModal={setShowProModal} revenue={revenue}/>}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function HomePage({t,P,nav,searchQuery,setSearchQuery,cur,toggleFav,favorites,isLoggedIn,setShowAuth,setShowProModal,isPro,openTip}){
  return(<div>
    <section style={{position:"relative",padding:"60px 24px 44px",textAlign:"center",overflow:"hidden"}}>
      <div style={{position:"relative",maxWidth:660,margin:"0 auto",animation:"slideUp 0.6s ease"}}>
        <div className="amiri" style={{fontSize:28,color:"var(--accent)",marginBottom:18,opacity:0.65}}>﴿ ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ ﴾</div>
        <h1 style={{fontSize:"clamp(28px,5vw,48px)",fontWeight:700,lineHeight:1.15,marginBottom:12,letterSpacing:"-0.5px"}}>
          {t("Where Islamic Knowledge","حيث العلم الإسلامي")} <br/><span style={{background:"linear-gradient(135deg,var(--accent),var(--accent2))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{t("Meets Purpose","يلتقي بالهدف")}</span>
        </h1>
        <p style={{fontSize:15,color:"var(--text2)",lineHeight:1.7,maxWidth:500,margin:"0 auto 24px"}}>{t("Connect with verified scholars for Quran, Arabic, and Islamic studies.","تواصل مع العلماء المعتمدين لدراسات القرآن والعربية.")}</p>
        <div style={{display:"flex",gap:7,maxWidth:520,margin:"0 auto 18px",padding:5,background:"var(--card)",borderRadius:14,border:"1px solid var(--border)",boxShadow:"var(--shadow)"}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:7,padding:"0 10px"}}><span style={{color:"var(--text3)"}}><I.Search/></span>
            <input className="inp" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={t("Search Quran, Arabic, Fiqh...","ابحث...")} style={{border:"none",background:"transparent",padding:"9px 0"}} onKeyDown={e=>{if(e.key==="Enter")nav("explore")}}/>
          </div>
          <button className="bp" onClick={()=>nav("explore")} style={{borderRadius:10,padding:"9px 20px"}}>{t("Search","بحث")}</button>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,fontSize:12,color:"var(--text3)",flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:3}}><I.Shield/>{t("Verified Teachers","معلمون معتمدون")}</span>
          <span style={{display:"flex",alignItems:"center",gap:3}}><I.Globe/>{t("Prices in ","أسعار ب")}{cur.code}</span>
          <span style={{display:"flex",alignItems:"center",gap:3}}><I.Gift/>{t("Barakah Mode","وضع البركة")}</span>
        </div>
      </div>
    </section>

    {/* Revenue Info Bar */}
    <div style={{maxWidth:1280,margin:"0 auto 20px",padding:"0 24px"}}>
      <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
        <div onClick={()=>setShowProModal(true)} style={{flex:"0 0 auto",padding:"10px 18px",borderRadius:13,background:"linear-gradient(135deg,#8B6914,#C9A94E)",color:"white",cursor:"pointer",display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:600,animation:"fadeIn 0.5s ease"}}>
          👑 {t("Go Pro — 0% Platform Fees","اشترك برو — 0% رسوم")}
        </div>
        <div style={{flex:"0 0 auto",padding:"10px 18px",borderRadius:13,background:"linear-gradient(135deg,#2D6A4F,#1B4332)",color:"white",display:"flex",alignItems:"center",gap:8,fontSize:13,fontWeight:500}}>
          🤲 {t("Barakah Fund: 1% of all transactions fund free education","صندوق البركة: 1% من كل معاملة لتمويل التعليم المجاني")}
        </div>
      </div>
    </div>

    {/* Categories */}
    <section style={{padding:"10px 24px 40px",maxWidth:1280,margin:"0 auto"}}>
      <h2 style={{fontSize:20,fontWeight:700,marginBottom:20}}>{t("Browse Categories","تصفح الأقسام")}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}} className="mg">
        {CATEGORIES.map((cat,i)=><div key={cat.id} className="cd lift" onClick={()=>{setSelCategory?.(cat.id);nav("explore")}} style={{padding:20,cursor:"pointer",animation:`fadeIn 0.4s ease ${i*0.06}s both`,textAlign:"center"}}><div style={{fontSize:30,marginBottom:8}}>{cat.icon}</div><div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{cat.name}</div><div style={{fontSize:11,color:"var(--text3)"}}>{cat.count} {t("services","خدمة")}</div></div>)}
      </div>
    </section>

    {/* Featured Gigs */}
    <section style={{padding:"10px 24px 40px",maxWidth:1280,margin:"0 auto"}}>
      <h2 style={{fontSize:20,fontWeight:700,marginBottom:20}}>{t("Featured Services","خدمات مميزة")} <span style={{fontSize:12,color:"var(--accent)",fontWeight:500}}>— {t("Promoted","مروّج")} 💎</span></h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:13}} className="mg">
        {GIGS.slice(0,6).map((g,i)=><GigCard key={g.id} gig={g} t={t} P={P} i={i} onClick={()=>nav("gig",g)} toggleFav={toggleFav} isFav={favorites.includes(g.id)}/>)}
      </div>
    </section>

    {/* Teachers + Tip */}
    <section style={{padding:"10px 24px 40px",maxWidth:1280,margin:"0 auto"}}>
      <h2 style={{fontSize:20,fontWeight:700,marginBottom:20}}>{t("Top Scholars","أبرز العلماء")}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:13}} className="mg">
        {TEACHERS.slice(0,4).map((te,i)=><div key={te.id} className="cd lift" onClick={()=>nav("teacher",undefined,te)} style={{padding:20,cursor:"pointer",animation:`fadeIn 0.4s ease ${i*0.06}s both`,textAlign:"center"}}>
          <div style={{width:52,height:52,borderRadius:16,background:"linear-gradient(135deg,var(--accent2)20,var(--accent)15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 10px",position:"relative"}}>{te.avatar}{te.online&&<div style={{position:"absolute",bottom:0,right:0,width:11,height:11,borderRadius:6,background:"#27AE60",border:"2px solid var(--card)"}}/>}{te.pro&&<div style={{position:"absolute",top:-4,right:-4,fontSize:12}}>👑</div>}</div>
          <h3 style={{fontSize:13,fontWeight:600,marginBottom:2}}>{te.name}</h3>
          <p style={{fontSize:10,color:"var(--text3)",marginBottom:6}}>{te.location}</p>
          <div style={{display:"flex",justifyContent:"center",gap:4,marginBottom:8}}>{te.badge&&<span className="vb" style={{fontSize:10}}>✓</span>}{te.barakah&&<span className="bb" style={{fontSize:10}}>🤲</span>}{te.pro&&<span className="pro-badge">👑 PRO</span>}</div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:3,fontSize:12,marginBottom:8}}>
            <I.Star f/><span style={{fontWeight:600,color:"var(--accent)"}}>{te.rating}</span><span style={{color:"var(--text3)"}}>({te.reviews})</span>
            <span style={{marginLeft:6,fontWeight:600,color:"var(--accent2)"}}>{P(te.price)}</span>
          </div>
          <button onClick={e=>{e.stopPropagation();openTip(te)}} style={{background:"none",border:"1px solid var(--border)",borderRadius:10,padding:"5px 14px",fontSize:11,color:"var(--text2)",display:"inline-flex",alignItems:"center",gap:4,transition:"all 0.2s"}} onMouseEnter={e=>e.target.style.borderColor="var(--accent)"} onMouseLeave={e=>e.target.style.borderColor="var(--border)"}>
            ☕ {t("Send Tip","أرسل بقشيش")}
          </button>
        </div>)}
      </div>
    </section>

    {/* Barakah Fund Banner */}
    <section style={{padding:"0 24px 40px",maxWidth:1280,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#2D6A4F,#1B4332)",borderRadius:18,padding:"40px 32px",color:"white",position:"relative",overflow:"hidden"}}>
        <div style={{position:"relative",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
          <div style={{maxWidth:460}}>
            <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 12px",borderRadius:18,background:"rgba(255,255,255,0.15)",fontSize:11,fontWeight:600,marginBottom:12}}>🤲 {t("Barakah Fund","صندوق البركة")}</div>
            <h2 style={{fontSize:24,fontWeight:700,marginBottom:8,lineHeight:1.3}}>{t("1% of Every Transaction Funds Free Education","1% من كل معاملة يموّل التعليم المجاني")}</h2>
            <p style={{fontSize:13,opacity:0.85,lineHeight:1.7}}>{t("Every order on AT-TIBYAN contributes to the Barakah Fund — providing free Islamic education to those who cannot afford it. Knowledge is the best sadaqah.","كل طلب في التبيان يساهم في صندوق البركة — يوفر التعليم الإسلامي المجاني لمن لا يستطيع تحمله.")}</p>
          </div>
          <div style={{textAlign:"center"}}><div style={{fontSize:32,fontWeight:700,marginBottom:4}}>$12,450</div><div style={{fontSize:12,opacity:0.7}}>{t("raised so far","جمعت حتى الآن")}</div></div>
        </div>
      </div>
    </section>

    <footer style={{borderTop:"1px solid var(--border)",padding:"30px 24px",textAlign:"center"}}>
      <div className="amiri" style={{fontSize:16,color:"var(--accent)",marginBottom:8,opacity:0.5}}>التبيان</div>
      <p style={{fontSize:11,color:"var(--text3)"}}>{t("Islamic Knowledge Marketplace","سوق المعرفة الإسلامية")} — {t(`${PLATFORM.feePercent}% platform fee (0% for Pro)`,`${PLATFORM.feePercent}% رسوم المنصة (0% للبرو)`)}</p>
    </footer>
  </div>);
}

// ─── GIG CARD ────────────────────────────────────────────────────────────────
function GigCard({gig,t,P,i,onClick,toggleFav,isFav}){
  const te=TEACHERS.find(x=>x.id===gig.teacherId);
  return(<div className={`cd lift ${gig.featured?"featured-border":""}`} onClick={onClick} style={{cursor:"pointer",animation:`fadeIn 0.4s ease ${i*0.06}s both`,position:"relative"}}>
    {gig.promoted&&<div className="promoted-label"><I.Zap/>AD</div>}
    <div style={{height:140,background:"linear-gradient(135deg,var(--accent2)20,var(--accent)10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:46,position:"relative"}}>
      {gig.image}
      {gig.isSadaqah&&<div className="bb" style={{position:"absolute",top:10,right:10}}>🤲</div>}
      {gig.featured&&!gig.promoted&&<div style={{position:"absolute",top:10,left:10,background:"var(--accent)",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>⭐ Featured</div>}
      <button onClick={e=>{e.stopPropagation();toggleFav(gig.id)}} style={{position:"absolute",bottom:10,right:10,width:30,height:30,borderRadius:9,background:"rgba(0,0,0,0.3)",backdropFilter:"blur(4px)",border:"none",display:"flex",alignItems:"center",justifyContent:"center",color:isFav?"#E74C3C":"white"}}><I.Heart f={isFav}/></button>
    </div>
    <div style={{padding:16}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
        <div style={{width:24,height:24,borderRadius:7,background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{te?.avatar}</div>
        <span style={{fontSize:11,color:"var(--text2)",fontWeight:500}}>{te?.name}</span>
        {te?.badge&&<span className="vb" style={{padding:"1px 5px",fontSize:9}}>✓</span>}
        {te?.pro&&<span className="pro-badge" style={{padding:"1px 5px",fontSize:8}}>👑</span>}
      </div>
      <h3 style={{fontSize:13,fontWeight:600,lineHeight:1.45,marginBottom:8,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{gig.title}</h3>
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>{gig.tags.slice(0,3).map(tag=><span key={tag} className="tg" style={{fontSize:10,padding:"2px 7px"}}>{tag}</span>)}</div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingTop:9,borderTop:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:3}}><I.Star f/><span style={{fontSize:12,fontWeight:600,color:"var(--accent)"}}>{te?.rating}</span><span style={{fontSize:10,color:"var(--text3)"}}>({te?.reviews})</span></div>
        <div><span style={{fontSize:10,color:"var(--text3)"}}>{t("From","من")} </span><span style={{fontSize:15,fontWeight:700,color:"var(--accent)"}}>{gig.tier.basic===0?t("Free","مجاني"):P(gig.tier.basic)}</span></div>
      </div>
    </div>
  </div>);
}

// ─── EXPLORE ─────────────────────────────────────────────────────────────────
function ExplorePage({t,P,nav,selCategory,setSelCategory,searchQuery,setSearchQuery,toggleFav,favorites}){
  const f=GIGS.filter(g=>{const mc=!selCategory||g.category===selCategory;const ms=!searchQuery||g.title.toLowerCase().includes(searchQuery.toLowerCase())||g.tags.some(x=>x.toLowerCase().includes(searchQuery.toLowerCase()));return mc&&ms;});
  // Sort: promoted first, then featured, then rest
  const sorted=[...f].sort((a,b)=>(b.promoted?2:b.featured?1:0)-(a.promoted?2:a.featured?1:0));
  return(<div style={{maxWidth:1280,margin:"0 auto",padding:"24px 24px",animation:"fadeIn 0.4s ease"}}>
    <h1 style={{fontSize:24,fontWeight:700,marginBottom:5}}>{t("Explore Services","استكشف الخدمات")}</h1>
    <p style={{fontSize:12,color:"var(--text2)",marginBottom:18}}>{t("Promoted gigs appear first","الخدمات المروّجة تظهر أولاً")} 💎</p>
    <div style={{display:"flex",gap:8,marginBottom:16}}><div style={{flex:1,display:"flex",alignItems:"center",gap:7}}><span style={{color:"var(--text3)",marginLeft:8}}><I.Search/></span><input className="inp" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={t("Search...","ابحث...")} style={{paddingLeft:0}}/></div></div>
    <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:6,marginBottom:18}}>
      <button className={`tg ${!selCategory?"act":""}`} onClick={()=>setSelCategory(null)}>{t("All","الكل")}</button>
      {CATEGORIES.map(c=><button key={c.id} className={`tg ${selCategory===c.id?"act":""}`} onClick={()=>setSelCategory(c.id)}>{c.icon} {c.name}</button>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:13}} className="mg">
      {sorted.map((g,i)=><GigCard key={g.id} gig={g} t={t} P={P} i={i} onClick={()=>nav("gig",g)} toggleFav={toggleFav} isFav={favorites.includes(g.id)}/>)}
    </div>
    {sorted.length===0&&<div style={{textAlign:"center",padding:44,color:"var(--text3)"}}><div style={{fontSize:40,marginBottom:10}}>🔍</div><p>{t("No services found.","لم يتم العثور على خدمات.")}</p></div>}
  </div>);
}

// ─── GIG DETAIL ──────────────────────────────────────────────────────────────
function GigPage({t,P,gig,nav,openChat,openBooking,handleOrder,toggleFav,favorites,cur,isPro,openTip}){
  const [tier,setTier]=useState("basic");
  const te=TEACHERS.find(x=>x.id===gig.teacherId);
  const tiers={basic:{name:t("Basic","أساسي"),price:gig.tier.basic,features:["1 session/week","Text support","Basic materials"]},standard:{name:t("Standard","متوسط"),price:gig.tier.standard,features:["2 sessions/week","Voice notes","Full materials","Progress tracking"]},premium:{name:t("Premium","متقدم"),price:gig.tier.premium,features:["3+ sessions/week","Priority support","All materials + Certificate","Recitation review"]}};
  const price=tiers[tier].price;
  const fee=isPro?0:Math.round(price*PLATFORM.feePercent)/100;
  const barakah=Math.round(price*PLATFORM.barakahFundPercent)/100;
  const total=price+fee;

  return(<div style={{maxWidth:1060,margin:"0 auto",padding:"24px 24px",animation:"fadeIn 0.4s ease"}}>
    <button onClick={()=>nav("explore")} style={{background:"none",border:"none",color:"var(--text2)",fontSize:12,marginBottom:14,cursor:"pointer"}}>← {t("Back","العودة")}</button>
    <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:24,alignItems:"start"}} className="mg">
      <div>
        <div style={{height:240,borderRadius:16,background:"linear-gradient(135deg,var(--accent2)15,var(--accent)10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:68,marginBottom:18,position:"relative"}}>
          {gig.image}
          {gig.isSadaqah&&<div className="bb" style={{position:"absolute",top:12,right:12,fontSize:11,padding:"4px 10px"}}>🤲 {t("Barakah","بركة")}</div>}
          {gig.promoted&&<div className="promoted-label"><I.Zap/>Promoted</div>}
        </div>
        <h1 style={{fontSize:22,fontWeight:700,lineHeight:1.4,marginBottom:12}}>{gig.title}</h1>
        <div className="cd" style={{padding:16,marginBottom:14,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>nav("teacher",undefined,te)}>
          <div style={{width:44,height:44,borderRadius:13,background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,position:"relative"}}>{te?.avatar}</div>
          <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}><span style={{fontWeight:600,fontSize:13}}>{te?.name}</span>{te?.badge&&<span className="vb" style={{fontSize:9}}>✓</span>}{te?.pro&&<span className="pro-badge" style={{fontSize:8}}>👑 PRO</span>}</div><div style={{fontSize:10,color:"var(--text3)",marginTop:1}}>{te?.location} • {te?.completedOrders} {t("completed","مكتمل")}</div></div>
          <button onClick={e=>{e.stopPropagation();openTip(te)}} style={{background:"none",border:"1px solid var(--border)",borderRadius:9,padding:"5px 12px",fontSize:11,color:"var(--text2)",display:"flex",alignItems:"center",gap:3}}>☕ {t("Tip","بقشيش")}</button>
        </div>
        <div className="cd" style={{padding:20,marginBottom:14}}><h3 style={{fontSize:14,fontWeight:600,marginBottom:8}}>{t("About","عن الخدمة")}</h3><p style={{fontSize:13,color:"var(--text2)",lineHeight:1.8}}>{te?.bio} {t("Includes personalized plans, assessments, and support between sessions.","تشمل خطط مخصصة وتقييمات ودعم بين الجلسات.")}</p></div>
        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:18}}>{gig.tags.map(tag=><span key={tag} className="tg">{tag}</span>)}</div>
        <div className="cd" style={{padding:20}}>
          <h3 style={{fontSize:14,fontWeight:600,marginBottom:12}}>{t("Reviews","التقييمات")} ({te?.reviews})</h3>
          {[{n:"Ahmad K.",r:5,txt:"Excellent teacher. Tajweed improved in 2 months.",time:"2w ago"},{n:"Khadijah R.",r:5,txt:"MashaAllah, best experience. Adapts to learning styles.",time:"1mo ago"},{n:"Yusuf B.",r:4,txt:"Very good. Clear explanations. Recommended.",time:"2mo ago"}].map((rv,i)=><div key={i} style={{padding:"12px 0",borderBottom:i<2?"1px solid var(--border)":"none"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontWeight:600,fontSize:11}}>{rv.n}</span><div style={{display:"flex",gap:1}}>{Array(rv.r).fill(0).map((_,j)=><I.Star key={j} f/>)}</div></div><span style={{fontSize:10,color:"var(--text3)"}}>{rv.time}</span></div>
            <p style={{fontSize:12,color:"var(--text2)",lineHeight:1.5}}>{rv.txt}</p>
          </div>)}
        </div>
      </div>

      {/* Sidebar: Pricing + Fees */}
      <div style={{position:"sticky",top:70}}>
        <div className="cd" style={{padding:20}}>
          <div style={{display:"flex",borderRadius:10,overflow:"hidden",border:"1px solid var(--border)",marginBottom:16}}>
            {Object.entries(tiers).map(([k,v])=><button key={k} onClick={()=>setTier(k)} style={{flex:1,padding:"8px 0",border:"none",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all 0.2s",background:tier===k?"var(--accent)":"var(--bg2)",color:tier===k?"white":"var(--text2)"}}>{v.name}</button>)}
          </div>

          {/* Price Breakdown */}
          <div style={{padding:"14px 16px",borderRadius:12,background:"var(--bg2)",marginBottom:16}}>
            <div className="fee-line"><span>{t("Service price","سعر الخدمة")}</span><span>{price===0?t("Free","مجاني"):P(price)}</span></div>
            {price>0&&<>
              <div className="fee-line"><span>{t("Platform fee","رسوم المنصة")} ({isPro?"0%":`${PLATFORM.feePercent}%`})</span><span style={{color:isPro?"#27AE60":"var(--text2)"}}>{isPro?t("FREE — Pro","مجاني — برو"):P(fee)}</span></div>
              <div className="fee-line"><span style={{fontSize:11,color:"var(--text3)"}}>{t("Barakah Fund","صندوق البركة")} ({PLATFORM.barakahFundPercent}%)</span><span style={{fontSize:11,color:"var(--accent2)"}}>{P(barakah)} 🤲</span></div>
              <div className="fee-line total"><span>{t("Total","المجموع")}</span><span style={{color:"var(--accent)"}}>{P(total)}</span></div>
              {cur.code!=="USD"&&<div style={{fontSize:10,color:"var(--text3)",textAlign:"right",marginTop:2}}>≈ ${total.toFixed(2)} USD</div>}
            </>}
          </div>

          <div style={{marginBottom:14}}>{tiers[tier].features.map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",fontSize:12,color:"var(--text2)"}}><span style={{color:"var(--accent2)"}}><I.Check/></span>{f}</div>)}</div>
          <button className="bp" style={{width:"100%",marginBottom:6,padding:12}} onClick={()=>handleOrder(gig,tier,price)}>{price===0?t("Enroll Free","سجل مجاناً"):`${t("Order","اطلب")} — ${P(total)}`}</button>
          <button className="bs" onClick={()=>openBooking(te)} style={{width:"100%",marginBottom:6,padding:10,fontSize:13}}><span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><I.Calendar/>{t("Book Session","احجز جلسة")}</span></button>
          <button className="bs" onClick={()=>openChat(te)} style={{width:"100%",padding:10,fontSize:13}}><span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4}}><I.Chat/>{t("Message","رسالة")}</span></button>
          {!isPro&&<p style={{fontSize:10,color:"var(--text3)",textAlign:"center",marginTop:8}}>{t("Go Pro to remove platform fees","اشترك برو لإزالة رسوم المنصة")} 👑</p>}
        </div>
        <div className="cd" style={{padding:16,marginTop:8,textAlign:"center"}}>
          <div style={{fontSize:20,marginBottom:4}}>🎙️</div>
          <h4 style={{fontSize:12,fontWeight:600,marginBottom:6}}>{t("Recitation Feedback","تصحيح التلاوة")}</h4>
          <label className="bs" style={{width:"100%",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer",padding:"8px 0"}}><I.Upload/>{t("Upload Audio","ارفع صوت")}<input type="file" accept="audio/*" style={{display:"none"}}/></label>
        </div>
      </div>
    </div>
  </div>);
}

// ─── TEACHER PROFILE ─────────────────────────────────────────────────────────
function TeacherPage({t,P,teacher,nav,openChat,openBooking,openTip}){
  const gigs=GIGS.filter(g=>g.teacherId===teacher.id);
  return(<div style={{maxWidth:860,margin:"0 auto",padding:"24px 24px",animation:"fadeIn 0.4s ease"}}>
    <button onClick={()=>nav("explore")} style={{background:"none",border:"none",color:"var(--text2)",fontSize:12,marginBottom:14,cursor:"pointer"}}>← {t("Back","العودة")}</button>
    <div className="cd" style={{padding:32,textAlign:"center",marginBottom:18}}>
      <div style={{width:68,height:68,borderRadius:20,background:"linear-gradient(135deg,var(--accent2)20,var(--accent)15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,margin:"0 auto 12px",animation:"float 3s ease infinite"}}>{teacher.avatar}</div>
      <h1 style={{fontSize:20,fontWeight:700,marginBottom:3}}>{teacher.name}</h1>
      <p style={{fontSize:11,color:"var(--text3)",marginBottom:8}}>{teacher.location}</p>
      <div style={{display:"flex",justifyContent:"center",gap:5,marginBottom:10,flexWrap:"wrap"}}>{teacher.badge&&<span className="vb">✓ {t("Verified","معتمد")}</span>}{teacher.barakah&&<span className="bb">🤲</span>}{teacher.pro&&<span className="pro-badge">👑 PRO</span>}</div>
      <p style={{fontSize:12,color:"var(--text2)",lineHeight:1.7,maxWidth:420,margin:"0 auto 16px"}}>{teacher.bio}</p>
      <div style={{display:"flex",justifyContent:"center",gap:24,padding:"16px 0",borderTop:"1px solid var(--border)",marginBottom:14}}>
        <div><div style={{fontSize:18,fontWeight:700,color:"var(--accent)"}}>{teacher.rating}</div><div style={{fontSize:10,color:"var(--text3)"}}>{t("Rating","التقييم")}</div></div>
        <div><div style={{fontSize:18,fontWeight:700}}>{teacher.reviews}</div><div style={{fontSize:10,color:"var(--text3)"}}>{t("Reviews","التقييمات")}</div></div>
        <div><div style={{fontSize:18,fontWeight:700}}>{teacher.completedOrders}</div><div style={{fontSize:10,color:"var(--text3)"}}>{t("Orders","الطلبات")}</div></div>
        <div><div style={{fontSize:18,fontWeight:700,color:"var(--accent2)"}}>{P(teacher.price)}</div><div style={{fontSize:10,color:"var(--text3)"}}>{t("From","من")}</div></div>
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:7,flexWrap:"wrap"}}>
        <button className="bp" onClick={()=>openChat(teacher)}><span style={{display:"flex",alignItems:"center",gap:4}}><I.Chat/>{t("Message","رسالة")}</span></button>
        <button className="bs" onClick={()=>openBooking(teacher)}><span style={{display:"flex",alignItems:"center",gap:4}}><I.Calendar/>{t("Book","احجز")}</span></button>
        <button className="bs" onClick={()=>openTip(teacher)}><span style={{display:"flex",alignItems:"center",gap:4}}>☕ {t("Send Tip","بقشيش")}</span></button>
      </div>
    </div>
    <h2 style={{fontSize:16,fontWeight:700,marginBottom:12}}>{t("Services","الخدمات")}</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:13}} className="mg">
      {gigs.map((g,i)=><GigCard key={g.id} gig={g} t={t} P={P} i={i} onClick={()=>nav("gig",g)} toggleFav={()=>{}} isFav={false}/>)}
    </div>
  </div>);
}

// ─── LEARNING TRACKS (Udemy-style) ───────────────────────────────────────────
function TracksPage({t,P,nav,toast,isLoggedIn,setShowAuth,tracks,enrollTrack,isEnrolled,getEnrollment,setSelTrack,user}){
  const [filter,setFilter]=useState("all");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{const tm=setTimeout(()=>setLoading(false),500);return()=>clearTimeout(tm)},[]);
  const published=tracks.filter(c=>c.isPublished);
  const filtered=filter==="all"?published:filter==="free"?published.filter(c=>c.price===0):published.filter(c=>c.price>0);

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"28px 24px",animation:"fadeIn 0.4s ease"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:"-0.5px",marginBottom:4}}>{t("Learning Tracks","مسارات التعلم")}</h1>
        <p style={{fontSize:13,color:"var(--text2)"}}>{t("Structured paths designed by scholars. Free and premium tracks available.","مسارات منظمة صممها العلماء. مسارات مجانية ومدفوعة.")}</p>
      </div>
      <button className="bp" onClick={()=>nav("admin-tracks")} style={{fontSize:12,padding:"8px 18px"}}><I.Settings/> {t("Manage Courses","إدارة الدورات")}</button>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:20}}>
      {[{k:"all",l:t("All","الكل")},{k:"free",l:t("Free","مجاني")},{k:"paid",l:t("Premium","مدفوع")}].map(f=><button key={f.k} className={`tg ${filter===f.k?"act":""}`} onClick={()=>setFilter(f.k)}>{f.l}</button>)}
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {loading?Array(4).fill(0).map((_,i)=><div key={i} className="cd" style={{padding:22,display:"flex",alignItems:"center",gap:16}}>
        <div style={{width:54,height:54,borderRadius:13,background:"var(--bg3)",animation:"pulse 1.5s ease infinite"}}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}><div style={{width:"55%",height:16,borderRadius:6,background:"var(--bg3)",animation:"pulse 1.5s ease infinite"}}/><div style={{width:"35%",height:12,borderRadius:6,background:"var(--bg3)",animation:"pulse 1.5s ease infinite"}}/></div>
        <div style={{width:110,height:40,borderRadius:12,background:"var(--bg3)",animation:"pulse 1.5s ease infinite"}}/>
      </div>):
      filtered.map((tr,i)=>{
        const enrolled=isEnrolled(tr.id);
        const enrollment=getEnrollment(tr.id);
        const totalLectures=tr.sections?.reduce((s,sec)=>s+sec.lectures.length,0)||0;
        return(
        <div key={tr.id} className="cd lift" style={{animation:`fadeIn 0.4s ease ${i*0.06}s both`,cursor:"pointer"}} onClick={()=>{setSelTrack(tr);nav("track-detail")}}>
          <div style={{display:"flex",alignItems:"center",gap:16,padding:"20px 22px",flexWrap:"wrap"}}>
            <div style={{width:54,height:54,borderRadius:14,background:`${tr.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{tr.icon}</div>
            <div style={{flex:1,minWidth:180}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
                <h3 style={{fontSize:16,fontWeight:700}}>{tr.title}</h3>
                {tr.price===0?<span className="bb" style={{fontSize:10}}>Free</span>:<span className="tg" style={{background:"var(--accent)12",color:"var(--accent)",borderColor:"var(--accent)30",fontSize:11,fontWeight:600}}>{P(tr.price)}</span>}
                {enrolled&&<span style={{fontSize:10,color:"var(--accent2)",fontWeight:600,background:"var(--accent2)12",padding:"2px 8px",borderRadius:8}}>✅ Enrolled</span>}
              </div>
              <p className="amiri" style={{fontSize:12,color:"var(--text3)",marginBottom:4}}>{tr.titleAr}</p>
              <div style={{display:"flex",gap:14,fontSize:11,color:"var(--text2)",flexWrap:"wrap",alignItems:"center"}}>
                <span>{totalLectures} {t("lectures","محاضرة")}</span>
                <span>{tr.enrolled?.toLocaleString()} {t("enrolled","مسجل")}</span>
                {tr.rating>0&&<span style={{display:"flex",alignItems:"center",gap:2}}>⭐ {tr.rating}</span>}
                <span>{tr.sections?.length||0} {t("sections","أقسام")}</span>
              </div>
            </div>
            <button className="bp" onClick={e=>{e.stopPropagation();enrollTrack(tr)}} style={{flexShrink:0,padding:"11px 26px",fontSize:13}}>
              {enrolled?t("Continue","تابع"):tr.price===0?t("Start Free","ابدأ مجاناً"):`${t("Enroll","سجّل")} — ${P(tr.price)}`}
            </button>
          </div>
          {enrolled&&enrollment?.progress>0&&<div style={{padding:"0 22px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text3)",marginBottom:3}}><span>Progress</span><span>{enrollment.progress}%</span></div>
            <div style={{width:"100%",height:5,borderRadius:3,background:"var(--bg3)",overflow:"hidden"}}><div style={{width:`${enrollment.progress}%`,height:"100%",borderRadius:3,background:"var(--accent2)",transition:"width 0.5s"}}/></div>
          </div>}
        </div>);
      })}
    </div>
    {!loading&&filtered.length===0&&<div style={{textAlign:"center",padding:44,color:"var(--text3)"}}><div style={{fontSize:40,marginBottom:10}}>📚</div><p>{t("No tracks found.","لا مسارات.")}</p></div>}
  </div>);
}

// ─── TRACK DETAIL PAGE ───────────────────────────────────────────────────────
function TrackDetailPage({t,P,nav,track,enrollTrack,isEnrolled,getEnrollment}){
  const [expandedSec,setExpandedSec]=useState(track.sections?.[0]?.id||null);
  const enrolled=isEnrolled(track.id);
  const enrollment=getEnrollment(track.id);
  const totalLectures=track.sections?.reduce((s,sec)=>s+sec.lectures.length,0)||0;
  return(<div style={{maxWidth:900,margin:"0 auto",padding:"28px 24px",animation:"fadeIn 0.4s ease"}}>
    <button onClick={()=>nav("tracks")} style={{background:"none",border:"none",color:"var(--text2)",fontSize:12,marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>← {t("Back to Tracks","العودة للمسارات")}</button>
    <div className="cd" style={{padding:28,marginBottom:22,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:4,background:`linear-gradient(90deg,${track.color},transparent)`}}/>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        <div style={{width:72,height:72,borderRadius:18,background:`${track.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:38,flexShrink:0}}>{track.icon}</div>
        <div style={{flex:1,minWidth:220}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3,flexWrap:"wrap"}}>
            <h1 style={{fontSize:22,fontWeight:800}}>{track.title}</h1>
            {track.price===0?<span className="bb">Free</span>:<span className="vb">{P(track.price)}</span>}
          </div>
          <p className="amiri" style={{fontSize:14,color:"var(--text3)",marginBottom:8}}>{track.titleAr}</p>
          <p style={{fontSize:13,color:"var(--text2)",lineHeight:1.7,marginBottom:14}}>{track.desc}</p>
          <div style={{display:"flex",gap:16,fontSize:12,color:"var(--text2)",flexWrap:"wrap",marginBottom:16}}>
            <span>🎬 {totalLectures} lectures</span><span>👥 {track.enrolled?.toLocaleString()} students</span>
            {track.rating>0&&<span>⭐ {track.rating}</span>}<span>📁 {track.sections?.length||0} sections</span>
          </div>
          <button className="bp" onClick={()=>enrollTrack(track)} style={{padding:"12px 30px",fontSize:14}}>
            {enrolled?"Continue Learning →":track.price===0?"Start Free →":`Enroll — ${P(track.price)}`}
          </button>
        </div>
      </div>
    </div>
    <h2 style={{fontSize:18,fontWeight:700,marginBottom:14}}>📋 {t("Curriculum","المنهج")}</h2>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {(track.sections||[]).map((sec,si)=>(
        <div key={sec.id} className="cd">
          <button onClick={()=>setExpandedSec(expandedSec===sec.id?null:sec.id)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",border:"none",background:"transparent",color:"var(--text)",cursor:"pointer",textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:26,height:26,borderRadius:8,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"var(--accent)"}}>{si+1}</div>
              <div><div style={{fontWeight:600,fontSize:13}}>{sec.title}</div><div style={{fontSize:10,color:"var(--text3)"}}>{sec.lectures.length} lectures</div></div>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{color:"var(--text3)",transform:expandedSec===sec.id?"rotate(180deg)":"none",transition:"transform 0.2s"}}><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {expandedSec===sec.id&&<div style={{borderTop:"1px solid var(--border)"}}>
            {sec.lectures.map((lec,li)=>{
              const completed=enrollment?.completedLectures?.includes(lec.id);
              const canAccess=enrolled||lec.isPreview;
              return(<div key={lec.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 18px 10px 54px",borderBottom:li<sec.lectures.length-1?"1px solid var(--border)":"none",cursor:canAccess?"pointer":"default",background:completed?"var(--accent2)06":"transparent"}} onClick={()=>{if(canAccess&&enrolled)nav("learn-track")}}>
                <div style={{width:22,height:22,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:completed?"var(--accent2)":"var(--bg3)",color:completed?"white":"var(--text3)",fontSize:9}}>
                  {completed?"✓":lec.type==="video"?"▶":lec.type==="quiz"?"?":"📝"}
                </div>
                <div style={{flex:1}}><div style={{fontSize:12,fontWeight:500,color:canAccess?"var(--text)":"var(--text3)"}}>{lec.title}</div>
                  <div style={{fontSize:10,color:"var(--text3)",display:"flex",gap:8,marginTop:1}}><span>{lec.duration}</span>{lec.isPreview&&<span style={{color:"var(--accent2)",fontWeight:600}}>Preview</span>}</div>
                </div>
                {!canAccess&&<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14" style={{color:"var(--text3)"}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>}
              </div>);
            })}
          </div>}
        </div>
      ))}
    </div>
    {(track.sections||[]).length===0&&<div className="cd" style={{padding:36,textAlign:"center",color:"var(--text3)"}}><p>No content available yet.</p></div>}
  </div>);
}

// ─── LEARN PAGE (Video Player + Sidebar) ─────────────────────────────────────
function LearnTrackPage({t,P,nav,track,getEnrollment,completeLecture,toast,tracks}){
  const freshTrack=tracks.find(c=>c.id===track.id)||track;
  const enrollment=getEnrollment(freshTrack.id);
  const allLectures=freshTrack.sections?.flatMap(s=>s.lectures.map(l=>({...l,secTitle:s.title,secId:s.id})))||[];
  const [curIdx,setCurIdx]=useState(0);
  const cur=allLectures[curIdx]||null;
  const [playing,setPlaying]=useState(false);
  const isCompleted=enrollment?.completedLectures?.includes(cur?.id);
  const next=allLectures[curIdx+1]||null;

  const markDone=()=>{
    if(cur&&!isCompleted){completeLecture(freshTrack.id,cur.id);toast("Lecture completed! ✅");}
    if(next)setCurIdx(curIdx+1);
  };

  return(<div style={{display:"flex",height:"calc(100vh - 56px)",overflow:"hidden"}}>
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Video */}
      <div style={{background:"#111",aspectRatio:"16/9",maxHeight:"55vh",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",flexShrink:0}}>
        <div style={{textAlign:"center",color:"white"}}>
          <div style={{fontSize:52,marginBottom:12,opacity:0.3}}>{cur?.type==="video"?"🎬":cur?.type==="quiz"?"❓":"📝"}</div>
          <button onClick={()=>setPlaying(!playing)} style={{width:56,height:56,borderRadius:28,background:"rgba(255,255,255,0.12)",border:"2px solid rgba(255,255,255,0.35)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",cursor:"pointer",backdropFilter:"blur(4px)"}}>
            {playing?<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>:<svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <p style={{marginTop:10,fontSize:12,opacity:0.5}}>{cur?.title}</p>
        </div>
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"rgba(255,255,255,0.1)"}}><div style={{width:playing?"60%":"0%",height:"100%",background:"var(--accent)",transition:"width 0.3s"}}/></div>
      </div>
      {/* Below video */}
      <div style={{padding:"18px 22px",overflowY:"auto",flex:1}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:10}}>
          <div><h2 style={{fontSize:16,fontWeight:700}}>{cur?.title}</h2><p style={{fontSize:11,color:"var(--text3)",marginTop:2}}>{cur?.secTitle} • {cur?.duration}</p></div>
          <div style={{display:"flex",gap:6}}>
            {!isCompleted&&<button className="bp" onClick={markDone} style={{fontSize:12,padding:"8px 16px"}}>✓ Complete</button>}
            {isCompleted&&<span className="bb" style={{padding:"7px 12px"}}>✅ Done</span>}
            {next&&<button className="bs" onClick={()=>setCurIdx(curIdx+1)} style={{fontSize:12,padding:"8px 14px"}}>Next →</button>}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,fontSize:11,color:"var(--text2)"}}>
          <span>{enrollment?.progress||0}%</span>
          <div style={{flex:1,maxWidth:280,height:5,borderRadius:3,background:"var(--bg3)",overflow:"hidden"}}><div style={{width:`${enrollment?.progress||0}%`,height:"100%",borderRadius:3,background:"var(--accent2)",transition:"width 0.5s"}}/></div>
          <span>{enrollment?.completedLectures?.length||0}/{allLectures.length}</span>
        </div>
      </div>
    </div>
    {/* Sidebar */}
    <div style={{width:320,borderLeft:"1px solid var(--border)",background:"var(--card)",overflowY:"auto",flexShrink:0}} className="hm">
      <div style={{padding:"14px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <h3 style={{fontSize:13,fontWeight:700}}>Course Content</h3>
        <button onClick={()=>nav("tracks")} style={{background:"none",border:"none",color:"var(--text3)",fontSize:11,cursor:"pointer"}}>← Exit</button>
      </div>
      {freshTrack.sections?.map((sec,si)=>(
        <div key={sec.id}>
          <div style={{padding:"10px 16px",background:"var(--bg2)",fontSize:11,fontWeight:600,color:"var(--text2)",borderBottom:"1px solid var(--border)"}}>S{si+1}: {sec.title}</div>
          {sec.lectures.map((lec,li)=>{
            const flatIdx=allLectures.findIndex(l=>l.id===lec.id);
            const done=enrollment?.completedLectures?.includes(lec.id);
            const active=curIdx===flatIdx;
            return(<div key={lec.id} onClick={()=>setCurIdx(flatIdx)} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 16px",cursor:"pointer",background:active?"var(--accent)10":"transparent",borderLeft:active?"3px solid var(--accent)":"3px solid transparent",borderBottom:"1px solid var(--border)",transition:"all 0.15s"}}>
              <div style={{width:18,height:18,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,background:done?"var(--accent2)":"var(--bg3)",color:done?"white":"var(--text3)",flexShrink:0}}>{done?"✓":"▶"}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:11,fontWeight:active?600:400,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{lec.title}</div><div style={{fontSize:9,color:"var(--text3)"}}>{lec.duration}</div></div>
            </div>);
          })}
        </div>
      ))}
    </div>
  </div>);
}

// ─── ADMIN TRACKS DASHBOARD ──────────────────────────────────────────────────
function AdminTracksPage({t,P,nav,toast,tracks,addTrackCourse,updateTrackCourse,deleteTrackCourse,setSelTrack,user}){
  const [showCreate,setShowCreate]=useState(false);
  const [form,setForm]=useState({title:"",titleAr:"",desc:"",price:0,icon:"📖",color:"#2D6A4F",category:"quran",steps:0,teachers:1});
  const totalEnrolled=tracks.reduce((s,c)=>s+(c.enrolled||0),0);
  const totalRevenue=tracks.reduce((s,c)=>s+(c.enrolled||0)*c.price,0);
  const publishedCount=tracks.filter(c=>c.isPublished).length;

  const handleCreate=()=>{
    if(!form.title.trim())return;
    addTrackCourse({...form,enrolled:0,rating:0,isPublished:false});
    setShowCreate(false);setForm({title:"",titleAr:"",desc:"",price:0,icon:"📖",color:"#2D6A4F",category:"quran",steps:0,teachers:1});
  };

  return(<div style={{maxWidth:1060,margin:"0 auto",padding:"28px 24px",animation:"fadeIn 0.4s ease"}}>
    <button onClick={()=>nav("tracks")} style={{background:"none",border:"none",color:"var(--text2)",fontSize:12,marginBottom:14,cursor:"pointer"}}>← Back to Tracks</button>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22,flexWrap:"wrap",gap:10}}>
      <div><h1 style={{fontSize:24,fontWeight:800}}>Admin: Course Management</h1><p style={{fontSize:12,color:"var(--text2)"}}>Create, edit, and manage learning tracks.</p></div>
      <button className="bp" onClick={()=>setShowCreate(true)} style={{fontSize:12}}><I.Plus/> Create Course</button>
    </div>
    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,marginBottom:24}} className="mg">
      {[{icon:"📚",label:"Total Courses",value:tracks.length,color:"var(--accent)"},{icon:"✅",label:"Published",value:publishedCount,color:"var(--accent2)"},{icon:"👥",label:"Enrollments",value:totalEnrolled.toLocaleString(),color:"var(--accent)"},{icon:"💰",label:"Revenue",value:P(totalRevenue),color:"#D4AF37"}].map((s,i)=>(
        <div key={i} className="cd" style={{padding:20,animation:`fadeIn 0.3s ease ${i*0.05}s both`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:26}}>{s.icon}</span><span style={{fontSize:22,fontWeight:800,color:s.color}}>{s.value}</span></div>
          <div style={{fontSize:11,color:"var(--text2)"}}>{s.label}</div>
        </div>
      ))}
    </div>
    {/* Course List */}
    <h2 style={{fontSize:16,fontWeight:700,marginBottom:14}}>All Courses</h2>
    {tracks.map((course,i)=>(
      <div key={course.id} className="cd" style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",marginBottom:8,animation:`fadeIn 0.3s ease ${i*0.04}s both`,flexWrap:"wrap"}}>
        <div style={{width:40,height:40,borderRadius:11,background:`${course.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{course.icon}</div>
        <div style={{flex:1,minWidth:160}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:1}}>
            <h3 style={{fontSize:13,fontWeight:600}}>{course.title}</h3>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:7,background:course.isPublished?"var(--accent2)12":"#E74C3C12",color:course.isPublished?"var(--accent2)":"#E74C3C",fontWeight:600}}>{course.isPublished?"Published":"Draft"}</span>
          </div>
          <div style={{display:"flex",gap:10,fontSize:10,color:"var(--text3)"}}>
            <span>{course.sections?.length||0} sections</span>
            <span>{course.sections?.reduce((s,sec)=>s+sec.lectures.length,0)||0} lectures</span>
            <span>{course.enrolled||0} students</span>
            <span>{course.price===0?"Free":P(course.price)}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:5}}>
          <button className="bs" onClick={()=>{setSelTrack(course);nav("admin-track-edit")}} style={{padding:"6px 12px",fontSize:11}}>✏️ Edit</button>
          <button onClick={()=>{updateTrackCourse(course.id,{isPublished:!course.isPublished})}} style={{padding:"6px 12px",fontSize:11,borderRadius:10,border:"1px solid var(--border)",background:"var(--bg2)",color:"var(--text2)",cursor:"pointer"}}>{course.isPublished?"Unpublish":"Publish"}</button>
          <button onClick={()=>{if(confirm("Delete?"))deleteTrackCourse(course.id)}} style={{padding:"6px 10px",fontSize:11,borderRadius:10,border:"1px solid #E74C3C30",background:"#E74C3C08",color:"#E74C3C",cursor:"pointer"}}>🗑</button>
        </div>
      </div>
    ))}
    {/* Create Modal */}
    {showCreate&&<Modal close={()=>setShowCreate(false)} title="Create New Course" wide>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}} className="mg">
        <div style={{gridColumn:"1/-1"}}><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Title *</label><input className="inp" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Tajweed Mastery Path"/></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Arabic Subtitle</label><input className="inp" value={form.titleAr} onChange={e=>setForm({...form,titleAr:e.target.value})} placeholder="مسار إتقان التجويد"/></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Category</label><select className="inp" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="quran">Quran</option><option value="arabic">Arabic</option><option value="fiqh">Fiqh</option><option value="aqeedah">Aqeedah</option></select></div>
        <div style={{gridColumn:"1/-1"}}><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Description</label><textarea className="inp" rows={3} value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} style={{resize:"vertical"}}/></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Price (USD, 0=Free)</label><input className="inp" type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:Number(e.target.value)})}/></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Icon</label><div style={{display:"flex",gap:5,flexWrap:"wrap"}}>{["📖","✍️","⚖️","🕌","📚","🎬","🤲","📜"].map(em=><button key={em} onClick={()=>setForm({...form,icon:em})} style={{width:36,height:36,borderRadius:9,border:form.icon===em?"2px solid var(--accent)":"1px solid var(--border)",background:"var(--bg2)",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{em}</button>)}</div></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Theme Color</label><div style={{display:"flex",gap:5}}>{["#2D6A4F","#8B6914","#4A6741","#6B5B3E","#5C4033","#1B4332"].map(c=><button key={c} onClick={()=>setForm({...form,color:c})} style={{width:28,height:28,borderRadius:8,background:c,border:form.color===c?"3px solid var(--text)":"2px solid transparent",cursor:"pointer"}}/>)}</div></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
        <button className="bs" onClick={()=>setShowCreate(false)}>Cancel</button>
        <button className="bp" onClick={handleCreate} disabled={!form.title.trim()}>Create Course</button>
      </div>
    </Modal>}
  </div>);
}

// ─── ADMIN COURSE EDITOR ─────────────────────────────────────────────────────
function AdminTrackEditor({t,P,nav,toast,track,updateTrackCourse,addSection,addLecture,deleteLecture,deleteSection,tracks}){
  const freshTrack=tracks.find(c=>c.id===track.id)||track;
  const [tab,setTab]=useState("content");
  const [editForm,setEditForm]=useState({title:freshTrack.title,titleAr:freshTrack.titleAr,desc:freshTrack.desc,price:freshTrack.price,isPublished:freshTrack.isPublished});
  const [showAddSec,setShowAddSec]=useState(false);
  const [secTitle,setSecTitle]=useState("");
  const [showAddLec,setShowAddLec]=useState(null);
  const [lecForm,setLecForm]=useState({title:"",duration:"00:00",isPreview:false,type:"video"});
  const totalLectures=freshTrack.sections?.reduce((s,sec)=>s+sec.lectures.length,0)||0;

  return(<div style={{maxWidth:920,margin:"0 auto",padding:"28px 24px",animation:"fadeIn 0.4s ease"}}>
    <button onClick={()=>nav("admin-tracks")} style={{background:"none",border:"none",color:"var(--text2)",fontSize:12,marginBottom:14,cursor:"pointer"}}>← Back to Admin</button>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
      <div style={{width:48,height:48,borderRadius:13,background:`${freshTrack.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{freshTrack.icon}</div>
      <div style={{flex:1}}>
        <h1 style={{fontSize:20,fontWeight:800}}>{freshTrack.title}</h1>
        <div style={{display:"flex",gap:8,fontSize:11,color:"var(--text3)",marginTop:2}}>
          <span>{freshTrack.sections?.length||0} sections</span><span>{totalLectures} lectures</span><span>{freshTrack.enrolled||0} students</span>
          <span style={{color:freshTrack.isPublished?"var(--accent2)":"#E74C3C",fontWeight:600}}>{freshTrack.isPublished?"Published":"Draft"}</span>
        </div>
      </div>
    </div>
    {/* Tabs */}
    <div style={{display:"flex",gap:2,borderBottom:"1px solid var(--border)",marginBottom:22}}>
      {[{k:"content",l:"📁 Content"},{k:"settings",l:"⚙️ Settings"},{k:"analytics",l:"📊 Analytics"}].map(tb=>
        <button key={tb.k} onClick={()=>setTab(tb.k)} style={{padding:"9px 16px",border:"none",background:"none",fontSize:12,fontWeight:tab===tb.k?600:400,color:tab===tb.k?"var(--accent)":"var(--text3)",borderBottom:tab===tb.k?"2px solid var(--accent)":"2px solid transparent",cursor:"pointer"}}>{tb.l}</button>
      )}
    </div>

    {/* CONTENT TAB */}
    {tab==="content"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,alignItems:"center"}}>
        <h2 style={{fontSize:15,fontWeight:700}}>Sections & Lectures</h2>
        <button className="bp" onClick={()=>{setSecTitle("");setShowAddSec(true)}} style={{fontSize:11,padding:"7px 14px"}}><I.Plus/> Add Section</button>
      </div>
      {(freshTrack.sections||[]).map((sec,si)=>(
        <div key={sec.id} className="cd" style={{marginBottom:10}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"var(--bg2)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontWeight:600,fontSize:13}}>Section {si+1}: {sec.title}</span>
              <span style={{fontSize:10,color:"var(--text3)"}}>({sec.lectures.length} lectures)</span>
            </div>
            <div style={{display:"flex",gap:4}}>
              <button className="bs" onClick={()=>{setLecForm({title:"",duration:"00:00",isPreview:false,type:"video"});setShowAddLec(sec.id)}} style={{padding:"4px 10px",fontSize:10}}>+ Lecture</button>
              <button onClick={()=>deleteSection(freshTrack.id,sec.id)} style={{background:"none",border:"none",color:"#E74C3C",cursor:"pointer",padding:3,fontSize:12}}>🗑</button>
            </div>
          </div>
          {sec.lectures.map((lec,li)=>(
            <div key={lec.id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 16px 9px 42px",borderTop:"1px solid var(--border)"}}>
              <div style={{width:22,height:22,borderRadius:6,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"var(--text3)"}}>{lec.type==="video"?"🎬":lec.type==="quiz"?"❓":"📝"}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500}}>{lec.title}</div>
                <div style={{fontSize:10,color:"var(--text3)",display:"flex",gap:6}}><span>{lec.type}</span><span>{lec.duration}</span>{lec.isPreview&&<span style={{color:"var(--accent2)",fontWeight:600}}>Preview</span>}</div>
              </div>
              <button onClick={()=>deleteLecture(freshTrack.id,sec.id,lec.id)} style={{background:"none",border:"none",color:"#E74C3C",cursor:"pointer",padding:3,opacity:0.6,fontSize:11}}>🗑</button>
            </div>
          ))}
          {sec.lectures.length===0&&<div style={{padding:"14px 42px",color:"var(--text3)",fontSize:11,borderTop:"1px solid var(--border)"}}>No lectures. Click "+ Lecture" to add.</div>}
        </div>
      ))}
      {(freshTrack.sections||[]).length===0&&<div className="cd" style={{padding:32,textAlign:"center",color:"var(--text3)"}}><p style={{fontSize:12,marginBottom:10}}>No sections yet.</p><button className="bp" onClick={()=>{setSecTitle("");setShowAddSec(true)}} style={{fontSize:12}}>+ Add First Section</button></div>}
    </div>}

    {/* SETTINGS TAB */}
    {tab==="settings"&&<div className="cd" style={{padding:22,maxWidth:520}}>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Title</label><input className="inp" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})}/></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Arabic Subtitle</label><input className="inp" value={editForm.titleAr} onChange={e=>setEditForm({...editForm,titleAr:e.target.value})}/></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Description</label><textarea className="inp" rows={3} value={editForm.desc} onChange={e=>setEditForm({...editForm,desc:e.target.value})} style={{resize:"vertical"}}/></div>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Price (USD)</label><input className="inp" type="number" min="0" step="0.01" value={editForm.price} onChange={e=>setEditForm({...editForm,price:Number(e.target.value)})}/></div>
        <div style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={editForm.isPublished} onChange={e=>setEditForm({...editForm,isPublished:e.target.checked})} id="pubCk"/><label htmlFor="pubCk" style={{fontSize:12}}>Published</label></div>
      </div>
      <button className="bp" onClick={()=>updateTrackCourse(freshTrack.id,editForm)} style={{marginTop:14}}>Save Changes</button>
    </div>}

    {/* ANALYTICS TAB */}
    {tab==="analytics"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}} className="mg">
      <div className="cd" style={{padding:20}}><div style={{fontSize:26,marginBottom:4}}>👥</div><div style={{fontSize:22,fontWeight:800,color:"var(--accent)"}}>{(freshTrack.enrolled||0).toLocaleString()}</div><div style={{fontSize:11,color:"var(--text2)"}}>Enrollments</div></div>
      <div className="cd" style={{padding:20}}><div style={{fontSize:26,marginBottom:4}}>💰</div><div style={{fontSize:22,fontWeight:800,color:"#D4AF37"}}>{P((freshTrack.enrolled||0)*freshTrack.price)}</div><div style={{fontSize:11,color:"var(--text2)"}}>Revenue</div></div>
      <div className="cd" style={{padding:20}}><div style={{fontSize:26,marginBottom:4}}>⭐</div><div style={{fontSize:22,fontWeight:800}}>{freshTrack.rating||"N/A"}</div><div style={{fontSize:11,color:"var(--text2)"}}>Rating</div></div>
      <div className="cd" style={{padding:20}}><div style={{fontSize:26,marginBottom:4}}>🎬</div><div style={{fontSize:22,fontWeight:800}}>{totalLectures}</div><div style={{fontSize:11,color:"var(--text2)"}}>Total Lectures</div></div>
    </div>}

    {/* Add Section Modal */}
    {showAddSec&&<Modal close={()=>setShowAddSec(false)} title="Add Section">
      <label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Section Title</label>
      <input className="inp" value={secTitle} onChange={e=>setSecTitle(e.target.value)} placeholder="e.g. Introduction to Tajweed" style={{marginBottom:12}}/>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button className="bs" onClick={()=>setShowAddSec(false)}>Cancel</button><button className="bp" onClick={()=>{if(!secTitle.trim())return;addSection(freshTrack.id,secTitle.trim());setShowAddSec(false)}} disabled={!secTitle.trim()}>Add Section</button></div>
    </Modal>}

    {/* Add Lecture Modal */}
    {showAddLec&&<Modal close={()=>setShowAddLec(null)} title="Add Lecture">
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Title *</label><input className="inp" value={lecForm.title} onChange={e=>setLecForm({...lecForm,title:e.target.value})} placeholder="e.g. What is Tajweed?"/></div>
        <div style={{display:"flex",gap:8}}>
          <div style={{flex:1}}><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Type</label><select className="inp" value={lecForm.type} onChange={e=>setLecForm({...lecForm,type:e.target.value})}><option value="video">Video</option><option value="quiz">Quiz</option><option value="exercise">Exercise</option><option value="text">Text</option></select></div>
          <div style={{flex:1}}><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Duration</label><input className="inp" value={lecForm.duration} onChange={e=>setLecForm({...lecForm,duration:e.target.value})} placeholder="mm:ss"/></div>
        </div>
        {lecForm.type==="video"&&<div><label style={{fontSize:10,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>Video (upload or URL)</label>
          <label className="bs" style={{width:"100%",justifyContent:"center",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><I.Upload/> Upload Video<input type="file" accept="video/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])toast(`Video "${e.target.files[0].name}" ready for upload`,"info")}}/></label>
        </div>}
        <div style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={lecForm.isPreview} onChange={e=>setLecForm({...lecForm,isPreview:e.target.checked})} id="prevCk"/><label htmlFor="prevCk" style={{fontSize:12}}>Free preview (visible to non-enrolled)</label></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}><button className="bs" onClick={()=>setShowAddLec(null)}>Cancel</button><button className="bp" onClick={()=>{if(!lecForm.title.trim())return;addLecture(freshTrack.id,showAddLec,lecForm);setLecForm({title:"",duration:"00:00",isPreview:false,type:"video"});setShowAddLec(null)}} disabled={!lecForm.title.trim()}>Add Lecture</button></div>
    </Modal>}
  </div>);
}

// ─── JOBS PAGE ───────────────────────────────────────────────────────────────
function JobsPage({t,P,nav,toast,isLoggedIn,setShowAuth,handleBoost,jobs,setJobs}){
  const [showPost,setShowPost]=useState(false);
  const [showApply,setShowApply]=useState(null);
  const [pf,setPf]=useState({title:"",desc:"",budget:"",category:"",urgent:false});
  const [af,setAf]=useState({proposal:"",rate:""});
  const [err,setErr]=useState("");

  // Only show approved jobs to regular users (+ user's own pending posts)
  const visibleJobs=jobs.filter(j=>j.status==="approved"||j.isNew);
  const pendingCount=jobs.filter(j=>j.status==="pending").length;

  const submitPost=()=>{
    if(!pf.title.trim()||!pf.desc.trim()||!pf.budget.trim()){setErr(t("Fill all required fields","املأ جميع الحقول المطلوبة"));return;}
    const j={id:Date.now(),student:"You",title:pf.title.trim(),desc:pf.desc.trim(),budget:pf.budget.trim(),category:pf.category||"tutoring",proposals:0,posted:t("Just now","الآن"),isNew:true,urgent:pf.urgent,status:"pending"};
    setJobs(p=>[j,...p]);setShowPost(false);
    toast("Job submitted for review! Admin will approve it shortly. ⏳","info");
  };

  return(<div style={{maxWidth:860,margin:"0 auto",padding:"24px 24px",animation:"fadeIn 0.4s ease"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div><h1 style={{fontSize:24,fontWeight:700,marginBottom:2}}>{t("Job Requests","طلبات العمل")}</h1><p style={{fontSize:12,color:"var(--text2)"}}>{visibleJobs.filter(j=>j.status==="approved").length} {t("active requests","طلب نشط")}</p></div>
      <div style={{display:"flex",gap:8}}>
        <button className="bp" onClick={()=>nav("admin-jobs")} style={{fontSize:12,padding:"8px 16px",background:"var(--bg2)",color:"var(--text)",border:"1px solid var(--border)"}}><I.Settings/> {t("Review Queue","مراجعة")} {pendingCount>0&&<span style={{background:"#E74C3C",color:"white",padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:700,marginLeft:4}}>{pendingCount}</span>}</button>
        <button className="bp" onClick={()=>{if(!isLoggedIn){setShowAuth(true);return;}setPf({title:"",desc:"",budget:"",category:"",urgent:false});setErr("");setShowPost(true)}} style={{fontSize:12}}><span style={{display:"flex",alignItems:"center",gap:4}}><I.Plus/>{t("Post","أنشئ")}</span></button>
      </div>
    </div>

    {visibleJobs.map((job,i)=><div key={job.id} className="cd lift" style={{padding:20,marginBottom:10,animation:`fadeIn 0.4s ease ${i*0.06}s both`,border:job.isNew&&job.status==="pending"?"1.5px solid #F39C12":job.urgent?"1.5px solid #E67E22":"1px solid var(--border)"}}>
      <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
        {job.isNew&&job.status==="pending"&&<span style={{background:"#F39C12",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>⏳ {t("Pending Approval","قيد المراجعة")}</span>}
        {job.isNew&&job.status==="approved"&&<span style={{background:"var(--accent2)",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>✅ {t("Approved","تمت الموافقة")}</span>}
        {job.isNew&&job.status==="rejected"&&<span style={{background:"#E74C3C",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>❌ {t("Rejected","مرفوض")}</span>}
        {job.urgent&&job.status==="approved"&&<span style={{background:"#E67E22",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>🔔 {t("Urgent","عاجل")}</span>}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:10,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <h3 style={{fontSize:14,fontWeight:600,marginBottom:4}}>{job.title}</h3>
          <p style={{fontSize:11,color:"var(--text2)",lineHeight:1.5,marginBottom:6}}>{job.desc}</p>
          <div style={{display:"flex",gap:8,fontSize:11,color:"var(--text3)",flexWrap:"wrap"}}><span>👤 {job.student}</span><span>💰 {job.budget}</span><span>⏰ {job.posted}</span></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
          <span className="tg" style={{fontSize:10,background:"var(--accent)10",color:"var(--accent)"}}>{job.proposals} {t("proposals","عرض")}</span>
          {!job.isNew&&job.status==="approved"&&<button className="bp" onClick={()=>{if(!isLoggedIn){setShowAuth(true);return;}setAf({proposal:"",rate:""});setShowApply(job)}} style={{fontSize:11,padding:"6px 14px"}}>{t("Apply","تقدم")}</button>}
          {job.isNew&&<button className="bs" onClick={()=>{setJobs(p=>p.filter(j=>j.id!==job.id));toast("Deleted","info")}} style={{fontSize:10,padding:"4px 10px",color:"#E74C3C",borderColor:"#E74C3C30"}}>{t("Delete","حذف")}</button>}
        </div>
      </div>
    </div>)}

    {visibleJobs.length===0&&<div className="cd" style={{padding:44,textAlign:"center",color:"var(--text3)"}}><div style={{fontSize:40,marginBottom:10}}>📋</div><p>{t("No job requests yet. Be the first to post!","لا طلبات بعد.")}</p></div>}

    {showPost&&<Modal close={()=>setShowPost(false)} title={t("Post Job Request","أنشئ طلب عمل")}>
      <div style={{padding:"10px 14px",borderRadius:10,background:"#F39C1210",border:"1px solid #F39C1230",marginBottom:14,fontSize:12,color:"#B7791F",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:16}}>⏳</span>
        <span>{t("Your request will be reviewed by admin before it appears publicly.","سيتم مراجعة طلبك من قبل المسؤول قبل النشر.")}</span>
      </div>
      {err&&<div style={{padding:"7px 12px",borderRadius:9,background:"#C0392B15",color:"#C0392B",fontSize:11,marginBottom:10}}>{err}</div>}
      <label style={{fontSize:10,fontWeight:600,color:"var(--text2)",marginBottom:2,display:"block"}}>{t("Title","العنوان")} *</label>
      <input className="inp" value={pf.title} onChange={e=>{setPf({...pf,title:e.target.value});setErr("")}} placeholder={t("e.g. Need Tajweed teacher","مثال: أحتاج معلم تجويد")} style={{marginBottom:8}}/>
      <label style={{fontSize:10,fontWeight:600,color:"var(--text2)",marginBottom:2,display:"block"}}>{t("Description","الوصف")} *</label>
      <textarea className="inp" rows={3} value={pf.desc} onChange={e=>{setPf({...pf,desc:e.target.value});setErr("")}} placeholder={t("Describe your needs...","اوصف ما تحتاجه...")} style={{marginBottom:8,resize:"vertical"}}/>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <div style={{flex:1}}><label style={{fontSize:10,fontWeight:600,color:"var(--text2)"}}>Budget *</label><input className="inp" value={pf.budget} onChange={e=>{setPf({...pf,budget:e.target.value});setErr("")}} placeholder="$20-30/hr"/></div>
        <div style={{flex:1}}><label style={{fontSize:10,fontWeight:600,color:"var(--text2)"}}>Category</label><select className="inp" value={pf.category} onChange={e=>setPf({...pf,category:e.target.value})}><option value="">Select</option>{CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </div>
      <div onClick={()=>setPf({...pf,urgent:!pf.urgent})} style={{padding:"12px 16px",borderRadius:12,border:pf.urgent?"2px solid #E67E22":"1.5px solid var(--border)",background:pf.urgent?"#E67E2210":"var(--bg2)",cursor:"pointer",marginBottom:14,display:"flex",alignItems:"center",gap:10,transition:"all 0.2s"}}>
        <div style={{width:20,height:20,borderRadius:6,border:pf.urgent?"2px solid #E67E22":"2px solid var(--border)",background:pf.urgent?"#E67E22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0}}>{pf.urgent&&<I.Check/>}</div>
        <div><div style={{fontSize:12,fontWeight:600,color:pf.urgent?"#E67E22":"var(--text)"}}>🔔 {t("Mark as Urgent","تحديد كعاجل")} — {P(PLATFORM.urgentJob)}</div><div style={{fontSize:10,color:"var(--text3)"}}>{t("Notify all teachers immediately","إخطار جميع المعلمين فوراً")}</div></div>
      </div>
      <button className="bp" onClick={submitPost} style={{width:"100%"}}>{t("Submit for Review","أرسل للمراجعة")} {pf.urgent?`(+${P(PLATFORM.urgentJob)})`:""}</button>
    </Modal>}

    {showApply&&<Modal close={()=>setShowApply(null)} title={`${t("Apply","تقدم")}: ${showApply.title}`}>
      <div style={{padding:"9px 12px",borderRadius:9,background:"var(--bg2)",marginBottom:12,fontSize:11,color:"var(--text2)"}}><strong>{showApply.student}</strong> — {showApply.budget}<p style={{marginTop:3}}>{showApply.desc}</p></div>
      <textarea className="inp" rows={4} value={af.proposal} onChange={e=>setAf({...af,proposal:e.target.value})} placeholder={t("Your proposal...","عرضك...")} style={{marginBottom:8,resize:"vertical"}}/>
      <input className="inp" value={af.rate} onChange={e=>setAf({...af,rate:e.target.value})} placeholder={t("Your rate","سعرك")} style={{marginBottom:12}}/>
      <button className="bp" disabled={!af.proposal.trim()} onClick={()=>{setJobs(p=>p.map(j=>j.id===showApply.id?{...j,proposals:j.proposals+1}:j));setShowApply(null);toast("Proposal submitted! ✅")}} style={{width:"100%"}}>{t("Submit","أرسل")}</button>
    </Modal>}
  </div>);
}

// ─── ADMIN JOBS APPROVAL PAGE ────────────────────────────────────────────────
function AdminJobsPage({t,P,nav,toast,jobs,setJobs}){
  const [tab,setTab]=useState("pending");
  const pending=jobs.filter(j=>j.status==="pending");
  const approved=jobs.filter(j=>j.status==="approved");
  const rejected=jobs.filter(j=>j.status==="rejected");
  const current=tab==="pending"?pending:tab==="approved"?approved:rejected;

  const approve=id=>{setJobs(p=>p.map(j=>j.id===id?{...j,status:"approved"}:j));toast("Job approved and now visible to teachers! ✅");};
  const reject=id=>{setJobs(p=>p.map(j=>j.id===id?{...j,status:"rejected"}:j));toast("Job rejected.","info");};
  const revert=id=>{setJobs(p=>p.map(j=>j.id===id?{...j,status:"pending"}:j));toast("Moved back to pending.","info");};
  const remove=id=>{setJobs(p=>p.filter(j=>j.id!==id));toast("Job deleted permanently.","info");};

  return(<div style={{maxWidth:900,margin:"0 auto",padding:"28px 24px",animation:"fadeIn 0.4s ease"}}>
    <button onClick={()=>nav("jobs")} style={{background:"none",border:"none",color:"var(--text2)",fontSize:12,marginBottom:14,cursor:"pointer"}}>← Back to Jobs</button>
    <div style={{marginBottom:22}}>
      <h1 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Job Request Review</h1>
      <p style={{fontSize:13,color:"var(--text2)"}}>Approve or reject job requests before they appear publicly.</p>
    </div>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:22}} className="mg">
      <div className="cd" style={{padding:18,textAlign:"center",cursor:"pointer",border:tab==="pending"?"1.5px solid #F39C12":"1px solid var(--border)"}} onClick={()=>setTab("pending")}>
        <div style={{fontSize:24,fontWeight:800,color:"#F39C12"}}>{pending.length}</div>
        <div style={{fontSize:11,color:"var(--text2)"}}>⏳ Pending</div>
      </div>
      <div className="cd" style={{padding:18,textAlign:"center",cursor:"pointer",border:tab==="approved"?"1.5px solid var(--accent2)":"1px solid var(--border)"}} onClick={()=>setTab("approved")}>
        <div style={{fontSize:24,fontWeight:800,color:"var(--accent2)"}}>{approved.length}</div>
        <div style={{fontSize:11,color:"var(--text2)"}}>✅ Approved</div>
      </div>
      <div className="cd" style={{padding:18,textAlign:"center",cursor:"pointer",border:tab==="rejected"?"1.5px solid #E74C3C":"1px solid var(--border)"}} onClick={()=>setTab("rejected")}>
        <div style={{fontSize:24,fontWeight:800,color:"#E74C3C"}}>{rejected.length}</div>
        <div style={{fontSize:11,color:"var(--text2)"}}>❌ Rejected</div>
      </div>
    </div>

    {/* Job List */}
    {current.length===0&&<div className="cd" style={{padding:40,textAlign:"center",color:"var(--text3)"}}>
      <div style={{fontSize:36,marginBottom:8}}>{tab==="pending"?"⏳":tab==="approved"?"✅":"❌"}</div>
      <p style={{fontSize:13}}>No {tab} jobs.</p>
    </div>}

    {current.map((job,i)=>(
      <div key={job.id} className="cd" style={{padding:20,marginBottom:10,animation:`fadeIn 0.3s ease ${i*0.05}s both`,border:tab==="pending"?"1.5px solid #F39C1240":"1px solid var(--border)"}}>
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          {job.status==="pending"&&<span style={{background:"#F39C12",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>⏳ Pending Review</span>}
          {job.status==="approved"&&<span style={{background:"var(--accent2)",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>✅ Live</span>}
          {job.status==="rejected"&&<span style={{background:"#E74C3C",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>❌ Rejected</span>}
          {job.urgent&&<span style={{background:"#E67E22",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>🔔 Urgent</span>}
        </div>
        <h3 style={{fontSize:15,fontWeight:600,marginBottom:4}}>{job.title}</h3>
        <p style={{fontSize:12,color:"var(--text2)",lineHeight:1.6,marginBottom:8}}>{job.desc}</p>
        <div style={{display:"flex",gap:10,fontSize:11,color:"var(--text3)",marginBottom:12,flexWrap:"wrap"}}>
          <span>👤 {job.student}</span><span>💰 {job.budget}</span><span>⏰ {job.posted}</span>
          <span className="tg" style={{fontSize:10,padding:"1px 7px"}}>{CATEGORIES.find(c=>c.id===job.category)?.name||"General"}</span>
        </div>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {tab==="pending"&&<>
            <button onClick={()=>approve(job.id)} style={{padding:"8px 20px",borderRadius:10,border:"none",background:"var(--accent2)",color:"white",fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>✅ Approve</button>
            <button onClick={()=>reject(job.id)} style={{padding:"8px 20px",borderRadius:10,border:"1.5px solid #E74C3C30",background:"#E74C3C08",color:"#E74C3C",fontWeight:600,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>❌ Reject</button>
          </>}
          {tab==="approved"&&<>
            <button onClick={()=>revert(job.id)} style={{padding:"7px 16px",borderRadius:10,border:"1px solid var(--border)",background:"var(--bg2)",color:"var(--text2)",fontSize:11,cursor:"pointer"}}>↩ Move to Pending</button>
            <button onClick={()=>reject(job.id)} style={{padding:"7px 16px",borderRadius:10,border:"1px solid #E74C3C30",background:"#E74C3C08",color:"#E74C3C",fontSize:11,cursor:"pointer"}}>❌ Reject</button>
          </>}
          {tab==="rejected"&&<>
            <button onClick={()=>approve(job.id)} style={{padding:"7px 16px",borderRadius:10,border:"none",background:"var(--accent2)",color:"white",fontSize:11,cursor:"pointer"}}>✅ Approve</button>
            <button onClick={()=>remove(job.id)} style={{padding:"7px 16px",borderRadius:10,border:"1px solid #E74C3C30",background:"#E74C3C08",color:"#E74C3C",fontSize:11,cursor:"pointer"}}>🗑 Delete Permanently</button>
          </>}
        </div>
      </div>
    ))}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICING PAGE — All monetization in one place
// ═══════════════════════════════════════════════════════════════════════════════
function PricingPage({t,P,isPro,handleProSubscribe,handleBoost,isLoggedIn,setShowAuth}){
  return(<div style={{maxWidth:960,margin:"0 auto",padding:"28px 24px",animation:"fadeIn 0.4s ease"}}>
    <div style={{textAlign:"center",marginBottom:32}}>
      <h1 style={{fontSize:28,fontWeight:700,marginBottom:6}}>{t("How AT-TIBYAN Works","كيف يعمل التبيان")}</h1>
      <p style={{fontSize:14,color:"var(--text2)",maxWidth:500,margin:"0 auto"}}>{t("Transparent pricing. Every transaction supports the platform and the Barakah Fund.","أسعار شفافة. كل معاملة تدعم المنصة وصندوق البركة.")}</p>
    </div>

    {/* Fee Structure */}
    <div className="cd" style={{padding:28,marginBottom:20}}>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:16}}>💰 {t("Transaction Fees","رسوم المعاملات")}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}} className="mg">
        {[
          {icon:"📋",label:t("Platform Fee","رسوم المنصة"),value:`${PLATFORM.feePercent}%`,desc:t("On every transaction","على كل معاملة"),note:t("0% for Pro members","0% لأعضاء برو")},
          {icon:"🤲",label:t("Barakah Fund","صندوق البركة"),value:`${PLATFORM.barakahFundPercent}%`,desc:t("Auto-contributed","يساهم تلقائياً"),note:t("Funds free education","يموّل التعليم المجاني")},
          {icon:"☕",label:t("Tips","البقاشيش"),value:"5%",desc:t("On voluntary tips","على البقاشيش الطوعية"),note:t("95% goes to teacher","95% للمعلم")},
        ].map((item,i)=><div key={i} style={{padding:18,borderRadius:14,background:"var(--bg2)",border:"1px solid var(--border)"}}>
          <div style={{fontSize:28,marginBottom:8}}>{item.icon}</div>
          <div style={{fontWeight:700,fontSize:20,color:"var(--accent)",marginBottom:2}}>{item.value}</div>
          <div style={{fontWeight:600,fontSize:13,marginBottom:4}}>{item.label}</div>
          <div style={{fontSize:11,color:"var(--text3)",marginBottom:4}}>{item.desc}</div>
          <div style={{fontSize:10,color:"var(--accent2)",fontWeight:500}}>{item.note}</div>
        </div>)}
      </div>
    </div>

    {/* Pro Plans */}
    <div style={{marginBottom:20}}>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:16}}>👑 {t("AT-TIBYAN Pro","التبيان برو")}</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}} className="mg">
        {[
          {plan:"monthly",label:t("Monthly","شهري"),price:PLATFORM.proMonthly,period:t("/month","شهرياً")},
          {plan:"yearly",label:t("Yearly","سنوي"),price:PLATFORM.proYearly,period:t("/year","سنوياً"),save:t("Save 33%","وفّر 33%")},
        ].map(p=><div key={p.plan} className="cd" style={{padding:24,position:"relative",border:isPro?"2px solid #D4AF37":"1px solid var(--border)"}}>
          {p.save&&<div style={{position:"absolute",top:12,right:12,background:"#27AE60",color:"white",padding:"2px 8px",borderRadius:8,fontSize:10,fontWeight:600}}>{p.save}</div>}
          <div style={{fontSize:13,fontWeight:600,color:"var(--text2)",marginBottom:4}}>{p.label}</div>
          <div style={{fontSize:28,fontWeight:700,color:"var(--accent)",marginBottom:4}}>{P(p.price)}</div>
          <div style={{fontSize:11,color:"var(--text3)",marginBottom:16}}>{p.period}</div>
          {["0% platform fees on all orders","Priority in search results","Verified Pro badge 👑","Featured profile placement","Early access to new features","Detailed analytics dashboard"].map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 0",fontSize:12,color:"var(--text2)"}}><span style={{color:"var(--accent2)"}}><I.Check/></span>{f}</div>)}
          <button className="bp" disabled={isPro} onClick={()=>{if(!isLoggedIn){setShowAuth(true);return;}handleProSubscribe(p.plan)}} style={{width:"100%",marginTop:16}}>{isPro?`✅ ${t("Active","مفعّل")}`:t("Subscribe","اشترك")}</button>
        </div>)}
      </div>
    </div>

    {/* Paid Features */}
    <div className="cd" style={{padding:28}}>
      <h2 style={{fontSize:18,fontWeight:700,marginBottom:16}}>✨ {t("Premium Features","ميزات مدفوعة")}</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}} className="mg">
        {[
          {icon:"⭐",label:t("Feature Gig","خدمة مميزة"),price:PLATFORM.featuredGig,desc:t("7 days highlighted placement","7 أيام في المقدمة"),type:"featured"},
          {icon:"⚡",label:t("Boost Gig","تعزيز الخدمة"),price:PLATFORM.boostGig,desc:t("3 days extra visibility","3 أيام ظهور إضافي"),type:"boost"},
          {icon:"🔔",label:t("Urgent Job Post","طلب عاجل"),price:PLATFORM.urgentJob,desc:t("Notify all teachers","إخطار جميع المعلمين"),type:"urgent_job"},
          {icon:"✓",label:t("Verification Badge","شارة التحقق"),price:PLATFORM.verifyBadge,desc:t("One-time credential verify","تحقق لمرة واحدة"),type:"verify_badge"},
          {icon:"📜",label:t("Certification Exam","امتحان الشهادة"),price:PLATFORM.certExam,desc:t("Test & earn a certificate","اختبر واحصل على شهادة"),type:"cert_exam"},
        ].map((f,i)=><div key={i} className="cd lift" style={{padding:18,cursor:"pointer",textAlign:"center"}} onClick={()=>{if(!isLoggedIn){setShowAuth(true);return;}handleBoost(f.type,f.price)}}>
          <div style={{fontSize:28,marginBottom:6}}>{f.icon}</div>
          <div style={{fontWeight:600,fontSize:13,marginBottom:2}}>{f.label}</div>
          <div style={{fontSize:18,fontWeight:700,color:"var(--accent)",marginBottom:4}}>{P(f.price)}</div>
          <div style={{fontSize:11,color:"var(--text3)"}}>{f.desc}</div>
        </div>)}
      </div>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardPage({t,P,nav,isLoggedIn,setShowAuth,user,setUser,profilePic,setProfilePic,orders,bookings,cur,handleLogout,toast,favorites,toggleFav,isPro,setShowProModal,revenue}){
  const [tab,setTab]=useState("overview");
  const [form,setForm]=useState({name:user?.name||"",bio:user?.bio||"",specialty:user?.specialty||""});
  const fileRef=useRef();

  if(!isLoggedIn)return(<div style={{maxWidth:420,margin:"70px auto",textAlign:"center",padding:24}}><div style={{fontSize:40,marginBottom:12}}>🔒</div><h2 style={{fontSize:18,fontWeight:700,marginBottom:5}}>{t("Login Required","يجب تسجيل الدخول")}</h2><button className="bp" onClick={()=>setShowAuth(true)} style={{marginTop:14}}>{t("Sign In","سجّل")}</button></div>);

  const handlePic=e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>5*1024*1024){toast("Max 5MB","error");return;}const r=new FileReader();r.onload=ev=>{setProfilePic(ev.target.result);toast("Photo updated! 📸")};r.readAsDataURL(f);};
  const savePro=()=>{setUser(p=>({...p,...form}));toast("Profile saved! ✅")};
  const favGigs=GIGS.filter(g=>favorites.includes(g.id));
  const totalSpent=orders.reduce((s,o)=>s+(o.total||0),0);

  const stats=[
    {label:t("Active","نشطة"),value:orders.filter(o=>o.status==="active").length,icon:"📋",color:"var(--accent)"},
    {label:t("Bookings","حجوزات"),value:bookings.length,icon:"📅",color:"var(--accent2)"},
    {label:t("Total Spent","المنفق"),value:P(totalSpent),icon:"💰",color:"var(--accent)"},
    {label:t("Favorites","المفضلة"),value:favGigs.length,icon:"❤️",color:"#E74C3C"},
  ];

  return(<div style={{maxWidth:1060,margin:"0 auto",padding:"24px 24px",animation:"fadeIn 0.4s ease"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{position:"relative"}}>
          <div style={{width:54,height:54,borderRadius:18,background:profilePic?`url(${profilePic}) center/cover`:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:22,overflow:"hidden",border:isPro?"2.5px solid #D4AF37":"none"}}>{!profilePic&&<I.User/>}</div>
          <button onClick={()=>fileRef.current?.click()} style={{position:"absolute",bottom:-2,right:-2,width:22,height:22,borderRadius:7,background:"var(--accent)",border:"2px solid var(--card)",display:"flex",alignItems:"center",justifyContent:"center",color:"white"}}><I.Camera/></button>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePic}/>
        </div>
        <div><div style={{display:"flex",alignItems:"center",gap:6}}><h1 style={{fontSize:20,fontWeight:700}}>{user?.name||"Welcome!"}</h1>{isPro&&<span className="pro-badge">👑 PRO</span>}</div><p style={{fontSize:11,color:"var(--text2)"}}>{user?.role==="teacher"?t("Teacher","معلم"):t("Student","طالب")} • {user?.email}</p></div>
      </div>
      <div style={{display:"flex",gap:6}}>
        {!isPro&&<button className="bs" onClick={()=>setShowProModal(true)} style={{fontSize:11,padding:"6px 12px",color:"var(--accent)",borderColor:"var(--accent)"}}>👑 {t("Go Pro","برو")}</button>}
        <button className="bs" onClick={handleLogout} style={{fontSize:11,padding:"6px 12px",color:"#E74C3C",borderColor:"#E74C3C30"}}><span style={{display:"flex",alignItems:"center",gap:3}}><I.LogOut/>{t("Logout","خروج")}</span></button>
      </div>
    </div>

    <div style={{display:"flex",gap:3,overflowX:"auto",marginBottom:20,borderBottom:"1px solid var(--border)"}}>
      {["overview","orders","bookings","favorites","profile"].map(tb=><button key={tb} onClick={()=>setTab(tb)} style={{padding:"8px 16px",border:"none",background:"none",fontSize:12,fontWeight:tab===tb?600:400,color:tab===tb?"var(--accent)":"var(--text3)",borderBottom:tab===tb?"2px solid var(--accent)":"2px solid transparent",cursor:"pointer",whiteSpace:"nowrap"}}>{tb.charAt(0).toUpperCase()+tb.slice(1)}</button>)}
    </div>

    {tab==="overview"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12,marginBottom:24}} className="mg">
        {stats.map((s,i)=><div key={i} className="cd" style={{padding:20}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}><span style={{fontSize:24}}>{s.icon}</span><span style={{fontSize:22,fontWeight:700,color:s.color}}>{s.value}</span></div><div style={{fontSize:11,color:"var(--text2)"}}>{s.label}</div></div>)}
      </div>
      {isPro&&<div style={{padding:"12px 18px",borderRadius:12,background:"linear-gradient(135deg,#8B691420,#C9A94E10)",border:"1px solid #D4AF37",marginBottom:16,fontSize:12,color:"var(--accent)",fontWeight:500}}>👑 {t("Pro Member — You save ","عضو برو — وفّرت ")}{P(totalSpent*PLATFORM.feePercent/100)} {t("in platform fees!","في رسوم المنصة!")}</div>}
      <div className="cd" style={{padding:20}}>
        <h3 style={{fontSize:14,fontWeight:600,marginBottom:12}}>{t("Recent","الأخير")}</h3>
        {orders.length===0&&bookings.length===0?<p style={{fontSize:12,color:"var(--text3)",padding:16,textAlign:"center"}}>{t("No activity yet.","لا نشاط بعد.")}</p>:
        [...orders.slice(-3).reverse(),...bookings.slice(-2).reverse()].map((item,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid var(--border)"}}><span style={{fontSize:16}}>{item.gig?"📋":"📅"}</span><div style={{flex:1,fontSize:11,fontWeight:500}}>{item.gig?item.gig.title.slice(0,40)+"...":item.teacher?.name}</div><span style={{fontSize:11,fontWeight:600,color:"var(--accent)"}}>{item.total?P(item.total):""}</span></div>)}
      </div>
    </div>}

    {tab==="orders"&&<div>{orders.length===0?<div style={{textAlign:"center",padding:36,color:"var(--text3)"}}><p>No orders yet</p><button className="bp" onClick={()=>nav("explore")} style={{marginTop:12,fontSize:12}}>{t("Browse","تصفح")}</button></div>:
      orders.map((o,i)=><div key={i} className="cd" style={{padding:18,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
          <div><h4 style={{fontSize:13,fontWeight:600,marginBottom:2}}>{o.gig?.title}</h4><p style={{fontSize:10,color:"var(--text3)"}}>{o.tier} • {o.date}</p></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"var(--accent)"}}>{P(o.total)}</div>{o.fee>0&&<div style={{fontSize:9,color:"var(--text3)"}}>{t("incl. fee","شامل الرسوم")} {P(o.fee)}</div>}<span style={{fontSize:10,padding:"2px 7px",borderRadius:7,background:"#2D6A4F20",color:"#2D6A4F",fontWeight:600}}>{o.status}</span></div>
        </div>
      </div>)}</div>}

    {tab==="bookings"&&<div>{bookings.length===0?<div style={{textAlign:"center",padding:36,color:"var(--text3)"}}>No bookings yet</div>:
      bookings.map((b,i)=><div key={i} className="cd" style={{padding:16,marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:40,height:40,borderRadius:12,background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{b.teacher?.avatar}</div>
        <div style={{flex:1}}><h4 style={{fontSize:13,fontWeight:600}}>{b.teacher?.name}</h4><p style={{fontSize:11,color:"var(--text3)"}}>{b.day} at {b.slot}</p></div>
        <span style={{fontSize:10,padding:"2px 7px",borderRadius:7,background:"#2D6A4F20",color:"#2D6A4F",fontWeight:600}}>✅ {b.status}</span>
      </div>)}</div>}

    {tab==="favorites"&&<div>{favGigs.length===0?<div style={{textAlign:"center",padding:36,color:"var(--text3)"}}>No favorites</div>:
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:13}} className="mg">{favGigs.map((g,i)=><GigCard key={g.id} gig={g} t={t} P={P} i={i} onClick={()=>nav("gig",g)} toggleFav={toggleFav} isFav={true}/>)}</div>}</div>}

    {tab==="profile"&&<div className="cd" style={{padding:24,maxWidth:520}}>
      <h3 style={{fontSize:16,fontWeight:600,marginBottom:16}}>{t("Edit Profile","تعديل الملف")}</h3>
      <div style={{textAlign:"center",marginBottom:16}}><div style={{position:"relative",display:"inline-block"}}><div style={{width:72,height:72,borderRadius:22,background:profilePic?`url(${profilePic}) center/cover`:"linear-gradient(135deg,var(--accent),var(--accent2))",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:28,overflow:"hidden"}}>{!profilePic&&<I.User/>}</div><button onClick={()=>fileRef.current?.click()} style={{position:"absolute",bottom:-2,right:-2,width:26,height:26,borderRadius:9,background:"var(--accent)",border:"2px solid var(--card)",display:"flex",alignItems:"center",justifyContent:"center",color:"white"}}><I.Camera/></button></div></div>
      <label style={{fontSize:10,fontWeight:600,color:"var(--text2)",marginBottom:2,display:"block"}}>Name</label>
      <input className="inp" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{marginBottom:10}}/>
      <label style={{fontSize:10,fontWeight:600,color:"var(--text2)",marginBottom:2,display:"block"}}>Bio</label>
      <textarea className="inp" rows={3} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})} style={{marginBottom:10,resize:"vertical"}}/>
      <label style={{fontSize:10,fontWeight:600,color:"var(--text2)",marginBottom:2,display:"block"}}>Specialization</label>
      <input className="inp" value={form.specialty} onChange={e=>setForm({...form,specialty:e.target.value})} placeholder="e.g. Tajweed, Nahwu" style={{marginBottom:14}}/>
      <button className="bp" onClick={savePro} style={{width:"100%"}}>{t("Save","حفظ")}</button>
    </div>}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODALS: Auth, Chat, Booking, Payment, Pro, Tip, Currency
// ═══════════════════════════════════════════════════════════════════════════════
function AuthModal({t,authMode,setAuthMode,setShowAuth,setIsLoggedIn,setUser,setProfilePic,toast}){
  const [step,setStep]=useState(1); // 1=role, 2=account, 3=profile (register only)
  const [role,setRole]=useState(null);
  const [avatarPreview,setAvatarPreview]=useState(null);
  const [avatarFile,setAvatarFile]=useState(null);
  const fileRef=useRef(null);
  const [agreed,setAgreed]=useState(false);
  const [f,setF]=useState({name:"",email:"",password:"",confirm:"",phone:"",location:"",bio:"",specialty:""});
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState("");

  const LOCATIONS=["Lagos, Nigeria","Cairo, Egypt","Madinah, KSA","Riyadh, KSA","Istanbul, Turkey","London, UK","Kuala Lumpur, Malaysia","Amman, Jordan","Dubai, UAE","Karachi, Pakistan","Jakarta, Indonesia","Dhaka, Bangladesh","Casablanca, Morocco","Nairobi, Kenya","New York, USA","Toronto, Canada","Paris, France","Berlin, Germany","Sydney, Australia","Other"];

  const handleAvatar=e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    if(file.size>5*1024*1024){setErr("Image must be under 5MB");return;}
    if(!file.type.startsWith("image/")){setErr("Please select an image file");return;}
    setAvatarFile(file);
    const reader=new FileReader();
    reader.onload=ev=>setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
    setErr("");
  };

  // Step 1 validation (role selection — register only)
  const goStep2=()=>{
    if(!role){setErr(t("Please select your role","اختر دورك"));return;}
    setErr("");setStep(2);
  };

  // Step 2 validation (account details)
  const goStep3=()=>{
    setErr("");
    if(!f.name.trim()){setErr(t("Full name is required","الاسم الكامل مطلوب"));return;}
    if(f.name.trim().split(" ").length<2){setErr(t("Please enter your full name (first & last)","أدخل اسمك الكامل (الأول والأخير)"));return;}
    if(!f.email.trim()){setErr(t("Email is required","البريد الإلكتروني مطلوب"));return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)){setErr(t("Please enter a valid email","أدخل بريداً إلكترونياً صالحاً"));return;}
    if(!f.password){setErr(t("Password is required","كلمة المرور مطلوبة"));return;}
    if(f.password.length<8){setErr(t("Password must be at least 8 characters","كلمة المرور 8 أحرف على الأقل"));return;}
    if(f.password!==f.confirm){setErr(t("Passwords don't match","كلمات المرور غير متطابقة"));return;}
    setErr("");setStep(3);
  };

  // Final submit (register)
  const submitRegister=()=>{
    setErr("");
    if(!f.location){setErr(t("Please select your location","اختر موقعك"));return;}
    if(!agreed){setErr(t("You must agree to the terms","يجب الموافقة على الشروط"));return;}
    setLoading(true);
    // Simulate Supabase auth + profile creation
    setTimeout(()=>{
      const newUser={id:Date.now(),name:f.name.trim(),email:f.email.trim(),role,bio:f.bio,specialty:f.specialty,phone:f.phone,location:f.location,avatar:avatarPreview};
      setIsLoggedIn(true);
      setUser(newUser);
      if(avatarPreview)setProfilePic(avatarPreview);
      setShowAuth(false);
      setLoading(false);
      toast(`Welcome to AT-TIBYAN, ${f.name.split(" ")[0]}! 🎉 Account created as ${role}.`);
    },900);
  };

  // Login submit
  const submitLogin=()=>{
    setErr("");
    if(!f.email.trim()){setErr(t("Email is required","البريد مطلوب"));return;}
    if(!f.password){setErr(t("Password is required","كلمة المرور مطلوبة"));return;}
    setLoading(true);
    setTimeout(()=>{
      setIsLoggedIn(true);
      setUser({id:Date.now(),name:f.email.split("@")[0],email:f.email,role:"student",bio:"",specialty:"",phone:"",location:""});
      setShowAuth(false);
      setLoading(false);
      toast("Welcome back! 🌟");
    },700);
  };

  const totalSteps=3;
  const isRegister=authMode==="register";

  return(<Modal close={()=>setShowAuth(false)} title={isRegister?step===1?t("Join AT-TIBYAN","انضم للتبيان"):step===2?t("Create Account","إنشاء حساب"):t("Complete Profile","أكمل ملفك"):t("Welcome Back","مرحباً بعودتك")} wide={isRegister&&step===3}>

    {/* ─── LOGIN FORM ─── */}
    {!isRegister&&<div>
      {err&&<div style={{padding:"8px 12px",borderRadius:10,background:"#C0392B12",color:"#C0392B",fontSize:12,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>❌ {err}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div><label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Email Address","البريد الإلكتروني")} *</label><input className="inp" placeholder="you@example.com" type="email" value={f.email} onChange={e=>setF({...f,email:e.target.value})}/></div>
        <div><label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Password","كلمة المرور")} *</label><input className="inp" placeholder="••••••••" type="password" value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></div>
      </div>
      <button className="bp" onClick={submitLogin} disabled={loading} style={{width:"100%",marginTop:16,padding:13}}>
        {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",animation:"spin 0.6s linear infinite",display:"inline-block"}}/>{t("Signing in...","جارٍ تسجيل الدخول...")}</span>:t("Sign In","تسجيل الدخول")}
      </button>
      <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"var(--text3)"}}>{t("Don't have an account?","ليس لديك حساب؟")} <span onClick={()=>{setAuthMode("register");setStep(1);setErr("")}} style={{color:"var(--accent)",cursor:"pointer",fontWeight:600}}>{t("Sign Up","سجّل")}</span></div>
    </div>}

    {/* ─── REGISTER STEP 1: Role Selection ─── */}
    {isRegister&&step===1&&<div>
      <p style={{fontSize:13,color:"var(--text2)",marginBottom:14}}>{t("What best describes you?","ما الذي يصفك أفضل؟")}</p>
      {err&&<div style={{padding:"8px 12px",borderRadius:10,background:"#C0392B12",color:"#C0392B",fontSize:12,marginBottom:10}}>❌ {err}</div>}
      <div style={{display:"flex",gap:10,marginBottom:18}}>
        {[
          {k:"student",ic:"📖",l:t("Student / Learner","طالب علم"),d:t("I want to learn Quran, Arabic, or Islamic studies","أريد تعلم القرآن والعربية والعلوم الإسلامية")},
          {k:"teacher",ic:"👨‍🏫",l:t("Teacher / Scholar","معلم / عالم"),d:t("I want to teach and offer my knowledge","أريد التعليم وتقديم علمي")}
        ].map(r=><div key={r.k} className="cd" onClick={()=>{setRole(r.k);setErr("")}} style={{flex:1,padding:18,cursor:"pointer",textAlign:"center",border:role===r.k?"2px solid var(--accent)":"1px solid var(--border)",transition:"all 0.2s",borderRadius:16}}>
          <div style={{fontSize:32,marginBottom:8}}>{r.ic}</div>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{r.l}</div>
          <div style={{fontSize:11,color:"var(--text3)",lineHeight:1.4}}>{r.d}</div>
          {role===r.k&&<div style={{marginTop:8,color:"var(--accent)",fontSize:18}}>✓</div>}
        </div>)}
      </div>
      <button className="bp" onClick={goStep2} style={{width:"100%",padding:13}}>{t("Continue","متابعة")} →</button>
      <div style={{textAlign:"center",marginTop:14,fontSize:12,color:"var(--text3)"}}>{t("Already have an account?","لديك حساب؟")} <span onClick={()=>{setAuthMode("login");setErr("")}} style={{color:"var(--accent)",cursor:"pointer",fontWeight:600}}>{t("Sign In","سجّل الدخول")}</span></div>
    </div>}

    {/* ─── REGISTER STEP 2: Account Details ─── */}
    {isRegister&&step===2&&<div>
      {/* Step indicator */}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:18}}>
        {[1,2,3].map(s=><Fragment key={s}><div style={{width:28,height:28,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:s<=step?"var(--accent)":"var(--bg3)",color:s<=step?"white":"var(--text3)",transition:"all 0.3s"}}>{s<step?"✓":s}</div>{s<3&&<div style={{flex:1,height:2,background:s<step?"var(--accent)":"var(--bg3)",borderRadius:1,transition:"all 0.3s"}}/>}</Fragment>)}
      </div>
      {err&&<div style={{padding:"8px 12px",borderRadius:10,background:"#C0392B12",color:"#C0392B",fontSize:12,marginBottom:10}}>❌ {err}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <div><label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Full Name","الاسم الكامل")} *</label><input className="inp" placeholder={t("e.g. Ahmad Abdullah","مثال: أحمد عبدالله")} value={f.name} onChange={e=>{setF({...f,name:e.target.value});setErr("")}}/></div>
        <div><label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Email Address","البريد الإلكتروني")} *</label><input className="inp" placeholder="you@example.com" type="email" value={f.email} onChange={e=>{setF({...f,email:e.target.value});setErr("")}}/></div>
        <div><label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Phone Number","رقم الهاتف")}</label><input className="inp" placeholder="+234 801 234 5678" type="tel" value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/></div>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:1}}><label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Password","كلمة المرور")} *</label><input className="inp" placeholder="Min 8 characters" type="password" value={f.password} onChange={e=>{setF({...f,password:e.target.value});setErr("")}}/></div>
          <div style={{flex:1}}><label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Confirm","تأكيد")} *</label><input className="inp" placeholder="Re-enter password" type="password" value={f.confirm} onChange={e=>{setF({...f,confirm:e.target.value});setErr("")}}/></div>
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:16}}>
        <button className="bs" onClick={()=>setStep(1)} style={{flex:1}}>← {t("Back","رجوع")}</button>
        <button className="bp" onClick={goStep3} style={{flex:2}}>{t("Continue","متابعة")} →</button>
      </div>
    </div>}

    {/* ─── REGISTER STEP 3: Profile Completion ─── */}
    {isRegister&&step===3&&<div>
      {/* Step indicator */}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:18}}>
        {[1,2,3].map(s=><Fragment key={s}><div style={{width:28,height:28,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:s<=step?"var(--accent)":"var(--bg3)",color:s<=step?"white":"var(--text3)",transition:"all 0.3s"}}>{s<step?"✓":s}</div>{s<3&&<div style={{flex:1,height:2,background:s<step?"var(--accent)":"var(--bg3)",borderRadius:1,transition:"all 0.3s"}}/>}</Fragment>)}
      </div>
      {err&&<div style={{padding:"8px 12px",borderRadius:10,background:"#C0392B12",color:"#C0392B",fontSize:12,marginBottom:10}}>❌ {err}</div>}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}} className="mg">
        {/* Avatar Upload */}
        <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:16}}>
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:80,height:80,borderRadius:24,background:avatarPreview?`url(${avatarPreview}) center/cover`:"linear-gradient(135deg,var(--accent)20,var(--accent2)20)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,overflow:"hidden",border:"2px dashed var(--border)"}}>
              {!avatarPreview&&<I.Camera/>}
            </div>
            <button onClick={()=>fileRef.current?.click()} style={{position:"absolute",bottom:-4,right:-4,width:28,height:28,borderRadius:10,background:"var(--accent)",border:"2.5px solid var(--card)",display:"flex",alignItems:"center",justifyContent:"center",color:"white",cursor:"pointer",fontSize:12}}>
              <I.Camera/>
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{display:"none"}} onChange={handleAvatar}/>
          </div>
          <div>
            <div style={{fontWeight:600,fontSize:14,marginBottom:2}}>{t("Profile Photo","صورة الملف")}</div>
            <div style={{fontSize:11,color:"var(--text3)",lineHeight:1.4}}>{t("Upload a clear photo of yourself. JPG, PNG or WebP. Max 5MB.","ارفع صورة واضحة. JPG أو PNG أو WebP. أقصى 5 ميجا.")}</div>
            {avatarPreview&&<div style={{fontSize:11,color:"var(--accent2)",fontWeight:600,marginTop:4}}>✅ {t("Photo uploaded","تم رفع الصورة")}</div>}
          </div>
        </div>

        {/* Location */}
        <div style={{gridColumn:"1/-1"}}>
          <label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Location","الموقع")} * </label>
          <select className="inp" value={f.location} onChange={e=>{setF({...f,location:e.target.value});setErr("")}}>
            <option value="">{t("Select your city / country","اختر مدينتك / بلدك")}</option>
            {LOCATIONS.map(loc=><option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>

        {/* Bio */}
        <div style={{gridColumn:"1/-1"}}>
          <label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Bio","نبذة عنك")} {role==="teacher"&&"*"}</label>
          <textarea className="inp" rows={2} value={f.bio} onChange={e=>setF({...f,bio:e.target.value})} placeholder={role==="teacher"?t("Tell students about your qualifications, experience, and teaching style...","أخبر الطلاب عن مؤهلاتك وخبرتك وأسلوبك في التدريس..."):t("Tell us about yourself (optional)","أخبرنا عن نفسك (اختياري)")} style={{resize:"vertical"}}/>
        </div>

        {/* Specialty (teachers) */}
        {role==="teacher"&&<div style={{gridColumn:"1/-1"}}>
          <label style={{fontSize:11,fontWeight:600,color:"var(--text2)",display:"block",marginBottom:3}}>{t("Specialization","التخصص")}</label>
          <input className="inp" value={f.specialty} onChange={e=>setF({...f,specialty:e.target.value})} placeholder={t("e.g. Tajweed, Nahwu, Fiqh, Aqeedah","مثال: تجويد، نحو، فقه، عقيدة")}/>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:6}}>
            {["Tajweed","Nahwu","Sarf","Fiqh","Aqeedah","Tafseer","Hifz","Arabic","Balagha","Translation"].map(tag=>
              <button key={tag} onClick={()=>{const cur=f.specialty;const has=cur.includes(tag);setF({...f,specialty:has?cur.replace(tag,"").replace(/,\s*,/,", ").replace(/^,\s*|,\s*$/g,"").trim():(cur?cur+", ":"")+tag})}}
                className="tg" style={{fontSize:10,padding:"3px 9px",background:f.specialty.includes(tag)?"var(--accent)":"var(--bg2)",color:f.specialty.includes(tag)?"white":"var(--text2)",borderColor:f.specialty.includes(tag)?"var(--accent)":"var(--border)"}}>{tag}</button>
            )}
          </div>
        </div>}

        {/* Terms Agreement */}
        <div style={{gridColumn:"1/-1",padding:"14px 16px",borderRadius:12,background:"var(--bg2)",border:"1px solid var(--border)"}}>
          <div onClick={()=>{setAgreed(!agreed);setErr("")}} style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
            <div style={{width:22,height:22,borderRadius:7,border:agreed?"2px solid var(--accent2)":"2px solid var(--border)",background:agreed?"var(--accent2)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"white",flexShrink:0,marginTop:1,transition:"all 0.2s"}}>
              {agreed&&<I.Check/>}
            </div>
            <div style={{fontSize:12,color:"var(--text2)",lineHeight:1.5}}>
              {t("I agree to AT-TIBYAN's ","أوافق على ")}
              <span style={{color:"var(--accent)",fontWeight:600,cursor:"pointer"}}>{t("Terms of Service","شروط الخدمة")}</span>
              {t(" and ","و")}
              <span style={{color:"var(--accent)",fontWeight:600,cursor:"pointer"}}>{t("Privacy Policy","سياسة الخصوصية")}</span>
              {t(". I understand that my profile information will be visible to other users.","، وأفهم أن معلومات ملفي ستكون مرئية للمستخدمين الآخرين.")}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:8,marginTop:16}}>
        <button className="bs" onClick={()=>setStep(2)} style={{flex:1}}>← {t("Back","رجوع")}</button>
        <button className="bp" onClick={submitRegister} disabled={loading} style={{flex:2}}>
          {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",animation:"spin 0.6s linear infinite",display:"inline-block"}}/>{t("Creating account...","جارٍ إنشاء الحساب...")}</span>:t("Create Account","إنشاء حساب")}
        </button>
      </div>
      <div style={{textAlign:"center",marginTop:12,fontSize:11,color:"var(--text3)"}}>{t("Already have an account?","لديك حساب؟")} <span onClick={()=>{setAuthMode("login");setErr("")}} style={{color:"var(--accent)",cursor:"pointer",fontWeight:600}}>{t("Sign In","سجّل الدخول")}</span></div>
    </div>}
  </Modal>);
}

function ChatDrawer({t,setShowChat,target,toast,openTip}){
  const [msgs,setMsgs]=useState([{from:"teacher",text:t("Assalamu Alaikum! How can I help?","السلام عليكم! كيف أساعدك؟"),time:"10:30"}]);
  const [newMsg,setNewMsg]=useState("");
  const [rec,setRec]=useState(false);
  const endRef=useRef();
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[msgs]);
  const send=()=>{if(!newMsg.trim())return;const time=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});setMsgs(p=>[...p,{from:"student",text:newMsg,time}]);setNewMsg("");setTimeout(()=>{setMsgs(p=>[...p,{from:"teacher",text:t("JazakAllahu khairan! Let me help you insha'Allah.","جزاك الله خيراً! دعني أساعدك إن شاء الله."),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}])},1200);};
  return(<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",justifyContent:"flex-end"}} onClick={()=>setShowChat(false)}>
    <div style={{width:380,maxWidth:"100vw",height:"100%",background:"var(--card)",borderLeft:"1px solid var(--border)",display:"flex",flexDirection:"column",animation:"slideDown 0.3s ease"}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:34,height:34,borderRadius:10,background:"var(--bg2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{target?.avatar||"👳"}</div><div><div style={{fontWeight:600,fontSize:12}}>{target?.name||"Teacher"}</div><div style={{fontSize:9,color:"#27AE60"}}>● Online</div></div></div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>openTip(target)} style={{background:"none",border:"1px solid var(--border)",borderRadius:8,padding:"4px 10px",fontSize:10,color:"var(--text2)",cursor:"pointer"}}>☕ Tip</button>
          <button onClick={()=>setShowChat(false)} style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer"}}><I.X/></button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:8}}>
        {msgs.map((m,i)=><div key={i} style={{alignSelf:m.from==="student"?"flex-end":"flex-start",maxWidth:"78%"}}><div style={{padding:"8px 12px",borderRadius:m.from==="student"?"12px 12px 3px 12px":"12px 12px 12px 3px",background:m.from==="student"?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--bg2)",color:m.from==="student"?"white":"var(--text)",fontSize:12,lineHeight:1.5}}>{m.text}</div><div style={{fontSize:9,color:"var(--text3)",marginTop:2,textAlign:m.from==="student"?"right":"left"}}>{m.time}</div></div>)}
        <div ref={endRef}/>
      </div>
      <div style={{padding:"8px 12px",borderTop:"1px solid var(--border)",display:"flex",gap:6,alignItems:"center"}}>
        <button onClick={()=>{if(rec){setRec(false);setMsgs(p=>[...p,{from:"student",text:"🎤 Voice (0:05)",time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}]);toast("Voice sent 🎤");}else{setRec(true);toast("Recording...","info")}}} style={{width:34,height:34,borderRadius:10,border:"1px solid var(--border)",background:rec?"#E74C3C":"var(--bg2)",color:rec?"white":"var(--text2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,animation:rec?"pulse 1s infinite":"none"}}><I.Mic/></button>
        <input className="inp" value={newMsg} onChange={e=>setNewMsg(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder={t("Message...","رسالة...")} style={{borderRadius:10,padding:"8px 12px"}}/>
        <button onClick={send} style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,var(--accent),var(--accent2))",color:"white",border:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I.Send/></button>
      </div>
    </div>
  </div>);
}

function BookingModal({t,P,setShowBooking,teacher,confirmBooking,cur}){
  const [day,setDay]=useState(null);const [slot,setSlot]=useState(null);
  const days=Array(7).fill(0).map((_,i)=>{const d=new Date();d.setDate(d.getDate()+i+1);return{date:d.getDate(),day:d.toLocaleDateString("en",{weekday:"short"}),month:d.toLocaleDateString("en",{month:"short"}),full:`${d.toLocaleDateString("en",{weekday:"short"})}, ${d.toLocaleDateString("en",{month:"short"})} ${d.getDate()}`}});
  const slots=["09:00 AM","10:00 AM","11:00 AM","02:00 PM","03:00 PM","04:00 PM","07:00 PM","08:00 PM"];
  return(<Modal close={()=>setShowBooking(false)} title={`${t("Book","احجز")} — ${teacher?.name}`}>
    <p style={{fontSize:11,fontWeight:600,marginBottom:6}}>Day</p>
    <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:14}}>{days.map(d=><div key={d.full} onClick={()=>setDay(d.full)} style={{minWidth:62,padding:"8px 4px",borderRadius:11,textAlign:"center",cursor:"pointer",border:day===d.full?"2px solid var(--accent)":"1px solid var(--border)",background:day===d.full?"var(--accent)10":"var(--bg2)"}}><div style={{fontSize:9,color:"var(--text3)"}}>{d.day}</div><div style={{fontSize:16,fontWeight:700}}>{d.date}</div><div style={{fontSize:9,color:"var(--text3)"}}>{d.month}</div></div>)}</div>
    <p style={{fontSize:11,fontWeight:600,marginBottom:6}}>Time</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>{slots.map(s=><button key={s} onClick={()=>setSlot(s)} style={{padding:"8px 0",borderRadius:8,border:slot===s?"2px solid var(--accent)":"1px solid var(--border)",background:slot===s?"var(--accent)":"var(--bg2)",color:slot===s?"white":"var(--text2)",fontSize:10,fontWeight:500,cursor:"pointer"}}>{s}</button>)}</div>
    <div style={{padding:"10px 14px",borderRadius:10,background:"var(--bg2)",marginBottom:12,fontSize:11,color:"var(--text2)"}}>Fee: <strong style={{color:"var(--accent)"}}>{P(teacher?.price||25)}</strong>{cur.code!=="USD"&&<span style={{opacity:0.6}}> ≈ ${teacher?.price||25}</span>}</div>
    <button className="bp" style={{width:"100%",padding:12}} disabled={!day||!slot} onClick={()=>confirmBooking(teacher,day,slot)}>Confirm{day&&slot?` — ${day}, ${slot}`:""}</button>
  </Modal>);
}

function PaymentModal({t,P,data,setShowPayment,confirmPayment,cur,isPro}){
  const [card,setCard]=useState("");const [exp,setExp]=useState("");const [cvc,setCvc]=useState("");
  const [processing,setProcessing]=useState(false);const [method,setMethod]=useState("card");
  const pay=()=>{if(data.total===0){confirmPayment();return;}if(method==="card"&&(card.replace(/\s/g,"").length<16||!exp||!cvc))return;setProcessing(true);setTimeout(()=>{setProcessing(false);confirmPayment();},1300);};
  const fmtCard=v=>v.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim();
  const fmtExp=v=>{const d=v.replace(/\D/g,"").slice(0,4);return d.length>2?d.slice(0,2)+"/"+d.slice(2):d;};

  return(<Modal close={()=>setShowPayment(false)} title={t("Payment","الدفع")}>
    <div style={{padding:"14px 16px",borderRadius:12,background:"var(--bg2)",marginBottom:16}}>
      {data.gig&&<div style={{fontSize:12,fontWeight:500,marginBottom:4}}>{data.gig.title?.slice(0,45)}...</div>}
      {data.type==="tip"&&<div style={{fontSize:12,fontWeight:500,marginBottom:4}}>☕ Tip for {data.teacher?.name}</div>}
      {data.type==="pro_subscription"&&<div style={{fontSize:12,fontWeight:500,marginBottom:4}}>👑 AT-TIBYAN Pro ({data.plan})</div>}
      {!["order","tip","pro_subscription"].includes(data.type)&&<div style={{fontSize:12,fontWeight:500,marginBottom:4}}>✨ {data.type?.replace(/_/g," ")}</div>}

      {data.type==="order"&&<>
        <div className="fee-line"><span>{t("Service","خدمة")}</span><span>{P(data.priceUsd)}</span></div>
        <div className="fee-line"><span>{t("Platform fee","رسوم")} ({isPro?"0%":`${PLATFORM.feePercent}%`})</span><span style={{color:isPro?"#27AE60":"var(--text2)"}}>{isPro?"FREE":P(data.fee)}</span></div>
        {data.barakah>0&&<div className="fee-line"><span style={{fontSize:11}}>🤲 Barakah Fund</span><span style={{fontSize:11,color:"var(--accent2)"}}>{P(data.barakah)}</span></div>}
      </>}
      <div className="fee-line total"><span>{t("Total","المجموع")}</span><span style={{color:"var(--accent)"}}>{P(data.total)}</span></div>
      {cur.code!=="USD"&&<div style={{fontSize:10,color:"var(--text3)",textAlign:"right"}}>≈ ${data.total?.toFixed?.(2)} USD</div>}
    </div>

    {data.total>0&&<>
      <div style={{display:"flex",gap:6,marginBottom:14}}>{[{k:"card",l:"💳 Card"},{k:"paypal",l:"PayPal"},{k:"bank",l:"🏦 Bank"}].map(m=><button key={m.k} onClick={()=>setMethod(m.k)} className={method===m.k?"tg act":"tg"} style={{flex:1,justifyContent:"center",padding:"7px 0"}}>{m.l}</button>)}</div>
      {method==="card"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        <input className="inp" value={fmtCard(card)} onChange={e=>setCard(e.target.value)} placeholder="1234 5678 9012 3456"/>
        <div style={{display:"flex",gap:8}}><input className="inp" value={fmtExp(exp)} onChange={e=>setExp(e.target.value)} placeholder="MM/YY" style={{flex:1}}/><input className="inp" value={cvc} onChange={e=>setCvc(e.target.value.replace(/\D/g,"").slice(0,4))} placeholder="CVC" type="password" style={{flex:1}}/></div>
      </div>}
      {method!=="card"&&<div style={{textAlign:"center",padding:16,fontSize:12,color:"var(--text2)"}}>{method==="paypal"?"Redirect to PayPal":"Bank details sent to email"}</div>}
      <div style={{display:"flex",alignItems:"center",gap:5,margin:"10px 0 4px"}}><I.Shield/><span style={{fontSize:10,color:"var(--text3)"}}>Secure payment via Stripe</span></div>
    </>}
    {data.total===0&&<div style={{textAlign:"center",padding:14,color:"var(--accent2)",fontWeight:600}}>🤲 Free Barakah service!</div>}
    <button className="bp" onClick={pay} disabled={processing} style={{width:"100%",marginTop:10,padding:13}}>
      {processing?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><span style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",animation:"spin 0.6s linear infinite",display:"inline-block"}}/>Processing...</span>:data.total===0?"Confirm Free":t("Pay","ادفع")+` ${P(data.total)}`}
    </button>
  </Modal>);
}

function ProModal({t,P,close,handleProSubscribe}){
  return(<Modal close={close} title="👑 AT-TIBYAN Pro" wide>
    <p style={{fontSize:13,color:"var(--text2)",marginBottom:16}}>Remove all platform fees and unlock premium features.</p>
    <div style={{display:"flex",gap:12}} className="mg">
      {[{plan:"monthly",price:PLATFORM.proMonthly,period:"/mo"},{plan:"yearly",price:PLATFORM.proYearly,period:"/yr",badge:"Save 33%"}].map(p=><div key={p.plan} className="cd" style={{flex:1,padding:22,textAlign:"center",position:"relative"}}>
        {p.badge&&<div style={{position:"absolute",top:10,right:10,background:"#27AE60",color:"white",padding:"2px 7px",borderRadius:7,fontSize:9,fontWeight:600}}>{p.badge}</div>}
        <div style={{fontSize:24,fontWeight:700,color:"var(--accent)",marginBottom:2}}>{P(p.price)}</div>
        <div style={{fontSize:11,color:"var(--text3)",marginBottom:14}}>{p.period}</div>
        <button className="bp" onClick={()=>handleProSubscribe(p.plan)} style={{width:"100%",fontSize:12}}>Subscribe</button>
      </div>)}
    </div>
  </Modal>);
}

function TipModal({t,P,teacher,close,handleTip}){
  const [custom,setCustom]=useState("");
  return(<Modal close={close} title={`☕ ${t("Send Tip to","أرسل بقشيش لـ")} ${teacher?.name}`}>
    <p style={{fontSize:12,color:"var(--text2)",marginBottom:14}}>{t("Show appreciation for your teacher's dedication.","أظهر تقديرك لتفاني معلمك.")}</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
      {PLATFORM.tipOptions.map(amt=><button key={amt} className="cd lift" onClick={()=>handleTip(teacher,amt)} style={{padding:16,textAlign:"center",cursor:"pointer"}}><div style={{fontSize:18,fontWeight:700,color:"var(--accent)"}}>{P(amt)}</div></button>)}
    </div>
    <div style={{display:"flex",gap:8}}>
      <input className="inp" value={custom} onChange={e=>setCustom(e.target.value.replace(/\D/g,""))} placeholder="Custom amount (USD)" type="number" style={{flex:1}}/>
      <button className="bp" disabled={!custom} onClick={()=>{if(custom)handleTip(teacher,Number(custom))}} style={{padding:"10px 20px"}}>Send</button>
    </div>
    <p style={{fontSize:10,color:"var(--text3)",marginTop:8}}>{t("5% service fee applies. 95% goes directly to the teacher.","5% رسوم خدمة. 95% يذهب مباشرة للمعلم.")}</p>
  </Modal>);
}

function CurrencyPicker({t,current,setCurrent,close}){
  const [s,setS]=useState("");
  const f=Object.entries(CUR).filter(([c,v])=>!s||v.name.toLowerCase().includes(s.toLowerCase())||v.code.toLowerCase().includes(s.toLowerCase()));
  return(<Modal close={close} title={t("Currency","العملة")}>
    <input className="inp" value={s} onChange={e=>setS(e.target.value)} placeholder="Search..." style={{marginBottom:12}}/>
    <div style={{maxHeight:320,overflowY:"auto"}}>{f.map(([c,v])=><div key={c} onClick={()=>{setCurrent(c);close()}} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderRadius:9,cursor:"pointer",background:current===c?"var(--accent)10":"transparent",border:current===c?"1px solid var(--accent)":"1px solid transparent",marginBottom:3}}>
      <div><span style={{fontWeight:600,fontSize:12}}>{v.symbol} {v.code}</span><span style={{fontSize:11,color:"var(--text3)",marginLeft:6}}>{v.name}</span></div>
      {current===c&&<span style={{color:"var(--accent)"}}><I.Check/></span>}
    </div>)}</div>
  </Modal>);
}
