import { Router, Response, NextFunction } from 'express';
import UserService from '../../services/user';
import { celebrate, Joi } from 'celebrate';
import logger from '../../loaders/logger';
import middlewares from '../middlewares';
import { IAuth } from '../../interfaces/Middleware';
const route = Router();

export default (app: Router) => {
  app.use('/user', route);

  route.get('/me', middlewares.isAuth, async (req: IAuth, res: Response) => {
    logger.debug('Calling /user/me endpoint with body');
    var response = {};

    const user = { ...req.token };
    Reflect.deleteProperty(user, 'exp');
    Reflect.deleteProperty(user, 'iat');
    response = { user };

    if (user.user_type === 'STUDENT') {
      try {
        const userServiceInstance = new UserService();
        const metadata = await userServiceInstance.GetStudentMetadata(user.username);
        response = { ...response, metadata };
      } catch (e) {
        logger.error(e);
      }
    }

    return res.json(response).status(200);
  });

  route.post(
    '/add',
    middlewares.isAuth,
    middlewares.requiredRole('SUPER_ADMIN'),
    celebrate({
      body: Joi.object({
        username: Joi.string().required(),
        email: Joi.string().email().required(),
        name: Joi.string().required(),
        password: Joi.string().required(),
        user_type: Joi.string().valid('SUPER_ADMIN', 'CLASSROOM_ADMIN').required(),
      }),
    }),
    async (req: IAuth, res: Response, next: NextFunction) => {
      logger.debug('Calling User add endpoint with body: %o', req.body);
      try {
        const userServiceInstance = new UserService();
        const result = await userServiceInstance.CreateUser(req.body);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/view',
    middlewares.isAuth,
    middlewares.requiredRole('CLASSROOM_ADMIN'),
    celebrate({
      body: Joi.object({
        username: Joi.string().required(),
      }),
    }),
    async (req: IAuth, res: Response, next: NextFunction) => {
      logger.debug('Calling User View endpoint with body: %o', req.body);
      try {
        const userServiceInstance = new UserService();
        const result = await userServiceInstance.ViewUser(
          req.body.username,
          req.token.username,
          req.token.user_type,
        );
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );

  route.post(
    '/list',
    middlewares.isAuth,
    middlewares.requiredRole('CLASSROOM_ADMIN'),
    celebrate({
      body: Joi.object({
        classroom_code: Joi.string(),
        role: Joi.when('classroom_code', {
          is: Joi.exist(),
          then: Joi.valid('STUDENT').required(),
          otherwise: Joi.valid('CLASSROOM_ADMIN').required(),
        }),
      }),
    }),
    async (req: IAuth, res: Response, next: NextFunction) => {
      logger.debug('Calling User List endpoint with body: %o', req.body);
      try {
        const userServiceInstance = new UserService();
        const result = await userServiceInstance.ListUser(req.body, req.token);
        return res.json(result).status(200);
      } catch (e) {
        logger.error('🔥 error: %o', e);
        return next(e);
      }
    },
  );
};
