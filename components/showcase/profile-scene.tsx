"use client";

import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { useRef, type CSSProperties } from "react";
import type { Person } from "@/lib/validation";
import { Portrait } from "../portrait";
import { Header } from "../site-chrome";

gsap.registerPlugin(useGSAP);

export function ProfileScene({ person, previous, next, index, demo }: {
  person: Person; previous: Person | null; next: Person | null; index: number; demo: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useGSAP((context, contextSafe) => {
    const safe = contextSafe!;
    const mm = gsap.matchMedia();
    mm.add({ animate: "(prefers-reduced-motion: no-preference)" }, (matchMedia) => {
      if (!matchMedia.conditions?.animate) return;
      const chars = gsap.utils.toArray<HTMLElement>(".spotlight-name-char", root.current);
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      // The portrait flies in from depth — a fake-3D driver reveal on a perspective stage.
      timeline.fromTo(stage.current,
        { autoAlpha: 0, rotationY: 16, rotationX: 5, z: -240, scale: 1.16, transformOrigin: "72% 68%" },
        { autoAlpha: 1, rotationY: 0, rotationX: 0, z: 0, scale: 1, duration: 1.7, ease: "expo.out" }, 0)
        .fromTo(".spotlight-atmosphere", { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 1.5 }, 0.1)
        .from(".spotlight-giant-number", { xPercent: 18, autoAlpha: 0, duration: 1.2, ease: "power2.out" }, 0.25)
        .from(".spotlight-back", { y: 14, autoAlpha: 0, duration: 0.7 }, 0.55)
        .from(chars, { yPercent: 118, rotationX: -55, autoAlpha: 0, transformPerspective: 600, transformOrigin: "50% 100%", duration: 0.9, ease: "back.out(1.4)", stagger: 0.055 }, 0.6)
        .from(".spotlight-name-echo", { autoAlpha: 0, x: -22, duration: 1 }, 0.95)
        .from(".spotlight-alias", { y: 22, autoAlpha: 0, duration: 0.7 }, 0.92)
        .from(".spotlight-biography", { y: 26, autoAlpha: 0, duration: 0.8 }, 1.04)
        .from(".spotlight-navigation", { y: 30, autoAlpha: 0, duration: 0.8 }, 1.18);
      // After landing, the stage follows the pointer with a subtle fake-3D tilt.
      const tilt: Record<string, (value: number) => void> | null = stage.current ? {
        x: gsap.quickTo(stage.current, "x", { duration: 1, ease: "power3.out" }),
        y: gsap.quickTo(stage.current, "y", { duration: 1, ease: "power3.out" }),
        ry: gsap.quickTo(stage.current, "rotationY", { duration: 0.9, ease: "power3.out" }),
        rx: gsap.quickTo(stage.current, "rotationX", { duration: 0.9, ease: "power3.out" }),
      } : null;
      const onMove = safe((event: PointerEvent) => {
        if (!tilt || event.pointerType !== "mouse") return;
        const target = event.currentTarget as HTMLElement;
        const nx = event.clientX / target.offsetWidth - 0.5;
        const ny = (event.clientY - target.offsetTop) / target.offsetHeight - 0.5;
        tilt.x(nx * 26); tilt.y(ny * 15);
        tilt.ry(nx * 3.2); tilt.rx(-ny * 2.2);
      });
      const onLeave = safe(() => {
        if (!tilt) return;
        for (const tween of Object.values(tilt)) tween(0);
      });
      const element = root.current;
      element?.addEventListener("pointermove", onMove);
      element?.addEventListener("pointerleave", onLeave);
      return () => { element?.removeEventListener("pointermove", onMove); element?.removeEventListener("pointerleave", onLeave); };
    });
  }, { scope: root });

  return <div className="spotlight-page" style={{ "--person-accent": person.accentColor } as CSSProperties}><Header dark overlay demo={demo} /><main id="main-content" className="spotlight" ref={root}>
    <div className="spotlight-atmosphere" aria-hidden="true"><Portrait src={person.background || person.portrait} alt="" /></div>
    <div className="spotlight-image" ref={stage}><Portrait src={person.portrait} alt={`${person.name}的展示图片`} fetchPriority="high" loading="eager" /></div>
    <div className="spotlight-color-wash" aria-hidden="true" /><div className="spotlight-shade" aria-hidden="true" /><div className="spotlight-track" aria-hidden="true" /><div className="spotlight-grain" aria-hidden="true" /><div className="spotlight-light-sweep" aria-hidden="true" />
    <span className="spotlight-giant-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
    <div className="shell spotlight-content"><Link href="/" className="spotlight-back"><ArrowLeft size={15} />返回人物全览</Link><div className="spotlight-copy">
      <div className="spotlight-name-wrap"><span className="spotlight-name-echo" aria-hidden="true">{person.name}</span><h1 className={person.name.length > 6 ? "long-name" : ""} aria-label={person.name}>{Array.from(person.name).map((char, i) => <span key={i} className="name-char-mask" aria-hidden="true"><span className="spotlight-name-char">{char === " " ? "\u00A0" : char}</span></span>)}<span className="spotlight-name-dot" aria-hidden="true">.</span></h1></div>
      {person.nickname && <div className="spotlight-alias"><span className="alias-line" /><span>{person.nickname}</span><ArrowUpRight size={19} /></div>}
      <section className="spotlight-biography" aria-label="简介"><span className="spotlight-bio-label">BEHIND THE NAME / 简介</span>{person.biography.split(/\n\s*\n/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</section>
    </div><div className="spotlight-navigation"><Link href="/" className="spotlight-all">THE LINEUP <ArrowUpRight size={14} /><span>全部人物</span></Link>{previous && next ? <><Link href={`/people/${previous.slug}`} className="spotlight-person-nav prev" aria-label={`上一位：${previous.name}`}><ArrowLeft size={18} /><span><small>PREVIOUS</small>{previous.name}</span></Link><Link href={`/people/${next.slug}`} className="spotlight-person-nav next" aria-label={`下一位：${next.name}`}><span><small>NEXT PERSONALITY</small>{next.name}</span><Portrait src={next.avatar || next.portrait} alt="" width={42} height={49} /><ArrowRight size={20} /></Link></> : <span className="spotlight-single">每一个人，都有自己的主场。</span>}</div></div>
  </main></div>;
}
