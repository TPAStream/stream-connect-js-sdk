import { sdkAxios } from '../services/axios';

export const beginInterop = async ({ email }) => {
  const interopStateResponse = await sdkAxios.post('interop', {
    user_email: email
  });
  return interopStateResponse.data.data;
};

export const getInteropState = async ({ email }) => {
  const interopStateResponse = await sdkAxios.get('interop', {
    params: {
      email: email
    }
  });
  return interopStateResponse.data.data;
};
