import{a as n,j as e}from"./query-Dr_DsP84.js";import{K as te,c as M,F as Ee,G as le,af as Oe,as as Ue,ag as He,b7 as qe,b8 as Ie,aD as We,aL as Ye,aQ as me,ar as Qe,B as U,b2 as Ne,J as Je,Y as Xe,aS as Ze,A as et,m as ye,e as tt,d as st,ac as H}from"./index-Dq6UKge_.js";import{a as at,b as rt,c as nt,d as ot}from"./useMutations-Grg6siz7.js";import{B as xe}from"./Badge-ZyEKD6LC.js";import{C as je}from"./Card-DV19xlDs.js";import{I as ue,T as lt}from"./Input-BFF4hsRq.js";import{T as we}from"./Nav-Cs7_iiiE.js";import{c as it,a as ct,u as dt}from"./DashboardApp-CpVfXYx1.js";import{P as mt}from"./PageHeader-DYW62fKC.js";import{F as ut,S as Ae,a as xt,L as pt,I as ft}from"./sigma-DBC3ChrG.js";import{S as ht}from"./sparkles-BYYJLmGA.js";import"./react-v8BWKAbm.js";import"./motion-BtU5Bk4N.js";import"./chevron-right-ipHjPZ-S.js";import"./transition-panel-CAZ3e3wA.js";const gt=`import React, { useState } from 'react';
import { Calculator, BarChart2, Plus, Trash2, RefreshCw, Zap } from 'lucide-react';

export default function StatisticsCalculator({ onScoreSubmit }) {
  const [inputVal, setInputVal] = useState("");
  const [numbers, setNumbers] = useState([12, 45, 23, 67, 89, 34, 56, 78, 90, 11]);

  const addNumber = () => {
    const parsed = parseFloat(inputVal);
    if (!isNaN(parsed)) {
      setNumbers(prev => [...prev, parsed]);
      setInputVal("");
    }
  };

  const parseBulk = () => {
    const items = inputVal
      .split(/[\\s,]+/)
      .map(n => parseFloat(n.trim()))
      .filter(n => !isNaN(n));
    if (items.length > 0) {
      setNumbers(prev => [...prev, ...items]);
      setInputVal("");
    }
  };

  const removeNumber = (index) => {
    setNumbers(prev => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => setNumbers([]);

  const count = numbers.length;
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = numbers.reduce((acc, curr) => acc + curr, 0);
  const mean = count > 0 ? sum / count : 0;
  
  const median = count === 0 ? 0 : (
    count % 2 !== 0
      ? sorted[Math.floor(count / 2)]
      : (sorted[count / 2 - 1] + sorted[count / 2]) / 2
  );

  const min = count > 0 ? Math.min(...numbers) : 0;
  const max = count > 0 ? Math.max(...numbers) : 0;
  const range = max - min;

  const variance = count > 0 
    ? numbers.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / count
    : 0;
  const stdDev = Math.sqrt(variance);

  const handleExportResult = () => {
    if (onScoreSubmit && count > 0) {
      onScoreSubmit(Math.round(mean));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-800 font-sans">
      <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white">Statistics Calculator</h2>
            <p className="text-xs text-slate-400 font-mono">Real-time Data Stream & Metrics Simulator</p>
          </div>
        </div>
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Clear Data
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Enter numbers (e.g. 42 or 10, 20, 30)..."
          onKeyDown={(e) => { if (e.key === 'Enter') parseBulk(); }}
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
        />
        <button
          onClick={addNumber}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
        >
          <Plus className="w-4 h-4" /> Add Single
        </button>
        <button
          onClick={parseBulk}
          className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
        >
          <Zap className="w-4 h-4" /> Add Bulk
        </button>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Sample Dataset ({count} items)</span>
        </div>
        <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80">
          {numbers.map((num, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1 rounded-lg text-xs font-mono group hover:border-red-500/50 transition"
            >
              {num}
              <button
                onClick={() => removeNumber(idx)}
                className="text-slate-500 hover:text-red-400 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
          {numbers.length === 0 && (
            <span className="text-xs text-slate-500 font-mono p-2">No numbers entered. Type above to add dataset.</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Mean (Average)</p>
          <p className="text-xl font-bold text-indigo-400 mt-1 font-mono">{mean.toFixed(2)}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Median</p>
          <p className="text-xl font-bold text-purple-400 mt-1 font-mono">{median.toFixed(2)}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Std Deviation</p>
          <p className="text-xl font-bold text-pink-400 mt-1 font-mono">{stdDev.toFixed(2)}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Sum Total</p>
          <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">{sum.toFixed(2)}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Min Value</p>
          <p className="text-xl font-bold text-cyan-400 mt-1 font-mono">{min}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Max Value</p>
          <p className="text-xl font-bold text-amber-400 mt-1 font-mono">{max}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Range</p>
          <p className="text-xl font-bold text-blue-400 mt-1 font-mono">{range}</p>
        </div>
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Variance</p>
          <p className="text-xl font-bold text-violet-400 mt-1 font-mono">{variance.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-800">
        <button
          onClick={handleExportResult}
          disabled={count === 0}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg disabled:opacity-50 transition flex items-center gap-2"
        >
          <BarChart2 className="w-4 h-4" /> Save Score Metric ({Math.round(mean)})
        </button>
      </div>
    </div>
  );
}`,bt=`import React, { useState, useEffect } from 'react';
import { Gamepad2, Trophy, RefreshCw } from 'lucide-react';

export default function CustomGame({ onScoreSubmit }) {
  const [score, setScore] = useState(0);
  const [active, setActive] = useState(true);

  return (
    <div className="p-8 bg-slate-900 text-white rounded-3xl text-center max-w-md mx-auto border border-slate-800 shadow-2xl">
      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Gamepad2 className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-black mb-2">Custom Arcade Game</h2>
      <p className="text-xs text-slate-400 mb-6 font-mono">Score: <span className="text-blue-400 font-bold">{score}</span></p>
      
      <div className="flex gap-3 justify-center mb-6">
        <button
          onClick={() => setScore(prev => prev + 10)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
        >
          Tap to Score (+10)
        </button>
        <button
          onClick={() => setScore(0)}
          className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
        >
          Reset
        </button>
      </div>

      <button
        onClick={() => onScoreSubmit && onScoreSubmit(score)}
        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition"
      >
        Submit Final Score ({score})
      </button>
    </div>
  );
}`,B=20,q=16,ne="  ";function vt(o){let s=1;for(let c=0;c<o.length;c++)o.charCodeAt(c)===10&&s++;return s}function Nt(o,s){let c=1,D=-1;for(let E=0;E<s;E++)o.charCodeAt(E)===10&&(c++,D=E);return{line:c,col:s-D}}const yt=n.forwardRef(function({value:s,onChange:c,fileName:D,status:E,toolbarEnd:_,emptyState:x,error:l,className:G},N){const h=n.useRef(null),y=n.useRef(null),L=n.useRef(null),f=n.useRef(!1),C=n.useRef(c);C.current=c;const[g,$]=n.useState({line:1,col:1}),[b,A]=n.useState(!1);n.useImperativeHandle(N,()=>h.current);const z=n.useMemo(()=>vt(s),[s]),se=n.useMemo(()=>Array.from({length:z},(a,i)=>i+1).join(`
`),[z]),K=Math.max(2,String(z).length)+3,j=n.useCallback(()=>{const a=h.current;if(!a)return;const i=`translate3d(0, ${-a.scrollTop}px, 0)`;y.current&&(y.current.style.transform=i),L.current&&(L.current.style.transform=i)},[]),v=n.useCallback(()=>{const a=h.current;if(!a)return;const i=Nt(a.value,a.selectionStart);$(p=>p.line===i.line&&p.col===i.col?p:i)},[]);n.useLayoutEffect(()=>{j(),v()},[s,j,v]);const w=(a,i)=>{let p=!1;try{p=typeof document.execCommand=="function"&&document.execCommand("insertText",!1,i)}catch{p=!1}if(!p){const{selectionStart:m,selectionEnd:d,value:F}=a;C.current(F.slice(0,m)+i+F.slice(d)),requestAnimationFrame(()=>{a.selectionStart=a.selectionEnd=m+i.length})}},I=(a,i)=>{const{selectionStart:p,selectionEnd:m,value:d}=a,F=d.slice(p,m).includes(`
`);if(!i&&!F){w(a,ne);return}const T=d.lastIndexOf(`
`,p-1)+1,P=m>p&&d[m-1]===`
`?m-1:m;let R=d.indexOf(`
`,P);R===-1&&(R=d.length);const O=d.slice(T,R);let k=0;const W=O.split(`
`).map((S,re)=>{var Y;if(i){const Q=((Y=/^( {1,2}|\t)/.exec(S))==null?void 0:Y[0].length)??0;return re===0&&(k=-Q),S.slice(Q)}return re===0&&(k=ne.length),ne+S}).join(`
`);W!==O&&(a.setSelectionRange(T,R),w(a,W),requestAnimationFrame(()=>{F?a.setSelectionRange(T,T+W.length):a.selectionStart=a.selectionEnd=Math.max(T,p+k),v()}))},ae=a=>{var p;if(a.nativeEvent.isComposing)return;const i=a.currentTarget;if(a.key==="Escape"){f.current=!0;return}if(a.key==="Tab"){if(f.current||a.metaKey||a.ctrlKey||a.altKey){f.current=!1;return}a.preventDefault(),I(i,a.shiftKey);return}if(f.current=!1,a.key==="Enter"&&!a.metaKey&&!a.ctrlKey&&!a.altKey&&!a.shiftKey){const{selectionStart:m,value:d}=i,F=d.lastIndexOf(`
`,m-1)+1,T=((p=/^[ \t]*/.exec(d.slice(F,m)))==null?void 0:p[0])??"",P=d[m-1],R=P==="{"||P==="("||P==="["?ne:"";(T||R)&&(a.preventDefault(),w(i,`
${T}${R}`))}},V="creator-code-error";return e.jsxs("div",{className:M("relative flex min-h-0 flex-col overflow-hidden rounded-[24px] border bg-navy text-white shadow-card transition-[border-color,box-shadow] duration-300",l?"border-red-500/70":b?"border-night-sage/40 shadow-float":"border-white/10",G),children:[e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-white/10 px-4 py-2.5",children:[e.jsxs("div",{className:"flex min-w-0 items-center gap-2.5",children:[e.jsxs("span",{className:"flex shrink-0 gap-1","aria-hidden":"true",children:[e.jsx("span",{className:"size-2.5 rounded-full bg-white/15"}),e.jsx("span",{className:"size-2.5 rounded-full bg-white/15"}),e.jsx("span",{className:"size-2.5 rounded-full bg-night-gold/70"})]}),e.jsx(ut,{className:"ml-1 size-4 shrink-0 text-night-sage","aria-hidden":"true"}),e.jsx("span",{className:"truncate font-mono text-[13px] text-white/85",children:D}),E]}),_]}),e.jsxs("div",{className:"relative flex min-h-0 flex-1 font-mono text-[13px]",children:[e.jsx("div",{"aria-hidden":"true",className:"relative shrink-0 select-none overflow-hidden border-r border-white/10 bg-white/[0.03] text-right text-white/30",style:{width:`${K}ch`},children:e.jsxs("div",{ref:y,className:"relative will-change-transform",children:[e.jsx("span",{className:"absolute inset-x-0 pr-3 text-night-sage",style:{top:q+(g.line-1)*B,height:B,lineHeight:`${B}px`},children:b?g.line:""}),e.jsx("pre",{className:"m-0 font-mono",style:{padding:`${q}px 12px ${q+24}px 0`,lineHeight:`${B}px`},children:se})]})}),e.jsxs("div",{className:"relative min-w-0 flex-1",children:[e.jsx("div",{ref:L,"aria-hidden":"true",className:"pointer-events-none absolute inset-x-0 top-0 will-change-transform",children:b&&e.jsx("div",{className:"absolute inset-x-0 bg-white/[0.045]",style:{top:q+(g.line-1)*B,height:B}})}),e.jsx("textarea",{ref:h,"aria-label":"Component source code","aria-invalid":!!l||void 0,"aria-describedby":l?V:void 0,value:s,onChange:a=>c(a.target.value),onScroll:j,onKeyDown:ae,onSelect:v,onFocus:()=>{A(!0),v()},onBlur:()=>{A(!1),f.current=!1},spellCheck:!1,autoCapitalize:"off",autoCorrect:"off",autoComplete:"off",wrap:"off",placeholder:"// Paste your React TSX component code here...",className:"absolute inset-0 size-full resize-none whitespace-pre bg-transparent px-4 text-white/90 caret-night-sage outline-none placeholder:text-white/30 focus-visible:shadow-none",style:{lineHeight:`${B}px`,paddingTop:q,paddingBottom:q,tabSize:2}}),!s&&x&&e.jsx("div",{className:"pointer-events-none absolute inset-0 grid place-items-center p-6",children:e.jsx("div",{className:"[&_a]:pointer-events-auto [&_button]:pointer-events-auto",children:x})})]})]}),l&&e.jsxs("p",{id:V,role:"alert",className:"flex items-center gap-2 border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-medium text-red-300",children:[e.jsx(it,{className:"size-3.5 shrink-0"})," ",l]}),e.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-white/10 px-4 py-2 font-mono text-[11px] text-white/50",children:[e.jsxs("span",{className:"flex items-center gap-3 tabular-nums","aria-live":"off",children:[e.jsxs("span",{children:["Ln ",g.line,", Col ",g.col]}),e.jsx("span",{className:"h-3 w-px bg-white/15","aria-hidden":"true"}),e.jsxs("span",{children:[z.toLocaleString()," ",z===1?"line":"lines"]}),e.jsx("span",{className:"h-3 w-px bg-white/15","aria-hidden":"true"}),e.jsxs("span",{children:[s.length.toLocaleString()," chars"]})]}),e.jsxs("span",{className:"hidden items-center gap-1.5 md:flex",children:[e.jsx(te,{className:"border-white/15 bg-white/10 text-white/70",children:"Tab"})," indent",e.jsx("span",{className:"mx-1.5 text-white/20",children:"·"}),e.jsx(te,{className:"border-white/15 bg-white/10 text-white/70",children:"Esc"}),e.jsx(te,{className:"border-white/15 bg-white/10 text-white/70",children:"Tab"})," leave editor"]})]})]})}),Se=["from-brand-soft via-surface-2 to-rose-soft","from-rose-soft via-surface-2 to-gold-soft","from-gold-soft via-surface-2 to-brand-soft"];function oe(o){let s=0;for(let c=0;c<o.length;c++)s=s*31+o.charCodeAt(c)|0;return Math.abs(s)}const jt=n.memo(function({kind:s,seed:c,title:D,description:E,category:_,thumbnail:x,failed:l,onImageError:G,className:N}){const h=x.trim(),y=!!h&&!l,[L,f]=n.useState(null),C=L===h,g=Se[oe(c)%Se.length],$=D.trim(),b=($[0]??(s==="simulator"?"S":"G")).toUpperCase(),A=s==="simulator"?Ee:le;return e.jsxs("div",{"aria-hidden":"true",className:M("pointer-events-none select-none overflow-hidden rounded-[24px] border border-line bg-surface shadow-soft",N),children:[e.jsxs("div",{className:M("relative aspect-[16/10] overflow-hidden",y?"bg-surface-2":s==="simulator"?"bg-brand-soft":M("bg-gradient-to-br",g)),children:[y?e.jsxs(e.Fragment,{children:[e.jsx("img",{src:h,alt:"",loading:"lazy",decoding:"async",referrerPolicy:"no-referrer",onLoad:()=>f(h),onError:G,className:M("size-full object-cover transition-opacity duration-500",C?"opacity-100":"opacity-0")},h),!C&&e.jsx("div",{className:"skeleton-shimmer absolute inset-0"}),e.jsx("div",{className:"absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-transparent"})]}):s==="simulator"?e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"bg-graph absolute inset-0"}),e.jsx("svg",{viewBox:"0 0 200 120",className:"absolute inset-0 size-full text-brand/50",preserveAspectRatio:"none",children:e.jsx("path",{d:`M0 ${90-oe(c)%20} C 40 ${40+oe(c)%30}, 80 100, 120 55 S 180 30, 200 ${45+oe(c)%25}`,fill:"none",stroke:"currentColor",strokeWidth:"1.5",vectorEffect:"non-scaling-stroke"})}),e.jsx("div",{className:"absolute inset-0 grid place-items-center",children:e.jsx("div",{className:"grid size-14 place-items-center rounded-2xl border border-line bg-surface/85 text-brand-strong shadow-card",children:e.jsx(A,{className:"size-7"})})})]}):e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"absolute -bottom-10 -right-2 text-[11rem] font-black leading-none text-ink/[0.04]",children:b}),e.jsx("span",{className:"absolute -left-10 -top-10 size-40 rounded-full border border-brand/20"}),e.jsx("span",{className:"absolute left-6 top-6 size-24 rounded-full border border-rose/40"}),e.jsx("span",{className:"absolute -right-6 bottom-8 size-28 rounded-full bg-gold/15"}),e.jsx("div",{className:"absolute inset-0 grid place-items-center",children:e.jsx("div",{className:"grid size-16 place-items-center rounded-2xl border border-line bg-surface/80 text-brand-strong shadow-card",children:e.jsx(A,{className:"size-8"})})})]}),s==="simulator"&&e.jsxs(e.Fragment,{children:[e.jsx(Oe,{className:"text-brand-strong/60"}),e.jsx("span",{className:"label-mono absolute bottom-3 left-4 rounded bg-surface/90 px-1.5 py-0.5 text-[9px] text-ink-muted",children:"FIG. NEW"})]})]}),e.jsxs("div",{className:"p-4 sm:p-5",children:[_.trim()?e.jsx(xe,{tone:"brand",children:_.trim()}):e.jsx(xe,{tone:"neutral",children:"No category"}),e.jsx("h3",{className:M("mt-2.5 line-clamp-2 text-lg font-extrabold",$?"text-ink":"text-ink-faint"),children:$||`Untitled ${s}`}),e.jsx("p",{className:"mt-1.5 line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed text-ink-muted",children:E.trim()||"No description yet."}),e.jsxs("span",{className:He("primary","sm","mt-4 h-11 w-full"),children:[e.jsx(Ue,{className:"size-4 fill-current"})," ",s==="simulator"?"Launch":"Play"]})]})]})}),Z={game:"Arcade",simulator:"Simulator"},wt={game:["Arcade","Casual","Strategy","Action","Puzzle"],simulator:["Simulator","Math","Analytics","Physics","Utility","Chemistry"]},Ce=[{id:"blank",label:"Blank",code:""},{id:"game",label:"Game starter",code:bt},{id:"stats",label:"Statistics calculator",code:gt}],St={blank:xt,game:le,stats:Ae},ee=o=>JSON.stringify(o),ke=typeof navigator<"u"&&/Mac|iPhone|iPad|iPod/.test(navigator.userAgent);function Ct(){return e.jsxs("div",{className:"grid gap-6 lg:grid-cols-12 lg:gap-8","aria-busy":"true","aria-label":"Loading editor",children:[e.jsxs("div",{className:"flex flex-col gap-6 lg:col-span-5",children:[e.jsxs("div",{className:"rounded-[24px] border border-line bg-surface p-5 sm:p-6",children:[e.jsx(H,{className:"h-3 w-24 rounded-md"}),e.jsxs("div",{className:"mt-6 space-y-6",children:[[0,1,2].map(o=>e.jsxs("div",{className:"space-y-2",children:[e.jsx(H,{className:"h-3.5 w-20 rounded-md"}),e.jsx(H,{className:M("w-full",o===2?"h-24":"h-12")})]},o)),e.jsx("div",{className:"flex flex-wrap gap-1.5",children:[56,72,64,80,60].map(o=>e.jsx(H,{className:"h-8 rounded-full",style:{width:o}},o))})]})]}),e.jsxs("div",{className:"rounded-[24px] border border-line bg-surface p-5 sm:p-6",children:[e.jsx(H,{className:"h-12 w-full"}),e.jsx(H,{className:"mt-5 aspect-[16/10] w-full rounded-[20px]"})]})]}),e.jsxs("div",{className:"hidden h-[min(48rem,calc(100dvh-13rem))] flex-col overflow-hidden rounded-[24px] border border-white/10 bg-navy lg:col-span-7 lg:flex",children:[e.jsx("div",{className:"h-11 border-b border-white/10"}),e.jsx("div",{className:"flex-1 space-y-3 p-5 pl-16",children:[70,45,82,30,64,52,76,40,58].map((o,s)=>e.jsx("div",{className:"h-2.5 rounded-full bg-white/10",style:{width:`${o}%`}},s))})]})]})}function _t({mode:o,editId:s,onDone:c,onCancel:D}){const E=ct(),_=dt(),x=!!s,[l,G]=n.useState(o),[N,h]=n.useState(""),[y,L]=n.useState(""),[f,C]=n.useState(Z[o]),[g,$]=n.useState(""),[b,A]=n.useState(""),[z,se]=n.useState(!1),[K,j]=n.useState(null),[v,w]=n.useState({}),[I,ae]=n.useState(!1),[V,a]=n.useState("details"),[i,p]=n.useState(null),m=n.useRef(null),d=n.useRef(null),F=n.useRef(null),T=n.useRef(null),P=n.useRef(null),R=qe(o==="simulator"&&s||""),O=Ie(o!=="simulator"&&s||""),{data:k,isError:W}=R,{data:S,isError:re}=O,{data:Y=[]}=We(),{data:Q=[]}=Ye(),Te=at(),Re=rt(),Le=nt(),$e=ot(),pe=s?`${o}:${s}`:null;n.useEffect(()=>{m.current=null,G(o),j(null),w({}),a("details"),s?d.current=null:(h(""),L(""),C(Z[o]),$(""),A(""),d.current=ee({kind:o,title:"",description:"",category:Z[o],thumbnail:"",code:""}))},[o,s]),n.useEffect(()=>{if(!(!s||m.current===`${o}:${s}`)){if(o==="simulator"&&k){const t={kind:"simulator",title:k.title,description:k.description||"",category:k.category||"Simulator",thumbnail:k.thumbnail||"",code:k.simulatorCode||k.gameCode||""};h(t.title),L(t.description),C(t.category),$(t.thumbnail),A(t.code),G("simulator"),j(null),d.current=ee(t),m.current=`${o}:${s}`,p(m.current)}else if(o!=="simulator"&&S){const t={kind:S.type==="simulator"?"simulator":"game",title:S.title,description:S.description||"",category:S.category||(S.type==="simulator"?"Simulator":"Arcade"),thumbnail:S.thumbnail||"",code:S.gameCode||""};h(t.title),L(t.description),C(t.category),$(t.thumbnail),A(t.code),G(t.kind),j(null),d.current=ee(t),m.current=`${o}:${s}`,p(m.current)}}},[s,o,k,S]);const ze=o==="simulator"?R.isFetching:O.isFetching,J=x&&(o==="simulator"?W:re)&&i!==pe&&!ze;n.useEffect(()=>{J&&j({type:"error",msg:"Could not load data for editing."})},[J]),n.useEffect(()=>ae(!1),[g]);const Fe=n.useCallback(()=>ae(!0),[]),Me=n.useMemo(()=>{const t=new Set(wt[l]);return(l==="simulator"?Q:Y).forEach(u=>{var ve;(ve=u.category)!=null&&ve.trim()&&t.add(u.category.trim())}),Array.from(t).slice(0,14)},[l,Y,Q]),De=`${N.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"custom-module"}.tsx`,X=l==="simulator"?"Simulator":"Game",ie=l==="simulator"?"Simulators":"Arcade",fe=x&&i!==pe&&!J,Pe=()=>d.current!==null&&d.current!==ee({kind:l,title:N,description:y,category:f,thumbnail:g,code:b}),Ge=t=>{x||t===l||(G(t),C(r=>r===Z[l]||!r?Z[t]:r))},ce=async t=>{const r=Ce.find(u=>u.id===t);r&&(b.trim()&&b!==r.code&&!await E({title:"Replace current code?",description:`Loading the "${r.label}" template will overwrite what is in the editor.`,confirmLabel:"Replace"})||(A(r.code),j(null),w(u=>({...u,code:void 0})),requestAnimationFrame(()=>{const u=P.current;u&&(u.scrollTop=0,u.scrollLeft=0)})))},de=async()=>{if(z)return;const t={};if(N.trim()||(t.title="Give it a title players will recognise."),f.trim()||(t.category="Pick a suggestion or type a category."),!N.trim()||!f.trim()){w(t),j({type:"error",msg:"Title and Category are required parameters."}),a("details"),requestAnimationFrame(()=>{var r;return(r=t.title?F.current:T.current)==null?void 0:r.focus()});return}if(!b.trim()){w({code:"The editor is empty — write a component or load a template."}),j({type:"error",msg:"Source code cannot be empty. Please provide valid React component code."}),a("code"),requestAnimationFrame(()=>{var r;return(r=P.current)==null?void 0:r.focus()});return}w({}),se(!0),j(null);try{if(l==="simulator"){const u={title:N.trim(),description:y.trim()||null,category:f.trim(),thumbnail:g.trim()||null,active:!0,simulatorCode:b,gameCode:b,isDynamic:!0,type:"simulator"};s?await $e.mutateAsync({id:s,data:u}):await Le.mutateAsync(u)}else{const u={title:N.trim(),description:y.trim()||null,category:f.trim(),thumbnail:g.trim()||null,active:!0,gameCode:b,isDynamic:!0,type:"game"};s?await Re.mutateAsync({id:s,data:u}):await Te.mutateAsync(u)}const r=`Successfully ${s?"updated":"compiled"} "${N.trim()}"! Added to ${ie}.`;j({type:"success",msg:r}),_.success(s?`${X} updated`:`${X} published`,r),d.current=ee({kind:l,title:N,description:y,category:f,thumbnail:g,code:b}),c(l)}catch(r){j({type:"error",msg:r instanceof Error&&r.message?r.message:"An unexpected error occurred during compilation."})}finally{se(!1)}},Ke=async()=>{Pe()&&!await E({title:"Discard your changes?",description:`Your edits to this ${l} haven't been ${x?"saved":"published"}.`,confirmLabel:"Discard",cancelLabel:"Keep editing",tone:"danger"})||D()},he=n.useRef(de);n.useEffect(()=>{he.current=de});const ge=!fe&&!J;n.useEffect(()=>{if(!ge)return;const t=r=>{if((r.metaKey||r.ctrlKey)&&!r.altKey&&!r.shiftKey&&r.key.toLowerCase()==="s"){if(r.preventDefault(),document.querySelector('[role="alertdialog"]'))return;he.current()}};return window.addEventListener("keydown",t),()=>window.removeEventListener("keydown",t)},[ge]);const Be=[Ce.map(t=>{const r=St[t.id]??me;return{label:t.label,icon:e.jsx(r,{className:"size-4"}),onSelect:()=>void ce(t.id)}})],_e=!!(v.title||v.category),be=(t,r)=>e.jsxs("span",{className:"inline-flex items-center gap-1.5",children:[t,r&&e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"size-1.5 rounded-full bg-red-500","aria-hidden":"true"}),e.jsx("span",{className:"sr-only",children:"(needs attention)"})]})]}),Ve=z?x?"Saving...":"Compiling...":x?`Update ${X}`:"Compile & publish";return e.jsxs("div",{className:"flex flex-col gap-6 lg:gap-8",children:[e.jsx(mt,{eyebrow:"Creator Studio",title:x?`Edit ${X.toLowerCase()}`:`New ${X.toLowerCase()}`,description:x?`Editing an existing ${l}. Update the details or code, then save your changes.`:`Write or paste a single-file React component that exports a default ${l}.`,actions:e.jsxs("span",{className:"hidden items-center gap-2 text-xs font-medium text-ink-faint lg:inline-flex",children:[e.jsx(te,{children:ke?"⌘":"Ctrl"}),e.jsx(te,{children:"S"}),e.jsx("span",{children:x?"to save":"to publish"})]})}),fe?e.jsx(Ct,{}):J?e.jsxs("div",{className:"flex flex-col items-center gap-4",children:[e.jsx(Qe,{className:"w-full",title:`Couldn't open this ${o}`,description:"We couldn't load it for editing. Check your connection and try again.",onRetry:()=>void(o==="simulator"?R.refetch():O.refetch())}),e.jsxs(U,{variant:"ghost",onClick:D,children:["Back to ",o==="simulator"?"Simulators":"Arcade"]})]}):e.jsxs(e.Fragment,{children:[e.jsx(we,{variant:"segmented",label:"Studio pane",value:V,onChange:t=>a(t),className:"w-full lg:hidden [&>button]:flex-1 [&>button]:justify-center",items:[{value:"details",label:be("Details",_e),icon:e.jsx(pt,{className:"size-4"})},{value:"code",label:be("Code",!!v.code),icon:e.jsx(me,{className:"size-4"})}]}),e.jsxs("div",{className:"grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-8",children:[e.jsxs("div",{className:M("flex-col gap-6 lg:col-span-5 lg:flex",V==="details"?"flex":"hidden"),children:[e.jsxs(je,{className:"rounded-[24px]",children:[e.jsxs("div",{className:"flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6",children:[e.jsx("p",{className:"label-mono text-brand-strong",children:"Specimen label"}),e.jsx(Ne,{children:x?`ID ${s==null?void 0:s.slice(0,8)}`:"Draft"})]}),e.jsxs("div",{className:"flex flex-col gap-6 p-5 sm:p-6",children:[!x&&e.jsxs("div",{className:"flex flex-col gap-2",children:[e.jsx("p",{className:"text-[13px] font-semibold text-ink",children:"What are you building?"}),e.jsx(we,{variant:"segmented",label:"What are you building?",value:l,onChange:Ge,className:"w-full [&>button]:flex-1 [&>button]:justify-center",items:[{value:"game",label:"Game",icon:e.jsx(le,{className:"size-4"})},{value:"simulator",label:"Simulator",icon:e.jsx(Ee,{className:"size-4"})}]})]}),e.jsx(ue,{ref:F,label:"Title",value:N,error:v.title,onChange:t=>{h(t.target.value),v.title&&t.target.value.trim()&&w(r=>({...r,title:void 0}))},placeholder:"e.g. Statistics Calculator"}),e.jsxs("div",{className:"flex flex-col gap-2.5",children:[e.jsx(ue,{ref:T,label:"Category",value:f,error:v.category,onChange:t=>{C(t.target.value),v.category&&t.target.value.trim()&&w(r=>({...r,category:void 0}))},placeholder:"e.g. Arcade"}),e.jsx("div",{className:"flex flex-wrap gap-1.5",role:"group","aria-label":"Category suggestions",children:Me.map(t=>{const r=f.trim().toLowerCase()===t.toLowerCase();return e.jsx("button",{type:"button",onClick:()=>{C(t),w(u=>({...u,category:void 0}))},"aria-pressed":r,className:M("font-narrow min-h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-[background-color,border-color,color,transform,translate,scale,rotate] duration-200 active:scale-[0.96]",r?"border-rose bg-rose-soft text-brand-strong":"border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"),children:t},t)})})]}),e.jsx(lt,{label:"Short description",optional:!0,rows:3,value:y,onChange:t=>L(t.target.value),placeholder:"What does it do, and who is it for?",className:"min-h-24 resize-none",hint:`${y.trim().length.toLocaleString()} characters · the library card shows the first few lines.`})]})]}),e.jsxs(je,{className:"rounded-[24px]",children:[e.jsxs("div",{className:"flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 sm:px-6",children:[e.jsx("p",{className:"label-mono text-brand-strong",children:"Library card"}),e.jsx(Ne,{children:"Live preview"})]}),e.jsxs("div",{className:"flex flex-col gap-5 p-5 sm:p-6",children:[e.jsx(ue,{label:"Thumbnail image URL",type:"url",inputMode:"url",optional:!0,value:g,onChange:t=>$(t.target.value),placeholder:"https://...",leading:I?e.jsx(ft,{className:"size-4 text-red-500"}):void 0,hint:I?"That image couldn't be loaded — players will see the composed cover below instead.":"Shown as the cover on the library card. Leave empty for a composed cover."}),e.jsxs("figure",{className:"flex flex-col gap-2.5",children:[e.jsx(jt,{kind:l,seed:s||"draft",title:N,description:y,category:f,thumbnail:g,failed:I,onImageError:Fe,className:"mx-auto w-full max-w-sm lg:max-w-none"}),e.jsxs("figcaption",{className:"text-center text-xs text-ink-faint",children:["How it appears in ",ie," — updates as you type."]})]})]})]})]}),e.jsx("div",{className:M("lg:sticky lg:top-6 lg:col-span-7 lg:block",V==="code"?"block":"hidden"),children:e.jsx(yt,{ref:P,value:b,onChange:t=>{A(t),v.code&&t.trim()&&w(r=>({...r,code:void 0}))},fileName:De,error:v.code,className:"h-[62dvh] min-h-[24rem] lg:h-[min(48rem,calc(100dvh-13rem))] lg:min-h-[30rem]",status:e.jsx(xe,{tone:"night",className:"hidden sm:inline-flex",children:x?"Editing":"Draft"}),toolbarEnd:e.jsx(Je,{label:"Load a template",groups:Be,placement:"bottom-end",header:e.jsx("p",{className:"label-mono text-ink-faint",children:"Start from a template"}),trigger:e.jsx(U,{variant:"night-outline",size:"sm",leadingIcon:e.jsx(Ze,{className:"size-4"}),trailingIcon:e.jsx(Xe,{className:"size-3.5"}),children:"Templates"})}),emptyState:e.jsxs("div",{className:"flex max-w-xs flex-col items-center text-center",children:[e.jsx("span",{className:"grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/5 text-night-sage",children:e.jsx(me,{className:"size-5"})}),e.jsx("p",{className:"mt-4 text-sm font-semibold text-white",children:"An empty bench"}),e.jsx("p",{className:"mt-1 text-sm text-white/60",children:"Paste a component, start typing, or begin from a starter."}),e.jsxs("div",{className:"mt-4 flex flex-wrap justify-center gap-2",children:[e.jsx(U,{variant:"night",size:"sm",onClick:()=>void ce("game"),leadingIcon:e.jsx(le,{className:"size-4"}),children:"Game starter"}),e.jsx(U,{variant:"night-outline",size:"sm",onClick:()=>void ce("stats"),leadingIcon:e.jsx(Ae,{className:"size-4"}),children:"Statistics"})]})]})})})]}),e.jsx("div",{className:"sticky bottom-4 z-20",children:e.jsxs("div",{className:"flex flex-col gap-3 rounded-2xl border border-line bg-surface/95 p-3 shadow-float backdrop-blur sm:flex-row sm:items-center sm:justify-between",children:[e.jsx("div",{className:"min-w-0 flex-1",children:e.jsx(et,{mode:"wait",initial:!1,children:K?e.jsx(ye.div,{initial:{opacity:0,y:6},animate:{opacity:1,y:0},exit:{opacity:0,y:-4},transition:{duration:.25,ease:tt.out},children:e.jsx(st,{tone:K.type==="success"?"success":"danger",className:"rounded-xl px-3 py-2.5",children:e.jsx("span",{className:"break-words",children:K.msg})})},`${K.type}:${K.msg}`):e.jsx(ye.p,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.2},className:"flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm text-ink-muted",children:x?`Saving updates this ${l} in place.`:`Publishing adds it to ${ie} instantly.`},"idle")})}),e.jsxs("div",{className:"flex shrink-0 gap-2",children:[e.jsx(U,{variant:"outline",onClick:()=>void Ke(),disabled:z,className:"flex-1 sm:flex-none",children:"Cancel"}),e.jsx(U,{onClick:()=>void de(),loading:z,leadingIcon:e.jsx(ht,{className:"size-4"}),className:"flex-[2] sm:flex-none","aria-keyshortcuts":ke?"Meta+S":"Control+S",children:Ve})]})]})})]})]})}export{_t as default};
