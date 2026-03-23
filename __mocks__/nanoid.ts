/**
 * Jest mock for nanoid ESM module
 */

export const nanoid = jest.fn((size = 21) => {
  let result = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  for (let i = 0; i < size; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
});

export const customAlphabet = jest.fn((alphabet: string, defaultSize = 21) => {
  return (size = defaultSize) => {
    let result = "";
    for (let i = 0; i < size; i++) {
      result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return result;
  };
});
