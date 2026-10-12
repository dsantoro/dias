export type Countdown = {
  id: string;
  title: string;
  emoji: string;
  date: string;
};
export type Filter = "upcoming" | "past" | "all";
export type User = { id: string; name: string; username: string };

export const emojiOptions = [
  ["\u2728", "Especial"],
  ["\u2708\ufe0f", "Viagem"],
  ["\ud83c\udf82", "Aniversario"],
  ["\ud83c\udf89", "Festa"],
  ["\u2764\ufe0f", "Amor"],
  ["\ud83c\udfaf", "Meta"],
  ["\ud83c\udf93", "Formatura"],
  ["\ud83c\udf34", "Ferias"],
  ["\ud83c\udfb5", "Musica"],
  ["\ud83c\udfc3", "Esporte"],
  ["\ud83d\udcbc", "Trabalho"],
  ["\ud83c\udfe1", "Casa"],
] as const;
