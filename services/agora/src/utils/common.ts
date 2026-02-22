export function getDateString(dateObject: Date) {
  return dateObject.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function zeroIfUndefined(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }
  return value;
}

export function getTrimmedPseudonym(pseudo: string) {
  return pseudo.substring(0, 7);
}

export async function persistData(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    return await navigator.storage.persist();
  } else {
    console.warn("The browser does not support persistence");
    return false;
  }
}

export async function isDataPersisted(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persisted) {
    return await navigator.storage.persisted();
  } else {
    console.warn("The browser does not support persistence");
    return false;
  }
}


export function formatPercentage(percentage: number) {
  const formattedPercentage = Number.isInteger(percentage)
    ? percentage.toFixed(0)
    : percentage < 1
      ? percentage.toFixed(1)
      : percentage.toFixed(0);

  // Step 4: Append the '%' sign
  return `${formattedPercentage}%`;
}

// console.log(formatter.format(10000)); // "10K"
// console.log(formatter.format(1000000)); // "1M"
// console.log(formatter.format(1500000)); // "1.5M"
const numberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  compactDisplay: "short",
});

// for amount of likes, participants, views, etc
export function formatAmount(amount: number) {
  return numberFormatter.format(amount);
}
