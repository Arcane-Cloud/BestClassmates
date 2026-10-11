import { Header, Footer } from "@/components/site-chrome";
import { Lineup } from "@/components/showcase/lineup";
import { getPublicPeople } from "@/lib/people";
import { isDemoMode } from "@/lib/db";

export const dynamic = "force-dynamic";
export default async function LineupPage() {
  const people = await getPublicPeople();
  const demo = isDemoMode();
  return <><Header demo={demo} /><main id="main-content"><Lineup people={people} />{demo && <div className="demo-notice shell"><span className="status-dot" /><p>只读演示模式。人物姓名与故事均为虚构，示例肖像来自 Unsplash。</p></div>}</main><Footer /></>;
}
