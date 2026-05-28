import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Select, Input, message } from "antd";
import { ThunderboltOutlined, ExperimentOutlined, GlobalOutlined } from "@ant-design/icons";
import type { RecommendResponse, CapsuleResponse } from "../types";
import { recommendDaily, recommendScenario, recordWear, submitFeedback, recommendCapsule } from "../api/client";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii, spacing } from "../styles/tokens";
import { Title } from "../components/ui/Typography";
import Card from "../components/ui/Card";
import Tag from "../components/ui/Tag";
import RecommendCard from "../components/RecommendCard";

// 和风天气支持的主要城市列表
const CITIES = [
  "北京", "上海", "广州", "深圳", "成都", "杭州", "武汉", "西安",
  "重庆", "南京", "天津", "苏州", "长沙", "郑州", "济南", "青岛",
];

// 快捷场景：点击一键填入描述文案
const QUICK_SCENARIOS = [
  { label: "通勤", desc: "日常通勤穿什么？" },
  { label: "面试", desc: "明天有个重要面试，推荐一套正式得体又不死板的搭配" },
  { label: "约会", desc: "周末约会穿什么？要好看但不刻意" },
  { label: "运动", desc: "去健身房，推荐舒适的运动穿搭" },
  { label: "聚会", desc: "朋友聚会，轻松时髦的搭配" },
  { label: "度假", desc: "去海边度假，清爽的度假穿搭" },
];

const RECOMMEND_DAILY_KEY = ["recommend", "daily"] as const;
const RECOMMEND_SCENARIO_KEY = ["recommend", "scenario"] as const;
const RECOMMEND_CAPSULE_KEY = ["recommend", "capsule"] as const;

export default function RecommendPage() {
  const { isMobile } = useResponsive();
  const [city, setCity] = useState("北京");
  const [mode, setMode] = useState<"daily" | "scenario" | "capsule">("daily");
  const [scenarioDesc, setScenarioDesc] = useState("");
  const [capsuleDest, setCapsuleDest] = useState("");
  const [capsuleDays, setCapsuleDays] = useState(3);
  const [capsuleOccasion, setCapsuleOccasion] = useState("");
  const [acceptedIdx, setAcceptedIdx] = useState<number | null>(null);
  const [feedbackIdx, setFeedbackIdx] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // 从缓存读取推荐结果，切换导航再回来不会丢失
  const { data: dailyData } = useQuery({
    queryKey: RECOMMEND_DAILY_KEY,
    queryFn: () => null,
    staleTime: Infinity,
  });
  const { data: scenarioData } = useQuery({
    queryKey: RECOMMEND_SCENARIO_KEY,
    queryFn: () => null,
    staleTime: Infinity,
  });
  const { data: capsuleData } = useQuery({
    queryKey: RECOMMEND_CAPSULE_KEY,
    queryFn: () => null,
    staleTime: Infinity,
  });

  const dailyMutation = useMutation({
    mutationFn: () => recommendDaily(city),
    onSuccess: (data) => {
      queryClient.setQueryData(RECOMMEND_DAILY_KEY, data);
    },
  });
  const scenarioMutation = useMutation({
    mutationFn: (desc: string) => recommendScenario(desc, city),
    onSuccess: (data) => {
      queryClient.setQueryData(RECOMMEND_SCENARIO_KEY, data);
    },
  });
  const capsuleMutation = useMutation({
    mutationFn: () => recommendCapsule(capsuleDest, capsuleDays, capsuleOccasion),
    onSuccess: (data) => {
      queryClient.setQueryData(RECOMMEND_CAPSULE_KEY, data);
    },
  });
  const wearMutation = useMutation({
    mutationFn: ({ itemIds, idx }: { itemIds: number[]; idx: number }) =>
      recordWear({ item_ids: itemIds }),
    onSuccess: (_, { idx }) => {
      setAcceptedIdx(idx);
      message.success("已记录穿着，今天就这么穿！");
    },
  });

  const data: RecommendResponse | null =
    mode === "daily" ? (dailyData as RecommendResponse | null) ?? null : mode === "scenario" ? (scenarioData as RecommendResponse | null) ?? null : null;
  const capsuleResult: CapsuleResponse | null =
    mode === "capsule" ? (capsuleData as CapsuleResponse | null) ?? null : null;
  const loading =
    mode === "daily" ? dailyMutation.isPending : mode === "scenario" ? scenarioMutation.isPending : capsuleMutation.isPending;

  return (
    <div>
      <Title style={{ marginBottom: 24 }}>穿搭推荐</Title>

      {/* 推荐输入面板：模式切换 + 城市 + 场景描述 + CTA */}
      <div
        style={{
          border: `1px solid ${colors.divider}`,
          borderRadius: radii.lg,
          background: colors.surface,
          padding: isMobile ? 14 : 20,
          marginBottom: 24,
        }}
      >
        {/* 模式切换 Tab */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
          <button
            onClick={() => setMode("daily")}
            style={{
              flex: 1,
              border: "none",
              background: mode === "daily" ? colors.accentSoft : "transparent",
              padding: "8px 0",
              fontSize: 13,
              fontWeight: mode === "daily" ? 600 : 400,
              color: mode === "daily" ? colors.textPrimary : colors.textSecondary,
              cursor: "pointer",
              borderRadius: 4,
              transition: "background 0.15s",
            }}
          >
            <ThunderboltOutlined style={{ marginRight: 6 }} />
            每日推荐
          </button>
          <button
            onClick={() => setMode("scenario")}
            style={{
              flex: 1,
              border: "none",
              background: mode === "scenario" ? colors.accentSoft : "transparent",
              padding: "8px 0",
              fontSize: 13,
              fontWeight: mode === "scenario" ? 600 : 400,
              color: mode === "scenario" ? colors.textPrimary : colors.textSecondary,
              cursor: "pointer",
              borderRadius: 4,
              transition: "background 0.15s",
            }}
          >
            <ExperimentOutlined style={{ marginRight: 6 }} />
            场景推荐
          </button>
          <button
            onClick={() => setMode("capsule")}
            style={{
              flex: 1,
              border: "none",
              background: mode === "capsule" ? colors.accentSoft : "transparent",
              padding: "8px 0",
              fontSize: 13,
              fontWeight: mode === "capsule" ? 600 : 400,
              color: mode === "capsule" ? colors.textPrimary : colors.textSecondary,
              cursor: "pointer",
              borderRadius: 4,
              transition: "background 0.15s",
            }}
          >
            <GlobalOutlined style={{ marginRight: 6 }} />
            旅行胶囊
          </button>
        </div>

        {/* 城市选择 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: mode === "scenario" ? 12 : 0,
          }}
        >
          <span style={{ fontSize: 13, color: colors.textSecondary }}>城市</span>
          <Select
            value={city}
            onChange={setCity}
            style={{ width: 130 }}
            options={CITIES.map((c) => ({ value: c, label: c }))}
            showSearch
            size="middle"
          />
        </div>

        {/* 场景描述输入 + 快捷场景标签（仅场景模式） */}
        {mode === "scenario" && (
          <div style={{ marginTop: 12 }}>
            <Input.TextArea
              value={scenarioDesc}
              onChange={(e) => setScenarioDesc(e.target.value)}
              placeholder='描述场景，如："明天有个面试，推荐一套靠谱的"'
              autoSize={{ minRows: 1, maxRows: 3 }}
              style={{ marginBottom: 12 }}
            />
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              {QUICK_SCENARIOS.map((s) => (
                <Tag
                  key={s.label}
                  variant="outline"
                  active={scenarioDesc === s.desc}
                  size="sm"
                  onClick={() => setScenarioDesc(s.desc)}
                >
                  {s.label}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* 旅行胶囊输入 */}
        {mode === "capsule" && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <Input
              placeholder="目的地，如：东京、巴黎"
              value={capsuleDest}
              onChange={(e) => setCapsuleDest(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <Select
                value={capsuleDays}
                onChange={setCapsuleDays}
                style={{ width: 120 }}
                options={[1, 2, 3, 4, 5, 7, 10, 14].map((d) => ({ value: d, label: `${d} 天` }))}
              />
              <Input
                placeholder="场合（选填），如：通勤,聚会"
                value={capsuleOccasion}
                onChange={(e) => setCapsuleOccasion(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>
        )}

        {/* 推荐触发按钮 */}
        <Button
          block
          size="large"
          style={{ height: 44, fontWeight: 500, fontSize: 14 }}
          onClick={() =>
            mode === "daily"
              ? dailyMutation.mutate()
              : mode === "scenario"
              ? scenarioMutation.mutate(scenarioDesc)
              : capsuleMutation.mutate()
          }
          loading={loading}
          disabled={
            (mode === "scenario" && !scenarioDesc.trim()) ||
            (mode === "capsule" && !capsuleDest.trim())
          }
        >
          {mode === "daily" ? "今日穿什么？" : mode === "scenario" ? "生成推荐" : "生成胶囊衣橱"}
        </Button>
      </div>

      {/* 推荐结果展示 */}
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
            if (data) {
              submitFeedback(data.recommendation_id, fb).catch(() => {});
            }
          }}
        />
      )}

      {/* 旅行胶囊结果 */}
      {mode === "capsule" && capsuleResult && (
        <div>
          {/* 打包清单 */}
          <Card padding={isMobile ? 14 : 20} style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary, margin: "0 0 4px" }}>
              打包清单 · {capsuleResult.items.length} 件
            </h3>
            <div style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
              {capsuleDest} · {capsuleDays} 天
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {capsuleResult.items.map((item) => (
                <span key={item.id} style={{
                  fontSize: 11, color: colors.accent,
                  border: `1px solid ${colors.divider}`, borderRadius: 2,
                  padding: "3px 10px",
                }}>
                  {item.name || item.sub_category}
                </span>
              ))}
            </div>
            {capsuleResult.packing_tip && (
              <div style={{
                marginTop: 12, padding: "8px 12px",
                background: colors.accentSoft, borderRadius: 4,
                fontSize: 11, color: colors.textSecondary, lineHeight: 1.6,
              }}>
                {capsuleResult.packing_tip}
              </div>
            )}
          </Card>

          {/* 每日方案 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {capsuleResult.outfits.map((outfit) => (
              <Card key={outfit.day} padding={isMobile ? 12 : 16}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
                    第 {outfit.day} 天
                  </span>
                  {outfit.occasion && (
                    <span style={{ fontSize: 11, color: colors.textSecondary }}>{outfit.occasion}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: colors.textSecondary, lineHeight: 1.8 }}>
                  {outfit.reason}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
