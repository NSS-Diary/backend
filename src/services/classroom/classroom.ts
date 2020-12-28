import logger from '../../loaders/logger';
import db from '../../loaders/db';
import ShortUniqueId from 'short-unique-id';
import { IClassroom, ICreateClassroom } from '../../interfaces/Classroom';
import { IDefaultResponse } from '../../interfaces/Response';
import { IGetUserInfo } from '../../interfaces/Users';

export default class ClassroomService {
  public async ClassroomInfo(classroom_code: string): Promise<IClassroom> {
    try {
      logger.silly('Fetching Classroom Info');
      const list = await db.query('SELECT * FROM Classroom Where Classroom.classroom_code = ?', [
        classroom_code,
      ]);
      const res = JSON.parse(JSON.stringify(list[0]));
      return res;
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  public async CreateClassroom(classroom: ICreateClassroom): Promise<IDefaultResponse> {
    let conn = null;
    try {
      conn = await db.getConnection();
      logger.silly('Transaction Begin');
      await conn.beginTransaction();

      // Check if Classroom Admin is valid
      logger.silly('Validating CLASSROOM_ADMIN');
      const [adminInfo] = await conn.query('SELECT * FROM Users WHERE Users.username = ?', [
        classroom.adminName,
      ]);
      if (adminInfo.length === 0 || adminInfo[0].user_type !== 'CLASSROOM_ADMIN') {
        throw new Error('Invalid CLASSROOM_ADMIN');
      }

      // Find a valid classroom_code
      logger.silly('Generating UUID');
      const uid = new ShortUniqueId();
      var UUID: string;
      while (1) {
        UUID = uid();
        const collidingClasses = await conn.query(
          'SELECT * FROM Classroom WHERE Classroom.classroom_code = ?',
          [UUID],
        );
        if (collidingClasses[0].length === 0) {
          break;
        }
      }

      // Insert db record
      logger.silly('Creating classroom db record');
      const results = await conn.query('INSERT INTO Classroom VALUES (?, ?, ?)', [
        UUID,
        classroom.classroomName,
        classroom.adminName,
      ]);

      await conn.commit();
      logger.silly('Transaction Commited');
      return { success: true, message: 'Classroom created' };
    } catch (error) {
      logger.error(error);
      if (conn) await conn.rollback();
      throw error;
    } finally {
      if (conn) await conn.release();
    }
  }

  public async ListClassroom(user: IGetUserInfo): Promise<IClassroom[]> {
    try {
      logger.silly('Fetching Classrooms');
      var list;
      if (user.user_type === 'SUPER_ADMIN') {
        list = await db.query('SELECT * FROM Classroom');
      } else {
        list = await db.query('SELECT * FROM Classroom Where Classroom.admin_name = ?', [
          user.username,
        ]);
      }
      const res = JSON.parse(JSON.stringify(list[0]));
      return res;
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }
}
