module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.jest.cjs"],
  clearMocks: true,
  collectCoverageFrom: ["src/lib/seguranca.ts"],
};
