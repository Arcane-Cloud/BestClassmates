"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";

export function LoginForm({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(""); setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "登录失败");
      router.replace("/admin"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "连接失败，请重试"); }
    finally { setPending(false); }
  };
  return <form onSubmit={submit} className="login-form">
    <label htmlFor="email">管理员邮箱</label><div className="login-input"><Mail size={17} /><input id="email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required maxLength={254} disabled={demo || pending} /></div>
    <label htmlFor="password">登录密码</label><div className="login-input"><LockKeyhole size={17} /><input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="请输入管理员密码" required maxLength={256} disabled={demo || pending} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "隐藏密码" : "显示密码"}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <button type="submit" disabled={demo || pending} className="button button-dark login-submit">{pending ? "正在验证身份…" : demo ? "配置数据库后启用登录" : "进入创作后台"}<ArrowRight size={18} /></button>
    <p className="login-security">仅限授权管理员访问 · 安全会话保护</p>
  </form>;
}
