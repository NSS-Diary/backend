import logger from '../../loaders/logger';
import db from '../../loaders/db';
import ShortUniqueId from 'short-unique-id';
import { IDefaultResponse } from '../../interfaces/Response';
import { IGetUserInfo } from '../../interfaces/Users';
import {
  IAddActivity,
  IListEnrollment,
  IListActivity,
  IVerificationList,
  ILockActivity,
} from '../../interfaces/Activity';
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

  public async EnrolledList(username: string): Promise<IListEnrollment[]> {
    try {
      logger.silly('Fetching Enrollments');
      const list = await db.query(
        'SELECT * FROM Enrolls INNER JOIN Activities ON Enrolls.activity_id = Activities.activity_id Where Enrolls.student = ?',
        [username],
      );
      const res = JSON.parse(JSON.stringify(list[0])).map((info) => {
        Reflect.deleteProperty(info, 'student');
        Reflect.deleteProperty(info, 'Status');
        Reflect.deleteProperty(info, 'classroom_code');
        return info;
      });
      return res;
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  public async VerificationList(activity_id: string): Promise<IVerificationList[]> {
    try {
      logger.silly('Fetching Verification List');
      const list = await db.query(
        'SELECT * FROM Enrolls INNER JOIN Proofs ON Enrolls.enrollment_id = Proofs.enrollment_id Where Enrolls.status = ? AND Enrolls.activity_id=?',
        ['VERIFICATION', activity_id],
      );
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
          'SELECT * FROM Enrolls INNER JOIN Student_Metadata ON Enrolls.student=Student_Metadata.student WHERE Enrolls.activity_id = ? ORDER BY Student_Metadata.social_hours',
          [info.activity_id],
        );
      } else {
        [
          enrolledStudents,
        ] = await conn.query(
          'SELECT * FROM Enrolls INNER JOIN Student_Metadata ON Enrolls.student=Student_Metadata.student WHERE Enrolls.activity_id = ? ORDER BY Student_Metadata.farm_hours',
          [info.activity_id],
        );
      }

      // Reject Students
      logger.silly('Rejecting Students');
      var rejectedStudents = enrolledStudents
        .slice(info.maxStudents)
        .map((student) => student.enrollment_id);
      if (rejectedStudents.length !== 0) {
        var query = await conn.query('DELETE FROM Enrolls WHERE enrollment_id IN (?)', [
          rejectedStudents,
        ]);
      }

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
        'SELECT Activities.Status, Activities.start_time, Activities.end_time FROM Student_Metadata, Activities WHERE Student_Metadata.student = ? AND Activities.activity_id = ? AND Activities.classroom_code = Student_Metadata.classroom_code',
        [username, activity_id],
      );
      if (activityStatus.length === 0) {
        throw new Error('No Activity with this ID in the Classroom');
      } else if (activityStatus[0].Status === 'LOCKED') {
        throw new Error('Activity is Locked. Cannot Enroll');
      }

      var dt1 = new Date(activityStatus.start_time);
      var dt2 = new Date(activityStatus.end_time);
      var hours = (dt2.getTime() - dt1.getTime()) / 1000;
      hours /= 60 * 60;

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
      const results = await conn.query('INSERT INTO Enrolls VALUES (?, ?, ?, DEFAULT, ?)', [
        UUID,
        activity_id,
        username,
        hours,
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

  public async Verify(enrollment_id: String, newStatus: string): Promise<IDefaultResponse> {
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
      } else if (enrollInfo[0].status !== 'VERIFICATION') {
        throw new Error('Cannot Verify Now');
      }

      //change to verifications stage
      logger.silly('Changing enrollment to Verification');
      await conn.query('UPDATE Enrolls SET status=? WHERE enrollment_id=?', [
        newStatus,
        enrollment_id,
      ]);

      if (newStatus === 'COMPLETED') {
        const [
          activityInfo,
        ] = await conn.query('SELECT * FROM Activities WHERE Activities.activity_id = ?', [
          enrollInfo[0].activity_id,
        ]);

        if (activityInfo[0].type === 'SOCIAL') {
          await conn.query(
            'UPDATE Student_Metadata SET social_hours=social_hours + ? WHERE student=?',
            [enrollInfo[0].hours, enrollInfo[0].student],
          );
        } else {
          await conn.query(
            'UPDATE Student_Metadata SET farm_hours=farm_hours + ? WHERE student=?',
            [enrollInfo[0].hours, enrollInfo[0].student],
          );
        }
      }

      await conn.commit();
      logger.silly('Transaction Commited');
      return { success: true, message: 'Successfully Marked' };
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
      } else if (enrollInfo[0].status !== 'ENROLLED') {
        throw new Error('Already uploaded proofs');
      }

      // Insert db record
      logger.silly('Creating proofs db record');
      const results = await conn.query('INSERT INTO Proofs VALUES (?, ?, ?)', [
        imageName,
        enrollment_id,
        'http://nss-db.nikhilrajesh.com/proofs/' + imageName + path.extname(file.originalname),
      ]);

      //change to verifications stage
      logger.silly('Changing enrollment to Verification');
      await conn.query('UPDATE Enrolls SET status=? WHERE enrollment_id=?', [
        'VERIFICATION',
        enrollment_id,
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
