import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

export function authenticate(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      if (required) return res.status(401).json({ error: 'Missing token' });
      req.user = null; return next();
    }
    try {
      const payload = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      });
      req.user = payload;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export function signToken(payload) {
  return jwt.sign(payload, jwtConfig.secret, {
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    expiresIn: jwtConfig.expiresIn
  });
}

