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
