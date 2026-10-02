import { celebrate } from "celebrate";

export const validate = (schema) => {
  return celebrate(schema);
};
