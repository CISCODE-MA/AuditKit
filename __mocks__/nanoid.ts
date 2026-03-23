/**
 * Jest mock for nanoid ESM module
 *
 * SECURITY NOTE: This mock uses Math.random() which is NOT cryptographically secure.
 * This is acceptable because:
 * 1. This code is ONLY used in Jest tests, never in production
 * 2. Test IDs don't require cryptographic security
 * 3. The real nanoid library (used in production) uses crypto.randomBytes()
 *
 * SonarQube Security Hotspot Review: Accepted as safe for test-only code
 */

export const nanoid = jest.fn((size = 21) => {
  let result = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  for (let i = 0; i < size; i++) {
    // NOSONAR: Math.random() is acceptable for test mocks
    result += chars.charAt(Math.floor(Math.random() * chars.length)); // NOSONAR
  }
  return result;
});

export const customAlphabet = jest.fn((alphabet: string, defaultSize = 21) => {
  return (size = defaultSize) => {
    let result = "";
    for (let i = 0; i < size; i++) {
      // NOSONAR: Math.random() is acceptable for test mocks
      result += alphabet.charAt(Math.floor(Math.random() * alphabet.length)); // NOSONAR
    }
    return result;
  };
});
