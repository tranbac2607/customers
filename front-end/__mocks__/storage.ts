const noopStorage = {
  getItem: () => Promise.resolve(null),
  setItem: (_: string, value: string) => Promise.resolve(value),
  removeItem: () => Promise.resolve(),
};

export default noopStorage;
