import Link from "next/link";
import type { Route } from "next";

type BusinessInfoSnapshot = {
  legalName: string;
  representative: string;
  businessRegistrationNumber: string;
  mailOrderRegistrationNumber: string;
  address: string;
  supportEmail: string;
  supportPhone: string;
  supportHours: string;
};

type AppFooterProps = {
  business: BusinessInfoSnapshot;
  businessInfoReady: boolean;
  placeholder: string;
};

const footerLinks = [
  { href: "/pricing", label: "요금제" },
  { href: "/terms", label: "이용약관" },
  { href: "/privacy", label: "개인정보처리방침" }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export function AppFooter({ business, businessInfoReady, placeholder }: AppFooterProps) {
  return (
    <footer className="mt-auto w-full border-t border-slate-200 bg-white/95">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-xs leading-5 text-slate-600 sm:gap-5 sm:px-6 sm:py-5 sm:leading-6">
          <div>
            <p className="text-sm font-semibold text-slate-900">사업자 정보</p>
            {!businessInfoReady && process.env.NODE_ENV !== "production" ? (
              <p className="mt-1 text-blue-700">
                심사용 필수 사업자 정보가 일부 비어 있습니다. 운영 배포 전 환경변수를 입력해 주세요.
              </p>
            ) : null}
          </div>

          <div className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2 sm:gap-y-1">
            <p>
              <span className="font-semibold text-slate-800">상호명:</span> {business.legalName || placeholder}
            </p>
            <p>
              <span className="font-semibold text-slate-800">대표자:</span> {business.representative || placeholder}
            </p>
            <p>
              <span className="font-semibold text-slate-800">사업자등록번호:</span>{" "}
              {business.businessRegistrationNumber || placeholder}
            </p>
            <p>
              <span className="font-semibold text-slate-800">통신판매업 신고번호:</span>{" "}
              {business.mailOrderRegistrationNumber || placeholder}
            </p>
            <p className="sm:col-span-2">
              <span className="font-semibold text-slate-800">주소:</span> {business.address || placeholder}
            </p>
            <p>
              <span className="font-semibold text-slate-800">고객센터 전화:</span> {business.supportPhone || placeholder}
            </p>
            <p>
              <span className="font-semibold text-slate-800">고객센터 이메일:</span> {business.supportEmail || placeholder}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 text-[11px] text-slate-500 sm:text-xs">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="underline-offset-2 hover:underline">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-1 border-t border-slate-200 pt-3 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
            <p className="break-keep">운영시간: {business.supportHours || placeholder}</p>
            <p>&copy; {new Date().getFullYear()} 오잉앱. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
