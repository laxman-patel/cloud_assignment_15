import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sign } from 'jsonwebtoken'
import { hash, compare } from 'bcryptjs'
import { query } from './db'

const app = new Hono()
app.use('/*', cors())
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'

app.get('/', (c) => {
  return c.text('Auth Service is running!')
})

app.post('/register', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Missing email or password' }, 400)

  try {
    const hashedPassword = await hash(password, 10)
    const res = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    )
    return c.json({ user: res.rows[0] }, 201)
  } catch (err: any) {
    console.error(err)
    return c.json({ error: 'Registration failed' }, 500)
  }
})

app.post('/login', async (c) => {
  const { email, password } = await c.req.json()
  if (!email || !password) return c.json({ error: 'Missing email or password' }, 400)

  try {
    const res = await query('SELECT * FROM users WHERE email = $1', [email])
    if (res.rows.length === 0) return c.json({ error: 'Invalid credentials' }, 401)

    const user = res.rows[0]
    const valid = await compare(password, user.password_hash)
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401)

    const token = sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' })
    return c.json({ token })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Login failed' }, 500)
  }
})

export default {
  port: 3000,
  fetch: app.fetch,
}