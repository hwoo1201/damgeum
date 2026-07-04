// Meta Pixel 이벤트 전송.
// window.fbq(베이스 코드로 로드됨)가 있으면 실제 픽셀을 직접 호출하고,
// 'Triggered' 콘솔 로그는 디버깅 보조용으로만 남긴다.
export const fbEvent = (name: string, options?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;

  const fbq = (window as any).fbq;

  if (typeof fbq === "function") {
    // 실제 Meta Pixel 호출 (facebook.com/tr 이벤트 요청 발생)
    if (options) {
      fbq("track", name, options);
    } else {
      fbq("track", name);
    }
    // 보조 로그 — 전송 자체는 위 fbq 호출로 처리됨
    console.log(`[Meta Pixel] Triggered: ${name}`, options ?? "");
  } else {
    console.warn(`[Meta Pixel] fbq not loaded — event skipped: ${name}`);
  }
};
