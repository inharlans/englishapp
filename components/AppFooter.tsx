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
  { href: "/privacy", label: "개인정보처리방침" },
  { href: "/terms", label: "서비스 이용약관" }
] as const satisfies ReadonlyArray<{ href: Route; label: string }>;

export function AppFooter({ business, businessInfoReady, placeholder }: AppFooterProps) {
  return (
    <footer className="mt-auto w-full border-t border-slate-200 bg-slate-100/95">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-[11px] text-slate-500 sm:text-xs">
          &copy; {new Date().getFullYear()} 오잉앱. All rights reserved.
        </p>

        <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10">
          <div className="space-y-1 text-xs leading-6 text-slate-700 sm:text-sm">
            {!businessInfoReady && process.env.NODE_ENV !== "production" ? (
              <p className="pb-1 text-blue-700">
                심사용 필수 사업자 정보가 일부 비어 있습니다. 운영 배포 전 환경변수를 입력해 주세요.
              </p>
            ) : null}
            <p className="break-keep">
              상호명: {business.legalName || placeholder} | 대표: {business.representative || placeholder}
            </p>
            <p>사업자등록번호: {business.businessRegistrationNumber || placeholder}</p>
            <p className="break-keep">주소: {business.address || placeholder}</p>
            <p>통신판매업 신고번호: {business.mailOrderRegistrationNumber || placeholder}</p>
            <p>
              고객센터: {business.supportPhone || placeholder}, {business.supportEmail || placeholder}
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm text-slate-800 md:items-end md:border-l md:border-slate-300 md:pl-8">
            <nav className="flex flex-col gap-2" aria-label="푸터 정책 링크">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors duration-150 hover:text-slate-950 hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <p className="text-xs text-slate-500">운영시간: {business.supportHours || placeholder}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
