export type Condition = "mint" | "opened" | "loose";
export type ListingStatus = "available" | "traded";
export type TradeStatus = "proposed" | "accepted" | "declined";

export interface DbUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  figure_name: string;
  series: string | null;
  condition: Condition;
  photo_url: string | null;
  status: ListingStatus;
  created_at: string;
  users?: DbUser;
}

export interface Trade {
  id: string;
  proposer_id: string;
  receiver_id: string;
  status: TradeStatus;
  created_at: string;
  proposer?: DbUser;
  receiver?: DbUser;
  trade_items?: TradeItem[];
}

export interface TradeItem {
  id: string;
  trade_id: string;
  listing_id: string;
  offered_by: string;
  listings?: Listing;
}
