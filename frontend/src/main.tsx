import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import App from "./App";
import "./styles/global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

const theme = {
  token: {
    colorPrimary: "#4a5c6c",
    colorSuccess: "#5b8c5a",
    colorWarning: "#c9a44b",
    colorError: "#b85c5c",
    colorTextBase: "#1a1a1a",
    colorTextSecondary: "#8c8c8c",
    colorTextTertiary: "#bfbfbf",
    colorBgBase: "#ffffff",
    colorBgContainer: "#ffffff",
    colorBgLayout: "#f8f9fa",
    colorBgElevated: "#ffffff",
    colorBorder: "#e8eaed",
    colorBorderSecondary: "#f0f0f0",
    borderRadius: 4,
    borderRadiusLG: 6,
    borderRadiusSM: 2,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif",
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 26,
    fontSizeHeading2: 22,
    fontSizeHeading3: 18,
    lineHeight: 1.6,
    controlHeight: 36,
    controlHeightLG: 44,
    paddingLG: 24,
    paddingMD: 16,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,
    marginLG: 24,
    marginMD: 16,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,
    boxShadow: "none",
    boxShadowSecondary: "none",
    wireframe: true,
  },
  components: {
    Button: {
      borderRadius: 4,
      controlHeight: 36,
      paddingInline: 20,
      fontWeight: 500,
    },
    Card: {
      borderRadius: 4,
      paddingLG: 24,
      padding: 20,
    },
    Tag: { borderRadius: 2 },
    Input: { borderRadius: 4, controlHeight: 36 },
    Select: { borderRadius: 4, controlHeight: 36 },
    Modal: { borderRadius: 6 },
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={zhCN} theme={theme}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConfigProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
