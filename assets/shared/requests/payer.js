import { sdkAxios } from '../services/axios';

export const getPayer = async ({ email, employerId, payerId }) => {
  const payerResponse = await sdkAxios.get(
    `https://app.tpastream.com/sdk-api/payer/${employerId}/${payerId}`,
    {
      params: {
        email: email
      }
    }
  );
  return payerResponse.data.data;
};
