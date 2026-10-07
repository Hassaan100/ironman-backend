import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Gym } from '../models/Gym.js';

export const authenticate = async (req, res, next) => {
  try {
    const cookieName = process.env.COOKIE_NAME || 'ironman_token';
    const tokenFromCookie = req.cookies?.[cookieName];
    const tokenFromHeader = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;

    const token = tokenFromCookie || tokenFromHeader;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token missing or expired' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ironman-gym-super-secret-jwt-key-2026');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account is deactivated' });
    }

    req.user = {
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      gymId: user.gymId ? user.gymId.toString() : undefined,
    };

    // Tenant context resolution
    let resolvedGymId = req.headers['x-tenant-id'] || user.gymId?.toString();

    // Fallback resolution if not directly set
    if (!resolvedGymId) {
      const defaultGym = await Gym.findOne({ subscriptionStatus: 'active' }).sort({ createdAt: 1 });
      if (defaultGym) {
        resolvedGymId = defaultGym._id.toString();
        // If user didn't have gymId linked, link it now
        if (user.role !== 'superadmin' && !user.gymId) {
          user.gymId = defaultGym._id;
          await user.save();
        }
      }
    }

    req.gymId = resolvedGymId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session', error: error.message });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Requires one of role [${allowedRoles.join(', ')}]`,
      });
    }
    next();
  };
};

export const requireGymContext = async (req, res, next) => {
  if (!req.gymId) {
    const firstGym = await Gym.findOne().sort({ createdAt: 1 });
    if (firstGym) {
      req.gymId = firstGym._id.toString();
      return next();
    }
    return res.status(400).json({
      success: false,
      message: 'Gym/Tenant context is required for this operation. Please create a gym first.',
    });
  }
  next();
};
