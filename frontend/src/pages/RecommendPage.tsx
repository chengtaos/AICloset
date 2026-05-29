import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input, Select, message } from "antd";
import { GlobalOutlined, HeartOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { CapsuleResponse, RecommendResponse } from "../types";
import { recommendCapsule, recommendDaily, recommendScenario, recordWear, submitFeedback } from "../api/client";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii, shadows, spacing, fontWeight } from "../styles/tokens";
import RecommendCard from "../components/RecommendCard";
import Tag from "../components/ui/Tag";

const CITIES = [
  "北京", "上海", "广州", "深圳", "成都", "杭州", "武汉", "西安",
  "重庆", "南京", "天津", "苏州", "长沙", "郑州", "济南", "青岛",
];

const QUICK_SCENARIOS = [
  { label: "通勤", desc: "日常通勤，想要利落但不严肃的穿搭" },
  { label: "面试", desc: "明天有重要面试，推荐一套正式得体又不死板的搭配" },
  { label: "约会", desc: "周末约会，想要好看、柔和、有一点氛围感" },
  { label: "运动", desc: "去健身或散步，推荐舒适清爽的运动穿搭" },
  { label: "聚会", desc: "朋友聚会，想要轻松时髦又有记忆点" },
  { label: "度假", desc: "去海边度假，推荐清爽放松的旅行穿搭" },
];

const RECOMMEND_DAILY_KEY = ["recommend", "daily"] as const;
const RECOMMEND_SCENARIO_KEY = ["recommend", "scenario"] as const;
const RECOMMEND_CAPSULE_KEY = ["recommend", "capsule"] as const;

export default function RecommendPage() {
  const { isMobile, isTablet } = useResponsive();
  const [city, setCity] = useState("北京");
  const [mode, setMode] = useState<"daily" | "scenario" | "capsule">("daily");
  const [scenarioDesc, setScenarioDesc] = useState("");
  const [capsuleDest, setCapsuleDest] = useState("");
  const [capsuleDays, setCapsuleDays] = useState(3);
  const [capsuleOccasion, setCapsuleOccasion] = useState("");
  const [acceptedIdx, setAcceptedIdx] = useState<number | null>(null);
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: dailyData } = useQuery({ queryKey: RECOMMEND_DAILY_KEY, queryFn: () => null, staleTime: Infinity });
  const { data: scenarioData } = useQuery({ queryKey: RECOMMEND_SCENARIO_KEY, queryFn: () => null, staleTime: Infinity });
  const { data: capsuleData } = useQuery({ queryKey: RECOMMEND_CAPSULE_KEY, queryFn: () => null, staleTime: Infinity });

  const dailyMutation = useMutation({
    mutationFn: () => recommendDaily(city),
    onSuccess: (data) => queryClient.setQueryData(RECOMMEND_DAILY_KEY, data),
  });
  const scenarioMutation = useMutation({
    mutationFn: (desc: string) => recommendScenario(desc, city),
    onSuccess: (data) => queryClient.setQueryData(RECOMMEND_SCENARIO_KEY, data),
  });
  const capsuleMutation = useMutation({
    mutationFn: () => recommendCapsule(capsuleDest, capsuleDays, capsuleOccasion),
    onSuccess: (data) => queryClient.setQueryData(RECOMMEND_CAPSULE_KEY, data),
  });
  const wearMutation = useMutation({
    mutationFn: ({ itemIds }: { itemIds: number[]; idx: number }) => recordWear({ item_ids: itemIds }),
    onSuccess: (_, { idx }) => {
      setAcceptedIdx(idx);
      message.success("已记录穿着，今天就这么穿");
    },
  });

  const data: RecommendResponse | null =
    mode === "daily"
      ? (dailyData as RecommendResponse | null) ?? null
      : mode === "scenario"
        ? (scenarioData as RecommendResponse | null) ?? null
        : null;
  const capsuleResult: CapsuleResponse | null =
    mode === "capsule" ? (capsuleData as CapsuleResponse | null) ?? null : null;
  const loading =
    mode === "daily" ? dailyMutation.isPending : mode === "scenario" ? scenarioMutation.isPending : capsuleMutation.isPending;

  const modeItems = [
    { key: "daily" as const, label: "今日灵感", icon: <ThunderboltOutlined /> },
    { key: "scenario" as const, label: "场景推荐", icon: <HeartOutlined /> },
    { key: "capsule" as const, label: "旅行胶囊", icon: <GlobalOutlined /> },
  ];

  return (
    <div className="xhs-page">
      <div className="xhs-page-head">
        <div>
          <div className="xhs-kicker">AI 穿搭助手</div>
          <h1 className="xhs-title">像刷灵感一样找到今天穿什么</h1>
          <div className="xhs-subtitle">结合天气、场景和你的衣橱，生成更像时尚笔记的搭配建议。</div>
        </div>
      </div>

      <section
        style={{
          borderRadius: radii.xl,
          background: "rgba(255,255,255,0.90)",
          border: `1px solid ${colors.divider}`,
          boxShadow: shadows.elevated,
          padding: isMobile ? 14 : isTablet ? 18 : 22,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto", gap: 16 }}>
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {modeItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setMode(item.key)}
                  style={{
                    border: "none",
                    borderRadius: radii.full,
                    background: mode === item.key ? colors.accent : colors.placeholder,
                    color: mode === item.key ? colors.surface : colors.textSecondary,
                    padding: "9px 14px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    fontWeight: mode === item.key ? fontWeight.semibold : fontWeight.medium,
                    cursor: "pointer",
                    boxShadow: mode === item.key ? "0 12px 28px rgba(217,75,72,0.20)" : "none",
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <Select
                value={city}
                onChange={setCity}
                style={{ width: isMobile ? "100%" : 150 }}
                options={CITIES.map((c) => ({ value: c, label: c }))}
                showSearch
              />
              {mode === "capsule" && (
                <Select
                  value={capsuleDays}
                  onChange={setCapsuleDays}
                  style={{ width: isMobile ? "100%" : 130 }}
                  options={[1, 2, 3, 4, 5, 7, 10, 14].map((d) => ({ value: d, label: `${d} 天` }))}
                />
              )}
            </div>

            {mode === "scenario" && (
              <>
                <Input.TextArea
                  value={scenarioDesc}
                  onChange={(e) => setScenarioDesc(e.target.value)}
                  placeholder="描述场景，比如：明天面试，想要可靠但不沉闷"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                  {QUICK_SCENARIOS.map((s) => (
                    <Tag key={s.label} variant="outline" active={scenarioDesc === s.desc} size="sm" onClick={() => setScenarioDesc(s.desc)}>
                      {s.label}
                    </Tag>
                  ))}
                </div>
              </>
            )}

            {mode === "capsule" && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <Input
                  placeholder="目的地，比如东京、巴黎"
                  value={capsuleDest}
                  onChange={(e) => setCapsuleDest(e.target.value)}
                />
                <Input
                  placeholder="场合，可选，比如通勤,聚会"
                  value={capsuleOccasion}
                  onChange={(e) => setCapsuleOccasion(e.target.value)}
                />
              </div>
            )}
          </div>

          <Button
            type="primary"
            size="large"
            style={{ height: 48, alignSelf: "end", fontWeight: 800, paddingInline: 24 }}
            onClick={() =>
              mode === "daily"
                ? dailyMutation.mutate()
                : mode === "scenario"
                  ? scenarioMutation.mutate(scenarioDesc)
                  : capsuleMutation.mutate()
            }
            loading={loading}
            disabled={(mode === "scenario" && !scenarioDesc.trim()) || (mode === "capsule" && !capsuleDest.trim())}
          >
            {mode === "daily" ? "生成今日灵感" : mode === "scenario" ? "生成场景搭配" : "生成胶囊衣橱"}
          </Button>
        </div>
      </section>

      {mode !== "capsule" && (
        <RecommendCard
          loading={loading}
          data={data}
          accepting={wearMutation.isPending}
          acceptedIdx={acceptedIdx}
          feedbackIdx={feedbackIdx}
          onAccept={(itemIds, idx) => {
            setFeedbackIdx(null);
            wearMutation.mutate({ itemIds, idx });
          }}
          onFeedback={(idx, fb) => {
            setAcceptedIdx(null);
            setFeedbackIdx(idx);
            if (data) submitFeedback(data.recommendation_id, fb).catch(() => {});
          }}
        />
      )}

      {mode === "capsule" && capsuleResult && (
        <div className="xhs-feed">
          <article className="xhs-feed-item" style={{ background: colors.surface, borderRadius: radii.xl, padding: spacing.lg, boxShadow: shadows.card }}>
            <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700 }}>旅行清单</div>
            <h3 style={{ margin: "6px 0 8px", fontSize: 24, lineHeight: 1.15 }}>
              {capsuleDest} · {capsuleDays} 天
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {capsuleResult.items.map((item) => (
                <Tag key={item.id} variant="outline" size="sm">{item.name || item.sub_category}</Tag>
              ))}
            </div>
            {capsuleResult.packing_tip && (
              <p style={{ margin: "14px 0 0", color: colors.textSecondary, lineHeight: 1.8 }}>
                {capsuleResult.packing_tip}
              </p>
            )}
          </article>

          {capsuleResult.outfits.map((outfit) => (
            <article
              className="xhs-feed-item"
              key={outfit.day}
              style={{ background: colors.surface, borderRadius: radii.xl, padding: spacing.lg, boxShadow: shadows.card }}
            >
              <div style={{ color: colors.accent, fontSize: 12, fontWeight: 700 }}>Day {outfit.day}</div>
              <h3 style={{ margin: "6px 0 8px", fontSize: 22 }}>{outfit.occasion || "每日搭配"}</h3>
              <p style={{ margin: 0, color: colors.textSecondary, lineHeight: 1.8 }}>{outfit.reason}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
