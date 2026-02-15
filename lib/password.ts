import bcrypt from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  const cost = 12;
  return bcrypt.hash(plain, cost);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

