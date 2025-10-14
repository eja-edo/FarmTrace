export function ok(res, data) {
  res.status(200).json({ success: true, data });
}

export function created(res, data) {
  res.status(201).json({ success: true, data });
}

export function badRequest(res, message) {
  res.status(400).json({ success: false, error: message });
}

export function unauthorized(res, message) {
  res.status(401).json({ success: false, error: message });
}

export function forbidden(res, message) {
  res.status(403).json({ success: false, error: message });
}

export function notFound(res, message) {
  res.status(404).json({ success: false, error: message });
}

