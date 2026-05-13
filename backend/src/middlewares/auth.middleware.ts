import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId: string  // non-optional — guaranteed after middleware runs
}

interface JwtPayload {
  userId: string
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido.' })
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload  = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    ;(req as AuthRequest).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' })
  }
}