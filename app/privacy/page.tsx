"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-navy text-white px-5 py-6">
      {/* 상단 헤더 */}
      <div className="flex items-center gap-2 mb-8">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg bg-navy-light/60 border border-white/5 text-slate-400 hover:text-white transition-colors"
          aria-label="이전 화면으로"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-white tracking-tight">개인정보처리방침</h1>
      </div>

      {/* 방침 내용 */}
      <div className="flex-1 space-y-6 text-sm text-slate-300 leading-relaxed font-light pb-12">
        <p className="text-slate-400 text-xs">
          시행일자: 2026년 7월 3일
        </p>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white border-l-2 border-gold pl-2">
            1. 개인정보 수집 항목 및 수집 방법
          </h2>
          <p>
            회사는 서비스 알림 및 마케팅 정보 전달을 위해 아래와 같은 개인정보를 수집하고 있습니다.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
            <li>수집 항목: 이메일 주소, 카카오 채널 상호작용 정보</li>
            <li>수집 방법: 웹사이트 내 사전등록 신청 폼 입력, 카카오 채널 이동 행위 로그</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white border-l-2 border-gold pl-2">
            2. 개인정보의 수집 및 이용 목적
          </h2>
          <p>
            수집된 개인정보는 서비스 정식 출시 시점의 <strong>알림 제공 및 쿠폰 발급 목적</strong>으로만 이용되며, 목적 외 사용이나 외부 노출은 일절 발생하지 않습니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white border-l-2 border-gold pl-2">
            3. 개인정보의 보유 및 이용 기간
          </h2>
          <p>
            이용자의 개인정보는 <strong>서비스 출시 알림 완료 및 목적 달성 시 즉시 파기</strong>됩니다. 단, 관계 법령에 의하여 보존할 필요가 있는 경우 해당 법령이 정한 기간 동안 보존합니다.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white border-l-2 border-gold pl-2">
            4. 개인정보 처리의 위탁
          </h2>
          <p>
            회사는 원활한 데이터 관리 및 인프라 처리를 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs">
            <li>수탁업체: Supabase, Inc.</li>
            <li>위탁 업무 내용: 데이터베이스 인프라 제공, 사전등록 정보의 저장 및 관리</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white border-l-2 border-gold pl-2">
            5. 개인정보의 파기절차 및 방법
          </h2>
          <p>
            이용자의 개인정보는 목적이 달성된 후 별도의 DB로 옮겨져 관련 법령에 따라 일정 기간 저장된 후 혹은 즉시 재생할 수 없는 기술적 방법을 사용하여 영구 파기됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}
