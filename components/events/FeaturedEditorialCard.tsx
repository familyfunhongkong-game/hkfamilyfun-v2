import Link from "next/link";
import type { Event } from "@/lib/types";
import type { AppLocale } from "@/lib/i18n/config";
import ResilientEventImage from "@/components/resilient-event-image";

export default function FeaturedEditorialCard({event,locale}:{event:Event;locale:AppLocale}) {
 const cta=locale==="en"?"Discover more":locale==="zh-Hans"?"了解更多":"了解更多";
 const kicker=locale==="en"?"HK Family Fun Pick":locale==="zh-Hans"?"精选推介":"精選推介";
 return <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
  <Link href={`/featured/${encodeURIComponent(event.id)}`} className="block aspect-[16/10] overflow-hidden bg-slate-100" aria-label={`${cta}：${event.title}`}>
   <ResilientEventImage src={event.image} alt={event.title} loading="lazy" compactFallback className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"/>
  </Link>
  <div className="flex flex-1 flex-col gap-3 p-5">
   <p className="text-xs font-bold text-purple-700">{kicker}{event.category?" · "+event.category:""}</p>
   <h3 className="line-clamp-2 text-xl font-extrabold leading-snug text-slate-950">{event.title}</h3>
   {event.shortDescription&&<p className="line-clamp-2 text-sm leading-6 text-slate-600">{event.shortDescription}</p>}
   <div className="mt-auto flex items-center justify-between gap-3 pt-2">
    <span className="truncate text-xs text-slate-500">{event.district}</span>
    <Link href={`/featured/${encodeURIComponent(event.id)}`} className="inline-flex shrink-0 items-center justify-center rounded-full bg-purple-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-800">{cta} ↗</Link>
   </div>
  </div>
 </article>;
}
