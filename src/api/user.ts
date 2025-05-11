import axios from "../config/axios";

export const getCurrentUser = async (token: string) => {
    try {
        const response = await axios.get("/user", {
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