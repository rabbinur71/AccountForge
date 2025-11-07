import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class JWTUtil {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '15m'
    });
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: '7d'
    });
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as TokenPayload;
  }
}