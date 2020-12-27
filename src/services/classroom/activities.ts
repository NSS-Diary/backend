import logger from '../../loaders/logger';
import db from '../../loaders/db';
import ShortUniqueId from 'short-unique-id';
import { IDefaultResponse } from '../../interfaces/Response';
import { IGetUserInfo } from '../../interfaces/Users';
import { IAddActivity, IListActivity } from '../../interfaces/Activity';

export default class ActivityService {
  public async ListActivities(classroom_code: string): Promise<IListActivity[]> {
    try {
      //
      // TODO: Add Verification for users
      //
      logger.silly('Fetching Activities');
      const list = await db.query('SELECT * FROM Activities Where Activities.classroom_code = ?', [
        classroom_code,
      ]);
      const res = JSON.parse(JSON.stringify(list[0]));
      return res;
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  public async EnrollStudent(username: string, activity_id: string): Promise<IDefaultResponse> {
    let conn = null;
    try {
      conn = await db.getConnection();
      logger.silly('Transaction Begin');
      await conn.beginTransaction();

      // Check if student is in the same classroom as Activity
      logger.silly('Checking if Student in Classroom');
      const [
        activityStatus,
      ] = await conn.query(
        'SELECT Activities.Status FROM Student_Metadata, Activities WHERE Student_Metadata.student = ? AND Activities.activity_id = ? AND Activities.classroom_code = Student_Metadata.classroom_code',
        [username, activity_id],
      );
      if (activityStatus.length === 0) {
        throw new Error('No Activity with this ID in the Classroom');
      } else if (activityStatus[0].Status === 'LOCKED') {
        throw new Error('Activity is Locked. Cannot Enroll');
      }

      // Find a valid activity_id
      logger.silly('Generating UUID');
      const uid = new ShortUniqueId();
      var UUID: string;
      while (1) {
        UUID = uid();
        const collidingClasses = await conn.query(
          'SELECT * FROM Enrolls WHERE Enrolls.enrollment_id = ?',
          [UUID],
        );
        if (collidingClasses[0].length === 0) {
          break;
        }
      }

      // Insert db record
      logger.silly('Creating enrollment db record');
      const results = await conn.query('INSERT INTO Enrolls VALUES (?, ?, ?, DEFAULT, DEFAULT)', [
        UUID,
        activity_id,
        username,
      ]);

      await conn.commit();
      logger.silly('Transaction Commited');
      return { success: true, message: 'Student Enrolled' };
    } catch (error) {
      logger.error(error);
      if (conn) await conn.rollback();
      throw error;
    } finally {
      if (conn) await conn.release();
    }
  }

  public async AddActivity(activity: IAddActivity, user: IGetUserInfo): Promise<IDefaultResponse> {
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
        activity.classroom_code,
      ]);
      if (classInfo.length === 0) {
        throw new Error('Invalid Classroom');
      }

      // Check if Admin has Perms
      logger.silly('Checking classroom admin perms');
      if (user.user_type !== 'SUPER_ADMIN' && classInfo[0].admin_name !== user.username) {
        throw new Error('Not enough Permissions');
      }

      // Find a valid activity_id
      logger.silly('Generating UUID');
      const uid = new ShortUniqueId();
      var UUID: string;
      while (1) {
        UUID = uid();
        const collidingClasses = await conn.query(
          'SELECT * FROM Activities WHERE Activities.activity_id = ?',
          [UUID],
        );
        if (collidingClasses[0].length === 0) {
          break;
        }
      }

      // Insert db record
      logger.silly('Creating activities db record');
      const results = await conn.query(
        'INSERT INTO Activities VALUES (?, ?, ?, ?, DEFAULT, ?, ?)',
        [
          UUID,
          activity.classroom_code,
          activity.name,
          activity.type,
          activity.start_time,
          activity.end_time,
        ],
      );

      await conn.commit();
      logger.silly('Transaction Commited');
      return { success: true, message: 'Activities added' };
    } catch (error) {
      logger.error(error);
      if (conn) await conn.rollback();
      throw error;
    } finally {
      if (conn) await conn.release();
    }
  }
}
