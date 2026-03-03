export class MobileAuthError extends Error {
  status: number;
  errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.name = "MobileAuthError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

export function asMobileAuthError(error: unknown, fallback: {
  status: number;
  errorCode: string;
  message: string;
}): MobileAuthError {
  if (error instanceof MobileAuthError) {
    return error;
  }
  return new MobileAuthError(fallback.status, fallback.errorCode, fallback.message);
}
