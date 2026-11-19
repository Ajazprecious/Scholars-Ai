const apiKey = () => process.env.OPENAI_API_KEY;
export async function chatCompletion(messages, { json = false, temperature = 0.4 } = {}) {
  if (!apiKey()) throw Object.assign(new Error('AI is not configured. Add OPENAI_API_KEY to the server environment.'), { status: 503 });
  const response = await fetch(`${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini', messages, temperature, ...(json ? { response_format: { type: 'json_object' } } : {}) })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error?.message || 'AI provider request failed'), { status: response.status >= 500 ? 502 : response.status });
  const content = data.choices?.[0]?.message?.content || '';
  if (json) { try { return JSON.parse(content); } catch { throw new Error('AI returned invalid structured content. Please retry.'); } }
  return content;
}
export async function generateLesson(section) {
  const prompt = `You are AJAZ AI, an encouraging university professor. Based ONLY on the source content below, create an in-depth lesson. Do not invent facts. Return JSON with string fields simplified_summary, key_concepts, related_materials, exam_tips, real_world_context, diagram_mermaid. Include clear definitions, mechanisms, examples and analogies; 5-8 key concepts; 4-6 related topics; 5-7 exam tips; 4-6 applications. If source content lacks enough information, say so.\nTITLE: ${section.heading_title}\nSOURCE:\n${(section.raw_content || '').slice(0, 14000)}`;
  return chatCompletion([{ role: 'system', content: 'Return valid JSON only.' }, { role: 'user', content: prompt }], { json: true });
}
