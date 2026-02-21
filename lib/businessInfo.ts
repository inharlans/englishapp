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

function readEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}

export function getBusinessInfo(): BusinessInfo {
  return {
    legalName: readEnv("COMPANY_LEGAL_NAME"),
    representative: readEnv("COMPANY_REPRESENTATIVE"),
    businessRegistrationNumber: readEnv("COMPANY_BUSINESS_NUMBER"),
    mailOrderRegistrationNumber: readEnv("COMPANY_MAIL_ORDER_NUMBER"),
    address: readEnv("COMPANY_ADDRESS"),
    supportEmail: readEnv("COMPANY_SUPPORT_EMAIL"),
    supportPhone: readEnv("COMPANY_SUPPORT_PHONE"),
    supportHours: readEnv("COMPANY_SUPPORT_HOURS")
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
