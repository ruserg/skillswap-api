export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      useESM: true,
      tsconfig: "tsconfig.test.json",
    }],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "coverage",
  verbose: true,
  testTimeout: 30000, // 30 секунд для HTTP запросов
  maxWorkers: 1, // Отключаем параллельные workers для избежания проблем с axios
  transformIgnorePatterns: [
    // Игнорируем node_modules, кроме тех, которые нужно трансформировать
    "node_modules/(?!(.*\\.mjs$))"
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"], // Загружаем setup файл для дополнительной настройки
};
