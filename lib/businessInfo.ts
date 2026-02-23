type BusinessInfo = {
  legalName: string;
  representative: string;
  businessRegistrationNumber: string;
  mailOrderRegistrationNumber: string;
  address: string;
  supportEmail: string;
  supportPhone: string;
  supportHours: string;
};

const DEFAULT_BUSINESS_INFO: BusinessInfo = {
  legalName: "지엘산업",
  representative: "민금선",
  businessRegistrationNumber: "122-10-64927",
  mailOrderRegistrationNumber: "준비 중",
  address: "부산광역시 사상구 대동로 307(감전동)",
  supportEmail: "mdkh8259@naver.com",
  supportPhone: "051-325-0586",
  supportHours: "평일 10:00-17:00 (주말/공휴일 휴무)"
};

function readEnv(name: string, fallback = ""): string {
  const value = (process.env[name] ?? "").trim();
  return value || fallback;
}

export function getBusinessInfo(): BusinessInfo {
  return {
    legalName: readEnv("COMPANY_LEGAL_NAME", DEFAULT_BUSINESS_INFO.legalName),
    representative: readEnv("COMPANY_REPRESENTATIVE", DEFAULT_BUSINESS_INFO.representative),
    businessRegistrationNumber: readEnv("COMPANY_BUSINESS_NUMBER", DEFAULT_BUSINESS_INFO.businessRegistrationNumber),
    mailOrderRegistrationNumber: readEnv("COMPANY_MAIL_ORDER_NUMBER", DEFAULT_BUSINESS_INFO.mailOrderRegistrationNumber),
    address: readEnv("COMPANY_ADDRESS", DEFAULT_BUSINESS_INFO.address),
    supportEmail: readEnv("COMPANY_SUPPORT_EMAIL", DEFAULT_BUSINESS_INFO.supportEmail),
    supportPhone: readEnv("COMPANY_SUPPORT_PHONE", DEFAULT_BUSINESS_INFO.supportPhone),
    supportHours: readEnv("COMPANY_SUPPORT_HOURS", DEFAULT_BUSINESS_INFO.supportHours)
  };
}

export function isBusinessInfoComplete(info: BusinessInfo): boolean {
  return Boolean(
    info.legalName &&
      info.representative &&
      info.businessRegistrationNumber &&
      info.mailOrderRegistrationNumber &&
      info.address &&
      info.supportEmail &&
      info.supportPhone
  );
}
