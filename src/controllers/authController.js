import Joi from 'joi';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { signToken } from '../middleware/auth.js';

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

export async function loginUser(req, res, next) {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const user = await prisma.user.findUnique({ where: { email: value.email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(value.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ sub: user.id, role: user.role, type: 'user' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

const deviceSchema = Joi.object({
  deviceId: Joi.string().required(),
  secret: Joi.string().required()
});

export async function authDevice(req, res, next) {
  try {
    const { error, value } = deviceSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    const device = await prisma.device.findUnique({ where: { deviceId: value.deviceId } });
    if (!device) return res.status(401).json({ error: 'Invalid device' });
    const ok = await bcrypt.compare(value.secret, device.secretHash);
    if (!ok) return res.status(401).json({ error: 'Invalid device secret' });

    const token = signToken({ sub: device.id, deviceId: device.deviceId, type: 'device' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
}

