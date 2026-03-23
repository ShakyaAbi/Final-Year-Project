import { request, setToken } from "./apiClient";
import { CurrentUser } from "../types";

const mapCurrentUser = (user: any): CurrentUser => ({
  id: String(user.id),
  email: user.email ?? "",
  role: user.role ?? "",
  createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
  name: user.name ?? null,
  jobTitle: user.jobTitle ?? null,
  organization: user.organization ?? null,
  avatar: user.avatar ?? null,
});

export const authApi = {
  login: async (email: string, password: string) => {
    const result = await request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(result.token);
    return result;
  },
  me: async (): Promise<CurrentUser> => {
    const user = await request("/auth/me");
    return mapCurrentUser(user);
  },
};
