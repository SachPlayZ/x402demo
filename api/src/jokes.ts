export interface Joke {
  id: string;
  category: "developer" | "stellar" | "general";
  text: string;
}

export const jokes: readonly Joke[] = [
  { id: "dev-01", category: "developer", text: "Why did the function return early? It had commitment issues." },
  { id: "dev-02", category: "developer", text: "A SQL query walks into a bar, joins two tables, and asks for their keys." },
  { id: "dev-03", category: "developer", text: "There are 10 kinds of people: those who understand binary and those who do not." },
  { id: "dev-04", category: "developer", text: "The debugger and the bug agreed to meet, but the bug never showed up in production." },
  { id: "stellar-01", category: "stellar", text: "Why did the payment cross the ledger? To reach finality on the other side." },
  { id: "stellar-02", category: "stellar", text: "My Stellar transaction is very polite: it always pays its fee before entering." },
  { id: "stellar-03", category: "stellar", text: "The smart contract stayed on budget because it had excellent account-ability." },
  { id: "stellar-04", category: "stellar", text: "A ledger never forgets, but it is excellent at closing old conversations." },
  { id: "general-01", category: "general", text: "Why was the calendar nervous? Its days were numbered." },
  { id: "general-02", category: "general", text: "Why did the bicycle stop? It was two tired." },
  { id: "general-03", category: "general", text: "What does a cloud wear under its coat? Thunderwear." },
  { id: "general-04", category: "general", text: "Why did the coffee file a report? It got mugged." }
] as const;

export function jokeAt(index: number): Joke {
  if (!Number.isInteger(index) || index < 0 || index >= jokes.length) {
    throw new RangeError(`joke index must be between 0 and ${jokes.length - 1}`);
  }
  return jokes[index]!;
}

