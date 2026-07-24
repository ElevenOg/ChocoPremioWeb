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
  retry_pool: boolean;
}

/** Sorteo ponderado. Ahora corre SOLO en el servidor: el cliente
 *  ya no puede ver las probabilidades ni forzar un resultado. */
export function pickPrize(prizes: Prize[]): Prize {
  const total = prizes.reduce((acc, p) => acc + Number(p.probability), 0);
  let random = Math.random() * total;

  for (const prize of prizes) {
    random -= Number(prize.probability);
    if (random <= 0) return prize;
  }

  return prizes[0];
}

export function getFirstPool(prizes: Prize[]) {
  return prizes.filter((p) => !p.retry_pool);
}

export function getRetryPool(prizes: Prize[]) {
  return prizes.filter(
    (p) =>
      p.retry_pool &&
      ["lose", "small_discount", "medium_discount", "large_discount"].includes(p.type)
  );
}
