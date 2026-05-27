import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import api, { setAccessToken } from "../api/client";
import axios from "axios";

interface User {
  id: number;
  phone: string;
  nickname: string;
  avatar: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // 初始为 true，等待 refresh 完成

  // 启动时尝试用 refresh cookie 恢复登录态
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.post(
          "/api/auth/refresh",
          {},
          { withCredentials: true },
        );
        if (!cancelled) {
          setAccessToken(data.token);
          setToken(data.token);
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          localStorage.removeItem("user");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { phone, password });
      setAccessToken(data.token);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (phone: string, password: string, nickname: string) => {
      setLoading(true);
      try {
        const { data } = await api.post("/auth/register", {
          phone, password, nickname,
        });
        setAccessToken(data.token);
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // 即使网络错误也清除本地状态
    }
    setAccessToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem("user");
  }, []);

  const updateUser = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
