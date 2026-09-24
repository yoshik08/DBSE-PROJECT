const jwt = require('jsonwebtoken');

// expects: Authorization: Bearer <token>
// puts { userId, role } on req.user
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'login required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'bad or expired token' });
  }
}

function admin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'admin only' });
  next();
}

// gym owners (and admins acting as owners)
function gymOwner(req, res, next) {
  if (req.user.role !== 'gym' && req.user.role !== 'admin')
    return res.status(403).json({ error: 'gym owners only' });
  next();
}

module.exports = { auth, admin, gymOwner };
