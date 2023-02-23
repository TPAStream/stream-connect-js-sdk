import { sdkAxios } from '../services/axios';

export const getPayer = async ({ email, employerId, payerId, referer }) => {
  const payerResponse = await sdkAxios.get(
    `https://app.tpastream.com.com/sdk-api/payer/${employerId}/${payerId}`,
    {
      params: {
        email: email,
        referer: referer
      }
    }
  );
  return payerResponse.data.data;
};
