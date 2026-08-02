import jwt from 'jsonwebtoken';

export const signToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);
