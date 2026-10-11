"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, LayoutGrid, LogOut, Plus, ShieldCheck, Database, Menu, X } from "lucide-react";
import { Brand } from "../site-chrome";
import type { ReactNode } from "react";

export function AdminShell({ children, email, demo = false }: { children: ReactNode; email?: string; demo?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const logout = async () => {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth", { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error || "退出失败");
      router.replace("/admin/login"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "无法退出，请重试"); }
    finally { setPending(false); }
  };
  return <div className="admin-app">
    <div className="admin-mobile-bar"><Brand /><button className="icon-button" aria-label={open ? "关闭后台导航" : "打开后台导航"} aria-expanded={open} aria-controls="admin-sidebar" onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button></div>
    <aside id="admin-sidebar" className={`admin-sidebar ${open ? "open" : ""}`}><Brand /><span className="admin-sidebar-caption">THE EDITORIAL ROOM</span><nav aria-label="后台导航"><Link href="/admin" className="active" onClick={() => setOpen(false)}><LayoutGrid size={17} /> 人物管理 <span>01</span></Link>{demo ? <span className="disabled-nav"><Plus size={17} /> 添加人物 <span>配置后启用</span></span> : <Link href="/admin/people/new" onClick={() => setOpen(false)}><Plus size={17} /> 添加人物</Link>}<Link href="/" target="_blank" rel="noopener noreferrer"><ArrowUpRight size={17} /> 查看展示站</Link></nav><div className="admin-sidebar-bottom"><ShieldCheck size={23} /><p>每个故事，值得认真记录。</p><span>{demo ? "READ-ONLY DEMO" : email}</span>{!demo && <button data-leave-editor onClick={logout} disabled={pending}><LogOut size={14} />{pending ? "正在退出…" : "安全退出"}</button>}{error && <p role="alert" className="form-error">{error}</p>}</div></aside>
    <div className="admin-workspace"><header className="admin-topbar"><span>WORKSPACE <i>/</i> 人物档案管理</span><Link href="/"><ArrowLeft size={13} /> 返回展示站</Link></header><main id="main-content" className="admin-content">{demo && <div className="admin-demo-banner"><Database size={20} /><div><strong>只读演示模式</strong><p>当前未连接 MySQL。可浏览管理界面，保存和上传功能在配置数据库后启用。</p></div><Link href="/admin/login">配置说明 <ArrowUpRight size={15} /></Link></div>}{children}</main><footer className="admin-footer">BEST CLASSMATES® <span>让独特被看见。</span></footer></div>
  </div>;
}
