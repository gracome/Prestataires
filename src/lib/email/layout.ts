/**
 * Email chrome.
 *
 * Inline styles and a table-free single column: mail clients strip <style>
 * blocks and mobile is the main reader here, so the layout stays deliberately
 * plain and readable when styling is dropped entirely.
 */

export type LayoutInput = {
  title: string;
  preheader?: string;
  businessName: string;
  primaryColor?: string;
  blocks: Block[];
  footerNote?: string;
};

export type Block =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "facts"; rows: Array<[string, string]> }
  | { kind: "callout"; text: string }
  | { kind: "button"; label: string; url: string }
  | { kind: "divider" };

export function renderEmail(input: LayoutInput): { html: string; text: string } {
  return { html: renderHtml(input), text: renderText(input) };
}

function renderHtml(input: LayoutInput): string {
  const primary = input.primaryColor ?? "#B0797A";

  const body = input.blocks
    .map((block) => renderBlockHtml(block, primary))
    .join("\n");

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2422;">
${
    input.preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>`
      : ""
  }
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="background:#ffffff;border-radius:16px;padding:28px 24px;">
    <p style="margin:0 0 18px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${primary};font-weight:600;">${escapeHtml(input.businessName)}</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:700;color:#2b2422;">${escapeHtml(input.title)}</h1>
${body}
  </div>
  <p style="margin:18px 4px 0;font-size:12px;line-height:1.6;color:#8a7f7a;">
    ${escapeHtml(input.footerNote ?? `Message envoyé automatiquement par ${input.businessName}.`)}
  </p>
</div>
</body>
</html>`;
}

function renderBlockHtml(block: Block, primary: string): string {
  switch (block.kind) {
    case "heading":
      return `    <h2 style="margin:24px 0 10px;font-size:16px;font-weight:700;color:#2b2422;">${escapeHtml(block.text)}</h2>`;

    case "paragraph":
      return `    <p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#4a4140;">${escapeHtml(block.text)}</p>`;

    case "callout":
      return `    <div style="margin:0 0 16px;padding:14px 16px;background:#faf6f4;border-left:3px solid ${primary};border-radius:8px;font-size:15px;line-height:1.6;color:#4a4140;">${escapeHtml(block.text)}</div>`;

    case "facts":
      return `    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;font-size:15px;">
${block.rows
  .map(
    ([label, value]) =>
      `      <tr><td style="padding:7px 0;color:#8a7f7a;width:42%;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:7px 0;color:#2b2422;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td></tr>`,
  )
  .join("\n")}
    </table>`;

    case "button":
      return `    <p style="margin:20px 0 6px;"><a href="${escapeAttribute(block.url)}" style="display:inline-block;background:${primary};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:999px;">${escapeHtml(block.label)}</a></p>`;

    case "divider":
      return `    <hr style="border:none;border-top:1px solid #ece6e3;margin:22px 0;">`;
  }
}

function renderText(input: LayoutInput): string {
  const lines: string[] = [input.businessName.toUpperCase(), "", input.title, ""];

  for (const block of input.blocks) {
    switch (block.kind) {
      case "heading":
        lines.push(block.text.toUpperCase(), "");
        break;
      case "paragraph":
      case "callout":
        lines.push(block.text, "");
        break;
      case "facts":
        for (const [label, value] of block.rows) lines.push(`${label} : ${value}`);
        lines.push("");
        break;
      case "button":
        lines.push(`${block.label} : ${block.url}`, "");
        break;
      case "divider":
        lines.push("---", "");
        break;
    }
  }

  lines.push(
    input.footerNote ?? `Message envoyé automatiquement par ${input.businessName}.`,
  );
  return lines.join("\n");
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
