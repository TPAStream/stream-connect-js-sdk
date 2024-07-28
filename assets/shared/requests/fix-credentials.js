import { sdkAxios } from '../services/axios';

export const getFixCredentials = async ({ email }) => {
  const fixCredentialsResponse = await sdkAxios.get(`fix-credentials`, {
    params: {
      email: email
    }
  });
  return fixCredentialsResponse.data.data;
};
