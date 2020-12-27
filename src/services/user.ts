import argon2 from 'argon2';
import logger from '../loaders/logger';
import db from '../loaders/db';
import mysql2 from 'mysql2';
import { ICreateUser, IGetUserInfo, IListUserRequest, IStudentMetadata } from '../interfaces/Users';
import { IDefaultResponse } from '../interfaces/Response';

export default class UserService {
  public async CreateUser(user: ICreateUser): Promise<IDefaultResponse> {
    try {
      logger.silly('Hashing password');
      user.password = await argon2.hash(user.password);

      logger.silly('Creating user db record');
      await db.query('INSERT INTO Users VALUES (?, ?, ?, ?, ?)', [
        user.username,
        user.email,
        user.name,
        user.password,
        user.user_type,
      ]);
      return { success: true, message: 'User created' };
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  public async ListUser(query: IListUserRequest, user: IGetUserInfo): Promise<IGetUserInfo[]> {
    try {
      if (user.user_type == 'CLASSROOM_ADMIN') {
        if (query.role === 'STUDENT') {
          const [
            classroomInfo,
          ] = await db.query('SELECT * FROM Classroom WHERE Classroom.classroom_code=?', [
            query.classroom_code,
          ]);

          if (classroomInfo[0].admin_name !== user.username) {
            throw new Error('Invalid Permissions');
          }
        } else {
          throw new Error('Invalid Permissions');
        }
      }

      logger.silly('Fetching Users');
      var sqlQuery;
      if (query.role === 'STUDENT') {
        sqlQuery =
          'SELECT username, email, name, farm_hours, social_hours FROM Users INNER JOIN Student_Metadata ON Users.username = Student_Metadata.student WHERE Student_Metadata.classroom_code=' +
          mysql2.escape(query.classroom_code);
      } else {
        sqlQuery =
          "SELECT username, email, name FROM Users WHERE Users.user_type = 'CLASSROOM_ADMIN'";
      }
      const queryRes = await db.query(sqlQuery);
      const users = JSON.parse(JSON.stringify(queryRes[0]));

      return users;
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  public async ViewUser(
    username: string,
    enquirer: string,
    enquirerRole: string,
  ): Promise<{ user: IGetUserInfo; metadata?: IStudentMetadata }> {
    try {
      logger.silly('Fetching User');
      const queryRes = await db.query('SELECT * FROM Users Where Users.username = ?', [username]);
      const users = JSON.parse(JSON.stringify(queryRes[0]));
      if (users.length === 0) {
        throw new Error('Invalid User');
      }

      const user: IGetUserInfo = users[0];
      Reflect.deleteProperty(user, 'password');

      var metadata: IStudentMetadata;
      if (user.user_type === 'STUDENT') {
        metadata = await this.GetStudentMetadata(user.username);

        if (enquirerRole === 'CLASSROOM_ADMIN') {
          const queryRes2 = await db.query(
            'SELECT * FROM Classroom Where Classroom.classroom_code = ?',
            [metadata.classroom_code],
          );
          const classroom = JSON.parse(JSON.stringify(queryRes2[0]));
          if (classroom[0].admin_name !== enquirer) throw new Error('Invalid Permissions');
        }
      }

      return { user, metadata };
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  public async GetStudentMetadata(username: string): Promise<IStudentMetadata> {
    try {
      logger.silly('Fetching Metadata');
      const metadata = await db.query(
        'SELECT * FROM Student_Metadata Where Student_Metadata.student = ?',
        [username],
      );
      const res = JSON.parse(JSON.stringify(metadata[0]));

      if (res.length === 0) {
        throw new Error('Invalid Student');
      }

      return res[0];
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }
}
