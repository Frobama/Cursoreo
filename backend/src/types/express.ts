// Runtime-less module to augment Express Request type for TypeScript
export {};

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
