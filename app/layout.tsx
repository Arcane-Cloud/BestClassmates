import type { Metadata } from "next";
import "./globals.css";

export const runtime = "nodejs";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "人物全览 · 最佳同学", template: "%s · 最佳同学" },
  description: "每一个独特的你，都值得被看见。认识有趣的灵魂，发现闪闪发光的另一面。",
  applicationName: "最佳同学",
  openGraph: { title: "最佳同学 — 平凡名字，不凡主场", description: "不同的人生，同样精彩。每一个独特的你，都值得被看见。", locale: "zh_CN", type: "website" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" data-scroll-behavior="smooth"><body><a href="#main-content" className="skip-link">跳至主要内容</a>{children}</body></html>;
}
