export interface WordbookActor {
  id: number;
  email: string;
  isAdmin: boolean;
  plan: "FREE" | "PRO";
  proUntil: Date | null;
  dailyGoal: number;
}

export interface CreateWordbookInput {
  title: string;
  description: string | null;
  fromLang: string;
  toLang: string;
}

export interface UpdateWordbookInput {
  title?: string;
  description?: string | null;
  fromLang?: string;
  toLang?: string;
}

export interface WordbookSummary {
  id: number;
  title: string;
  description: string | null;
  fromLang: string;
  toLang: string;
  isPublic: boolean;
  downloadCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordbookDetail extends WordbookSummary {
  ownerId: number;
  hiddenByAdmin: boolean;
  owner: { id: number; email: string };
  items: Array<{
    id: number;
    term: string;
    meaning: string;
    pronunciation: string | null;
    example: string | null;
    exampleMeaning: string | null;
    position: number;
  }>;
}

export interface MarketQuery {
  q: string;
  sort: "top" | "new" | "downloads";
  page: number;
  take: number;
  blockedOwnerIds: number[];
}
