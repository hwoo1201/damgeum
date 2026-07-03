"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fbEvent } from "@/lib/pixel";
import { ChevronLeft } from "lucide-react";

interface Option {
  text: string;
  score: number;
}

interface Question {
  id: number;
  text: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "일주일에 술자리, 몇 번인가요?",
    options: [
      { text: "0~1번", score: 2 },
      { text: "2~3번", score: 6 },
      { text: "4번 이상", score: 10 },
    ],
  },
  {
    id: 2,
    text: "한 번 마시면 보통 어느 정도 마시나요?",
    options: [
      { text: "반 병 이하", score: 2 },
      { text: "1병 정도", score: 6 },
      { text: "2병 이상", score: 10 },
    ],
  },
  {
    id: 3,
    text: "주로 어떤 상황에서 마시나요?",
    options: [
      { text: "회식이나 모임 때만", score: 3 },
      { text: "혼자 집에서", score: 8 },
      { text: "스트레스 받을 때", score: 9 },
    ],
  },
  {
    id: 4,
    text: '"오늘은 안 마셔야지" 하고 마신 적, 최근 한 달에?',
    options: [
      { text: "없다", score: 0 },
      { text: "1~2번", score: 5 },
      { text: "3번 이상", score: 10 },
    ],
  },
  {
    id: 5,
    text: "마신 다음 날 후회한 적은?",
    options: [
      { text: "거의 없다", score: 1 },
      { text: "가끔", score: 5 },
      { text: "자주", score: 9 },
    ],
  },
  {
    id: 6,
    text: "음주 다음 날, 하루가 망가진다고 느끼나요?",
    options: [
      { text: "아니다", score: 1 },
      { text: "반나절 정도", score: 5 },
      { text: "하루 종일", score: 9 },
    ],
  },
  {
    id: 7,
    text: "한 달 술값은 대략?",
    options: [
      { text: "5만원 이하", score: 2 },
      { text: "5~15만원", score: 6 },
      { text: "15만원 이상", score: 10 },
    ],
  },
  {
    id: 8,
    text: "술을 줄이면 가장 얻고 싶은 건?",
    options: [
      { text: "몸과 피부", score: 0 },
      { text: "돈", score: 0 },
      { text: "시간과 집중력", score: 0 },
      { text: "관계와 자존감", score: 0 },
    ],
  },
  {
    id: 9,
    text: "혼자 줄여보려고 시도한 적 있나요?",
    options: [
      { text: "없다", score: 3 },
      { text: "있는데 실패했다", score: 8 },
      { text: "지금 시도 중이다", score: 6 },
    ],
  },
];

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 퀴즈 관련 상태
  const [currentStep, setCurrentStep] = useState<number>(0); // 0: 히어로, 1~9: 선택지형, 10: 슬라이더
  const [answers, setAnswers] = useState<Record<number, { value: string | number; score: number }>>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [variant, setVariant] = useState<"price" | "noprice" | null>(null);
  const [utmContent, setUtmContent] = useState<string | null>(null);

  // 10번 슬라이더 상태
  const [sliderValue, setSliderValue] = useState<number>(5);

  // 트랜지션 및 시각 피드백 상태
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. 초기 픽셀 전송 및 쿼리 파라미터 로딩
  useEffect(() => {
    fbEvent("ViewContent");

    const utm = searchParams.get("utm_content");
    if (utm) {
      setUtmContent(utm);
    }

    // sessionStorage에서 기존 상태 복구
    try {
      const savedSessionId = sessionStorage.getItem("dumgeum_session_id");
      const savedVariant = sessionStorage.getItem("dumgeum_variant") as "price" | "noprice" | null;
      const savedStep = sessionStorage.getItem("dumgeum_current_step");
      const savedAnswers = sessionStorage.getItem("dumgeum_answers");

      if (savedSessionId) setSessionId(savedSessionId);
      if (savedVariant) setVariant(savedVariant);
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
      if (savedStep) {
        const stepNum = parseInt(savedStep, 10);
        if (stepNum > 0 && stepNum <= 10) {
          setCurrentStep(stepNum);
        }
      }
    } catch (e) {
      console.error("Failed to restore session from sessionStorage", e);
    }
  }, [searchParams]);

  // 2. 답변 또는 단계 변경 시 sessionStorage 동기화
  useEffect(() => {
    if (currentStep > 0) {
      sessionStorage.setItem("dumgeum_current_step", currentStep.toString());
    }
  }, [currentStep]);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      sessionStorage.setItem("dumgeum_answers", JSON.stringify(answers));
    }
  }, [answers]);

  // 3. 테스트 시작 (세션 생성 및 variant 배정)
  const startQuiz = async () => {
    setIsSubmitting(true);
    let assignedVariant = variant;
    if (!assignedVariant) {
      assignedVariant = Math.random() < 0.5 ? "price" : "noprice";
      setVariant(assignedVariant);
      sessionStorage.setItem("dumgeum_variant", assignedVariant);
    }

    const utm = utmContent || searchParams.get("utm_content") || null;

    // 세션 id를 클라이언트에서 생성해 insert에 포함한다.
    // anon RLS는 select를 막으므로 .select() 체이닝 없이 insert만 수행한다.
    const newSessionId = crypto.randomUUID();

    try {
      const { error } = await supabase
        .from("quiz_sessions")
        .insert({
          id: newSessionId,
          variant: assignedVariant,
          utm_content: utm,
          answers: {},
          score: null,
          cta_clicked: false,
        });

      if (error) throw error;

      setSessionId(newSessionId);
      sessionStorage.setItem("dumgeum_session_id", newSessionId);
    } catch (e) {
      console.error("Failed to create Supabase session. Initializing local session only.", e);
      // insert 실패 시에도 동일한 id로 로컬 세션을 유지한다.
      setSessionId(newSessionId);
      sessionStorage.setItem("dumgeum_session_id", newSessionId);
    }

    setCurrentStep(1);
    setIsSubmitting(false);
  };

  // 4. 이전 단계로 가기
  const handlePrev = () => {
    if (isTransitioning) return;
    if (currentStep === 1) {
      // 히어로로 갈 때 상태 초기화
      setCurrentStep(0);
      setAnswers({});
      sessionStorage.removeItem("dumgeum_current_step");
      sessionStorage.removeItem("dumgeum_answers");
    } else {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // 5. 객관식 답변 선택 (1~9번)
  const handleOptionSelect = (optionIdx: number, score: number, optionText: string) => {
    if (isTransitioning) return;

    setSelectedOptionIdx(optionIdx);
    setIsTransitioning(true);

    const updatedAnswers = {
      ...answers,
      [currentStep]: { value: optionText, score },
    };
    setAnswers(updatedAnswers);

    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setSelectedOptionIdx(null);
      setIsTransitioning(false);
    }, 300);
  };

  // 6. 슬라이더 답변 제출 (10번)
  const handleSliderSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const finalAnswers = {
      ...answers,
      10: { value: sliderValue, score: sliderValue },
    };
    setAnswers(finalAnswers);
    sessionStorage.setItem("dumgeum_answers", JSON.stringify(finalAnswers));

    // 점수 계산: 배점 합계(최대 87) ÷ 87 × 100 반올림. [40, 92] 클램프
    let totalScore = 0;
    Object.keys(finalAnswers).forEach((key) => {
      const step = parseInt(key, 10);
      totalScore += finalAnswers[step].score;
    });

    const rawCalculated = Math.round((totalScore / 87) * 100);
    const clampedScore = Math.max(40, Math.min(92, rawCalculated));

    // Supabase에 세션 답변 및 점수 업데이트
    const currentSessionId = sessionId || sessionStorage.getItem("dumgeum_session_id");
    if (currentSessionId) {
      try {
        await supabase
          .from("quiz_sessions")
          .update({
            answers: finalAnswers,
            score: clampedScore,
          })
          .eq("id", currentSessionId);
      } catch (e) {
        console.error("Failed to update quiz session in database", e);
      }
    }

    // Meta Pixel 전송
    fbEvent("CompleteRegistration");

    // 결과 페이지로 이동
    router.push("/result");
    setIsSubmitting(false);
  };

  // --- 렌더링 영역 ---

  // 히어로 랜딩 (0단계)
  if (currentStep === 0) {
    return (
      <div className="flex flex-col items-center justify-between min-h-screen px-6 py-12 text-center">
        {/* 상단 브랜딩 */}
        <div className="mt-8">
          <span className="text-xs font-semibold tracking-widest text-gold uppercase bg-navy-light px-3 py-1.5 rounded-full border border-gold/10">
            DUMGEUM TEST
          </span>
        </div>

        {/* 히어로 콘텐츠 */}
        <div className="flex flex-col items-center my-auto">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-white mb-4">
            나는 술을
            <br />
            얼마나 의지하고 있을까?
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mb-8">
            1분 테스트로 확인하는
            <br />
            나의 음주 의존도 점수
          </p>

          {/* 인포 그래픽 느낌의 그래픽 요소 */}
          <div className="w-48 h-48 relative flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full border border-dashed border-gold/20 animate-spin" style={{ animationDuration: '40s' }}></div>
            <div className="absolute w-40 h-40 rounded-full border border-gold/30 flex items-center justify-center bg-navy-light/40 backdrop-blur-sm shadow-xl">
              <span className="text-5xl">🥃</span>
            </div>
            <div className="absolute -top-1 -right-1 bg-gold text-navy font-bold text-xs px-2.5 py-1 rounded-full shadow-lg">
              1 MIN
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <div className="w-full max-w-[340px] flex flex-col gap-3">
          <button
            onClick={startQuiz}
            disabled={isSubmitting}
            className="w-full py-4.5 bg-gradient-to-r from-gold via-gold-light to-gold-dark text-navy font-semibold text-base rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:opacity-90 active:scale-[0.98] transition-all duration-200"
          >
            {isSubmitting ? "세션 생성 중..." : "무료로 테스트하기"}
          </button>
          <p className="text-[11px] text-slate-500">
            개인정보는 사전동의 없이 노출되지 않습니다.
          </p>
        </div>
      </div>
    );
  }

  // 1~9번 객관식 문항
  if (currentStep >= 1 && currentStep <= 9) {
    const question = QUESTIONS[currentStep - 1];

    return (
      <div className="flex flex-col min-h-screen px-6 py-6 justify-between">
        {/* 상단 네비게이션 헤더 */}
        <div className="flex items-center justify-between w-full mb-6">
          <button
            onClick={handlePrev}
            className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
            aria-label="이전 문항"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-xs text-slate-400 font-semibold tracking-wider bg-navy-light/60 px-3 py-1 rounded-full border border-white/5">
            <span className="text-gold">{currentStep}</span> / 10
          </div>
          <div className="w-8"></div> {/* 균형 맞추기용 더미 */}
        </div>

        {/* 프로그레스 바 */}
        <div className="w-full bg-navy-light h-1 rounded-full overflow-hidden mb-12">
          <div
            className="bg-gold h-full transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / 10) * 100}%` }}
          ></div>
        </div>

        {/* 문항 내용 */}
        <div className="flex-1 flex flex-col justify-center my-auto">
          <h2 className="text-2xl font-bold leading-snug tracking-tight text-white mb-10 whitespace-pre-line">
            {question.text}
          </h2>

          <div className="flex flex-col gap-4.5">
            {question.options.map((option, idx) => {
              const isSelected = selectedOptionIdx === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx, option.score, option.text)}
                  disabled={isTransitioning}
                  className={`w-full text-left px-5 py-4 rounded-xl text-[15px] font-medium transition-all duration-200 border ${
                    isSelected
                      ? "bg-gold text-navy border-gold shadow-[0_4px_15px_rgba(212,175,55,0.2)]"
                      : "bg-navy-light/50 border-white/10 hover:border-gold/30 text-slate-200"
                  }`}
                >
                  {option.text}
                </button>
              );
            })}
          </div>
        </div>

        <div className="py-4"></div>
      </div>
    );
  }

  // 10번 슬라이더 문항
  if (currentStep === 10) {
    return (
      <div className="flex flex-col min-h-screen px-6 py-6 justify-between">
        {/* 상단 네비게이션 헤더 */}
        <div className="flex items-center justify-between w-full mb-6">
          <button
            onClick={handlePrev}
            className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
            aria-label="이전 문항"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="text-xs text-slate-400 font-semibold tracking-wider bg-navy-light/60 px-3 py-1 rounded-full border border-white/5">
            <span className="text-gold">10</span> / 10
          </div>
          <div className="w-8"></div>
        </div>

        {/* 프로그레스 바 */}
        <div className="w-full bg-navy-light h-1 rounded-full overflow-hidden mb-12">
          <div className="bg-gold h-full w-full"></div>
        </div>

        {/* 문항 내용 */}
        <div className="flex-1 flex flex-col justify-center my-auto">
          <h2 className="text-2xl font-bold leading-snug tracking-tight text-white mb-4">
            솔직히, 지금 줄이고 싶은 마음은?
          </h2>
          <p className="text-slate-400 text-xs mb-10">
            슬라이더를 밀어 의지 점수를 알려주세요 (1: 별로 없음 ~ 10: 매우 강함)
          </p>

          <div className="flex flex-col items-center gap-8 bg-navy-light/30 border border-white/5 rounded-2xl p-6.5">
            {/* 실시간 수치 표시 */}
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 font-medium mb-1">나의 의지 점수</span>
              <span className="text-5xl font-extrabold text-gold animate-pulse">{sliderValue}</span>
            </div>

            {/* 슬라이더 인풋 */}
            <div className="w-full px-2">
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-navy rounded-lg appearance-none cursor-pointer accent-gold"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-2 font-medium">
                <span>1 (조금 더 마셔도 됨)</span>
                <span>10 (오늘 당장 끊고 싶음)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 완료 CTA 버튼 */}
        <div className="w-full max-w-[340px] mx-auto mt-6">
          <button
            onClick={handleSliderSubmit}
            disabled={isSubmitting}
            className="w-full py-4.5 bg-gradient-to-r from-gold via-gold-light to-gold-dark text-navy font-semibold text-base rounded-xl shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:opacity-90 active:scale-[0.98] transition-all duration-200"
          >
            {isSubmitting ? "분석 중..." : "제출하고 결과 보기"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-navy text-white">
        <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-400">불러오는 중...</p>
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}
