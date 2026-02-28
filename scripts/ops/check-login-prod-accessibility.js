/*
 * 실서비스 로그인 페이지에서 새 번들 반영 여부와 주요 접근성 마크업 표시를 점검합니다.
 */
import { mkdir, appendFile } from "node:fs/promises";
import { dirname } from "node:path";

const LOGIN_URL = "https://www.oingapp.com/login?_smoke=2";
const LOG_FILE = process.env.OINGAPP_LOGIN_CHECK_LOG;

function nowKst() {
  const now = new Date();
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(now);
}

function isProdLoginHtml(html) {
  const scriptMatch = html.match(/\/(_next\/static\/chunks\/app\/login\/page-[^"']+\.js)"/);
  const script = scriptMatch ? scriptMatch[1] : null;
  return {
    script: script ? `/${script}` : null,
    hasLoginDetails: html.includes("비밀번호 로그인 (관리자/개발용)"),
  };
}

function parseLoginChunk(html) {
  const regex = /<script[^>]*src="([^"]*\/app\/login\/page-[^"]+\.js)"[^>]*><\/script>/g;
  const matches = [...html.matchAll(regex)];
  return matches.map((m) => m[1]).filter((src) => src.includes("app/login/page-"));
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`${url} -> ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function hasLoginMarkup(chunk) {
  return [
    { pattern: 'id="login-email"', ok: chunk.includes('id="login-email"') },
    { pattern: 'name attr email', ok: /name\s*[:=]\s*[\"\']email[\"\']/.test(chunk) },
    { pattern: 'id="login-password"', ok: chunk.includes('id="login-password"') },
    { pattern: 'name attr password', ok: /name\s*[:=]\s*[\"\']password[\"\']/.test(chunk) },
  ];
}

async function main() {
  const checkedAt = nowKst();
  const html = await fetchText(LOGIN_URL);
  const { script, hasLoginDetails } = isProdLoginHtml(html);
  const candidates = parseLoginChunk(html);
  const latest = candidates.length === 1 ? candidates[0] : candidates[candidates.length - 1] || null;
  const result = {
    checkedAt,
    url: LOGIN_URL,
    status: "warn",
    scriptCandidates: candidates,
    visibleScript: latest,
    loginDetails: hasLoginDetails,
    chunkChecks: null,
    chunkEvaluations: [],
    errors: [],
  };

  if (!latest) {
    result.status = "fail";
    result.errors.push("login chunk script 태그를 찾지 못했습니다.");
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  let latestChunkText = "";
  for (const chunk of candidates) {
    try {
      const chunkUrl = new URL(chunk, LOGIN_URL).toString();
      const chunkText = await fetchText(chunkUrl);
      const checks = hasLoginMarkup(chunkText);
      const hasAll = checks.every((c) => c.ok);
      const hasWarningPattern = chunkText.includes("A form field element should have an id or name attribute");

      result.chunkEvaluations.push({
        script: chunk,
        checks,
        hasAll,
        hasWarningPattern,
      });

      if (chunk === latest) {
        latestChunkText = chunkText;
      }
    } catch (error) {
      result.chunkEvaluations.push({
        script: chunk,
        checks: null,
        hasAll: false,
        hasWarningPattern: false,
        error: `login chunk fetch 실패: ${error.message}`,
      });
    }
  }

  const checks = result.chunkEvaluations.find((entry) => entry.script === latest)?.checks || null;
  result.chunkChecks = checks;

  const hasAll = checks ? checks.every((c) => c.ok) : false;
  const hasWarningPattern = latestChunkText.includes("A form field element should have an id or name attribute");

  if (hasAll && !hasWarningPattern && script) {
    result.status = "pass";
  } else if (!hasAll || hasWarningPattern) {
    result.status = "warn";
  }

  result.chunkWarningObserved = hasWarningPattern;
  result.summary = {
    script,
    hasRequiredMarkup: hasAll,
    hasWarningPattern,
  };

  if (LOG_FILE) {
    await mkdir(dirname(LOG_FILE), { recursive: true });
    await appendFile(LOG_FILE, `${JSON.stringify(result)}\n`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(`[login-prod-check] 실패: ${error.message}`);
  process.exit(1);
});
