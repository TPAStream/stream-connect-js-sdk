import { sdkAxios } from '../services/axios';

export const beginInterop = async ({ email }) => {
  const interopStateResponse = await sdkAxios.post(
    'https://app.tpastream.com/sdk-api/interop',
    {
      user_email: email
    }
  );
  return interopStateResponse.data.data;
};

export const getInteropState = async ({ email }) => {
  const interopStateResponse = await sdkAxios.get(
    'https://app.tpastream.com/sdk-api/interop',
    {
      params: {
        email: email
      }
    }
  );
  return interopStateResponse.data.data;
};
