import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Header, Footer } from "@/components/site-chrome";

export default function NotFound() {
  return <><Header /><main id="main-content" className="error-page shell"><span className="error-number">404</span><div className="eyebrow">OFF THE GRID</div><h1>这位主角，暂未登场。</h1><p>页面可能已被移走，或这份人物档案尚未发布。<br />不如先去认识其他有趣的灵魂。</p><Link href="/" className="button button-dark">返回人物全览 <ArrowUpRight size={18} /></Link></main><Footer /></>;
}
