/**
 * Tests for PII masking utility.
 */

import { maskSensitiveData } from "../src/core/mask";

describe("maskSensitiveData", () => {
  test("masks password field", () => {
    const data = { username: "john", password: "secret123" };
    const result = maskSensitiveData(data);

    expect(result.username).toBe("john");
    expect(result.password).toBe("[REDACTED]");
  });

  test("masks nested sensitive fields", () => {
    const data = {
      user: {
        name: "john",
        credentials: {
          apiKey: "key123",
          token: "tok456",
        },
      },
    };
    const result = maskSensitiveData(data);

    expect(result.user.name).toBe("john");
    expect(result.user.credentials.apiKey).toBe("[REDACTED]");
    expect(result.user.credentials.token).toBe("[REDACTED]");
  });

  test("masks fields with sensitive substrings", () => {
    const data = {
      userPassword: "secret",
      authToken: "abc123",
      myApiKey: "key",
    };
    const result = maskSensitiveData(data);

    expect(result.userPassword).toBe("[REDACTED]");
    expect(result.authToken).toBe("[REDACTED]");
    expect(result.myApiKey).toBe("[REDACTED]");
  });

  test("handles arrays", () => {
    const data = {
      users: [
        { name: "john", password: "pass1" },
        { name: "jane", password: "pass2" },
      ],
    };
    const result = maskSensitiveData(data);

    expect(result.users[0]?.name).toBe("john");
    expect(result.users[0]?.password).toBe("[REDACTED]");
    expect(result.users[1]?.name).toBe("jane");
    expect(result.users[1]?.password).toBe("[REDACTED]");
  });

  test("handles null and undefined", () => {
    expect(maskSensitiveData(null)).toBe(null);
    expect(maskSensitiveData(undefined)).toBe(undefined);
    expect(maskSensitiveData({ value: null })).toEqual({ value: null });
  });

  test("handles circular references", () => {
    const data: Record<string, unknown> = { name: "test" };
    data.self = data;

    const result = maskSensitiveData(data);
    expect(result.name).toBe("test");
    expect(result.self).toBe("[CIRCULAR]");
  });

  test("uses custom mask value", () => {
    const data = { password: "secret" };
    const result = maskSensitiveData(data, [], "***");

    expect(result.password).toBe("***");
  });

  test("masks custom sensitive keys", () => {
    const data = { ssn: "123-45-6789", dob: "1990-01-01" };
    const result = maskSensitiveData(data, ["ssn", "dob"]);

    expect(result.ssn).toBe("[REDACTED]");
    expect(result.dob).toBe("[REDACTED]");
  });

  test("preserves Date objects", () => {
    const date = new Date("2024-01-01");
    const data = { createdAt: date };
    const result = maskSensitiveData(data);

    expect(result.createdAt).toBe(date);
  });
});
