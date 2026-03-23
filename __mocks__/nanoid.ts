/**
 * Jest mock for nanoid ESM module
 */

export const nanoid = jest.fn((size?: number) => {
  const length = size || 21;
  let result = "";
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
});

export const customAlphabet = jest.fn((alphabet: string, defaultSize?: number) => {
  return (size?: number) => {
    const length = size || defaultSize || 21;
    let result = "";
    for (let i = 0; i < length; i++) {
      result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return result;
  };
});
