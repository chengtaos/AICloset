import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";
import api from "../api/client";

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
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function loadFromStorage(): { user: User | null; token: string | null } {
  const token = localStorage.getItem("token");
  if (!token) return { user: null, token: null };
  try {
    const payload = jwtDecode<{ sub: string; exp: number }>(token);
    if (payload.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      return { user: null, token: null };
    }
  } catch {
    localStorage.removeItem("token");
    return { user: null, token: null };
  }
  const raw = localStorage.getItem("user");
  const user = raw ? (JSON.parse(raw) as User) : null;
  return { user, token };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadFromStorage().user);
  const [token, setToken] = useState<string | null>(() => loadFromStorage().token);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  }, [user]);

  const login = useCallback(async (phone: string, password: string) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { phone, password });
      setToken(data.token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(
    async (phone: string, password: string, nickname: string) => {
      setLoading(true);
      try {
        const { data } = await api.post("/auth/register", {
          phone,
          password,
          nickname,
        });
        setToken(data.token);
        setUser(data.user);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
