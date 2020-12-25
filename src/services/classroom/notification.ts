import logger from '../../loaders/logger';
import db from '../../loaders/db';
import ShortUniqueId from 'short-unique-id';
import { IDefaultResponse } from '../../interfaces/Response';
import { IGetUserInfo } from '../../interfaces/Users';
import { IAddNotification, IListNotification } from '../../interfaces/Notification';

export default class NotificationService {
  public async ListNotification(classroom_code: string): Promise<IListNotification[]> {
    try {
      //
      // TODO: Add Verification for users
      //
      logger.silly('Fetching Notifications');
      const list = await db.query(
        'SELECT * FROM Notification Where Notification.classroom_code = ?',
        [classroom_code],
      );
      const res = JSON.parse(JSON.stringify(list[0]));
      return res;
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  public async AddNotification(
    notif: IAddNotification,
    user: IGetUserInfo,
  ): Promise<IDefaultResponse> {
    let conn = null;
    try {
      conn = await db.getConnection();
      logger.silly('Transaction Begin');
      await conn.beginTransaction();

      // Find classroom
      logger.silly('Fetching the classroom info');
      const [
        classInfo,
      ] = await conn.query('SELECT * FROM Classroom WHERE Classroom.classroom_code = ?', [
        notif.classroom_code,
      ]);
      if (classInfo.length === 0) {
        throw new Error('Invalid Classroom');
      }

      // Check if Admin has Perms
      logger.silly('Checking classroom admin perms');
      if (user.user_type !== 'SUPER_ADMIN' && classInfo[0].admin_name !== user.username) {
        throw new Error('Not enough Permissions');
      }

      // Find a valid classroom_code
      logger.silly('Generating UUID');
      const uid = new ShortUniqueId();
      var UUID: string;
      while (1) {
        UUID = uid();
        const collidingClasses = await conn.query(
          'SELECT * FROM Notification WHERE Notification.notification_id = ?',
          [UUID],
        );
        if (collidingClasses[0].length === 0) {
          break;
        }
      }

      // Insert db record
      logger.silly('Creating notification db record');
      const results = await conn.query('INSERT INTO Notification VALUES (?, ?, ?, DEFAULT, ?)', [
        UUID,
        notif.title,
        notif.description,
        notif.classroom_code,
      ]);

      await conn.commit();
      logger.silly('Transaction Commited');
      return { success: true, message: 'Notification added' };
    } catch (error) {
      logger.error(error);
      if (conn) await conn.rollback();
      throw error;
    } finally {
      if (conn) await conn.release();
    }
  }
}
