# Outreach Email Verifier

A smart email verification tool that discovers and validates probable email addresses for outreach campaigns.

## Features

- **Tiered Verification** - Saves API costs by checking most common formats first
- **Smart Early Stopping** - Stops verification once deliverable emails are found
- **28 Email Variations** - Tests all probable email format combinations
- **Real-time Validation** - Uses APILayer Email Verification API
- **Beautiful UI** - Modern, dark-themed interface with real-time results

## How It Works

The tool verifies emails in 3 tiers based on popularity:

### Tier 1 (Most Common) - 4 variations
- `first.last@domain` (most common corporate format)
- `first@domain`
- `flast@domain` (first initial + last name)
- `firstlast@domain`

### Tier 2 (Common Alternatives) - 5 variations
- `last@domain`
- `first_last@domain`
- `first-last@domain`
- `last.first@domain`
- `f.last@domain`

### Tier 3 (Less Common) - 19 variations
- All other permutations including reversed names, underscores, hyphens, and initial combinations

**Cost Savings:** If a deliverable email is found in Tier 1, the tool stops immediately, saving you up to **24 API calls** per search (86% reduction).

## Setup

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Get your API key from [APILayer Email Verification](https://apilayer.com/marketplace/email_verification-api)

4. Add your API key to `.env`:
```env
APILAYER_API_KEY=your_actual_api_key_here
PORT=3000
```

5. Start the server:
```bash
npm start
```

6. Open your browser to `http://localhost:3000`

## Usage

1. Enter the person's first name, last name, and company domain
2. Click "Verify Email Variations"
3. The system will check tier by tier, stopping early when deliverable emails are found
4. Results are sorted by deliverability score (highest first)

## API Response Fields

- `is_deliverable` - Whether the email can receive messages
- `score` - Confidence score (0-1)
- `syntax_valid` - Email format is valid
- `mx_records` - Domain has mail exchange records
- `is_disposable` - Whether it's a temporary email
- `is_role_account` - Whether it's a generic role (e.g., info@, sales@)
- `tier` - Which tier the email was found in (1-3)

## Cost Optimization

The tiered approach dramatically reduces API costs:

- **Worst case:** 28 API calls (all tiers checked)
- **Best case:** 4 API calls (deliverable found in Tier 1)
- **Average case:** ~9 API calls (deliverable found in Tier 2)

Console output shows exactly how many API calls were used and how many were saved.

## Tech Stack

- Node.js + Express (backend)
- Vanilla JavaScript (frontend)
- APILayer Email Verification API
- Modern CSS with dark theme

## License

MIT
