"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fbEvent } from "@/lib/pixel";
import { Check, X } from "lucide-react";

interface AnswerItem {
  value: string | number;
  score: number;
}

function ResultContent() {
  const router = useRouter();

  // 세션 및 상태 데이터
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variant, setVariant] = useState<"price" | "noprice" | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerItem>>({});
  const [isValidSession, setIsValidSession] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 게이지 애니메이션 점수
  const [animatedScore, setAnimatedScore] = useState<number>(0);
  const [finalScore, setFinalScore] = useState<number>(0);

  // 가격 선택 상태 (variant === 'price' 전용)
  const [selectedPrice, setSelectedPrice] = useState<"monthly" | "yearly">("yearly");

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [agreePrivacy, setAgreePrivacy] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [preorderComplete, setPreorderComplete] = useState<boolean>(false);

  // 1. 세션 복구 및 예외 처리
  useEffect(() => {
    try {
      const savedSessionId = sessionStorage.getItem("dumgeum_session_id");
      const savedVariant = sessionStorage.getItem("dumgeum_variant") as "price" | "noprice" | null;
      const savedAnswersStr = sessionStorage.getItem("dumgeum_answers");

      if (!savedSessionId || !savedAnswersStr) {
        // 유효한 세션이 없으면 홈으로 리다이렉트
        router.push("/");
        return;
      }

      const savedAnswers = JSON.parse(savedAnswersStr);
      setSessionId(savedSessionId);
      setVariant(savedVariant || "noprice");
      setAnswers(savedAnswers);
      setIsValidSession(true);

      // 점수 재계산
      let totalScore = 0;
      Object.keys(savedAnswers).forEach((key) => {
        totalScore += savedAnswers[parseInt(key, 10)].score;
      });

      const rawCalculated = Math.round((totalScore / 87) * 100);
      const clampedScore = Math.max(40, Math.min(92, rawCalculated));
      setFinalScore(clampedScore);
    } catch (e) {
      console.error("Error reading session info", e);
      router.push("/");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // 2. 점수 게이지 카운터 애니메이션
  useEffect(() => {
    if (!isValidSession || finalScore === 0) return;

    let start = 0;
    const duration = 1200; // ms
    const increment = finalScore / (duration / 16); // 60fps 대략 16ms

    const counter = setInterval(() => {
      start += increment;
      if (start >= finalScore) {
        setAnimatedScore(finalScore);
        clearInterval(counter);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(counter);
  }, [isValidSession, finalScore]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-navy text-white">
        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-400">결과 분석 중...</p>
      </div>
    );
  }

  if (!isValidSession) {
    return null;
  }

  // 7번 답변 및 연간 술값 매핑
  // 7. 한 달 술값은 대략? — 5만원 이하(2) / 5~15만원(6) / 15만원 이상(10)
  const q7Answer = answers[7]?.value || "";
  let annualDrinkCost = "연 약 144만원";
  if (typeof q7Answer === "string") {
    if (q7Answer.includes("5만원 이하")) {
      annualDrinkCost = "연 약 48만원";
    } else if (q7Answer.includes("15만원 이상")) {
      annualDrinkCost = "연 약 240만원+";
    }
  }

  // 8번 답변 및 맞춤 티저 첫 줄 매핑
  // 8. 술을 줄이면 가장 얻고 싶은 건? — 몸과 피부 / 돈 / 시간과 집중력 / 관계와 자존감
  const q8Answer = answers[8]?.value || "";
  let personalizedTeaser = "2주 만에 아침이 달라지는 회복 타임라인";
  if (typeof q8Answer === "string") {
    if (q8Answer.includes("돈")) {
      personalizedTeaser = "안 마신 날마다 쌓이는 절약 금액 실시간 카운터";
    } else if (q8Answer.includes("시간")) {
      personalizedTeaser = "숙취 없는 아침을 만드는 주간 컨디션 플랜";
    } else if (q8Answer.includes("관계")) {
      personalizedTeaser = "술자리에서 당당해지는 회식 생존 전략";
    }
  }

  // 점수 범위별 등급 레이블 및 테마 색상 설정
  let scoreGrade = "습관 형성 단계 — 아직 늦지 않았어요";
  let gradeColor = "text-emerald-400";
  let gaugeColor = "#34d399"; // emerald
  if (finalScore >= 60 && finalScore <= 74) {
    scoreGrade = "습관화 진입 단계 — 몸이 술을 기억하기 시작했어요";
    gradeColor = "text-amber-400";
    gaugeColor = "#fbbf24"; // amber
  } else if (finalScore >= 75) {
    scoreGrade = "의존 주의 단계 — 의지만으로는 어려운 구간이에요";
    gradeColor = "text-rose-400";
    gaugeColor = "#f87171"; // rose
  }

  // SVG 반원 호 길이 = 125.66 (r=40)
  const radius = 40;
  const strokeLength = Math.PI * radius; // 125.66
  // animatedScore가 0일 때 offset = 125.66, 100일 때 offset = 0
  const strokeOffset = strokeLength * (1 - animatedScore / 100);

  // 3. CTA 클릭 시 동작
  const handleCtaClick = async () => {
    fbEvent("InitiateCheckout");

    const currentSessionId = sessionId || sessionStorage.getItem("dumgeum_session_id");
    if (currentSessionId) {
      try {
        await supabase
          .from("quiz_sessions")
          .update({
            cta_clicked: true,
            price_selected: variant === "price" ? selectedPrice : null,
          })
          .eq("id", currentSessionId);
      } catch (e) {
        console.error("Failed to update CTA status in session", e);
      }
    }

    setIsModalOpen(true);
  };

  // 4. 이메일 기반 사전등록 처리
  const handlePreorderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreePrivacy || !email || isSubmittingOrder) return;

    setIsSubmittingOrder(true);
    const currentSessionId = sessionId || sessionStorage.getItem("dumgeum_session_id");

    try {
      const { error } = await supabase.from("preorders").insert({
        id: crypto.randomUUID(),
        session_id: currentSessionId,
        contact: email,
        contact_type: "email",
      });

      if (error) throw error;

      fbEvent("Lead");
      setPreorderComplete(true);
    } catch (e) {
      console.error("Preorder submission failed", e);
      // Fallback UI
      fbEvent("Lead");
      setPreorderComplete(true);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // 5. 카카오 채널 클릭 등록 처리
  const handleKakaoClick = async () => {
    const currentSessionId = sessionId || sessionStorage.getItem("dumgeum_session_id");
    const kakaoUrl = process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL || "#";

    try {
      await supabase.from("preorders").insert({
        id: crypto.randomUUID(),
        session_id: currentSessionId,
        contact: "clicked_kakao_channel",
        contact_type: "kakao",
      });
    } catch (e) {
      console.error("Failed to log kakao interaction", e);
    }

    fbEvent("Lead");
    window.open(kakaoUrl, "_blank", "noopener,noreferrer");
    setPreorderComplete(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-navy text-white px-5">
      {/* 게이지 섹션 */}
      <div className="flex flex-col items-center pt-10 pb-8 border-b border-white/5">
        <h2 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-6">
          나의 음주 의존도 분석 결과
        </h2>

        {/* 반원형 게이지 */}
        <div className="relative w-56 h-32 flex justify-center overflow-hidden">
          <svg className="w-52 h-28 transform -rotate-180" viewBox="0 0 100 50">
            {/* 회색 배경 호 */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="#1e293b"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* 채워지는 애니메이션 호 */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={strokeLength}
              strokeDashoffset={strokeOffset}
              className="transition-all duration-300 ease-out"
            />
          </svg>
          {/* 점수 텍스트 */}
          <div className="absolute bottom-1 flex flex-col items-center">
            <span className="text-5xl font-black text-white">{animatedScore}</span>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider mt-1">SCORE</span>
          </div>
        </div>

        {/* 단계 라벨 */}
        <div className="mt-4 text-center">
          <p className={`text-[15px] font-bold ${gradeColor} tracking-tight leading-relaxed px-4`}>
            {scoreGrade}
          </p>
        </div>
      </div>

      {/* 연간 술값 카드 */}
      <div className="mt-8 bg-navy-light/40 border border-white/5 rounded-2xl p-6.5">
        <div className="flex flex-col items-start gap-1">
          <span className="text-xs text-slate-400 font-semibold tracking-tight">나의 낭비 예상액</span>
          <span className="text-3xl font-extrabold text-gold tracking-tight">{annualDrinkCost}</span>
          <p className="text-[12px] text-slate-400 leading-normal mt-3 pt-3 border-t border-white/5 w-full">
            술값만이 아니에요. 택시비, 해장 배달, 다음 날의 컨디션까지.
          </p>
        </div>
      </div>

      {/* 진단 카피 */}
      <div className="mt-6 bg-navy-light/20 border border-white/5 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-1.5">
          <span>🔍</span> 전문가 맞춤 분석
        </h3>
        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line tracking-tight">
          "4번 문항에서 보이듯, 의지로 참는 방식은 이미 시도했고 통하지 않았어요. 문제는 의지가 아니라 시스템입니다."
        </p>
      </div>

      {/* 플랜 티저 */}
      <div className="mt-6 bg-navy-light/40 border border-white/5 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-1.5">
          <span>⚡</span> 담금 맞춤 케어 플랜
        </h3>
        <ul className="flex flex-col gap-3.5">
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-[10px] text-gold font-bold">
              1
            </span>
            <span className="text-sm text-slate-300 font-medium leading-relaxed">
              {personalizedTeaser}
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-[10px] text-gold font-bold">
              2
            </span>
            <span className="text-sm text-slate-300 font-medium leading-relaxed">
              마시고 싶은 순간, 3초 안에 개입하는 AI 코치
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center text-[10px] text-gold font-bold">
              3
            </span>
            <span className="text-sm text-slate-300 font-medium leading-relaxed">
              재발해도 자책 대신 트리거 분석
            </span>
          </li>
        </ul>
      </div>

      {/* 가격 카드 분기 (variant === 'price' 인 경우) */}
      {variant === "price" && (
        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-300 mb-4 text-center">원하는 멤버십 플랜 선택</h3>
          <div className="grid grid-cols-2 gap-3.5">
            {/* 월 플랜 */}
            <div
              onClick={() => setSelectedPrice("monthly")}
              className={`cursor-pointer rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                selectedPrice === "monthly"
                  ? "bg-navy-light border-gold shadow-[0_4px_15px_rgba(212,175,55,0.15)]"
                  : "bg-navy-light/20 border-white/5 hover:border-white/10"
              }`}
            >
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">월 정기권</span>
                <span className="text-xl font-extrabold text-white">월 9,900원</span>
              </div>
              <div className="mt-6 flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedPrice === "monthly" ? "border-gold bg-gold" : "border-slate-600"
                }`}>
                  {selectedPrice === "monthly" && <Check size={10} className="text-navy font-bold" />}
                </div>
                <span className="text-[11px] text-slate-400 font-medium">선택</span>
              </div>
            </div>

            {/* 연 플랜 (기본 추천) */}
            <div
              onClick={() => setSelectedPrice("yearly")}
              className={`cursor-pointer rounded-2xl p-5 border flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                selectedPrice === "yearly"
                  ? "bg-navy-light border-gold shadow-[0_4px_15px_rgba(212,175,55,0.15)]"
                  : "bg-navy-light/20 border-white/5 hover:border-white/10"
              }`}
            >
              {/* 할인 뱃지 */}
              <div className="absolute top-0 right-0 bg-gold text-navy font-bold text-[9px] px-2.5 py-0.5 rounded-bl-lg">
                58% 할인
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">연 정기권</span>
                <span className="text-xl font-extrabold text-white">연 49,000원</span>
                <span className="text-[10px] text-gold font-medium block mt-1">(월 4,083원)</span>
              </div>
              <div className="mt-4 flex items-center gap-1.5">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedPrice === "yearly" ? "border-gold bg-gold" : "border-slate-600"
                }`}>
                  {selectedPrice === "yearly" && <Check size={10} className="text-navy font-bold" />}
                </div>
                <span className="text-[11px] text-gold font-semibold">기본 추천</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CTA 버튼 */}
      <div
        className="mt-10 pb-6"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={handleCtaClick}
          className="w-full py-4 bg-gradient-to-r from-gold via-gold-light to-gold-dark text-navy text-base font-bold rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
        >
          3일 무료로 시작하기
        </button>
      </div>

      {/* Fakedoor 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-[400px] bg-navy-light border border-white/10 rounded-3xl p-6.5 shadow-2xl relative">
            {/* 닫기 버튼 */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-navy/40 border border-white/5 transition-colors"
              aria-label="모달 닫기"
            >
              <X size={18} />
            </button>

            {!preorderComplete ? (
              <>
                <div className="mb-6 mt-2">
                  <h4 className="text-lg font-bold text-white tracking-tight mb-2">
                    지금 마지막 준비 중이에요
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    곧 출시됩니다. 지금 사전등록하면 출시 알림과 함께 첫 달 50% 할인권을 드려요.
                  </p>
                </div>

                <form onSubmit={handlePreorderSubmit} className="flex flex-col gap-4">
                  {/* 이메일 입력 */}
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="email"
                      required
                      placeholder="이메일 주소를 입력해 주세요"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4.5 py-3.5 bg-navy border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold/60 transition-colors"
                    />
                  </div>

                  {/* 개인정보 처리동의 */}
                  <label className="flex items-start gap-2.5 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      required
                      checked={agreePrivacy}
                      onChange={(e) => setAgreePrivacy(e.target.checked)}
                      className="mt-0.5 rounded border-slate-600 bg-navy text-gold focus:ring-gold focus:ring-offset-navy accent-gold"
                    />
                    <span className="text-[11px] text-slate-400 leading-normal select-none">
                      개인정보 수집·이용에 동의합니다 (
                      <span
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push("/privacy");
                        }}
                        className="text-gold underline hover:opacity-80"
                      >
                        자세히 보기
                      </span>
                      )
                    </span>
                  </label>

                  {/* 이메일 제출 버튼 */}
                  <button
                    type="submit"
                    disabled={!agreePrivacy || !email || isSubmittingOrder}
                    className="w-full py-4 bg-gradient-to-r from-gold via-gold-light to-gold-dark text-navy text-base font-bold rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
                  >
                    {isSubmittingOrder ? "등록 중..." : "사전등록하기"}
                  </button>
                </form>

                {/* 카카오 보조 버튼 구분선 */}
                <div className="relative flex py-3.5 items-center">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="flex-shrink mx-4 text-[10px] text-slate-500 font-medium">또는</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {/* 카카오 보조 버튼 */}
                <button
                  onClick={handleKakaoClick}
                  className="w-full py-3.5 bg-[#FEE500] text-[#191919] font-bold text-sm rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <span className="text-base">💬</span> 카카오 채널로 알림받기
                </button>
              </>
            ) : (
              // 완료 화면
              <div className="text-center py-8 px-2 flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-gold/10 border border-gold/20 rounded-full flex items-center justify-center mb-6 text-3xl">
                  🙌
                </div>
                <h4 className="text-xl font-bold text-white tracking-tight mb-2.5">
                  등록 완료!
                </h4>
                <p className="text-sm text-slate-300 leading-relaxed max-w-[240px]">
                  출시되면 가장 먼저 알려드릴게요.
                  <br />
                  감사합니다!
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="mt-8 px-6 py-2.5 bg-navy-light text-slate-300 border border-white/5 hover:border-white/10 text-xs font-semibold rounded-lg transition-colors"
                >
                  창 닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-navy text-white">
        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-400">결과 분석 중...</p>
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
