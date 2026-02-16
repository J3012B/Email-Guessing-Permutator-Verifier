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

// Server-Sent Events endpoint for real-time verification
app.get("/api/verify-stream", async (req, res) => {
  const { firstName, lastName, domain } = req.query;

  if (!firstName || !lastName || !domain) {
    return res.status(400).json({ error: "firstName, lastName, and domain are required" });
  }

  if (!API_KEY || API_KEY === "YOUR_API_KEY_HERE") {
    return res.status(500).json({ error: "API key not configured. Please set APILAYER_API_KEY in .env" });
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const { tier1, tier2, tier3 } = generateVariationsByTier(firstName, lastName, domain);
  const allTiers = [
    ...tier1.map(email => ({ email, tier: 1 })),
    ...tier2.map(email => ({ email, tier: 2 })),
    ...tier3.map(email => ({ email, tier: 3 }))
  ];

  let totalApiCalls = 0;
  const allVerified = [];

  console.log(`\n📧 Starting tiered verification for ${firstName} ${lastName} @ ${domain}\n`);

  // Send initial list of all variations
  sendEvent("init", { variations: allTiers });

  try {
    // Helper to verify a tier with streaming updates
    async function verifyTier(tierEmails, tierNumber, tierName) {
      console.log(`🔍 Tier ${tierNumber} (${tierName}): Checking ${tierEmails.length} variations`);
      tierEmails.forEach((email, i) => console.log(`   ${i + 1}. ${email}`));

      sendEvent("tier-start", { tier: tierNumber, name: tierName, count: tierEmails.length });

      // Verify emails one by one for real-time updates
      const verifiedEmails = [];
      for (const email of tierEmails) {
        try {
          const result = await verifyEmail(email);
          totalApiCalls++;
          const verified = { email, tier: tierNumber, ...result };
          verifiedEmails.push(verified);
          allVerified.push(verified);
          sendEvent("result", verified);
        } catch (err) {
          totalApiCalls++;
          const verified = { email, tier: tierNumber, error: err.message };
          verifiedEmails.push(verified);
          allVerified.push(verified);
          sendEvent("result", verified);
        }
      }

      const deliverable = verifiedEmails.filter(v => v.is_deliverable);
      console.log(`   ✓ Found ${deliverable.length} deliverable email(s)\n`);

      sendEvent("tier-complete", { 
        tier: tierNumber, 
        deliverable: deliverable.length,
        total: tierEmails.length
      });

      return deliverable.length > 0;
    }

    // Tier 1
    const foundInTier1 = await verifyTier(tier1, 1, "Most Common");
    
    if (foundInTier1) {
      console.log(`✅ Stopping early - found deliverable email(s) in Tier 1`);
      console.log(`💰 API calls saved: ${tier2.length + tier3.length} (only used ${totalApiCalls} instead of ${tier1.length + tier2.length + tier3.length})\n`);
      
      sendEvent("complete", { 
        apiCallsUsed: totalApiCalls,
        apiCallsSaved: tier2.length + tier3.length,
        stoppedAtTier: 1
      });
      return res.end();
    }

    // Tier 2
    const foundInTier2 = await verifyTier(tier2, 2, "Common Alternatives");
    
    if (foundInTier2) {
      console.log(`✅ Stopping early - found deliverable email(s) in Tier 2`);
      console.log(`💰 API calls saved: ${tier3.length} (only used ${totalApiCalls} instead of ${tier1.length + tier2.length + tier3.length})\n`);
      
      sendEvent("complete", { 
        apiCallsUsed: totalApiCalls,
        apiCallsSaved: tier3.length,
        stoppedAtTier: 2
      });
      return res.end();
    }

    // Tier 3
    await verifyTier(tier3, 3, "Less Common");

    const totalDeliverable = allVerified.filter(v => v.is_deliverable).length;
    const totalErrors = allVerified.filter(v => v.error).length;
    console.log(`✅ Verification complete: ${totalDeliverable} deliverable, ${totalErrors} errors, ${totalApiCalls} API calls\n`);

    sendEvent("complete", { 
      apiCallsUsed: totalApiCalls,
      apiCallsSaved: 0,
      stoppedAtTier: 3
    });
    
    res.end();
  } catch (err) {
    sendEvent("error", { message: err.message });
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
