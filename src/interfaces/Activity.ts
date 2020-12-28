export interface IAddActivity {
  classroom_code: string;
  name: string;
  type: string;
  start_time: string;
  end_time: string;
}
export interface IListActivity {
  activity_id: string;
  classroom_code: string;
  name: string;
  type: string;
  start_time: string;
  end_time: string;
}
export interface ILockActivity {
  activity_id: string;
  maxStudents: number;
}

export interface IListEnrollment {
  enrollment_id: string;
  status: string;
  hours: number;
  activity_id: string;
  name: string;
  type: string;
  start_time: string;
  end_time: string;
}
export interface IVerificationList {
  enrollment_id: string;
  student: string;
  status: string;
  hours: number;
  activity_id: string;
}
