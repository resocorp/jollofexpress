# Diagnostic Scripts

This directory contains diagnostic and troubleshooting scripts for development and debugging purposes.

## 🔧 Available Scripts

### 1. **diagnose-localhost.js**
Diagnoses localhost connectivity issues and environment setup.

**Usage:**
```bash
node scripts/diagnostics/diagnose-localhost.js
```

**Checks:**
- Environment variables configuration
- Supabase connectivity
- Node modules installation
- Next.js configuration

**When to use:** When the app works via ngrok but not on localhost

---

### 2. **diagnose-reprint.js**
Diagnoses why the reprint button isn't working for a specific order.

**Usage:**
```bash
node scripts/diagnostics/diagnose-reprint.js ORDER_ID
```

**Example:**
```bash
node scripts/diagnostics/diagnose-reprint.js 123e4567-e89b-12d3-a456-426614174000
node scripts/diagnostics/diagnose-reprint.js ORD-20251023-8779
```

**When to use:** When reprint functionality fails for specific orders

---

### 3. **check-print-worker.js**
Checks if the print worker is running and processing jobs correctly.

**Usage:**
```bash
node scripts/diagnostics/check-print-worker.js
```

**Checks:**
- Print worker status
- Pending print jobs in queue
- Recent print job statistics
- Printer configuration

**When to use:** When prints aren't being processed

---

### 4. **check-printer-status.js**
Tests printer connectivity and status using ESC/POS commands.

**Usage:**
```bash
node scripts/diagnostics/check-printer-status.js [PRINTER_IP]
```

**Example:**
```bash
node scripts/diagnostics/check-printer-status.js 10.250.40.14
```

**Checks:**
- Network connectivity to printer
- Printer online status
- Paper status
- Cover status
- Error conditions

**When to use:** When printer is not responding or has hardware issues

---

### 5. **clear-old-print-jobs.js**
Removes old pending print jobs from the queue.

**Usage:**
```bash
node scripts/diagnostics/clear-old-print-jobs.js [hours]
```

**Example:**
```bash
node scripts/diagnostics/clear-old-print-jobs.js 24  # Clear jobs older than 24 hours
```

**When to use:** When the print queue has stale jobs that need cleanup

---

## 📝 Notes

- These scripts are for **development and troubleshooting** only
- Do not run in production unless investigating issues
- Most scripts require proper environment variables in `.env.local`
- Some scripts require the application to be running
