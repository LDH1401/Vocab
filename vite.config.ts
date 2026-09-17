import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'

const SERVER_ENV_KEYS = ['MONGODB_URI', 'MONGODB_DB', 'APP_PASSWORD', 'AUTH_SECRET']

async function toWebRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && chunks.length > 0
  return new Request(new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`), {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  })
}

async function sendWebResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    if (key !== 'set-cookie') res.setHeader(key, value)
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length > 0) res.setHeader('set-cookie', cookies)
  res.end(Buffer.from(await response.arrayBuffer()))
}

/** Khi chạy `npm run dev`, phục vụ các file api/*.ts giống cách Vercel Functions chạy */
function vercelApiDev(): Plugin {
  return {
    name: 'vocab-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
        if (!pathname.startsWith('/api/')) return next()
        const name = pathname.slice('/api/'.length)
        try {
          if (!/^[a-z-]+$/.test(name)) throw Object.assign(new Error('not found'), { code: 'NOT_FOUND' })
          const mod = (await server.ssrLoadModule(`/api/${name}.ts`)) as {
            default: { fetch: (request: Request) => Promise<Response> }
          }
          await sendWebResponse(res, await mod.default.fetch(await toWebRequest(req)))
        } catch (error) {
          const notFound = (error as { code?: string }).code === 'NOT_FOUND' || /Failed to load url/.test(String(error))
          if (!notFound) server.config.logger.error(String(error))
          res.statusCode = notFound ? 404 : 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: notFound ? 'Không tìm thấy API.' : 'Lỗi máy chủ.' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Nạp biến môi trường của server (từ .env.local) cho các API khi chạy dev
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of SERVER_ENV_KEYS) {
    if (env[key] && !process.env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [react(), tailwindcss(), vercelApiDev()],
  }
})
