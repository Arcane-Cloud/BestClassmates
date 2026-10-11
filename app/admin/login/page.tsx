import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Asterisk, Database } from "lucide-react";
import { getSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/db";
import { Brand } from "@/components/site-chrome";
import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage() {
  const demo = isDemoMode();
  if (!demo && await getSession()) redirect("/admin");
  return <main id="main-content" className="login-page"><section className="login-story"><Brand inverse /><div className="login-story-center"><span className="eyebrow"><span className="red-dash" /> BEHIND THE STORIES</span><h1>故事的背后，<br />有认真记录的<span>你。</span></h1><p>欢迎来到最佳同学的创作后台。<br />让每一个独特的人，都拥有自己的主场。</p><div className="login-orbit" aria-hidden="true"><Asterisk strokeWidth={.8} /></div></div><span className="micro">BEST CLASSMATES® — THE EDITORIAL ROOM</span></section><section className="login-panel"><Link href="/" className="login-back"><ArrowLeft size={15} /> 回到展示站</Link><div className="login-form-wrap"><div className="eyebrow">ADMIN ACCESS / 01</div><h2>欢迎回来<span>。</span></h2><p className="login-intro">登录后，开始编辑属于我们的故事。</p><LoginForm demo={demo} />{demo && <div className="setup-guide"><h3><Database size={17} /> 连接你的 MySQL</h3><ol><li>复制 <code>.env.example</code> 为 <code>.env.local</code>，填写 <code>DATABASE_URL</code>、<code>DIRECT_URL</code> 和 <code>APP_URL</code>。</li><li>执行 <code>npm run db:migrate</code> 创建数据表；需要示例内容可执行 <code>npm run db:seed</code>。</li><li>设置管理员邮箱和至少 12 位密码，运行 <code>npm run admin:create</code>，然后重启应用。</li><li>图片上传需配置 Azure Blob 私有容器、服务端密钥和 CORS，详见项目 README。</li></ol><Link href="/admin">先看看后台演示 <ArrowUpRight size={15} /></Link></div>}</div><span className="login-bottom">好故事，从这里开始。</span></section></main>;
}
