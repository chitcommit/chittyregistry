import { ChittyValidator } from "./validator.js";
import { CheckCategory, Priority } from "../types/index.js";

jest.mock("child_process");
jest.mock("fs/promises");

describe("ChittyValidator", () => {
  let validator: ChittyValidator;

  beforeEach(() => {
    validator = new ChittyValidator();
  });

  describe("constructor", () => {
    it("should initialize with system checks", () => {
      expect(validator).toBeInstanceOf(ChittyValidator);
    });
  });

  describe("runAll", () => {
    it("should run all validation checks", async () => {
      const results = await validator.runAll({ verbose: false });

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);

      results.forEach((result) => {
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("message");
        expect(result).toHaveProperty("timestamp");
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });

    it("should handle timeout option", async () => {
      const results = await validator.runAll({
        verbose: false,
        timeout: 1000,
      });

      expect(results).toBeInstanceOf(Array);
    });

    it("should handle verbose option", async () => {
      const results = await validator.runAll({ verbose: true });

      expect(results).toBeInstanceOf(Array);
    });
  });
});
