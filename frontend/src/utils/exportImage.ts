import type { ClothingItemBrief, WeatherInfo } from "../types";
import { getImageUrl } from "./imageUrl";

const CARD_W = 420;
const CARD_PAD = 24;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    if (ctx.measureText(current + char).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("load failed"));
      img.src = src;
    });
    return img;
  } catch {
    return null;
  }
}

export async function exportOutfitCard(
  items: ClothingItemBrief[],
  reason: string,
  weather?: WeatherInfo,
) {
  const canvas = document.createElement("canvas");
  const scale = 2; // Retina
  canvas.width = CARD_W * scale;
  canvas.height = 1; // will calc

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // ── 预加载图片 ──
  const itemImgs: (HTMLImageElement | null)[] = [];
  for (const item of items.slice(0, 6)) {
    if (item.images.length > 0) {
      itemImgs.push(await loadImage(getImageUrl(item.images[0])));
    } else {
      itemImgs.push(null);
    }
  }

  // ── 布局计算 ──
  ctx.font = "13px -apple-system, PingFang SC, Microsoft YaHei, sans-serif";

  const reasonLines = wrapText(ctx, reason, CARD_W - CARD_PAD * 2);
  const reasonH = reasonLines.length * 20 + 20;

  const hasWeather = !!weather;
  const weatherH = hasWeather ? 36 : 0;
  const titleH = 40;
  const itemAreaH = items.length > 0 ? 120 : 0;
  const cardH = CARD_PAD + titleH + weatherH + itemAreaH + reasonH + CARD_PAD;

  canvas.height = Math.round(cardH * scale);
  ctx.scale(scale, scale);
  // Re-apply font after second scale
  ctx.font = "13px -apple-system, PingFang SC, Microsoft YaHei, sans-serif";

  // ── 背景 ──
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, 0, CARD_W, cardH, 12);
  ctx.fill();

  // ── 标题 ──
  let y = CARD_PAD;
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "600 16px -apple-system, PingFang SC, Microsoft YaHei, sans-serif";
  ctx.fillText("今日穿搭推荐", CARD_PAD, y + 16);
  y += titleH;

  // ── 天气条 ──
  if (weather) {
    ctx.fillStyle = "#f5f5f7";
    roundRect(ctx, CARD_PAD, y, CARD_W - CARD_PAD * 2, 28, 6);
    ctx.fill();
    ctx.fillStyle = "#4a5c6c";
    ctx.font = "12px -apple-system, PingFang SC, Microsoft YaHei, sans-serif";
    const wx = `${weather.city} · ${weather.condition} · ${weather.temperature}°C（体感${weather.feels_like}°C）`;
    ctx.fillText(wx, CARD_PAD + 10, y + 19);
    y += weatherH;
  }

  // ── 衣物缩略图 ──
  if (items.length > 0) {
    const thumbSize = 80;
    const gap = 8;
    const startX = CARD_PAD;
    for (let i = 0; i < Math.min(items.length, 6); i++) {
      const x = startX + i * (thumbSize + gap);
      // 占位背景
      ctx.fillStyle = "#f5f5f5";
      roundRect(ctx, x, y, thumbSize, thumbSize, 6);
      ctx.fill();

      const img = itemImgs[i];
      if (img) {
        ctx.save();
        roundRect(ctx, x, y, thumbSize, thumbSize, 6);
        ctx.clip();
        ctx.drawImage(img, x, y, thumbSize, thumbSize);
        ctx.restore();
      }

      // 名称
      ctx.fillStyle = "#8c8c8c";
      ctx.font = "10px -apple-system, PingFang SC, Microsoft YaHei, sans-serif";
      const name = items[i].name || items[i].sub_category;
      const nameW = ctx.measureText(name).width;
      ctx.fillText(name, x + (thumbSize - nameW) / 2, y + thumbSize + 14);
    }
    y += itemAreaH;
  }

  // ── 推荐理由 ──
  ctx.fillStyle = "#f5f5f7";
  roundRect(ctx, CARD_PAD, y, CARD_W - CARD_PAD * 2, reasonH - 8, 6);
  ctx.fill();
  ctx.fillStyle = "#4a5c6c";
  ctx.font = "13px -apple-system, PingFang SC, Microsoft YaHei, sans-serif";
  for (let i = 0; i < reasonLines.length; i++) {
    ctx.fillText(reasonLines[i], CARD_PAD + 12, y + 18 + i * 20);
  }

  // ── 水印 ──
  ctx.fillStyle = "#d9d9d9";
  ctx.font = "10px -apple-system, PingFang SC, Microsoft YaHei, sans-serif";
  ctx.fillText("AiCloset · 智能电子衣橱", CARD_PAD, cardH - 8);

  // ── 下载 ──
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AiCloset_搭配卡片_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
