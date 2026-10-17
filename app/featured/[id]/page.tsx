import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedEvents } from "@/lib/supabase/events";
import { getServerLocale } from "@/lib/i18n/server";
import ResilientEventImage from "@/components/resilient-event-image";
import PublicEventCard from "@/components/events/PublicEventCard";

export const dynamic="force-dynamic";
export default async function FeaturedStory({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const locale=await getServerLocale();
 const event=(await getPublishedEvents(locale)).find(e=>e.id===id&&e.featured);
 if(!event) notFound();
 const en=locale==="en",sc=locale==="zh-Hans";
 const label=(tc:string,zh:string,english:string)=>en?english:sc?zh:tc;
 return <main className="min-h-screen bg-slate-50 pb-20 text-slate-950">
  <article className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
   <nav className="mb-5 text-sm text-slate-500"><Link className="hover:text-purple-700" href="/">{label("首頁","首页","Home")}</Link> / {label("精選推介","精选推介","Featured story")}</nav>
   <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
    <div className="p-6 sm:p-10">
     <p className="text-sm font-bold text-purple-700">{label("HK Family Fun 精選推介","HK Family Fun 精选推介","HK Family Fun Picks")}</p>
     <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{event.title}</h1>
     {event.shortDescription&&<p className="mt-4 text-lg leading-8 text-slate-600">{event.shortDescription}</p>}
    </div>
    <div className="aspect-[16/9] bg-slate-100"><ResilientEventImage src={event.image} alt={event.title} compactFallback className="h-full w-full object-contain"/></div>
    <div className="space-y-8 p-6 sm:p-10">
     <section><h2 className="mb-3 text-2xl font-bold">{label("活動介紹","活动介绍","About this experience")}</h2><div className="whitespace-pre-line break-words text-base leading-8 text-slate-700">{event.description||event.shortDescription}</div></section>
     {event.tags?.length>0&&<section><h2 className="mb-3 text-xl font-bold">{label("活動亮點","活动亮点","Highlights")}</h2><div className="flex flex-wrap gap-2">{event.tags.map(tag=><span key={tag} className="rounded-full bg-purple-50 px-3 py-1.5 text-sm font-semibold text-purple-800">{tag}</span>)}</div></section>}
     <section id="event-details" className="scroll-mt-24 border-t border-slate-200 pt-8"><h2 className="mb-4 text-2xl font-bold">{label("活動詳情及報名","活动详情及报名","Event details and booking")}</h2><div className="max-w-xl"><PublicEventCard event={event} locale={locale}/></div></section>
    </div>
   </div>
  </article>
 </main>;
}
