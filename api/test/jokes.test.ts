import { describe, expect, it } from "vitest";
import { jokeAt, jokes } from "../src/jokes.js";

describe("joke catalog", () => {
  it("contains stable, unique records", () => {
    expect(jokes.length).toBeGreaterThanOrEqual(10);
    expect(new Set(jokes.map(joke => joke.id)).size).toBe(jokes.length);
    expect(jokes.every(joke => joke.text.length > 20)).toBe(true);
  });

  it("selects a joke by index and rejects invalid indices", () => {
    expect(jokeAt(0)).toBe(jokes[0]);
    expect(() => jokeAt(-1)).toThrow(RangeError);
    expect(() => jokeAt(jokes.length)).toThrow(RangeError);
  });
});

