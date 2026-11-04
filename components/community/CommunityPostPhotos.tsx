"use client";
import { useEffect, useState } from "react";

type Photo = {position:number;url:string};
export default function CommunityPostPhotos({postId,title}:{postId:string;title:string}) {
  const [photos,setPhotos]=useState<Photo[]>([]);
  useEffect(()=>{
    let live=true;
    const controller=new AbortController();
    void fetch("/api/community/post-images?post_id="+encodeURIComponent(postId),{
      signal:controller.signal,cache:"no-store",
    }).then(async(response)=>{
      if(!response.ok) return {images:[] as Photo[]};
      return response.json() as Promise<{images:Photo[]}>;
    }).then((data)=>{
      if(live) setPhotos(Array.isArray(data.images)?data.images.slice(0,4):[]);
    }).catch(()=>{ /* No public image available; do not expose private paths. */ });
    return ()=>{live=false;controller.abort();};
  },[postId]);
  if(!photos.length)return null;
  return (
    <div className={`mt-4 grid gap-2 ${photos.length>1?"grid-cols-2":"grid-cols-1"}`}>
      {photos.map((photo)=>(
        // Signed image URL only exists after Admin approved the post.
        // eslint-disable-next-line @next/next/no-img-element
        <img key={photo.position} src={photo.url} alt={title+" — 分享圖片 "+(photo.position+1)}
          loading="lazy" className="max-h-80 w-full rounded-xl bg-slate-100 object-contain"/>
      ))}
    </div>
  );
}
