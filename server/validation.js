const millisecondsPerDay = 86_400_000;

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
];

function calendarDay(value) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime() / millisecondsPerDay;
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return false;
  const date = new Date(calendarDay(value) * millisecondsPerDay);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
