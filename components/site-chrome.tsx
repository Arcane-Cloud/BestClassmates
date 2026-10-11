"use client";

import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useState } from "react";

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <Link href="/" className={`brand ${inverse ? "inverse" : ""}`} aria-label="最佳同学，返回人物全览"><span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span><span className="brand-type">最佳同学<span>BEST CLASSMATES</span></span><sup>®</sup></Link>;
}
export function Header({ dark = false, demo = false, overlay = false }: { dark?: boolean; demo?: boolean; overlay?: boolean }) {
  const [open, setOpen] = useState(false);
  return <header className={`site-header ${dark ? "header-dark" : ""} ${overlay ? "header-overlay" : ""}`}><div className="shell header-inner"><Brand inverse={dark} /><nav className={`main-nav ${open ? "is-open" : ""}`} id="main-navigation" aria-label="主导航"><Link href="/" onClick={() => setOpen(false)}>人物全览 <span>THE LINEUP</span></Link><Link href="/admin" className="mobile-admin" onClick={() => setOpen(false)}>管理后台 <ArrowUpRight size={15} /></Link></nav><div className="header-right">{demo && <span className="demo-label"><span /> 演示模式</span>}<Link href="/admin" className="admin-link">管理后台 <ArrowUpRight size={15} /></Link><button className="icon-button menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="main-navigation" aria-label={open ? "关闭导航" : "展开导航"}>{open ? <X size={22} /> : <Menu size={22} />}</button></div></div></header>;
}
export function Footer() {
  return <footer className="site-footer"><div className="shell footer-inner"><Brand /><p>每一个独特的你，都值得被看见。<span>EVERY PERSON. AN ORIGINAL.</span></p><span className="footer-copyright">© {new Date().getFullYear()} BEST CLASSMATES</span></div></footer>;
}
