import { Router, Response, NextFunction } from 'express';
import { celebrate, Joi } from 'celebrate';
import logger from '../../../loaders/logger';
import middlewares from '../../middlewares';
import { IAuth } from '../../../interfaces/Middleware';
import ActivityService from '../../../services/classroom/activities';
const route = Router();

export default (app: Router) => {
  app.use('/classroom/activities', route);

  route.post(
    '/add',
    middlewares.isAuth,
    middlewares.requiredRole('CLASSROOM_ADMIN'),
    celebrate({
      body: Joi.object({
        classroom_code: Joi.string().required(),
        name: Joi.string().required(),
        type: Joi.string().valid('FARM', 'SOCIAL').required(),
        start_time: Joi.date().required(),
        end_time: Joi.date().required(),
      }),
    }),
    async (req: IAuth, res: Response, next: NextFunction) => {
      logger.debug('Calling Activities add endpoint with body: %o', req.body);
      try {
        const acitivityServiceInstance = new ActivityService();
        const result = await acitivityServiceInstance.AddActivity(req.body, req.token);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.get(
    '/list',
    middlewares.isAuth,
    celebrate({
      body: Joi.object({
        classroom_code: Joi.string().required(),
      }),
    }),
    async (req: IAuth, res: Response, next: NextFunction) => {
      logger.debug('Calling Activity List endpoint');
      try {
        const acitivityServiceInstance = new ActivityService();
        const result = await acitivityServiceInstance.ListActivities(req.body.classroom_code);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/enroll',
    middlewares.isAuth,
    celebrate({
      body: Joi.object({
        activity_id: Joi.string().required(),
      }),
    }),
    async (req: IAuth, res: Response, next: NextFunction) => {
      logger.debug('Calling Activity Enroll endpoint with body %o', req.body);
      try {
        if (req.token.user_type === 'STUDENT') {
          const acitivityServiceInstance = new ActivityService();
          const result = await acitivityServiceInstance.EnrollStudent(
            req.token.username,
            req.body.activity_id,
          );
          return res.json(result).status(200);
        } else {
          throw new Error('User is not a STUDENT');
        }
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/lock',
    middlewares.isAuth,
    middlewares.requiredRole('CLASSROOM_ADMIN'),
    celebrate({
      body: Joi.object({
        activity_id: Joi.string().required(),
        maxStudents: Joi.number().required(),
      }),
    }),
    async (req: IAuth, res: Response, next: NextFunction) => {
      logger.debug('Calling Activity Lock endpoint with body %o', req.body);
      try {
        const acitivityServiceInstance = new ActivityService();
        const result = await acitivityServiceInstance.LockActivity(req.body, req.token);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
