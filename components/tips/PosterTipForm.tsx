"use client";
import { useEffect, useRef, useState } from "react";

type Field = "title" | "date" | "time" | "venue" | "district" | "price" | "url" | "details" | "contact";
const blank: Record<Field,string> = {title:"",date:"",time:"",venue:"",district:"",price:"",url:"",details:"",contact:""};
const cn = ["中西區","灣仔","東區","南區","油尖旺","深水埗","九龍城","黃大仙","觀塘","荃灣","屯門","元朗","北區","大埔","沙田","西貢","葵青","離島"];
declare global { interface Window { Tesseract?: { recognize: (image: string, language: string) => Promise<{ data: { text: string } }> }; } }
function guess(text:string):Partial<Record<Field,string>> {
 const lines=text.split(/\n/).map(s=>s.trim()).filter(Boolean);
 return {
 title:lines.find(s=>s.length>=5&&!/^(日期|時間|地點|收費|報名|查詢|https?:)/.test(s))?.slice(0,160)||"",
 date:(text.match(/20\d{2}[年\/.\-]\d{1,2}[月\/.\-]\d{1,2}日?(?:\s*[至到\-–~]\s*(?:20\d{2}[年\/.\-])?\d{1,2}[月\/.\-]\d{1,2}日?)?/ )||[])[0]||"",
 time:(text.match(/(?:上午|下午)?\s*\d{1,2}[:：]\d{2}\s*(?:[至到\-–~]\s*(?:上午|下午)?\s*\d{1,2}[:：]\d{2})?/)||[])[0]||"",
 venue:(text.match(/(?:地點|場地|地址)[：:]\s*([^\n]+)/)||[])[1]?.slice(0,180)||"",
 district:cn.find(s=>text.includes(s))||"",
 price:(text.match(/(?:免費|HK\$\s*[\d,]+|港幣\s*[\d,]+|\$\s*[\d,]+)/i)||[])[0]||"",
 url:(text.match(/https?:\/\/[^\s<>]+/)||[])[0]||"",
 details:text.slice(0,4500)
 };
}
async function loadOCR() {
 if(window.Tesseract) return;
 await new Promise<void>((resolve,reject)=>{
  const existing=document.querySelector<HTMLScriptElement>('script[data-familyfun-ocr]');
  if(existing){existing.addEventListener("load",()=>resolve(),{once:true});existing.addEventListener("error",()=>reject(new Error("OCR 載入失敗")),{once:true});return;}
  const tag=document.createElement("script"); tag.dataset.familyfunOcr="1";
  tag.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  tag.onload=()=>resolve();tag.onerror=()=>reject(new Error("無法載入免費 OCR，請改用手動輸入文字"));
  document.head.appendChild(tag);
 });
}
export default function PosterTipForm(){
 const [src,setSrc]=useState("");const [crop,setCrop]=useState({x:0,y:0,w:100,h:100});
 const [fields,setFields]=useState<Record<Field,string>>(blank);const [raw,setRaw]=useState("");
 const [message,setMessage]=useState("");const [loading,setLoading]=useState(false);const [sending,setSending]=useState(false);
 const [consent,setConsent]=useState(false);const [trap,setTrap]=useState("");
 const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{const paste=(ev:ClipboardEvent)=>{const file=Array.from(ev.clipboardData?.files||[]).find(f=>f.type.startsWith("image/"));if(file){ev.preventDefault();void select(file);}};window.addEventListener("paste",paste);return()=>window.removeEventListener("paste",paste);},[]);
 async function select(file:File){if(!/^image\/(png|jpeg|webp)$/.test(file.type)){setMessage("請使用 JPG、PNG 或 WebP 圖片");return;}if(file.size>8*1024*1024){setMessage("圖片不可超過 8MB");return;}
 const reader=new FileReader();reader.onload=()=>{setSrc(String(reader.result||""));setCrop({x:0,y:0,w:100,h:100});setMessage("");};reader.readAsDataURL(file);}
 async function cropped():Promise<string>{
  return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{const sx=Math.round(image.naturalWidth*crop.x/100),sy=Math.round(image.naturalHeight*crop.y/100),sw=Math.max(1,Math.round(image.naturalWidth*crop.w/100)),sh=Math.max(1,Math.round(image.naturalHeight*crop.h/100));const canvas=document.createElement("canvas");const scale=Math.min(1,1600/Math.max(sw,sh));canvas.width=Math.max(1,Math.round(sw*scale));canvas.height=Math.max(1,Math.round(sh*scale));canvas.getContext("2d")?.drawImage(image,sx,sy,sw,sh,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.8));};image.onerror=()=>reject(new Error("圖片讀取失敗"));image.src=src;});
 }
 async function readPoster(){if(!src)return;setLoading(true);setMessage("正在本機辨認海報文字，首次可能需下載語言資料…");try{await loadOCR();const image=await cropped();const result=await window.Tesseract!.recognize(image,"chi_tra+eng");const text=result.data.text.trim();setRaw(text);setFields(old=>({...old,...Object.fromEntries(Object.entries(guess(text)).filter(([,v])=>Boolean(v)))}));setMessage(text?"已抽取文字。請核對所有日期、時間及收費，必要時可手動修改。":"未能辨認文字，請手動輸入。");}catch(e){setMessage(e instanceof Error?e.message:"辨認失敗，請手動填寫。");}finally{setLoading(false);}}
 function edit(key:Field,value:string){setFields(old=>({...old,[key]:value}));}
 async function submit(e:React.FormEvent){e.preventDefault();if(!consent){setMessage("請確認資料可以提供 HK Family Fun 作審核用途");return;}setSending(true);setMessage("");try{
  const poster=src?await cropped():"";
  const r=await fetch("/api/tips/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...fields,ocr_text:raw,poster,honeypot:trap})});
  const j=await r.json();if(!r.ok)throw new Error(j.error||"提交失敗");
  setMessage("已收到活動資料及海報，會交由 HK Family Fun 審核，並不代表已公開上架。");setSrc("");setRaw("");setFields(blank);setConsent(false);
 }catch(e){setMessage(e instanceof Error?e.message:"提交失敗，請改用 Email");}finally{setSending(false);}}
 const controls:[Field,string,string][]=[["title","活動名稱 *","text"],["date","活動日期（可輸入多個日期）","text"],["time","活動時間（包括不同日子的場次）","text"],["venue","場地／地址","text"],["district","地區","text"],["price","收費／免費","text"],["url","官方／報名連結","url"],["contact","聯絡電郵（選填）","email"]];
 return <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8" aria-labelledby="poster-tip-heading">
  <div className="rounded-[2rem] border border-emerald-200 bg-white p-5 shadow-sm sm:p-8">
   <p className="text-sm font-bold text-emerald-700">免費 · 海報快速建立活動</p>
   <h2 id="poster-tip-heading" className="mt-2 text-2xl font-black">拖入活動海報，自動填寫活動資料</h2>
   <p className="mt-2 text-sm leading-7 text-slate-600">支援拖放、貼上截圖（Ctrl+V）或選擇相片。裁剪後可免費辨認海報文字；資料只作初步建議，請先核對再提交。</p>
   <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const file=e.dataTransfer.files[0];if(file)void select(file);}}
     className="mt-5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 p-5 text-center">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void select(file);e.target.value="";}} className="sr-only" aria-label="上傳活動海報"/>
    <button type="button" onClick={()=>input.current?.click()} className="rounded-full bg-emerald-700 px-5 py-3 font-bold text-white">選擇海報／圖片</button>
    <p className="mt-3 text-xs text-slate-500">JPG / PNG / WebP · 不多於 8MB · 亦可直接拖放或貼上圖片</p>
   </div>
   {src&&<div className="mt-5 grid gap-5 lg:grid-cols-2">
    <div><p className="mb-2 font-bold">海報裁剪預覽</p><div className="relative overflow-hidden rounded-xl bg-slate-100"><img alt="海報裁剪預覽" src={src} className="w-full" /><div aria-hidden="true" className="pointer-events-none absolute border-2 border-emerald-600 bg-emerald-400/10" style={{left:crop.x+"%",top:crop.y+"%",width:crop.w+"%",height:crop.h+"%"}}/></div></div>
    <div className="space-y-3"><p className="font-bold">調整擷取範圍</p>{([["x","左邊起點"],["y","上邊起點"],["w","寬度"],["h","高度"]] as const).map(([key,label])=><label key={key} className="block text-sm">{label}：{crop[key]}%<input type="range" min={key==="w"||key==="h"?10:0} max={key==="w"?100-crop.x:key==="h"?100-crop.y:key==="x"?100-crop.w:100-crop.h} value={crop[key]} onChange={e=>setCrop(old=>({...old,[key]:Number(e.target.value)}))} className="mt-1 block w-full accent-emerald-700"/></label>)}
     <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>setCrop({x:0,y:0,w:100,h:100})} className="rounded-full border px-4 py-2 text-sm">重設裁剪</button><button type="button" disabled={loading} onClick={()=>void readPoster()} className="rounded-full bg-purple-700 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">{loading?"正在辨認…":"免費抽取海報文字"}</button></div>
    </div>
   </div>}
   <form onSubmit={e=>void submit(e)} className="mt-7 space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">{controls.map(([key,label,type])=><label key={key} className="block text-sm font-semibold text-slate-700">{label}<input required={key==="title"} type={type} value={fields[key]} onChange={e=>edit(key,e.target.value)} maxLength={key==="url"?800:320} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" placeholder={key==="date"?"例：10月23、24、30日":key==="time"?"例：星期六 10:00–16:00":""}/></label>)}</div>
    <label className="block text-sm font-semibold">活動介紹／注意事項<textarea rows={4} value={fields.details} onChange={e=>edit("details",e.target.value)} maxLength={4500} className="mt-1 w-full rounded-xl border border-slate-300 p-3 font-normal" placeholder="可直接貼上活動說明，或修改辨認結果"/></label>
    <label className="hidden" aria-hidden="true">網站地址<input tabIndex={-1} value={trap} onChange={e=>setTrap(e.target.value)}/></label>
    <label className="flex gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>我有權提交此活動資料及海報供 HK Family Fun 審核，並明白提交不等於活動已獲批准或上架。</span></label>
    {message&&<p role="status" className="rounded-xl bg-slate-100 p-3 text-sm text-slate-800">{message}</p>}
    <button disabled={sending||!fields.title.trim()} type="submit" className="rounded-full bg-purple-700 px-7 py-3 font-bold text-white disabled:opacity-60">{sending?"正在提交…":"提交活動資料及海報供審核"}</button>
    <p className="text-xs leading-6 text-slate-500">OCR 在瀏覽器處理，不使用收費 AI API；首次執行會向第三方 CDN 下載開源辨認程式與語言模型。提交時海報及填寫資料會發送予 HK Family Fun。</p>
   </form>
  </div>
 </section>;
}
