import axios from "../config/axios";

export const getAcsAuth = async (stationCode: string) => {
  try {
    const response = await axios.post(`/acs/azureauth`, {
      stationCode,
    });
    return response.data;
  } catch (error) {
    console.log(error);
    return error;
  }
};

export const getAcsToken = async () => {
  try {
    const response = await axios.get("/acs");
    return response.data;
  } catch (error) {
    console.log(error);
    return error;
  }
};
