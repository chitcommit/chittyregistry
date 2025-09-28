/**
 * Custom Jest Matchers
 *
 * Adds ChittyOS-specific test matchers
 */

import type { MatcherFunction } from 'expect';

const toBeValidChittyId: MatcherFunction<[expected: unknown]> = function (actual: unknown) {
  if (typeof actual !== 'string') {
    return {
      message: () => `Expected ${actual} to be a string`,
      pass: false,
    };
  }

  const chittyIdPattern = /^CHITTY-[A-Z]{2,5}-[A-F0-9]{16}$/;
  const pass = chittyIdPattern.test(actual);

  return {
    message: () =>
      pass
        ? `Expected ${actual} not to be a valid ChittyID`
        : `Expected ${actual} to be a valid ChittyID (format: CHITTY-{NAMESPACE}-{16_HEX_CHARS})`,
    pass,
  };
};

const toBeValidServiceToken: MatcherFunction<[expected: unknown]> = function (actual: unknown) {
  if (typeof actual !== 'string') {
    return {
      message: () => `Expected ${actual} to be a string`,
      pass: false,
    };
  }

  const tokenPattern = /^svc_chitty_[a-zA-Z0-9_-]{8,}$/;
  const pass = tokenPattern.test(actual) && actual.length >= 32;

  return {
    message: () =>
      pass
        ? `Expected ${actual} not to be a valid service token`
        : `Expected ${actual} to be a valid service token (format: svc_chitty_{service}_{env}_{random}, min 32 chars)`,
    pass,
  };
};

const toHavePipelineCompliance: MatcherFunction<[expected: unknown]> = function (actual: unknown) {
  if (typeof actual !== 'object' || actual === null) {
    return {
      message: () => `Expected ${actual} to be an object`,
      pass: false,
    };
  }

  const service = actual as any;
  const requiredFields = ['pipelineCompliant', 'enforcement'];
  const missingFields = requiredFields.filter(field => !(field in service));

  if (missingFields.length > 0) {
    return {
      message: () => `Service missing pipeline compliance fields: ${missingFields.join(', ')}`,
      pass: false,
    };
  }

  const pass = service.pipelineCompliant === true &&
                service.enforcement &&
                typeof service.enforcement.level === 'string';

  return {
    message: () =>
      pass
        ? `Expected service not to have pipeline compliance`
        : `Expected service to have pipeline compliance (pipelineCompliant: true, enforcement.level defined)`,
    pass,
  };
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidChittyId(): R;
      toBeValidServiceToken(): R;
      toHavePipelineCompliance(): R;
    }
  }
}

// Register custom matchers
expect.extend({
  toBeValidChittyId,
  toBeValidServiceToken,
  toHavePipelineCompliance,
});

export {};