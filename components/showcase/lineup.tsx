"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, Search, X, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { filterPeople, type Person } from "@/lib/validation";
import { Portrait } from "../portrait";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Lineup({ people }: { people: Person[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => filterPeople(people, query), [people, query]);
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (context) => {
      if (!context.conditions?.animate) return;
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(".lineup-heading", { y: 26, autoAlpha: 0, duration: 0.7 })
        .from(".lineup-toolbar", { y: 14, autoAlpha: 0, duration: 0.6 }, 0.12);
    });
  }, { scope: root });

  // Re-dealt cards whenever the search filters the roster.
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (context) => {
      if (!context.conditions?.animate) return;
      const cards = gsap.utils.toArray<HTMLElement>(".person-card", root.current);
      cards.forEach((card, i) => {
        gsap.from(card, {
          y: 44, autoAlpha: 0, rotationX: 7, transformOrigin: "50% 100%", transformPerspective: 900,
          duration: 0.85, ease: "power3.out", delay: (i % 3) * 0.07,
          scrollTrigger: cards.length > 3 && i >= 3 ? { trigger: card, start: "top 92%", once: true } : undefined,
        });
      });
      const empty = root.current?.querySelector(".empty-state");
      if (empty) gsap.from(empty, { y: 20, autoAlpha: 0, duration: 0.5, ease: "power2.out" });
    });
  }, { scope: root, dependencies: [query], revertOnUpdate: true });

  return <section id="lineup" className="lineup shell" aria-labelledby="lineup-heading" ref={root}><div className="lineup-heading"><div><div className="eyebrow"><span className="red-dash" /> THE LINEUP / BEST CLASSMATES</div><h1 id="lineup-heading">人物全览<span>。</span></h1></div></div><div className="lineup-toolbar"><label className="search-field"><Search size={17} /><span className="sr-only">搜索名称、外号或简介</span><input type="search" placeholder="寻找熟悉的名字或外号…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button onClick={() => setQuery("")} aria-label="清除搜索" type="button"><X size={15} /></button>}</label></div><p className="sr-only" role="status">找到 {visible.length} 位人物</p><div className="people-grid">{visible.map((person, index) => <article key={person.id} className="person-card" style={{ "--person-accent": person.accentColor } as CSSProperties}><Link href={`/people/${person.slug}`} className="person-card-link" aria-label={`查看${person.name}的人物档案`}><Portrait src={person.portrait} alt={person.name} loading={index < 3 ? "eager" : "lazy"} width={700} height={900} /><div className="card-shade" /><span className="card-number" aria-hidden="true">{String(people.findIndex((p) => p.id === person.id) + 1).padStart(2, "0")}</span><div className="person-card-info"><span className="card-nickname">{person.nickname || "独一无二，自成风格"}</span><div><h2>{person.name}</h2><span className="card-arrow"><ArrowUpRight size={24} /></span></div></div></Link></article>)}</div>{visible.length === 0 && <div className="empty-state"><Users size={35} strokeWidth={1.3} /><h2>{people.length ? "还没有找到这位同学" : "下一位主角，正在登场"}</h2><p>{people.length ? "试试其他名称或外号。" : "管理员发布人物后，他们就会在这里与你见面。"}</p>{people.length > 0 && <button className="button button-outline" onClick={() => setQuery("")}>查看全部人物 <ArrowUpRight size={17} /></button>}</div>}</section>;
}
