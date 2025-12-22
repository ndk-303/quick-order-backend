import bcrypt from 'bcrypt';
const saltRounds = 10;

export const hashPassword = async (
  plainPassword: string,
): Promise<string | undefined> => {
  try {
    return await bcrypt.hash(plainPassword, saltRounds);
  } catch (error) {
    console.log(error);
  }
};

export const comparePassword = async (
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    console.log(error);
  }
  return false;
};
