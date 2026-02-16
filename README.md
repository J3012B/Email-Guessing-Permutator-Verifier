# Outreach Email Verifier

A smart email verification tool that discovers and validates probable email addresses for outreach campaigns.

## Features

- **Real-time Streaming** - See results instantly as each verification completes
- **Tiered Verification** - Saves API costs by checking most common formats first
- **Smart Early Stopping** - Stops verification once deliverable emails are found
- **Manual Verification** - Check skipped variations individually if needed
- **28 Email Variations** - Tests all probable email format combinations
- **Live Progress Updates** - Watch verification happen in real-time with visual feedback
- **Detailed Tooltips** - Hover over any result to see full API response details
- **Beautiful UI** - Modern, dark-themed interface with instant updates

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

1. Enter the person's first name, last name, and company domain (accepts full URLs - automatically extracts domain)
2. Click "Verify Email Variations"
3. Watch in real-time as:
   - All variations appear instantly with "Verifying" status
   - Each email updates to show results as verification completes
   - Progress counter updates live
   - Tier completion messages appear
4. The system checks tier by tier, stopping early when deliverable emails are found
5. See exactly how many API calls were used and saved

### Real-time Updates

The app uses **Server-Sent Events (SSE)** to stream results as they happen:
- All 28 variations appear immediately with pending status
- Each row updates the moment its verification completes
- No waiting for all checks to finish - see deliverable emails instantly
- Live progress tracking shows exactly what's happening

### Smart Early Stopping

When a deliverable email is found in an earlier tier:
- Verification stops immediately to save API costs
- Remaining unchecked variations show "Not Checked" status
- Click the **"Check"** button on any skipped variation to verify it manually
- Hover over any result to see detailed API response information

This gives you full control: save costs with automatic stopping, but still verify any specific variation you're curious about.

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
