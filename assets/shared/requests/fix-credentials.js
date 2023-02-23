import { sdkAxios } from '../services/axios';

export const getFixCredentials = async ({ email }) => {
  const fixCredentialsResponse = await sdkAxios.get(
    `https://app.tpastream.com.com/sdk-api/fix-credentials`,
    {
      params: {
        email: email
      }
    }
  );
  return fixCredentialsResponse.data.data;
};
