// Keep tests deterministic: every date-sensitive calculation must be given an
// explicit timezone/reference date rather than reading ambient system state.
process.env.TZ = 'UTC';
