const ALLOWED_IFRAME_ATTRIBUTES = new Set([
  "allow",
  "allowfullscreen",
  "frameborder",
  "height",
  "id",
  "loading",
  "referrerpolicy",
  "sandbox",
  "scrolling",
  "src",
  "style",
  "title",
  "width"
]);

export function sanitizeIframeEmbed(embedCode: string) {
  const cleaned = embedCode.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "").trim();
  const iframeMatch = cleaned.match(/<iframe\b[\s\S]*?<\/iframe>/i) ?? cleaned.match(/<iframe\b[^>]*>/i);
  if (!iframeMatch) return "";

  const iframe = iframeMatch[0];
  const attributes = iframe.match(/\s[a-zA-Z:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g) ?? [];
  const safeAttributes: string[] = [];
  let hasTitle = false;
  let hasLoading = false;
  let hasStyle = false;

  for (const rawAttribute of attributes) {
    const [rawName] = rawAttribute.trim().split(/\s*=\s*/);
    const name = rawName.toLowerCase();
    if (!ALLOWED_IFRAME_ATTRIBUTES.has(name) || name.startsWith("on")) continue;

    const valueMatch = rawAttribute.match(/=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/);
    const value = valueMatch?.[1] ?? valueMatch?.[2] ?? valueMatch?.[3] ?? "";
    const safeValue = value.replace(/"/g, "&quot;").replace(/</g, "").replace(/>/g, "");

    if (name === "src" && !/^https?:\/\//i.test(safeValue)) continue;
    if (name === "style" && /expression|javascript:|url\s*\(/i.test(safeValue)) continue;

    if (name === "title") hasTitle = true;
    if (name === "loading") hasLoading = true;
    if (name === "style") hasStyle = true;

    safeAttributes.push(valueMatch ? `${name}="${safeValue}"` : name);
  }

  if (!safeAttributes.some((attribute) => attribute.startsWith("src="))) return "";
  if (!hasTitle) safeAttributes.push('title="Tabela ligowa"');
  if (!hasLoading) safeAttributes.push('loading="lazy"');
  if (!hasStyle) safeAttributes.push('style="max-width:100%;width:100%;border:0;"');

  return `<iframe ${safeAttributes.join(" ")}></iframe>`;
}
