export function htmlResponse(body: string, status = 200): Response {
  return new Response(
    `<!DOCTYPE html><html><head><title>Secretario</title></head><body>${body}</body></html>`,
    { status, headers: { 'Content-Type': 'text/html' } }
  );
}
