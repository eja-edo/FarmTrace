export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'dev-secret',
  issuer: process.env.JWT_ISSUER || 'iot-backend',
  audience: process.env.JWT_AUDIENCE || 'iot-clients',
  expiresIn: process.env.JWT_EXPIRES || '7d'
};

