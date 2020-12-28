import logger from '../../loaders/logger';
import db from '../../loaders/db';
import ShortUniqueId from 'short-unique-id';
import { IDefaultResponse } from '../../interfaces/Response';
import { IGetUserInfo } from '../../interfaces/Users';
import { IAddActivity, IListActivity, ILockActivity } from '../../interfaces/Activity';
import path from 'path';
import config from '../../config';

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

  public async LockActivity(info: ILockActivity, user: IGetUserInfo): Promise<IDefaultResponse> {
    let conn = null;
    try {
      conn = await db.getConnection();
      logger.silly('Transaction Begin');
      await conn.beginTransaction();

      // Find Activity
      logger.silly('Fetching the activity info');
      const [
        activityInfo,
      ] = await conn.query('SELECT * FROM Activities WHERE Activities.activity_id = ?', [
        info.activity_id,
      ]);
      if (activityInfo.length === 0) {
        throw new Error('Invalid Activity');
      } else if (activityInfo.Status === 'LOCKED') {
        throw new Error('Activity already Locked');
      }

      //
      // TODO: Check if Classroom Admin is the admin corresponding to activities classroom
      //

      logger.silly('Fetching the enrolled students');
      let enrolledStudents;
      if (activityInfo[0].type === 'SOCIAL') {
        [
          enrolledStudents,
        ] = await conn.query(
          'SELECT * FROM Enrolls INNER JOIN Student_Metadata ON Enrolls.student=Student_Metadata.student WHERE Enrolls.activity_id = ? GROUP BY Student_Metadata.social_hours',
          [info.activity_id],
        );
      } else {
        [
          enrolledStudents,
        ] = await conn.query(
          'SELECT * FROM Enrolls INNER JOIN Student_Metadata ON Enrolls.student=Student_Metadata.student WHERE Enrolls.activity_id = ? GROUP BY Student_Metadata.farm_hours',
          [info.activity_id],
        );
      }

      // Reject Students
      logger.silly('Rejecting Students');
      var rejectedStudents = enrolledStudents
        .slice(info.maxStudents)
        .map((student) => student.enrollment_id);
      var query = await conn.query('DELETE FROM Enrolls WHERE enrollment_id IN (?)', [
        rejectedStudents,
      ]);

      //TODO: Send Notification
      enrolledStudents = enrolledStudents.slice(0, info.maxStudents);

      //Lock Activity
      logger.silly('Locking Activity');
      await conn.query('UPDATE Activities SET Status=? WHERE activity_id=?', [
        'LOCKED',
        info.activity_id,
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

  public async UploadProof(
    enrollment_id: String,
    username: String,
    imageName: String,
    file,
  ): Promise<IDefaultResponse> {
    let conn = null;
    try {
      conn = await db.getConnection();
      logger.silly('Transaction Begin');
      await conn.beginTransaction();

      // Find enrollment
      logger.silly('Fetching the enrollment info');
      const [enrollInfo] = await conn.query(
        'SELECT * FROM Enrolls WHERE Enrolls.enrollment_id = ?',
        [enrollment_id],
      );
      if (enrollInfo.length === 0) {
        throw new Error('Invalid Enrollment Id');
      } else if (enrollInfo[0].student !== username) {
        throw new Error('Invalid Permissions');
      }

      // Insert db record
      logger.silly('Creating proofs db record');
      const results = await conn.query('INSERT INTO Proofs VALUES (?, ?, ?)', [
        imageName,
        enrollment_id,
        config.imageUploadDir + '/' + imageName + path.extname(file.originalname),
      ]);

      await conn.commit();
      logger.silly('Transaction Commited');
      return { success: true, message: 'Proof Uploaded' };
    } catch (error) {
      logger.error(error);
      if (conn) await conn.rollback();
      throw error;
    } finally {
      if (conn) await conn.release();
    }
  }
}
