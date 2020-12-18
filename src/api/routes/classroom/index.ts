import { Router, Response, NextFunction } from 'express';
import { celebrate, Joi } from 'celebrate';
import { IAuth } from '../../../interfaces/Middleware';
import ClassroomService from '../../../services/classroom/classroom';
import logger from '../../../loaders/logger';
import middlewares from '../../middlewares';
const route = Router();

export default (app: Router) => {
  app.use('/classroom', route);

  route.post(
    '/add',
    middlewares.isAuth,
    middlewares.requiredRole('SUPER_ADMIN'),
    celebrate({
      body: Joi.object({
        classroomName: Joi.string().required(),
        adminName: Joi.string().required(),
      }),
    }),
    async (req: IAuth, res: Response, next: NextFunction) => {
      logger.debug('Calling Classroom add endpoint with body: %o', req.body);
      try {
        const classroomServiceInstance = new ClassroomService();
        const result = await classroomServiceInstance.CreateClassroom(req.body);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
