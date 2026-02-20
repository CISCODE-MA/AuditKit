/**
 * Tests for deep diff utility.
 */

import { deepDiff } from "../src/core/diff";

describe("deepDiff", () => {
  test("detects modified fields", () => {
    const before = { name: "John", age: 30 };
    const after = { name: "Jane", age: 30 };

    const result = deepDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.modifiedFields).toContain("name");
    expect(result.modifiedFields).not.toContain("age");
  });

  test("detects added fields", () => {
    const before = { name: "John" };
    const after = { name: "John", email: "john@example.com" };

    const result = deepDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.addedFields).toContain("email");
  });

  test("detects removed fields", () => {
    const before = { name: "John", email: "john@example.com" };
    const after = { name: "John" };

    const result = deepDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.removedFields).toContain("email");
  });

  test("detects nested changes", () => {
    const before = { user: { name: "John", address: { city: "NYC" } } };
    const after = { user: { name: "John", address: { city: "LA" } } };

    const result = deepDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.modifiedFields).toContain("user.address.city");
  });

  test("handles arrays as modified", () => {
    const before = { tags: ["a", "b"] };
    const after = { tags: ["a", "c"] };

    const result = deepDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.modifiedFields).toContain("tags");
  });

  test("handles null before", () => {
    const after = { name: "John" };

    const result = deepDiff(null, after);

    expect(result.hasChanges).toBe(true);
    expect(result.addedFields).toContain("name");
  });

  test("handles null after", () => {
    const before = { name: "John" };

    const result = deepDiff(before, null);

    expect(result.hasChanges).toBe(true);
    expect(result.removedFields).toContain("name");
  });

  test("returns no changes for identical objects", () => {
    const before = { name: "John", nested: { value: 1 } };
    const after = { name: "John", nested: { value: 1 } };

    const result = deepDiff(before, after);

    expect(result.hasChanges).toBe(false);
    expect(result.modifiedFields).toHaveLength(0);
    expect(result.addedFields).toHaveLength(0);
    expect(result.removedFields).toHaveLength(0);
  });

  test("handles Date comparison", () => {
    const date = new Date("2024-01-01");
    const before = { createdAt: date };
    const after = { createdAt: new Date("2024-01-01") };

    const result = deepDiff(before, after);

    expect(result.hasChanges).toBe(false);
  });

  test("detects Date changes", () => {
    const before = { createdAt: new Date("2024-01-01") };
    const after = { createdAt: new Date("2024-01-02") };

    const result = deepDiff(before, after);

    expect(result.hasChanges).toBe(true);
    expect(result.modifiedFields).toContain("createdAt");
  });
});
