import { Router } from "express";
import { z } from "zod";
import {
  fetchOwnershipByPIN,
  fetchTaxTrendByPIN,
  isValidCookCountyPIN,
} from "../lib/connectors/cook_county";

const router = Router();

/**
 * GET /property/pin/:pin/ownership
 * Fetch current ownership information for a property PIN
 */
router.get("/pin/:pin/ownership", async (req, res) => {
  try {
    const { pin } = req.params;

    if (!isValidCookCountyPIN(pin)) {
      return res.status(400).json({
        error: "Invalid PIN format",
        message: "PIN must be in format: XX-XX-XXX-XXX-XXXX",
      });
    }

    // Fetch ownership data
    const data = await fetchOwnershipByPIN(pin);

    res.json(data);
    return;
  } catch (error) {
    console.error("Error fetching ownership:", error);
    res.status(500).json({
      error: "Failed to fetch ownership data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
});

/**
 * GET /property/pin/:pin/tax-trend
 * Fetch historical tax assessment data for a property PIN
 */
router.get("/pin/:pin/tax-trend", async (req, res) => {
  try {
    const { pin } = req.params;

    if (!isValidCookCountyPIN(pin)) {
      return res.status(400).json({
        error: "Invalid PIN format",
        message: "PIN must be in format: XX-XX-XXX-XXX-XXXX",
      });
    }

    const data = await fetchTaxTrendByPIN(pin);
    res.json(data);
    return;
  } catch (error) {
    console.error("Error fetching tax trend:", error);
    res.status(500).json({
      error: "Failed to fetch tax trend data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
});

/**
 * POST /property/pin/batch
 * Fetch ownership for multiple PINs
 */
const BatchPINSchema = z.object({
  pins: z.array(z.string()).max(50),
});

router.post("/pin/batch", async (req, res) => {
  try {
    const parsed = BatchPINSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parsed.error.issues,
      });
    }

    const { pins } = parsed.data;

    // Validate all PINs
    const invalidPins = pins.filter((pin) => !isValidCookCountyPIN(pin));
    if (invalidPins.length > 0) {
      return res.status(400).json({
        error: "Invalid PINs",
        invalidPins,
      });
    }

    // Fetch ownership for all PINs
    const results = await Promise.all(
      pins.map((pin) => fetchOwnershipByPIN(pin)),
    );

    res.json({
      count: results.length,
      data: results,
    });
    return;
  } catch (error) {
    console.error("Error in batch fetch:", error);
    res.status(500).json({
      error: "Failed to fetch batch data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return;
  }
});

export default router;
