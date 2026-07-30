export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  /** Present once BMONI onboarding has been started for this trader. */
  bmoniUserId?: string | null;
};

export type AuthResponse = {
  user: AuthUser;
};

async function post(path: string, body: unknown): Promise<AuthResponse> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error ?? "Something went wrong. Try again.");
  return payload;
}

export function login(email: string, password: string) {
  return post("/api/auth/login", { email, password });
}

export function signup(name: string, email: string, password: string, phone: string) {
  return post("/api/auth/signup", { name, email, password, phone });
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("authUser");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem("authUser", JSON.stringify(user));
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("authUser");
}
