import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'your_secret_key',
  expiresIn: process.env.JWT_EXPIRATION || '3600s',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret_key',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '604800s',
}));
