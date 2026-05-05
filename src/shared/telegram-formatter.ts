import { marked } from "marked";

/**
 * Convert Markdown to Telegram-compatible HTML
 *
 * Telegram supports a subset of HTML tags:
 * <b>, <strong>, <i>, <em>, <u>, <s>, <code>, <pre>, <a>
 *
 * This function converts Markdown to HTML and ensures it's compatible.
 */
export function markdownToTelegramHtml(markdown: string): string {
	// Configure marked to output simple HTML without <p> tags for inline content
	marked.setOptions({
		breaks: true, // Convert line breaks to <br>
		gfm: true, // GitHub Flavored Markdown
	});

	// Parse markdown to HTML
	let html = marked.parse(markdown) as string;

	// Clean up HTML for Telegram compatibility

	// Remove <p> tags (Telegram doesn't need them, they add extra spacing)
	html = html.replace(/<p>/g, "").replace(/<\/p>/g, "\n");

	// Replace <h1>, <h2>, etc. with <b> (Telegram doesn't support headings)
	html = html.replace(/<h[1-6]>/g, "<b>").replace(/<\/h[1-6]>/g, "</b>\n");

	// Replace <em> with <i> (both work but <i> is more standard)
	html = html.replace(/<em>/g, "<i>").replace(/<\/em>/g, "</i>");

	// Replace <strong> with <b> (both work but <b> is shorter)
	html = html.replace(/<strong>/g, "<b>").replace(/<\/strong>/g, "</b>");

	// Replace <del> or <strike> with <s>
	html = html.replace(/<del>/g, "<s>").replace(/<\/del>/g, "</s>");
	html = html.replace(/<strike>/g, "<s>").replace(/<\/strike>/g, "</s>");

	// Handle code blocks: <pre><code> → <pre>
	html = html.replace(/<pre><code>/g, "<pre>").replace(/<\/code><\/pre>/g, "</pre>");

	// Convert lists to plain text with bullets (Telegram doesn't support <ul>/<ol>/<li>)
	// Unordered lists
	html = html.replace(/<ul>\s*/g, "");
	html = html.replace(/<\/ul>\s*/g, "\n");
	html = html.replace(/<li>/g, "• ");
	html = html.replace(/<\/li>/g, "\n");

	// Ordered lists (convert to numbered plain text)
	let olCounter = 0;
	html = html.replace(/<ol>\s*/g, () => {
		olCounter = 0;
		return "";
	});
	html = html.replace(/<\/ol>\s*/g, "\n");
	// For <li> inside <ol>, we'll just use bullets for simplicity
	// (Proper numbering would require more complex parsing)

	// Remove any remaining unsupported tags
	html = html.replace(/<\/?div>/g, "");
	html = html.replace(/<\/?span>/g, "");
	html = html.replace(/<\/?blockquote>/g, "");

	// Clean up excessive newlines
	html = html.replace(/\n{3,}/g, "\n\n");

	// Trim
	html = html.trim();

	return html;
}

/**
 * Alternative: Request HTML directly from AI
 *
 * System prompt addition for getting HTML output:
 * "Format your response in simple HTML using only these tags: <b>, <i>, <code>, <pre>.
 * Do NOT use <p>, <h1>, or other tags. Use <b> for headers and important text."
 */
export function getHtmlSystemPromptAddition(): string {
	return `

FORMATO DE SALIDA:
- Usa HTML simple con solo estas etiquetas: <b>, <i>, <code>, <pre>
- NO uses <p>, <h1>, <h2>, ni otras etiquetas
- Usa <b> para títulos y texto importante
- Usa viñetas con • o -
- Separa secciones con líneas en blanco`;
}
