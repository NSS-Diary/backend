export interface IGetUserInfo {
  username: string;
  email: string;
  name: string;
  user_type: string;
}

export interface ICreateUser {
  username: string;
  email: string;
  name: string;
  user_type: string;
  password: string;
}

export interface ISignUpUser {
  username: string;
  email: string;
  name: string;
  password: string;
  classroom_code: string;
}

export interface IStudentMetadata {
  student: string;
  farm_hours: string;
  social_hours: string;
  classroom_code: string;
  project_name: string;
}

export interface IListUserRequest {
  role: string;
  classroom_code?: string;
}
