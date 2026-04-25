import { registerAs } from '@nestjs/config';

export default registerAs('encryption', () => ({
  key: process.env.ENCRYPTION_KEY || 'your_32_character_key_here_1234',
  iv: process.env.ENCRYPTION_IV || 'your_16_character_iv',
  algorithm: 'aes-256-cbc',
}));
