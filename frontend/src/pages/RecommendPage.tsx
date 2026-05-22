import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Select, Input, message } from "antd";
import { ThunderboltOutlined, ExperimentOutlined } from "@ant-design/icons";
import type { RecommendResponse } from "../types";
import { recommendDaily, recommendScenario, recordWear } from "../api/client";
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

export default function RecommendPage() {
  const [city, setCity] = useState("北京");
  // 推荐模式：每日推荐 / 场景推荐
  const [mode, setMode] = useState<"daily" | "scenario">("daily");
  const [scenarioDesc, setScenarioDesc] = useState("");
  // 已采纳的推荐索引，用于高亮已穿搭的结果
  const [acceptedIdx, setAcceptedIdx] = useState<number | null>(null);

  const dailyMutation = useMutation({
    mutationFn: () => recommendDaily(city),
  });
  const scenarioMutation = useMutation({
    mutationFn: (desc: string) => recommendScenario(desc, city),
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
    mode === "daily" ? dailyMutation.data ?? null : scenarioMutation.data ?? null;
  const loading =
    mode === "daily" ? dailyMutation.isPending : scenarioMutation.isPending;

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, color: "#1a1a1a", margin: "0 0 24px" }}>
        穿搭推荐
      </h2>

      {/* 推荐输入面板：模式切换 + 城市 + 场景描述 + CTA */}
      <div
        style={{
          border: "1px solid #e8eaed",
          borderRadius: 4,
          background: "#fff",
          padding: 20,
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
              background: mode === "daily" ? "#f0f2f5" : "transparent",
              padding: "8px 0",
              fontSize: 13,
              fontWeight: mode === "daily" ? 600 : 400,
              color: mode === "daily" ? "#1a1a1a" : "#8c8c8c",
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
              background: mode === "scenario" ? "#f0f2f5" : "transparent",
              padding: "8px 0",
              fontSize: 13,
              fontWeight: mode === "scenario" ? 600 : 400,
              color: mode === "scenario" ? "#1a1a1a" : "#8c8c8c",
              cursor: "pointer",
              borderRadius: 4,
              transition: "background 0.15s",
            }}
          >
            <ExperimentOutlined style={{ marginRight: 6 }} />
            场景推荐
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
          <span style={{ fontSize: 13, color: "#8c8c8c" }}>城市</span>
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
                <span
                  key={s.label}
                  onClick={() => setScenarioDesc(s.desc)}
                  style={{
                    fontSize: 11,
                    color: scenarioDesc === s.desc ? "#4a5c6c" : "#8c8c8c",
                    border: `1px solid ${scenarioDesc === s.desc ? "#4a5c6c" : "#e8eaed"}`,
                    borderRadius: 2,
                    padding: "3px 10px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {s.label}
                </span>
              ))}
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
              : scenarioMutation.mutate(scenarioDesc)
          }
          loading={loading}
          disabled={mode === "scenario" && !scenarioDesc.trim()}
        >
          {mode === "daily" ? "今日穿什么？" : "生成推荐"}
        </Button>
      </div>

      {/* 推荐结果展示 */}
      <RecommendCard
        loading={loading}
        data={data}
        accepting={wearMutation.isPending}
        acceptedIdx={acceptedIdx}
        onAccept={(itemIds, idx) => wearMutation.mutate({ itemIds, idx })}
      />
    </div>
  );
}
