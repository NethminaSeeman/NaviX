export const normalizeError = (error) => {
  if (!error) return "Unexpected error occurred.";
  if (error.response?.data?.error) return error.response.data.error;
  if (error.message) return error.message;
  return "Something went wrong. Please try again.";
};
