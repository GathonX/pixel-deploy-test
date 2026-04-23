import api from './api';
import type { AxiosResponse } from 'axios';

export interface UserImage {
  id: number;
  url: string;
}

export function fetchUserImages(): Promise<AxiosResponse<{ data: UserImage[] }>> {
  return api.get<{ data: UserImage[] }>('/user/images');
}
