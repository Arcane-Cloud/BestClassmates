"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, LoaderCircle, Save } from "lucide-react";
import type { CSSProperties } from "react";
import { emptyPerson, isSafeImageUrl, personSchema, type Person, type PersonInput } from "@/lib/validation";
import { Portrait } from "../portrait";
import { ImageField } from "./image-field";

export function PersonEditor({ person }: { person?: Person }) {
  const router = useRouter();
  const initial = person ? personSchema.parse(person) : { ...emptyPerson };
  const [form, setForm] = useState<PersonInput>(initial);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(initial));
  const [savedId, setSavedId] = useState(person?.id);
  const [savedSlug, setSavedSlug] = useState(person?.slug);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [visualOpen, setVisualOpen] = useState(!person);
  const busy = pending || uploadCount > 0;
  const dirty = JSON.stringify(form) !== savedSnapshot;
  const set = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) => {
    setForm((current) => ({ ...current, [key]: value })); setSuccess("");
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const uploadState = (uploading: boolean) => setUploadCount((count) => Math.max(0, count + (uploading ? 1 : -1)));

  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const guard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLAnchorElement | HTMLButtonElement>("a[href],button[data-leave-editor]");
      if (!target) return;
      if (target instanceof HTMLAnchorElement) {
        if (target.target === "_blank") return;
        const url = new URL(target.href, location.href);
        if (url.pathname === location.pathname && url.search === location.search) return;
      }
      if (!window.confirm("还有未保存的内容，确定离开编辑器吗？")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", guard, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guard, true); };
  }, [dirty, busy]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    setError(""); setSuccess("");
    const parsed = personSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) nextErrors[String(issue.path[0])] ??= issue.message;
      setErrors(nextErrors);
      if (["portrait", "avatar", "background", "accentColor"].some((field) => nextErrors[field])) setVisualOpen(true);
      setError("请完善必填资料，并检查标红的字段。");
      requestAnimationFrame(() => document.getElementById(String(parsed.error.issues[0]?.path[0]))?.focus());
      return;
    }
    setPending(true);
    try {
      const response = await fetch(savedId ? `/api/people/${savedId}` : "/api/people", { method: savedId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      setForm(parsed.data); setSavedSnapshot(JSON.stringify(parsed.data)); setSavedId(data.person.id); setSavedSlug(data.person.slug);
      setSuccess(parsed.data.status === "published" ? "已保存并发布，人物全览已同步更新。" : "草稿已保存，仅管理员可见。");
      if (!savedId) router.replace(`/admin/people/${data.person.id}`);
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "连接失败，请重试"); }
    finally { setPending(false); }
  };

  return <><Link href="/admin" className="editor-back"><ArrowLeft size={14} />返回人物管理</Link><div className="admin-page-heading editor-heading"><div><span className="eyebrow">MAKE AN ENTRANCE</span><h1>{savedId ? "编辑人物" : "新的主角"}<span>。</span></h1><p>一个名字，一个外号，一段属于自己的简介。</p></div><span className={`editor-save-state ${dirty ? "unsaved" : ""}`}><i />{busy ? "正在处理…" : dirty ? "有未保存的修改" : "内容已同步"}</span></div><form onSubmit={submit} noValidate className="editor-form"><div className="editor-layout"><div className="editor-main">{error && <div className="form-error editor-alert" role="alert">{error}</div>}{success && <div className="form-success editor-alert" role="status"><Check size={17} />{success}</div>}<fieldset disabled={pending} className="editor-panel"><div className="panel-heading"><span>01 / THE PERSON</span><h2>让大家认识你</h2><p>只需要名称、外号和简介。其他交给画面。</p></div><div className="form-grid"><div className="form-field"><label htmlFor="name">名称<span> *</span></label><input id="name" className="form-input" value={form.name} onChange={(event) => set("name", event.target.value)} maxLength={60} placeholder="例如：林予安" aria-invalid={!!errors.name} />{errors.name && <span className="field-error">{errors.name}</span>}</div><div className="form-field"><label htmlFor="nickname">外号</label><input id="nickname" className="form-input" value={form.nickname} onChange={(event) => set("nickname", event.target.value)} maxLength={60} placeholder="例如：光影捕手" aria-invalid={!!errors.nickname} />{errors.nickname && <span className="field-error">{errors.nickname}</span>}</div></div><div className="form-field"><label htmlFor="biography">简介<span> *</span></label><textarea id="biography" className="form-input" rows={7} value={form.biography} onChange={(event) => set("biography", event.target.value)} maxLength={2000} placeholder="写一段属于这个人的介绍，空一行可以分段。" aria-invalid={!!errors.biography} /><span className={errors.biography ? "field-error" : "field-hint"}>{errors.biography || `${form.biography.length} / 2000 字 · 全文会在人物画面上展示`}</span></div><details className="editor-details" open={visualOpen} onToggle={(event) => setVisualOpen(event.currentTarget.open)}><summary>人物图片与视觉 <ChevronDown size={16} /></summary><div className="editor-details-content"><ImageField label="人物主图" required value={form.portrait} onChange={(value) => set("portrait", value)} onUploadStateChange={uploadState} error={errors.portrait} hint="详情页铺底图片，推荐清晰的半身人像" disabled={pending} /><div className="form-grid image-pair"><ImageField label="头像" value={form.avatar} onChange={(value) => set("avatar", value)} onUploadStateChange={uploadState} error={errors.avatar} hint="选填，默认使用主图" disabled={pending} /><ImageField label="氛围背景图" value={form.background} onChange={(value) => set("background", value)} onUploadStateChange={uploadState} error={errors.background} hint="选填，不覆盖人物主图" disabled={pending} /></div><div className="form-field"><label htmlFor="accentColor">画面点缀色</label><div className="color-field"><input type="color" aria-label="选择主题色" value={/^#[0-9a-fA-F]{6}$/.test(form.accentColor) ? form.accentColor : "#e13d30"} onChange={(event) => set("accentColor", event.target.value)} /><input id="accentColor" className="form-input" value={form.accentColor} maxLength={7} onChange={(event) => set("accentColor", event.target.value)} /></div>{errors.accentColor && <span className="field-error">{errors.accentColor}</span>}</div></div></details><div className="editor-publishing"><div className="form-grid"><div className="form-field"><label htmlFor="status">发布状态</label><select id="status" className="form-input" value={form.status} onChange={(event) => set("status", event.target.value as PersonInput["status"])}><option value="draft">草稿 — 不公开展示</option><option value="published">已发布 — 在人物全览展示</option></select></div><div className="form-field"><label htmlFor="sortOrder">展示顺序</label><input id="sortOrder" type="number" className="form-input" min={0} max={99999} value={form.sortOrder} onChange={(event) => set("sortOrder", Number(event.target.value))} /><span className={errors.sortOrder ? "field-error" : "field-hint"}>{errors.sortOrder || "数字越小，越靠前"}</span></div></div><p className="publish-privacy">发布前请确认人物与图片已获得授权。最终媒体链接可公开访问，不要上传私密资料。</p></div></fieldset></div><aside className="editor-preview"><span className="micro">A FIRST LOOK · 人物预览</span><div className="preview-card" style={{ "--person-accent": form.accentColor } as CSSProperties}><div className="preview-photo"><Portrait src={isSafeImageUrl(form.portrait) ? form.portrait : "/images/placeholder.svg"} alt="人物卡片实时预览" /><span className="preview-nickname">{form.nickname || "独一无二，自成风格"}</span></div><div className="preview-body"><h3>{form.name || "下一位主角"}</h3><p>{form.biography || "在这里写下人物简介。"}</p></div></div><p className="preview-caption">主图将成为整个详情页的视觉底色。<br />保存后，名字与故事即刻登场。</p>{savedSlug && form.status === "published" && !dirty && <Link href={`/people/${savedSlug}`} target="_blank" rel="noopener noreferrer" className="text-link">查看人物展示 <ArrowUpRight size={15} /></Link>}</aside></div><div className="editor-save-bar"><span>{uploadCount ? "图片正在直传 Azure，请稍候" : form.status === "published" ? "保存后将公开展示" : "保存为草稿，不会公开展示"}</span><div><button type="submit" className="button button-dark" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Save size={16} />}{pending ? "正在保存…" : uploadCount ? "等待上传完成…" : "保存人物"}</button></div></div></form></>;
}
