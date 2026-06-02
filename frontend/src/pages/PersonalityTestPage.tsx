import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPersonalityQuestions,
  fetchPersonalityResult,
  submitPersonalityAnswers,
} from "../api/client";
import type { PersonalityQuestion, PersonalityResult } from "../types";
import { useResponsive } from "../hooks/useResponsive";
import { colors, radii, shadows, spacing, fontSize, fontWeight } from "../styles/tokens";
import { Title, Caption, Body } from "../components/ui/Typography";
import Card from "../components/ui/Card";
import UIButton from "../components/ui/Button";
import PersonalityResultCard from "../components/PersonalityResultCard";

type Stage = "loading" | "intro" | "testing" | "result" | "error";

const PAGE_SIZE = 15;

/** -3 到 +3 的 7 级 Likert 量表 */
const SCALE_POINTS = [
  { value: -3, short: "非常同意" },
  { value: -2, short: "比较同意" },
  { value: -1, short: "略微同意" },
  { value: 0, short: "中立" },
  { value: 1, short: "略微同意" },
  { value: 2, short: "比较同意" },
  { value: 3, short: "非常同意" },
];

export default function PersonalityTestPage() {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("loading");
  const [page, setPage] = useState(0);
  const answersRef = useRef<Map<string, number>>(new Map());
  const [, setTick] = useState(0); // 强制 re-render 计数器

  // 已有结果
  const { data: existingResult, isLoading: loadingResult } = useQuery({
    queryKey: ["personality-result"],
    queryFn: fetchPersonalityResult,
    retry: false,
  });

  // 题目
  const {
    data: questions,
    isLoading: loadingQuestions,
    isError: questionsError,
    refetch: refetchQuestions,
  } = useQuery({
    queryKey: ["personality-questions"],
    queryFn: fetchPersonalityQuestions,
    enabled: stage === "testing",
    retry: 1,
  });

  // 提交
  const submitMutation = useMutation({
    mutationFn: submitPersonalityAnswers,
    onSuccess: (data) => {
      queryClient.setQueryData(["personality-result"], data);
      setStage("result");
      setSubmittedResult(data);
    },
    onError: () => setStage("error"),
  });

  const [submittedResult, setSubmittedResult] = useState<PersonalityResult | null>(null);
  const displayResult = submittedResult ?? existingResult ?? null;

  useEffect(() => {
    if (loadingResult) return;
    if (existingResult && stage === "loading") {
      setSubmittedResult(existingResult);
      setStage("result");
      return;
    }
    if (stage === "loading") setStage("intro");
  }, [loadingResult, existingResult, stage]);

  const allQuestions: PersonalityQuestion[] = questions ?? [];
  const totalPages = Math.max(1, Math.ceil(allQuestions.length / PAGE_SIZE));
  const startIdx = page * PAGE_SIZE;
  const endIdx = Math.min((page + 1) * PAGE_SIZE, allQuestions.length);
  const pageQuestions = allQuestions.slice(startIdx, endIdx);

  const getAnswer = (qId: string) => answersRef.current.get(qId) ?? 0;

  const setAnswer = useCallback((qId: string, value: number) => {
    answersRef.current.set(qId, value);
    setTick((t) => t + 1); // 强制 re-render
  }, []);

  const handleStart = () => setStage("testing");
  const handleSkip = () => navigate("/recommend", { replace: true });

  const handleSubmit = () => {
    // 未点击的题目默认填 0（中立），确保全部 60 题都提交
    const all = allQuestions.map((q) => ({
      id: q.id,
      value: answersRef.current.get(q.id) ?? 0,
    }));
    submitMutation.mutate({ answers: all, gender: "Other" });
  };

  const goNext = () => { if (page < totalPages - 1) { setPage(page + 1); window.scrollTo(0, 0); } };
  const goPrev = () => { if (page > 0) { setPage(page - 1); window.scrollTo(0, 0); } };

  // ── Loading / Result / Error / Intro ──
  if (stage === "loading" || loadingResult) {
    return (
      <div className="xhs-page" style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <div style={{ color: colors.textTertiary, fontSize: fontSize.body }}>加载中...</div>
      </div>
    );
  }

  if (stage === "result" && displayResult) {
    return (
      <div className="xhs-page">
        <Title style={{ marginBottom: 24 }}>穿搭人格</Title>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <PersonalityResultCard result={displayResult} />
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
            <UIButton variant="primary" size="lg" onClick={() => navigate("/recommend", { replace: true })}>
              完成
            </UIButton>
            <UIButton variant="ghost" size="lg" onClick={() => { setStage("intro"); setSubmittedResult(null); }}>
              重新测试
            </UIButton>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="xhs-page">
        <div style={{ maxWidth: 400, margin: "80px auto 0", textAlign: "center" }}>
          <Card padding={32}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
            <Title style={{ marginBottom: 8 }}>服务暂不可用</Title>
            <Body style={{ marginBottom: 20, color: colors.textSecondary }}>
              人格测试服务暂时无法访问，请稍后重试。
            </Body>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <UIButton variant="primary" onClick={() => { submitMutation.reset(); setStage("intro"); }}>
                返回
              </UIButton>
              <UIButton variant="ghost" onClick={handleSkip}>跳过</UIButton>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (stage === "intro") {
    return (
      <div className="xhs-page">
        <div style={{ maxWidth: 460, margin: "0 auto", paddingTop: isMobile ? 24 : 48 }}>
          <Card variant="elevated" padding={isMobile ? 24 : 36}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🧠</div>
              <Title style={{ marginBottom: 8 }}>发现你的穿搭人格</Title>
              <Body style={{ color: colors.textSecondary, lineHeight: 1.8 }}>
                通过 16 型人格测试，了解你与生俱来的穿搭偏好。
                AI 将根据测试结果，结合你的衣橱，给出更懂你的搭配建议。
              </Body>
            </div>
            <div style={{
              display: "flex", flexDirection: "column", gap: 10, marginBottom: 24,
              padding: "16px 0", borderTop: `1px solid ${colors.divider}`, borderBottom: `1px solid ${colors.divider}`,
            }}>
              {[
                { icon: "📝", text: "约 60 道选择题，约需 5-8 分钟" },
                { icon: "🎯", text: "每题左右两个陈述，选择你的倾向" },
                { icon: "👗", text: "结果生成专属穿搭风格画像" },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: colors.textSecondary }}>
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <UIButton variant="primary" size="lg" block onClick={handleStart}>开始测试</UIButton>
              <UIButton variant="ghost" size="lg" block onClick={handleSkip}>跳过</UIButton>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Testing: loading ──
  if (loadingQuestions) {
    return (
      <div className="xhs-page" style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
        <div style={{ color: colors.textTertiary }}>加载题目中...</div>
      </div>
    );
  }

  // ── Testing: error ──
  if (questionsError || allQuestions.length === 0) {
    return (
      <div className="xhs-page">
        <div style={{ maxWidth: 400, margin: "80px auto 0", textAlign: "center" }}>
          <Card padding={32}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
            <Title style={{ marginBottom: 8 }}>加载失败</Title>
            <Body style={{ marginBottom: 20, color: colors.textSecondary }}>
              无法加载测试题目，请检查网络后重试。
            </Body>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <UIButton variant="primary" onClick={() => refetchQuestions()}>重试</UIButton>
              <UIButton variant="ghost" onClick={handleSkip}>跳过</UIButton>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 圆形按钮直径（根据屏幕宽度自适应）
  const dotSize = isMobile ? 34 : 36;
  const gap = isMobile ? 3 : 6;

  // ── Testing ──
  return (
    <div className="xhs-page">
      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        {/* 进度条 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Caption>第 {startIdx + 1}-{endIdx} 题 / 共 {allQuestions.length} 题</Caption>
            <Caption>{Math.round((endIdx / allQuestions.length) * 100)}%</Caption>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: colors.placeholder, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${(endIdx / allQuestions.length) * 100}%`,
              borderRadius: 3, background: colors.accent, transition: "width 0.3s ease",
            }} />
          </div>
        </div>

        {/* 题目列表 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pageQuestions.map((q, i) => {
            const val = getAnswer(q.id);
            return (
              <Card key={q.id} padding={isMobile ? 16 : 22} style={{ border: val !== 0 ? `1px solid ${colors.accentSoft}` : undefined }}>
                {/* 题号 + 问题 */}
                <Body style={{ marginBottom: 16, fontWeight: fontWeight.medium, lineHeight: 1.6 }}>
                  {startIdx + i + 1}. {q.question}
                </Body>

                {/* 左侧陈述 + Likert 量表 + 右侧陈述 */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr auto 1fr",
                  gap: isMobile ? 12 : 16,
                  alignItems: "center",
                }}>
                  {/* 左侧陈述 */}
                  <div style={{
                    fontSize: 13, fontWeight: fontWeight.semibold, color: colors.accent,
                    textAlign: isMobile ? "center" : "right", lineHeight: 1.5,
                    padding: "4px 0",
                  }}>
                    {q.options[0]}
                  </div>

                  {/* Likert 圆点 */}
                  <div style={{
                    display: "flex", gap,
                    alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                    padding: "4px 0",
                  }}>
                    {SCALE_POINTS.map(({ value, short }) => {
                      const selected = val === value;
                      const isNeutral = value === 0;
                      const isLeft = value < 0;
                      const isRight = value > 0;

                      // 颜色：选中时按方向着色，未选中时淡灰
                      let bg: string = colors.surface;
                      let bd: string = colors.divider;
                      if (selected) {
                        if (isNeutral) { bg = "#888"; bd = "#888"; }
                        else if (isLeft) { bg = "#5B8DEF"; bd = "#5B8DEF"; }
                        else { bg = "#E87C5A"; bd = "#E87C5A"; }
                      }

                      return (
                        <button
                          key={value}
                          onClick={() => setAnswer(q.id, value)}
                          title={`${short}${isLeft ? "左边" : isRight ? "右边" : ""}`}
                          style={{
                            width: dotSize, height: dotSize,
                            borderRadius: "50%",
                            border: `2px solid ${bd}`,
                            background: bg,
                            cursor: "pointer", padding: 0,
                            transition: "transform 0.15s, border-color 0.15s, background 0.15s",
                            transform: selected ? "scale(1.15)" : "scale(1)",
                            flexShrink: 0,
                            outline: "none",
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* 右侧陈述 */}
                  <div style={{
                    fontSize: 13, fontWeight: fontWeight.semibold, color: colors.accent,
                    textAlign: isMobile ? "center" : "left", lineHeight: 1.5,
                    padding: "4px 0",
                  }}>
                    {q.options[1]}
                  </div>
                </div>

                {/* 量表标签 */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  marginTop: 6, padding: `0 ${isMobile ? 0 : 20}px`,
                }}>
                  <span style={{ fontSize: 10, color: colors.textTertiary }}>← 同意左边</span>
                  <span style={{ fontSize: 10, color: colors.textTertiary }}>同意右边 →</span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* 底部导航 */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 24, paddingTop: 16,
          borderTop: `1px solid ${colors.divider}`,
        }}>
          <UIButton variant="ghost" disabled={page === 0} onClick={goPrev}>上一页</UIButton>

          <div style={{ display: "flex", gap: 8 }}>
            {Array.from({ length: totalPages }, (_, i2) => (
              <div key={i2} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i2 === page ? colors.accent : colors.divider,
                transition: "background 0.2s",
              }} />
            ))}
          </div>

          {page < totalPages - 1 ? (
            <UIButton variant="primary" onClick={goNext}>下一页</UIButton>
          ) : (
            <UIButton variant="primary" onClick={handleSubmit} loading={submitMutation.isPending}>
              提交
            </UIButton>
          )}
        </div>
      </div>
    </div>
  );
}
