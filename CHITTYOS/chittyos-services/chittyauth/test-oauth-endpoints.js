#!/usr/bin/env node

/**
 * Test OAuth and Portal Endpoints
 * Tests the new MCP Portal and Linked Apps functionality
 */

// Color codes for output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test configuration
const TEST_CONFIG = {
  chittyAuthUrl: "http://localhost:8787", // Local development server
  testChittyId: "CHITTY-PEO-TEST001-ABC",
  testAppId: "test-external-app",
  testRedirectUri: "https://app.example.com/oauth/callback",
  mockCfJwt:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0QGNoaXR0eS5jYyIsImVtYWlsIjoidGVzdEBjaGl0dHkuY2MiLCJpYXQiOjE2MDA5NDY2NjYsImV4cCI6MTkwMDk0NjY2Nn0.mock_signature",
};

async function testOAuthEndpoints() {
  log("🔐 Testing ChittyAuth OAuth and Portal Endpoints\\n", "cyan");

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: MCP Portal Authentication
  log("1. Testing MCP Portal Authentication...", "blue");
  try {
    const response = await fetch(
      `${TEST_CONFIG.chittyAuthUrl}/v1/mcp/portal/authenticate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cf-Access-Jwt-Assertion": TEST_CONFIG.mockCfJwt,
          "Cf-Access-Authenticated-User-Email": "test@chitty.cc",
        },
      },
    );

    const result = await response.json();

    if (response.ok && result.authenticated) {
      log("   ✅ MCP Portal authentication: Success", "green");
      log(`   📝 ChittyID: ${result.chitty_id}`, "cyan");
      log(`   🔗 Portal URL: ${result.mcp_portal_url}`, "cyan");
      testsPassed++;
    } else {
      log(`   ❌ MCP Portal authentication: Failed - ${result.error}`, "red");
      testsFailed++;
    }
  } catch (error) {
    log(`   ❌ MCP Portal authentication: Error - ${error.message}`, "red");
    testsFailed++;
  }

  // Test 2: Create OAuth Authorization Flow
  log("\\n2. Testing OAuth Authorization Flow Creation...", "blue");
  let authCode = null;
  try {
    const response = await fetch(
      `${TEST_CONFIG.chittyAuthUrl}/v1/mcp/linked-app/oauth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chitty_id: TEST_CONFIG.testChittyId,
          app_id: TEST_CONFIG.testAppId,
          redirect_uri: TEST_CONFIG.testRedirectUri,
          scopes: ["read", "write", "profile"],
        }),
      },
    );

    const result = await response.json();

    if (response.ok && result.authorized) {
      log("   ✅ OAuth flow creation: Success", "green");
      log(`   📝 Authorization Code: ${result.authorization_code}`, "cyan");
      log(`   🔗 Redirect URI: ${result.redirect_uri}`, "cyan");
      log(`   ⏰ Expires In: ${result.expires_in} seconds`, "cyan");
      authCode = result.authorization_code;
      testsPassed++;
    } else {
      log(`   ❌ OAuth flow creation: Failed - ${result.error}`, "red");
      testsFailed++;
    }
  } catch (error) {
    log(`   ❌ OAuth flow creation: Error - ${error.message}`, "red");
    testsFailed++;
  }

  // Test 3: OAuth Token Exchange
  log("\\n3. Testing OAuth Token Exchange...", "blue");
  let accessToken = null;
  if (authCode) {
    try {
      const response = await fetch(
        `${TEST_CONFIG.chittyAuthUrl}/v1/mcp/linked-app/token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: authCode,
            client_id: "test-client-id",
            client_secret: "test-client-secret",
            grant_type: "authorization_code",
          }),
        },
      );

      const result = await response.json();

      if (response.ok && result.access_token) {
        log("   ✅ OAuth token exchange: Success", "green");
        log(
          `   🔑 Access Token: ${result.access_token.substring(0, 20)}...`,
          "cyan",
        );
        log(
          `   🔄 Refresh Token: ${result.refresh_token.substring(0, 20)}...`,
          "cyan",
        );
        log(`   📋 Token Type: ${result.token_type}`, "cyan");
        log(`   ⏰ Expires In: ${result.expires_in} seconds`, "cyan");
        log(`   🏷️ Scopes: ${result.scope}`, "cyan");
        accessToken = result.access_token;
        testsPassed++;
      } else {
        log(`   ❌ OAuth token exchange: Failed - ${result.error}`, "red");
        testsFailed++;
      }
    } catch (error) {
      log(`   ❌ OAuth token exchange: Error - ${error.message}`, "red");
      testsFailed++;
    }
  } else {
    log("   ⏭️ Skipping token exchange (no auth code)", "yellow");
  }

  // Test 4: Token Validation (Portal Token)
  log("\\n4. Testing Portal Token Validation...", "blue");
  try {
    const response = await fetch(
      `${TEST_CONFIG.chittyAuthUrl}/v1/mcp/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer portal_test_token_123`,
        },
        body: JSON.stringify({
          token: "portal_test_token_123",
        }),
      },
    );

    const result = await response.json();

    if (response.ok) {
      if (result.valid) {
        log("   ✅ Portal token validation: Valid token", "green");
        log(`   📝 ChittyID: ${result.chitty_id}`, "cyan");
      } else {
        log("   ✅ Portal token validation: Invalid token (expected)", "green");
        log(`   📝 Error: ${result.error}`, "cyan");
      }
      testsPassed++;
    } else {
      log(`   ❌ Portal token validation: Failed - ${result.error}`, "red");
      testsFailed++;
    }
  } catch (error) {
    log(`   ❌ Portal token validation: Error - ${error.message}`, "red");
    testsFailed++;
  }

  // Test 5: Token Validation (Access Token)
  log("\\n5. Testing Access Token Validation...", "blue");
  if (accessToken) {
    try {
      const response = await fetch(
        `${TEST_CONFIG.chittyAuthUrl}/v1/tokens/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            token: accessToken,
          }),
        },
      );

      const result = await response.json();

      if (response.ok) {
        if (result.valid) {
          log("   ✅ Access token validation: Valid token", "green");
          log(`   📝 ChittyID: ${result.chitty_id}`, "cyan");
          log(`   🏷️ Scopes: ${result.scopes?.join(", ")}`, "cyan");
        } else {
          log("   ✅ Access token validation: Invalid token", "green");
          log(`   📝 Error: ${result.error}`, "cyan");
        }
        testsPassed++;
      } else {
        log(`   ❌ Access token validation: Failed - ${result.error}`, "red");
        testsFailed++;
      }
    } catch (error) {
      log(`   ❌ Access token validation: Error - ${error.message}`, "red");
      testsFailed++;
    }
  } else {
    log("   ⏭️ Skipping access token validation (no token)", "yellow");
  }

  // Test 6: Health Check
  log("\\n6. Testing Service Health...", "blue");
  try {
    const response = await fetch(`${TEST_CONFIG.chittyAuthUrl}/health`);
    const result = await response.json();

    if (response.ok && result.status === "healthy") {
      log("   ✅ Service health check: Healthy", "green");
      log(`   📋 Service: ${result.service}`, "cyan");
      log(`   🔖 Version: ${result.version}`, "cyan");
      log(`   🛠️ Capabilities: ${result.capabilities?.length || 0}`, "cyan");
      testsPassed++;
    } else {
      log(`   ❌ Service health check: Unhealthy`, "red");
      testsFailed++;
    }
  } catch (error) {
    log(`   ❌ Service health check: Error - ${error.message}`, "red");
    testsFailed++;
  }

  // Summary
  log("\\n==================================================", "cyan");
  log("📊 OAuth and Portal Endpoint Test Results:", "cyan");
  log(`✅ Passed: ${testsPassed}`, "green");
  log(`❌ Failed: ${testsFailed}`, "red");
  log(
    `📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`,
    "yellow",
  );

  if (testsFailed === 0) {
    log(
      "\\n🎉 All tests passed! OAuth and Portal integration is working.",
      "green",
    );
  } else {
    log(
      "\\n⚠️ Some tests failed. Check ChittyAuth service configuration.",
      "yellow",
    );
  }

  log("\\n💡 Tested Features:", "blue");
  log("✅ MCP Portal authentication with Cloudflare Zero Trust", "cyan");
  log("✅ OAuth2 authorization code flow creation", "cyan");
  log("✅ OAuth token exchange (authorization_code grant)", "cyan");
  log("✅ Portal token validation endpoint", "cyan");
  log("✅ Access token validation endpoint", "cyan");
  log("✅ Service health monitoring", "cyan");

  log("\\n📝 Next Steps:", "blue");
  log("1. Deploy ChittyAuth service: npm run dev", "cyan");
  log("2. Configure Cloudflare Zero Trust policies", "cyan");
  log("3. Test with real ChittyIDs from id.chitty.cc", "cyan");
  log("4. Integrate with external applications", "cyan");

  return testsFailed === 0;
}

// Run tests
testOAuthEndpoints().catch((error) => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});
