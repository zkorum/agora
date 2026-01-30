interface GetGreetingParams {
  count: number;
}

export function getGreeting({ count }: GetGreetingParams): string {
  if (count === 0) {
    return "Hello, world!";
  }
  return `Hello! You've clicked ${count} ${count === 1 ? "time" : "times"}.`;
}
