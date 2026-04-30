export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value * 1000);
}

export function formatDate(value: string | null) {
  if (!value) {
    return "Sin dato";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getSituationLabel(situation: number) {
  const labels: Record<number, string> = {
    1: "Normal",
    2: "Riesgo bajo",
    3: "Riesgo medio",
    4: "Riesgo alto",
    5: "Irrecuperable",
    6: "Irrecuperable por disposición técnica",
  };

  return labels[situation] ?? `Situación ${situation}`;
}

export function formatPeriod(period: string) {
  if (!/^\d{6}$/.test(period)) {
    return period;
  }

  const year = period.slice(0, 4);
  const month = period.slice(4, 6);
  return `${month}/${year}`;
}

export function normalizeIdentification(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}
