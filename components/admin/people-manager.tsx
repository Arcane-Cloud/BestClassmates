"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Edit3, Plus, Search, Trash2, Users, X } from "lucide-react";
import { filterPeople, type Person } from "@/lib/validation";
import { Portrait } from "../portrait";

export function PeopleManager({ people, demo }: { people: Person[]; demo: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [target, setTarget] = useState<Person | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = filterPeople(people, query).filter((person) => status === "all" || person.status === status);
  const remove = async () => {
    if (!target || demo) return;
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/people/${target.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "删除失败");
      dialog.current?.close(); setMessage(`已删除「${target.name}」。`); setTarget(null); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "删除失败，请重试"); }
    finally { setPending(false); }
  };
  return <><div className="admin-page-heading"><div><span className="eyebrow"><span className="red-dash" /> YOUR PEOPLE, YOUR STORIES</span><h1>人物管理<span>。</span></h1><p>名称、外号、简介。让每个人都有自己的主场。</p></div>{demo ? <button disabled className="button button-dark"><Plus size={17} />添加人物</button> : <Link href="/admin/people/new" className="button button-dark"><Plus size={17} />添加人物</Link>}</div>{message && <div className="form-success" role="status"><Check size={17} />{message}<button onClick={() => setMessage("")} aria-label="关闭提示"><X size={16} /></button></div>}<section className="people-manager"><div className="manager-toolbar"><div className="manager-status-tabs" aria-label="发布状态筛选">{[["all", "全部人物"], ["published", "已发布"], ["draft", "草稿"]].map(([value, label]) => <button key={value} aria-pressed={status === value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{label}<span>{people.filter((p) => value === "all" || p.status === value).length}</span></button>)}</div><label className="search-field"><Search size={16} /><span className="sr-only">搜索后台人物</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、外号…" type="search" /></label></div><div className="manager-table-heading compact" aria-hidden="true"><span>名称 / 外号</span><span>发布状态</span><span>排序</span><span>操作</span></div><div className="manager-rows">{visible.map((person) => <article key={person.id} className="manager-row compact"><div className="manager-person"><Portrait src={person.avatar || person.portrait} alt="" width={46} height={52} /><div><h2>{person.name}</h2><p>{person.nickname || "暂无外号"}</p></div></div><span className={`status-badge ${person.status}`}><i />{person.status === "published" ? "已发布" : "草稿"}</span><span className="manager-sort">{String(person.sortOrder).padStart(2, "0")}</span><div className="manager-actions">{person.status === "published" && <Link href={`/people/${person.slug}`} target="_blank" rel="noopener noreferrer" className="icon-button" aria-label={`查看${person.name}的公开档案`}><ArrowUpRight size={16} /></Link>}{!demo && <><Link href={`/admin/people/${person.id}`} className="icon-button" aria-label={`编辑${person.name}`}><Edit3 size={15} /></Link><button className="icon-button delete-action" aria-label={`删除${person.name}`} onClick={() => { setTarget(person); setError(""); dialog.current?.showModal(); }}><Trash2 size={15} /></button></>}{demo && <span className="read-only-label">只读</span>}</div></article>)}</div>{visible.length === 0 && <div className="empty-state"><Users size={35} /><h3>{people.length ? "没有符合条件的人物" : "从第一位同学开始"}</h3><p>{people.length ? "调整搜索关键词或发布状态试试。" : "点击添加人物，为他们准备一个主场。"}</p>{people.length > 0 && <button className="button button-outline" onClick={() => { setQuery(""); setStatus("all"); }}>清除筛选</button>}</div>}<div className="manager-bottom"><span role="status">显示 {visible.length} / {people.length} 位人物</span><span>排序数值越小，展示越靠前</span></div></section><dialog ref={dialog} className="confirm-dialog" onCancel={(event) => { if (pending) event.preventDefault(); }} aria-labelledby="delete-title"><div className="confirm-icon"><Trash2 size={25} /></div><h2 id="delete-title">删除这位人物？</h2><p>「{target?.name}」将从展示站永久移除。此操作无法撤销，不会自动删除共用图片。</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="confirm-actions"><button className="button button-outline" disabled={pending} onClick={() => dialog.current?.close()}>保留人物</button><button className="button button-danger" disabled={pending} onClick={remove}>{pending ? "正在删除…" : "确认删除"}</button></div></dialog></>;
}
