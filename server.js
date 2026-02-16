const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.APILAYER_API_KEY;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

function generateVariations(first, last, domain) {
  const f = first.toLowerCase().trim();
  const l = last.toLowerCase().trim();
  const fi = f.charAt(0);
  const li = l.charAt(0);

  const variations = new Set([
    `${f}@${domain}`,
    `${l}@${domain}`,
    `${f}${l}@${domain}`,
    `${f}.${l}@${domain}`,
    `${f}_${l}@${domain}`,
    `${f}-${l}@${domain}`,
    `${l}${f}@${domain}`,
    `${l}.${f}@${domain}`,
    `${l}_${f}@${domain}`,
    `${l}-${f}@${domain}`,
    `${fi}${l}@${domain}`,
    `${fi}.${l}@${domain}`,
    `${fi}_${l}@${domain}`,
    `${fi}-${l}@${domain}`,
    `${f}${li}@${domain}`,
    `${f}.${li}@${domain}`,
    `${f}_${li}@${domain}`,
    `${f}-${li}@${domain}`,
    `${fi}${li}@${domain}`,
    `${fi}.${li}@${domain}`,
    `${l}${fi}@${domain}`,
    `${l}.${fi}@${domain}`,
    `${l}_${fi}@${domain}`,
    `${l}-${fi}@${domain}`,
    `${li}${f}@${domain}`,
    `${li}.${f}@${domain}`,
    `${li}_${f}@${domain}`,
    `${li}-${f}@${domain}`,
  ]);

  return [...variations];
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

  const emails = generateVariations(firstName, lastName, domain);

  console.log(`\n📧 Verifying ${emails.length} email variations for ${firstName} ${lastName} @ ${domain}:`);
  emails.forEach((email, i) => {
    console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${email}`);
  });
  console.log('');

  try {
    const results = await Promise.allSettled(emails.map((email) => verifyEmail(email)));

    const verified = results.map((result, i) => {
      if (result.status === "fulfilled") {
        return { email: emails[i], ...result.value };
      }
      return { email: emails[i], error: result.reason.message };
    });

    verified.sort((a, b) => (b.score || 0) - (a.score || 0));

    const deliverable = verified.filter(v => v.is_deliverable).length;
    const errors = verified.filter(v => v.error).length;
    console.log(`✅ Verification complete: ${deliverable} deliverable, ${errors} errors, ${verified.length} total\n`);

    return res.json({ results: verified });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
