import type { Person } from "./validation";

const photo = (id: string, width = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
const timestamp = "2026-01-01T00:00:00.000Z";
const entries = [
  { slug: "lin-yuan", name: "林予安", nickname: "光影捕手", color: "#d85b40", image: "photo-1534528741775-53994a69daeb", biography: "把日常的微小瞬间，拍成值得珍藏的电影。\n\n我相信，好奇心是生活里最好的镜头。喜欢收集午后的光、街角的对话，以及朋友们毫无防备的笑。不急着给自己下定义，保持探索，做一些让人心头一亮的小事。" },
  { slug: "chen-yu", name: "陈屿", nickname: "代码诗人", color: "#66877a", image: "photo-1535713875002-d1d0cf377fde", biography: "用逻辑构建世界，也为世界留一点浪漫。\n\n喜欢把脑海里的想法变成可以触摸的作品。写程序之外，喜欢听黑胶、修理旧物件，以及在陌生城市里散步。对我来说，最好的作品，是那些真正让生活变好一点的小东西。" },
  { slug: "zhou-yue", name: "周越", nickname: "山野来信", color: "#c5a369", image: "photo-1500648767791-00dcc994a43e", biography: "向山走，向海走，向自己走。\n\n城市是生活的基地，山野是灵感的来源。每次出发，都不是为了征服什么，而是重新发现自己与世界的连接。答案不一定在终点，也可能在沿途的风里。" },
  { slug: "xu-zhixia", name: "许知夏", nickname: "灵感永动机", color: "#9183a7", image: "photo-1524504388940-b1c1722653e1", biography: "给平凡的生活，加一点不按常理的颜色。\n\n用画笔记录情绪，用色彩传递温柔。我的灵感来自菜市场、旧杂志和一场突如其来的雨。认真生活，偶尔异想天开，永远保留第一次画画时的快乐。" },
  { slug: "lu-jing", name: "陆景", nickname: "节拍制造者", color: "#7793a4", image: "photo-1527980965255-d3b416303d12", biography: "把没说出口的话，写进下一首歌里。\n\n习惯在深夜创作，在清晨听回放。比起某种风格的标签，我更在意一段旋律能不能让人停下来，认真听完。每个人都有自己的频率，而我还在寻找自己的声音。" },
  { slug: "jiang-ye", name: "江野", nickname: "追风少年", color: "#b78364", image: "photo-1506794778202-cad84cf45f1d", biography: "人生不是排位赛，跑自己的那一圈。\n\n跑步是我和一座城市打招呼的方式。从清晨河岸到夜晚街道，喜欢用最简单的方式感受变化。保持自己的配速，去见更远的风景，也记得享受沿途。" },
];

// All names and stories are fictional. Stock images are replaced by Blob URLs when cloud seeding.
export const demoPeople: Person[] = entries.map((entry, index) => ({
  id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  slug: entry.slug, name: entry.name, nickname: entry.nickname, biography: entry.biography,
  avatar: photo(entry.image, 200), portrait: photo(entry.image), background: "", accentColor: entry.color,
  sortOrder: index + 1, status: "published", createdAt: timestamp, updatedAt: timestamp,
}));
