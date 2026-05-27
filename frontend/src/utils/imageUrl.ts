/**
 * 将后端存储的图片路径转为前端可用 URL。
 * 后端存储格式: "uploads/xxx.png"
 * 开发环境由 Vite proxy 转发，生产环境由 nginx 直接 serve。
 */
export function getImageUrl(path: string | undefined | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `/${path}`;
}
