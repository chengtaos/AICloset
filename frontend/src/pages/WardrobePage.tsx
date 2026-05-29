import { useState } from "react";
import { spacing } from "../styles/tokens";
import { Title } from "../components/ui/Typography";
import Tag from "../components/ui/Tag";
import WardrobeView from "../components/WardrobeView";
import StatsView from "../components/StatsView";

export default function WardrobePage() {
  const [tab, setTab] = useState<"wardrobe" | "stats">("wardrobe");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: spacing.xl }}>
        <Title style={{ marginBottom: 0, letterSpacing: "-0.01em" }}>衣橱</Title>
        <div style={{ display: "flex", gap: 4 }}>
          <Tag
            variant="filled"
            active={tab === "wardrobe"}
            size="md"
            onClick={() => setTab("wardrobe")}
          >
            衣橱
          </Tag>
          <Tag
            variant="filled"
            active={tab === "stats"}
            size="md"
            onClick={() => setTab("stats")}
          >
            统计
          </Tag>
        </div>
      </div>

      {tab === "wardrobe" ? <WardrobeView /> : <StatsView />}
    </div>
  );
}
