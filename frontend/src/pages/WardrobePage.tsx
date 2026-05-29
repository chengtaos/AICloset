import { useState } from "react";
import Tag from "../components/ui/Tag";
import WardrobeView from "../components/WardrobeView";
import StatsView from "../components/StatsView";

export default function WardrobePage() {
  const [tab, setTab] = useState<"wardrobe" | "stats">("wardrobe");

  return (
    <div className="xhs-page">
      <div className="xhs-page-head">
        <div>
          <div className="xhs-kicker">我的衣橱</div>
          <h1 className="xhs-title">把单品整理成灵感</h1>
          <div className="xhs-subtitle">像刷穿搭笔记一样浏览衣物，快速找到今天想穿的那一件。</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Tag variant="filled" active={tab === "wardrobe"} size="md" onClick={() => setTab("wardrobe")}>
            衣橱笔记
          </Tag>
          <Tag variant="filled" active={tab === "stats"} size="md" onClick={() => setTab("stats")}>
            衣橱洞察
          </Tag>
        </div>
      </div>

      {tab === "wardrobe" ? <WardrobeView /> : <StatsView />}
    </div>
  );
}
