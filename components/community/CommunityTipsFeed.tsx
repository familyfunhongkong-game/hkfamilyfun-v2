"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CommunityReplies from "@/components/community/CommunityReplies";
import CommunityPostPhotos from "@/components/community/CommunityPostPhotos";
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";

const districts = [
  "中西區","灣仔","東區","南區","油尖旺","深水埗","九龍城","黃大仙","觀塘",
  "葵青","荃灣","屯門","元朗","北區","大埔","沙田","西貢","離島",
] as const;
const categories = ["親子工作坊","免費活動","藝術文化","戶外活動","STEM","SEN友善","其他"] as const;
type CommunityPost = {
  id: string; display_name: string; title: string;
  body: string; district: string; category: string; event_date: string | null;
  source_url: string | null; created_at: string;
};
const textInput = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-purple-500";
const maxPhotos=4;
const maxPhotoBytes=5*1024*1024;
const allowedPhotoTypes=new Set(["image/jpeg","image/png","image/webp"]);

function validExternalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !!url.hostname;
  } catch { return false; }
}

export default function CommunityTipsFeed() {
  const [posts,setPosts] = useState<CommunityPost[]>([]);
  const [mine,setMine]=useState<Array<{id:string;title:string;status:string;created_at:string}>>([]);
  const [district,setDistrict] = useState("");
  const [category,setCategory] = useState("");
  const [keyword,setKeyword] = useState("");
  const [loading,setLoading] = useState(true);
  const [page,setPage] = useState(0);
  const [hasMore,setHasMore] = useState(false);
  const pageSize=20;
  const [loadError,setLoadError] = useState("");
  const [composerOpen,setComposerOpen] = useState(false);
  const [authorId,setAuthorId] = useState<string | null>(null);
  const [form,setForm] = useState({display_name:"",title:"",body:"",district:"",category:"親子工作坊",event_date:"",source_url:""});
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");
  const [photos,setPhotos] = useState<File[]>([]);
  const [myLikes,setMyLikes] = useState<string[]>([]);
  const [likeCounts,setLikeCounts] = useState<Record<string,number>>({});
  const [liking,setLiking] = useState("");
  const [error,setError] = useState("");

  useEffect(() => {
    if (!supabase) { setLoading(false); setLoadError("社區服務暫時未設定，請稍後再試。"); return; }
    const client = supabase;
    const {data: listener}=client.auth.onAuthStateChange((_event,session)=>setAuthorId(session?.user?.id ?? null));
    void client.auth.getUser().then(({data})=>setAuthorId(data.user?.id??null));
    return () => listener.subscription.unsubscribe();
  },[]);

  useEffect(() => {
    const client=supabase;
    if(!client){setLoading(false);return;}
    let active=true;
    const timer=setTimeout(async()=>{
      setLoading(true);
      let request=client.from("community_tips")
        .select("id,display_name,title,body,district,category,event_date,source_url,created_at")
        .eq("status","approved").order("created_at",{ascending:false})
        .range(page*pageSize,(page+1)*pageSize);
      if(district) request=request.eq("district",district);
      if(category) request=request.eq("category",category);
      // Escape characters with special meaning in PostgreSQL LIKE patterns.
      const search=keyword.trim().replace(/[\\%_]/g, c=>"\\"+c).replace(/[(),.]/g," ");
      if(search) request=request.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
      const {data,error:queryError}=await request;
      if(!active)return;
      setPosts(((data??[]) as CommunityPost[]).slice(0,pageSize));
      setHasMore((data??[]).length>pageSize);
      setLoadError(queryError?"社區資料暫時無法讀取，請稍後再試。":"");
      setLoading(false);
    },250);
    return ()=>{active=false;clearTimeout(timer);};
  },[district,category,keyword,page]);

  const shown = useMemo(() => posts,[posts]);
  useEffect(()=>{
    if(!supabase || !posts.length) {setLikeCounts({});setMyLikes([]);return;}
    let active=true;
    const ids=posts.map((post)=>post.id);
    void supabase.from("community_tip_like_totals").select("post_id,like_count")
      .in("post_id",ids).then(({data})=>{
        if(!active)return;
        const counts:Record<string,number>={};
        for(const row of data||[]) counts[row.post_id]=Number(row.like_count)||0;
        setLikeCounts(counts);
      });
    if(authorId) void supabase.from("community_tip_likes").select("post_id").eq("user_id",authorId)
      .in("post_id",ids).then(({data})=>{
        if(active)setMyLikes((data||[]).map((row)=>row.post_id));
      });
    else setMyLikes([]);
    return ()=>{active=false;};
  },[posts,authorId]);

  async function toggleLike(postId:string){
    if(!supabase || !authorId){setNotice("請先登入免費會員，先可以讚好活動報料。");return;}
    if(liking)return;
    setLiking(postId);
    const previouslyLiked=myLikes.includes(postId);
    const {error:likeError}=previouslyLiked ?
      await supabase.from("community_tip_likes").delete().eq("post_id",postId).eq("user_id",authorId) :
      await supabase.from("community_tip_likes").insert({post_id:postId,user_id:authorId});
    if(likeError)setNotice("暫時未能更新讚好，請稍後再試。");
    else{
      setMyLikes((old)=>previouslyLiked?old.filter((id)=>id!==postId):[...old,postId]);
      setLikeCounts((old)=>({...old,[postId]:Math.max(0,(old[postId]||0)+(previouslyLiked?-1:1))}));
    }
    setLiking("");
  }


  useEffect(()=>{
    if(!supabase||!authorId){setMine([]);return;}
    let active=true;
    void supabase.from("community_tips").select("id,title,status,created_at")
      .eq("author_id",authorId).order("created_at",{ascending:false}).limit(10)
      .then(({data})=>{if(active)setMine(data??[]);});
    return()=>{active=false;};
  },[authorId,notice]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");setNotice("");
    if (!supabase || !isSupabaseConfigured) { setError("社區服務暫時無法使用。");return; }
    const {data:{user}}=await supabase.auth.getUser();
    if (!user) { setError("為防止垃圾廣告，請先登入免費會員帳戶再發帖。");return; }
    if (!form.title.trim() || !form.body.trim() || !form.district || !form.display_name.trim()) {
      setError("請填妥稱呼、標題、活動詳情及地區。");return;
    }
    if (!validExternalUrl(form.source_url)) { setError("活動連結必須以 https:// 或 http:// 開頭。");return; }
    if (form.title.length>120 || form.body.length>3000 || form.display_name.length>50) {
      setError("文字超出長度限制（標題120字、內容3000字）。");return;
    }
    if(photos.length>maxPhotos || photos.some((file)=>file.size>maxPhotoBytes || !allowedPhotoTypes.has(file.type))){
      setError("最多可上載四張 JPG／PNG／WebP 圖片，每張不得超過 5MB。");return;
    }
    setSaving(true);
    const {data:created,error: insertError}=await supabase.from("community_tips").insert({
      author_id:user.id,display_name:form.display_name.trim(),title:form.title.trim(),body:form.body.trim(),
      district:form.district,category:form.category,event_date:form.event_date||null,
      source_url:form.source_url.trim()||null,status:"pending",
    }).select("id").single();
    if (insertError || !created) { setSaving(false);setError("投稿未能送出，請稍後再試。");return; }
    let failedPhotos=0;
    for(const [position,file] of photos.entries()){
      const extension=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"webp";
      const storagePath=`${user.id}/${created.id}/${position}-${crypto.randomUUID()}.${extension}`;
      const {error:uploadError}=await supabase.storage.from("community-tip-images")
        .upload(storagePath,file,{upsert:false,contentType:file.type,cacheControl:"60"});
      if(uploadError){failedPhotos++;continue;}
      const {error:recordError}=await supabase.from("community_tip_photos").insert({
        post_id:created.id,image_position:position,author_id:user.id,storage_path:storagePath,
      });
      if(recordError){failedPhotos++;await supabase.storage.from("community-tip-images").remove([storagePath]);}
    }
    setSaving(false);
    setNotice(failedPhotos
      ? `投稿已接收並等待審批，但有 ${failedPhotos} 張圖片上載失敗。請聯絡 Admin 補圖。`
      : "投稿連同圖片已收到！管理員審批後才公開。");
    setPhotos([]);
    setForm({display_name:"",title:"",body:"",district:"",category:"親子工作坊",event_date:"",source_url:""});
    setComposerOpen(false);
  }

  return (
    <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8" aria-labelledby="community-title">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-black tracking-wide text-emerald-700">FAMILY FUN COMMUNITY</p>
            <h2 id="community-title" className="mt-1 text-2xl font-black">親子活動交流區</h2>
            <p className="mt-2 text-sm text-slate-600">家長同主辦方都可以分享 Workshop、免費活動及親子好去處。</p>
          </div>
          <button type="button" onClick={()=>setComposerOpen(!composerOpen)} className="rounded-full bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800">
            {composerOpen?"收起投稿":"＋ 分享活動"}
          </button>
        </div>
        {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
        {composerOpen && (
          <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border border-purple-200 bg-purple-50/60 p-4 sm:p-5">
            <p className="text-sm font-bold text-purple-900">分享一個你發現嘅親子活動（免費投稿，審核後公開）</p>
            {!authorId && <p className="text-sm text-amber-900">需要先登入免費會員帳戶，避免匿名垃圾廣告。你仍然可以先填寫內容。 <Link href="/login" className="font-black underline">登入／免費註冊 →</Link></p>}
            <input aria-label="顯示名稱" className={textInput} placeholder="顯示名稱／主辦單位" value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})} maxLength={50} required/>
            <input aria-label="活動標題" className={textInput} placeholder="活動標題，例如：沙田週末親子陶藝工作坊" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} maxLength={120} required/>
            <textarea aria-label="活動內容" className={textInput} rows={5} placeholder="活動詳情、日期、時間、費用、適合年齡、報名方法..." value={form.body} onChange={e=>setForm({...form,body:e.target.value})} maxLength={3000} required/>
            <div className="grid gap-3 sm:grid-cols-2">
              <select aria-label="活動地區" className={textInput} value={form.district} onChange={e=>setForm({...form,district:e.target.value})} required><option value="">選擇香港地區 *</option>{districts.map(d=><option key={d}>{d}</option>)}</select>
              <select aria-label="活動類別" className={textInput} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select>
              <label className="text-sm font-bold text-slate-700">活動日期（如適用）<input aria-label="活動日期" className={textInput+" mt-1"} type="date" value={form.event_date} onChange={e=>setForm({...form,event_date:e.target.value})}/></label>
              <label className="text-sm font-bold text-slate-700">活動／報名連結（如有）<input aria-label="活動連結" className={textInput+" mt-1"} type="url" placeholder="https://..." value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})} maxLength={500}/></label>
            </div>
            <label className="block text-sm font-bold text-slate-800">活動圖片（最多 4 張，審批前完全不公開）
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                onChange={(event)=>{
                  const chosen=Array.from(event.target.files||[]);
                  if(chosen.length>maxPhotos || chosen.some((file)=>file.size>maxPhotoBytes || !allowedPhotoTypes.has(file.type))) {
                    setError("最多四張圖片，每張 5MB 以下，只接受 JPG／PNG／WebP。");
                    setPhotos([]);event.currentTarget.value="";return;
                  }
                  setError("");setPhotos(chosen);
                }}
                className={textInput+" mt-2"} />
              {photos.length? <span className="mt-2 block text-xs text-purple-700">已選擇 {photos.length}／4 張：{photos.map((file)=>file.name).join("、")}</span>:null}
            </label>
            <p className="text-xs leading-6 text-slate-600">請只上載有權使用嘅圖片，避免兒童可識別相片、姓名或個人資料。所有圖片均先進入私人儲存空間，Admin 審批後先公開。</p>
            {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
            <button disabled={saving} className="w-fit rounded-full bg-purple-700 px-6 py-3 text-sm font-black text-white disabled:opacity-50">{saving?"提交中...":"提交審核"}</button>
          </form>
        )}
        {authorId&&mine.length>0&&<div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black">我嘅投稿進度</h3>
          <div className="mt-3 grid gap-2">{mine.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="max-w-xl truncate">{item.title}</span><span className="rounded-full bg-white px-3 py-1 text-xs font-bold">{item.status==="approved"?"已公開":item.status==="rejected"?"未通過審核":"待審批"}</span></div>)}</div>
        </div>}
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <input className={textInput} aria-label="搜尋活動關鍵字" placeholder="搜尋 Workshop、STEAM、免費..." value={keyword} onChange={e=>{setPage(0);setKeyword(e.target.value)}}/>
          <select aria-label="搜尋地區" className={textInput} value={district} onChange={e=>{setPage(0);setDistrict(e.target.value)}}><option value="">全港18區</option>{districts.map(d=><option key={d}>{d}</option>)}</select>
          <select aria-label="搜尋類別" className={textInput} value={category} onChange={e=>{setPage(0);setCategory(e.target.value)}}><option value="">所有活動類別</option>{categories.map(c=><option key={c}>{c}</option>)}</select>
        </div>
        <div className="mt-6 flex items-center justify-between"><h3 className="text-lg font-black">最新社區分享</h3><span className="text-xs text-slate-500">{shown.length} 則分享</span></div>
        {loading && <p className="mt-4 text-sm text-slate-600">載入社區分享中...</p>}
        {!loading && loadError && <p role="status" className="mt-4 text-sm text-amber-800">{loadError}</p>}
        {!loading && !loadError && shown.length===0 && <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-600">暫時未有符合條件嘅分享。歡迎成為第一位報料家長！</p>}
        <div className="mt-4 grid gap-4">
          {shown.map(post=><article key={post.id} id={"post-"+post.id} className="scroll-mt-28 rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span className="font-bold text-slate-800">{post.display_name}</span><span>·</span><span>{post.district}</span><span>·</span><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString("zh-HK",{timeZone:"Asia/Hong_Kong"})}</time></div>
            <h4 className="mt-3 text-lg font-black text-slate-950">{post.title}</h4>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{post.body}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">{post.category}</span>{post.event_date&&<span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{post.event_date}</span>}</div>
            <CommunityPostPhotos postId={post.id} title={post.title}/>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
              {post.source_url && <a className="font-bold text-blue-700 underline underline-offset-2" target="_blank" rel="noopener noreferrer nofollow ugc" href={post.source_url}>查看活動來源 ↗</a>}
              <button type="button" disabled={liking===post.id} aria-pressed={myLikes.includes(post.id)}
                className="font-black text-rose-700 disabled:opacity-40" onClick={()=>void toggleLike(post.id)}>
                {myLikes.includes(post.id)?"♥ 已讚好":"♡ 讚好"} ({likeCounts[post.id]||0})
              </button>
              <button type="button" className="text-slate-600 underline underline-offset-2" onClick={async()=>{
                const shareUrl=window.location.origin+"/tips#post-"+post.id;
                try{if(navigator.share)await navigator.share({title:post.title,url:shareUrl});
                else await navigator.clipboard.writeText(shareUrl);}
                catch{ /* User cancelled sharing or clipboard is unavailable. */ }
              }}>分享此報料</button>
              <a className="text-slate-600 underline underline-offset-2" href={`mailto:info@hkfamilyfun.com?subject=${encodeURIComponent("舉報社區帖文 "+post.id)}`}>舉報</a>
            </div>
            <CommunityReplies postId={post.id}/>
          </article>)}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3"><button type="button" disabled={page===0||loading} onClick={()=>setPage(v=>Math.max(0,v-1))} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-40">上一頁</button><span className="text-xs text-slate-500">第 {page+1} 頁</span><button type="button" disabled={!hasMore||loading} onClick={()=>setPage(v=>v+1)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-40">下一頁</button></div>
      </div>
    </section>
  );
}
