import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/User';

export interface AdminRequest extends Request {
  user?: any;
}

export const requireAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await UserModel.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin' && user.role !== 'merchant') {
      return res.status(403).json({ 
        message: 'Admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const requireSuperAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await UserModel.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Super admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Super admin middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};