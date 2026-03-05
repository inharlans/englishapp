import { parseApiResponse } from "@/lib/api/base";
import { apiFetch } from "@/lib/clientApi";

type ClipperSettingsResponse = {
  defaultWordbookId: number | null;
};

export async function getClipperSettings(): Promise<ClipperSettingsResponse> {
  const res = await apiFetch("/api/users/me/clipper-settings", {
    method: "GET"
  });
  return parseApiResponse<ClipperSettingsResponse>(
    res,
    "클리퍼 설정을 불러오지 못했습니다.",
    "users.clipperSettings.get"
  );
}

export async function updateClipperDefaultWordbook(defaultWordbookId: number | null): Promise<ClipperSettingsResponse> {
  const res = await apiFetch("/api/users/me/clipper-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ defaultWordbookId })
  });
  return parseApiResponse<ClipperSettingsResponse>(
    res,
    "클리퍼 기본 단어장 저장에 실패했습니다.",
    "users.clipperSettings.patch"
  );
}
