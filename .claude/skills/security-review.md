# Security Review

Run a comprehensive security scan and provide detailed remediation guidance.

## Steps

1. Run the security gate:

   ```bash
   bash scripts/gates/security.sh
   ```

2. For each finding, provide a detailed report:

   **npm audit vulnerabilities:**
   - Severity, affected package, and dependency chain
   - Whether it's a direct or transitive dependency
   - Recommended fix: `npm audit fix`, manual update, or override

   **Secrets detected:**
   - File and line number
   - What type of secret it appears to be
   - How to remove it and rotate the credential

   **License violations:**
   - Which dependency has the denied license
   - Alternative packages with permissive licenses

   **Supply chain issues:**
   - Which Actions are unpinned and how to pin them
   - Lockfile sync commands

   **Electron SAST findings:**
   - The security risk of each finding
   - The correct secure configuration
   - Links to Electron security documentation

3. Prioritize findings by severity: critical > high > moderate > low.

4. Provide a final security score (pass/warn/fail) with actionable next steps.
