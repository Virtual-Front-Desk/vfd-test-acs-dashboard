import axios from "../config/axios";

export const updateCall = async (callData: any, token: string) => {
    try {
        const response = await axios.put(`/stay/${callData.id}`, callData, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return response.data;
    } catch (error) {
        console.log(error);
        return error;
    }
}