import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
const limit = new Map<string,{count:number;until:number}>();
const fields = ["title","date","time","venue","district","price","url","details","contact"] as const;
const clean = (value:unknown,max:number) => typeof value==="string" ? value.trim().slice(0,max) : "";
export async function POST(req:NextRequest){
 const key=clean(req.headers.get("x-forwarded-for")?.split(",")[0]||"unknown",90);
 const now=Date.now(); const current=limit.get(key);
 if(current&&current.until>now&&current.count>=4)return NextResponse.json({error:"提交過於頻繁，請稍後再試。"}, {status:429});
 limit.set(key,{count:current&&current.until>now?current.count+1:1,until:now+3600_000});
 if(limit.size>1000)for(const [k,v] of limit){if(v.until<now)limit.delete(k);}
 let body:Record<string,unknown>;
 try{body=await req.json();}catch{return NextResponse.json({error:"請提供有效活動資料。"}, {status:400});}
 if(clean(body.honeypot,200))return NextResponse.json({ok:true});
 const data=Object.fromEntries(fields.map(key=>[key,clean(body[key],key==="details"?4500: key==="url"?800:320)])) as Record<(typeof fields)[number],string>;
 if(!data.title||data.title.length<3)return NextResponse.json({error:"請輸入活動名稱。"}, {status:400});
 if(data.contact&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact))return NextResponse.json({error:"聯絡電郵格式不正確。"}, {status:400});
 if(data.url){try{const u=new URL(data.url);if(!["https:","http:"].includes(u.protocol))throw Error();}catch{return NextResponse.json({error:"請輸入正確活動連結。"}, {status:400});}}
 const poster=clean(body.poster,3_000_000);
 if(poster&&!/^data:image\/jpeg;base64,[a-z0-9+/=]+$/i.test(poster))return NextResponse.json({error:"圖片資料格式不正確。"}, {status:400});
 const apiKey=process.env.RESEND_API_KEY;
 if(!apiKey)return NextResponse.json({error:"活動接收服務暫時未設定。請改用 info@hkfamilyfun.com 聯絡。"}, {status:503});
 const labels:Record<string,string>={title:"活動名稱",date:"日期",time:"時間",venue:"場地",district:"地區",price:"收費",url:"報名連結",details:"活動說明",contact:"聯絡電郵"};
 const text=fields.map(key=>labels[key]+"："+(data[key]||"未提供")).join("\n\n")+"\n\n來源：/tips 海報投稿；未審核，不可直接公開。";
 try {
  const response=await fetch("https://api.resend.com/emails",{
   method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
   body:JSON.stringify({
    from:"HK Family Fun <no-reply@hkfamilyfun.com>",to:[process.env.APPROVAL_EMAIL||"info@hkfamilyfun.com"],
    subject:"【待審批活動報料】"+data.title, text,
    ...(data.contact?{reply_to:data.contact}:{}),
    ...(poster?{attachments:[{filename:"event-poster.jpg",content:poster.slice("data:image/jpeg;base64,".length)}]}:{})
   })
  });
  if(!response.ok){console.error("tip submission email failed",response.status);return NextResponse.json({error:"暫時未能提交，請稍後再試或使用電郵報料。"}, {status:502});}
  return NextResponse.json({ok:true,status:"sent_for_review"});
 }catch{return NextResponse.json({error:"連線失敗，請稍後再試。"}, {status:502});}
}
