// Local preview that mirrors GitHub Pages: the site is served under /<repo>/,
// so absolute asset paths in the project builds resolve exactly as they will
// once deployed.
//
//   deno task serve            http://localhost:8000/
//   PORT=3000 deno task serve

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DIST = `${ROOT}/dist`;
const manifest = JSON.parse(await Deno.readTextFile(`${ROOT}/projects.json`));
const base = manifest.site.repo.replace(/\/$/, "").split("/").pop()!;
const port = Number(Deno.env.get("PORT") ?? 8000);

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".wasm": "application/wasm",
  ".pck": "application/octet-stream",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
};

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

console.log(`Serving dist/ at http://localhost:${port}/${base}/`);

Deno.serve({ port }, async (request) => {
  const url = new URL(request.url);
  let path = decodeURIComponent(url.pathname);

  if (path === "/" || path === "") {
    return Response.redirect(new URL(`/${base}/`, request.url), 302);
  }
  if (!path.startsWith(`/${base}/`)) return notFound();
  path = path.slice(base.length + 1);

  // No escaping the build directory.
  const file = `${DIST}/${path}`.replace(/\/+/g, "/");
  if (!file.startsWith(`${DIST}/`)) return notFound();

  try {
    const info = await Deno.stat(file);
    if (info.isDirectory) {
      if (!url.pathname.endsWith("/")) {
        return Response.redirect(new URL(`${url.pathname}/`, request.url), 302);
      }
      return await serveFile(`${file}index.html`);
    }
    return await serveFile(file);
  } catch {
    return notFound();
  }
});

async function serveFile(file: string): Promise<Response> {
  try {
    const data = await Deno.readFile(file);
    const ext = file.slice(file.lastIndexOf("."));
    return new Response(data, {
      headers: {
        "content-type": types[ext] ?? "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  } catch {
    return notFound();
  }
}
