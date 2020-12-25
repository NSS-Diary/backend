export interface IAddNotification {
  classroom_code: string;
  title: string;
  description: string;
}

export interface IListNotification {
  notification_id: string;
  title: string;
  description: string;
  created_at: string;
}
