"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main id="main-content" className="error-page shell"><span className="error-number">PIT STOP</span><div className="eyebrow">稍作停靠，即刻出发</div><h1>故事正在重新连接。</h1><p>暂时无法读取内容。请稍后重试；如果你是管理员，<br />请检查数据库服务、DATABASE_URL 以及是否已经完成数据库迁移。</p><div className="error-actions"><button onClick={reset} className="button button-dark"><RotateCw size={17} />重新加载</button><Link href="/" className="button button-outline">返回首页</Link></div></main>;
}
