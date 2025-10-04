/**
 * ChittyRegistry Certificate Integration
 * Validates services have proper certificates from ChittyRegister before listing
 */

// Service endpoints per Charter separation
const REGISTER_ENDPOINT =
  process.env.CHITTYREGISTER_URL ||
  "https://chittyregister-production.chitty.workers.dev";
const VERIFY_ENDPOINT =
  process.env.CHITTYVERIFY_URL || "https://chittyverify.chitty.cc";
const CERTIFY_ENDPOINT =
  process.env.CHITTYCERTIFY_URL || "https://chittycertify.chitty.cc";

/**
 * Validate a service has a valid certificate from ChittyRegister
 * @param {Object} service - Service to validate
 * @param {Object} certificate - Certificate to validate
 * @returns {Promise<boolean>} - Whether service is properly certified
 */
export async function validateServiceCertificate(service, certificate) {
  try {
    // Call ChittyRegister to validate certificate
    const response = await fetch(`${REGISTER_ENDPOINT}/api/v1/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ certificate }),
    });

    if (!response.ok) {
      console.error("Certificate validation failed:", response.status);
      return false;
    }

    const result = await response.json();

    // Ensure certificate matches the service
    if (result.valid && certificate.serviceName === service.name) {
      return true;
    }

    return false;
  } catch (error) {
    console.error("Error validating certificate:", error);
    return false;
  }
}

/**
 * Complete service onboarding following Charter separation
 * @param {Object} service - Service to onboard
 * @returns {Promise<Object|null>} - Certificate if successful, null otherwise
 */
export async function onboardServiceWithChittyOS(service) {
  try {
    // Step 1: Register with Foundation (gets ChittyID)
    const registration = await registerWithFoundation(service);
    if (!registration.success) {
      return {
        success: false,
        step: "registration",
        error: registration.error,
      };
    }

    // Step 2: Verify compliance with ChittyVerify service
    const verification = await verifyCompliance(service, registration.chittyId);
    if (!verification.success) {
      return {
        success: false,
        step: "verification",
        error: verification.error,
      };
    }

    // Step 3: Get certificate from ChittyCertify service
    const certification = await getCertificate(
      service,
      registration.chittyId,
      verification.report,
    );
    if (!certification.success) {
      return {
        success: false,
        step: "certification",
        error: certification.error,
      };
    }

    return {
      success: true,
      chittyId: registration.chittyId,
      certificate: certification.certificate,
      verification: verification.report,
    };
  } catch (error) {
    console.error("Error in service onboarding:", error);
    return { success: false, step: "onboarding", error: error.message };
  }
}

/**
 * Step 1: Register with ChittyRegister (Foundation)
 */
async function registerWithFoundation(service) {
  const submission = {
    name: service.name,
    description: service.description || "ChittyOS service",
    version: service.version || "1.0.0",
    maintainer: service.maintainer || "ChittyOS Team",
  };

  const response = await fetch(`${REGISTER_ENDPOINT}/api/v1/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.message };
  }

  const result = await response.json();
  return { success: true, chittyId: result.chittyId };
}

/**
 * Step 2: Verify compliance with ChittyVerify (Service)
 */
async function verifyCompliance(service, chittyId) {
  const submission = {
    chittyId,
    service: {
      name: service.name,
      endpoints: service.endpoints || ["/health", "/api/v1/status"],
      schema: service.schema || { version: "1.0.0", entities: ["service"] },
      security: service.security || {
        authentication: "apikey",
        encryption: "https",
      },
    },
  };

  const response = await fetch(`${VERIFY_ENDPOINT}/api/v1/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    return { success: false, error: "Verification service unavailable" };
  }

  const result = await response.json();
  return { success: result.compliant, report: result };
}

/**
 * Step 3: Get certificate from ChittyCertify (Service)
 */
async function getCertificate(service, chittyId, verificationReport) {
  const submission = {
    chittyId,
    serviceName: service.name,
    verificationReport,
  };

  const response = await fetch(`${CERTIFY_ENDPOINT}/api/v1/certify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    return { success: false, error: "Certification service unavailable" };
  }

  const result = await response.json();
  return { success: true, certificate: result.certificate };
}

/**
 * Get compliance status for a service
 * @param {string} serviceName - Name of service to check
 * @returns {Promise<Object>} - Compliance status
 */
export async function getServiceCompliance(serviceName) {
  try {
    const response = await fetch(
      `${REGISTER_ENDPOINT}/api/v1/compliance/${serviceName}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        compliant: false,
        error: "Service not found in register",
      };
    }

    return await response.json();
  } catch (error) {
    console.error("Error checking compliance:", error);
    return {
      compliant: false,
      error: error.message,
    };
  }
}

/**
 * Sync registered services from ChittyRegister
 * @returns {Promise<Array>} - List of certified services
 */
export async function syncWithRegister() {
  try {
    const response = await fetch(`${REGISTER_ENDPOINT}/api/v1/services`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to sync with register:", response.status);
      return [];
    }

    const result = await response.json();
    return result.services || [];
  } catch (error) {
    console.error("Error syncing with register:", error);
    return [];
  }
}

/**
 * Middleware to ensure service has valid certificate
 * @param {Object} service - Service to check
 * @returns {Promise<Object>} - Validation result
 */
export async function requireCertificate(service) {
  // Check if service has certificate
  if (!service.certificate) {
    return {
      valid: false,
      error: "Service missing certificate",
      action: "register_required",
    };
  }

  // Validate certificate with ChittyRegister
  const isValid = await validateServiceCertificate(
    service,
    service.certificate,
  );

  if (!isValid) {
    return {
      valid: false,
      error: "Invalid or expired certificate",
      action: "renewal_required",
    };
  }

  return {
    valid: true,
    certificate: service.certificate,
  };
}

/**
 * Add certificate requirement to service before listing
 * @param {Object} service - Service to add to registry
 * @param {Object} env - Environment with KV namespace
 * @returns {Promise<Object>} - Result of adding service
 */
export async function addCertifiedService(service, env) {
  // First check certificate
  const certCheck = await requireCertificate(service);

  if (!certCheck.valid) {
    // Try to register with foundation if no certificate
    if (certCheck.action === "register_required") {
      const certificate = await registerServiceWithFoundation(service);

      if (!certificate) {
        return {
          success: false,
          error: "Failed to obtain certificate from ChittyRegister",
          requirements: await fetch(
            `${REGISTER_ENDPOINT}/api/v1/requirements`,
          ).then((r) => r.json()),
        };
      }

      service.certificate = certificate;
    } else {
      return {
        success: false,
        error: certCheck.error,
        action: certCheck.action,
      };
    }
  }

  // Service is certified, add to registry
  const key = `service:${service.name}`;
  const value = {
    ...service,
    certificateValidated: true,
    addedAt: new Date().toISOString(),
    lastValidated: new Date().toISOString(),
  };

  await env.REGISTRY_KV.put(key, JSON.stringify(value));

  return {
    success: true,
    service: value,
    certificate: service.certificate,
  };
}

export default {
  validateServiceCertificate,
  registerServiceWithFoundation,
  getServiceCompliance,
  syncWithRegister,
  requireCertificate,
  addCertifiedService,
};
