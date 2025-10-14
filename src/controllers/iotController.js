import { ingestHttp } from '../services/iotService.js';

export async function ingestData(req, res, next) {
  try {
    const record = await ingestHttp(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
}

