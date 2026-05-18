import type { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}
declare function userMiddleware(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export default userMiddleware;
//# sourceMappingURL=user.middleware.d.ts.map