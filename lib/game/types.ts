export type PrizeType =
  | "lose"
  | "small_discount"
  | "medium_discount"
  | "large_discount"
  | "big_discount"
  | "accessory"
  | "retry";

export interface Prize {
  id: string;
  campaign_id: string;
  type: PrizeType;
  title: string;
  emoji: string;
  probability: number;
  name: string;
  redemption_condition?: string;
}

export interface ResultData {
  won: boolean;
  prize: Prize;
  selected_box?: number | null;
}

export interface IntroSession {
  session_id: string;
  commerce_id: string;
  campaign_id?: string;
  slug: string;
  social_url: string | null;
  has_result?: boolean;
  selected_box?: number | null;
}
