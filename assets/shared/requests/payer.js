import { sdkAxios } from '../services/axios';

export const getPayer = async ({ email, employerId, payerId, referer }) => {
  const payerResponse = await sdkAxios.get(`payer/${employerId}/${payerId}`, {
    params: {
      email: email,
      referer: referer
    }
  });
  return payerResponse.data.data;
};
