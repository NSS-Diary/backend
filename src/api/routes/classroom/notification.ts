import { Router, Response, NextFunction } from 'express';
import { celebrate, Joi } from 'celebrate';
import logger from '../../../loaders/logger';
import middlewares from '../../middlewares';
import { IAuth } from '../../../interfaces/Middleware';
import NotificationService from '../../../services/classroom/notification';
const route = Router();

export default (app: Router) => {
  app.use('/classroom/notification', route);

  route.post(
    '/add',
    middlewares.isAuth,
    middlewares.requiredRole('CLASSROOM_ADMIN'),
    celebrate({
      body: Joi.object({
        classroom_code: Joi.string().required(),
        title: Joi.string().required(),
        description: Joi.string().required(),
      }),
    }),
    async (req: IAuth, res: Response, next: NextFunction) => {
      logger.debug('Calling Notification add endpoint with body: %o', req.body);
      try {
        const notificationServiceInstance = new NotificationService();
        const result = await notificationServiceInstance.AddNotification(req.body, req.token);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
