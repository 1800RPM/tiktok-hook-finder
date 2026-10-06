// Token use per Anthropic call, so the bill can be traced back to a tab, a model and its retries.
// Every call is logged as one line; the running totals since the server started are served at
// GET /usage. The model is the one that actually answered, so a fallback (e.g. Fable 5 handing a
// declined request to Opus 4.8) shows up under the model that billed it.

type Tally = { label: string; model: string; calls: number; retries: number; input: number; cacheWrite: number; cacheRead: number; output: number };

const startedAt = new Date().toISOString();
const totals = new Map<string, Tally>();

export function logClaudeUsage(label: string, data: any, attempt = 0) {
    const usage = data?.usage || {};
    const model = String(data?.model || 'unknown');
    const input = Number(usage.input_tokens) || 0;
    const cacheWrite = Number(usage.cache_creation_input_tokens) || 0;
    const cacheRead = Number(usage.cache_read_input_tokens) || 0;
    const output = Number(usage.output_tokens) || 0;
    console.log(`[Usage] ${label} · ${model} · attempt ${attempt + 1} · in ${input} · cacheWrite ${cacheWrite} · cacheRead ${cacheRead} · out ${output} · stop ${data?.stop_reason ?? '?'}`);
    const key = `${label}|${model}`;
    const tally = totals.get(key) || { label, model, calls: 0, retries: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
    tally.calls += 1;
    if (attempt > 0) tally.retries += 1;
    tally.input += input;
    tally.cacheWrite += cacheWrite;
    tally.cacheRead += cacheRead;
    tally.output += output;
    totals.set(key, tally);
}

export function usageSummary() {
    const rows = [...totals.values()]
        .map((tally) => ({ ...tally }))
        .sort((a, b) => (b.input + b.output * 5) - (a.input + a.output * 5));
    return { since: startedAt, rows };
}
