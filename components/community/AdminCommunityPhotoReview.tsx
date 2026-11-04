"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Photo = {image_position:number;storage_path:string};
export default function AdminCommunityPhotoReview({postId}:{postId:string}) {
  const [urls,setUrls]=useState<Array<{position:number;url:string}>>([]);
  const [loading,setLoading]=useState(true);
  const [problem,setProblem]=useState("");
  useEffect(()=>{
    let alive=true;
    async function load(){
      if(!supabase){if(alive){setProblem("未能連接圖片儲存服務。");setLoading(false);}return;}
      const {data,error}=await supabase.from("community_tip_photos").select("image_position,storage_path")
        .eq("post_id",postId).order("image_position",{ascending:true}).limit(4);
      if(!alive)return;
      if(error){setProblem("未能載入私人圖片，請勿批准投稿。");setLoading(false);return;}
      const images: Array<{position:number;url:string}> = [];
      for(const item of (data || []) as Photo[]){
        const {data:link,error:signError}=await supabase.storage.from("community-tip-images")
          .createSignedUrl(item.storage_path,120);
        if(signError || !link?.signedUrl){
          if(alive)setProblem("有圖片未能預覽，請先解決問題再審批。");
          continue;
        }
        images.push({position:item.image_position,url:link.signedUrl});
      }
      if(alive){setUrls(images);setLoading(false);}
    }
    void load();
    return()=>{alive=false;};
  },[postId]);
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-black text-slate-800">投稿圖片審核（最多 4 張）</p>
      {loading?<p className="mt-2 text-xs text-slate-500">載入圖片…</p>:null}
      {problem?<p role="alert" className="mt-2 text-xs font-bold text-rose-700">{problem}</p>:null}
      {!loading && !problem && !urls.length?<p className="mt-2 text-xs text-slate-500">此則投稿沒有上載圖片。</p>:null}
      <div className="mt-2 grid grid-cols-2 gap-2">
        {urls.map((photo)=>(
          // Signed URL is valid briefly and remains private to the Admin view.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={photo.position} src={photo.url} loading="lazy"
            alt={"待審批社區圖片 "+(photo.position+1)}
            className="max-h-64 w-full rounded-xl bg-white object-contain"/>
        ))}
      </div>
    </div>
  );
}
