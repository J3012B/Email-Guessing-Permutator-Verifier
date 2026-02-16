const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.APILAYER_API_KEY;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

function generateVariationsByTier(first, last, domain) {
  const f = first.toLowerCase().trim();
  const l = last.toLowerCase().trim();
  const fi = f.charAt(0);
  const li = l.charAt(0);

  // Tier 1: Most common corporate email formats
  const tier1 = [
    `${f}.${l}@${domain}`,      // first.last (most common)
    `${f}@${domain}`,            // first
    `${fi}${l}@${domain}`,       // flast
    `${f}${l}@${domain}`,        // firstlast
  ];

  // Tier 2: Common alternative formats
  const tier2 = [
    `${l}@${domain}`,            // last
    `${f}_${l}@${domain}`,       // first_last
    `${f}-${l}@${domain}`,       // first-last
    `${l}.${f}@${domain}`,       // last.first
    `${fi}.${l}@${domain}`,      // f.last
  ];

  // Tier 3: Less common formats
  const tier3 = [
    `${l}${f}@${domain}`,        // lastfirst
    `${l}_${f}@${domain}`,       // last_first
    `${l}-${f}@${domain}`,       // last-first
    `${fi}_${l}@${domain}`,      // f_last
    `${fi}-${l}@${domain}`,      // f-last
    `${f}${li}@${domain}`,       // firstl
    `${f}.${li}@${domain}`,      // first.l
    `${f}_${li}@${domain}`,      // first_l
    `${f}-${li}@${domain}`,      // first-l
    `${fi}${li}@${domain}`,      // fl
    `${fi}.${li}@${domain}`,     // f.l
    `${l}${fi}@${domain}`,       // lastf
    `${l}.${fi}@${domain}`,      // last.f
    `${l}_${fi}@${domain}`,      // last_f
    `${l}-${fi}@${domain}`,      // last-f
    `${li}${f}@${domain}`,       // lfirst
    `${li}.${f}@${domain}`,      // l.first
    `${li}_${f}@${domain}`,      // l_first
    `${li}-${f}@${domain}`,      // l-first
  ];

  return { tier1, tier2, tier3 };
}

async function verifyEmail(email) {
  const url = `https://api.apilayer.com/email_verification/${encodeURIComponent(email)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { apikey: API_KEY },
  });

  if (!res.ok) {
    throw new Error(`API returned ${res.status} for ${email}`);
  }

  return res.json();
}

app.post("/api/verify", async (req, res) => {
  const { firstName, lastName, domain } = req.body;

  if (!firstName || !lastName || !domain) {
    return res.status(400).json({ error: "firstName, lastName, and domain are required" });
  }

  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    return res.status(500).json({ error: "API key not configured. Please set APILAYER_API_KEY in .env" });
  }

  const { tier1, tier2, tier3 } = generateVariationsByTier(firstName, lastName, domain);
  const allVerified = [];
  let totalApiCalls = 0;

  console.log(`\n📧 Starting tiered verification for ${firstName} ${lastName} @ ${domain}\n`);

  try {
    // Tier 1: Most common formats
    console.log(`🔍 Tier 1 (Most Common): Checking ${tier1.length} variations`);
    tier1.forEach((email, i) => console.log(`   ${i + 1}. ${email}`));
    
    const tier1Results = await Promise.allSettled(tier1.map((email) => verifyEmail(email)));
    totalApiCalls += tier1.length;

    const tier1Verified = tier1Results.map((result, i) => {
      if (result.status === "fulfilled") {
        return { email: tier1[i], tier: 1, ...result.value };
      }
      return { email: tier1[i], tier: 1, error: result.reason.message };
    });

    allVerified.push(...tier1Verified);

    const tier1Deliverable = tier1Verified.filter(v => v.is_deliverable);
    console.log(`   ✓ Found ${tier1Deliverable.length} deliverable email(s)\n`);

    // If we found deliverable emails in Tier 1, stop here
    if (tier1Deliverable.length > 0) {
      console.log(`✅ Stopping early - found deliverable email(s) in Tier 1`);
      console.log(`💰 API calls saved: ${tier2.length + tier3.length} (only used ${totalApiCalls} instead of ${tier1.length + tier2.length + tier3.length})\n`);
      
      allVerified.sort((a, b) => (b.score || 0) - (a.score || 0));
      return res.json({ results: allVerified, apiCallsUsed: totalApiCalls });
    }

    // Tier 2: Common alternatives
    console.log(`🔍 Tier 2 (Common Alternatives): Checking ${tier2.length} variations`);
    tier2.forEach((email, i) => console.log(`   ${i + 1}. ${email}`));

    const tier2Results = await Promise.allSettled(tier2.map((email) => verifyEmail(email)));
    totalApiCalls += tier2.length;

    const tier2Verified = tier2Results.map((result, i) => {
      if (result.status === "fulfilled") {
        return { email: tier2[i], tier: 2, ...result.value };
      }
      return { email: tier2[i], tier: 2, error: result.reason.message };
    });

    allVerified.push(...tier2Verified);

    const tier2Deliverable = tier2Verified.filter(v => v.is_deliverable);
    console.log(`   ✓ Found ${tier2Deliverable.length} deliverable email(s)\n`);

    // If we found deliverable emails in Tier 2, stop here
    if (tier2Deliverable.length > 0) {
      console.log(`✅ Stopping early - found deliverable email(s) in Tier 2`);
      console.log(`💰 API calls saved: ${tier3.length} (only used ${totalApiCalls} instead of ${tier1.length + tier2.length + tier3.length})\n`);
      
      allVerified.sort((a, b) => (b.score || 0) - (a.score || 0));
      return res.json({ results: allVerified, apiCallsUsed: totalApiCalls });
    }

    // Tier 3: Less common formats
    console.log(`🔍 Tier 3 (Less Common): Checking ${tier3.length} variations`);
    tier3.forEach((email, i) => console.log(`   ${i + 1}. ${email}`));

    const tier3Results = await Promise.allSettled(tier3.map((email) => verifyEmail(email)));
    totalApiCalls += tier3.length;

    const tier3Verified = tier3Results.map((result, i) => {
      if (result.status === "fulfilled") {
        return { email: tier3[i], tier: 3, ...result.value };
      }
      return { email: tier3[i], tier: 3, error: result.reason.message };
    });

    allVerified.push(...tier3Verified);

    const tier3Deliverable = tier3Verified.filter(v => v.is_deliverable);
    console.log(`   ✓ Found ${tier3Deliverable.length} deliverable email(s)\n`);

    const totalDeliverable = allVerified.filter(v => v.is_deliverable).length;
    const totalErrors = allVerified.filter(v => v.error).length;
    console.log(`✅ Verification complete: ${totalDeliverable} deliverable, ${totalErrors} errors, ${totalApiCalls} API calls\n`);

    allVerified.sort((a, b) => (b.score || 0) - (a.score || 0));
    return res.json({ results: allVerified, apiCallsUsed: totalApiCalls });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
