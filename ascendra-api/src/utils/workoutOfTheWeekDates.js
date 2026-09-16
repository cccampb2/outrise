import { DateTime } from "luxon";
import BadRequestError from "../errors/BadRequestError.js";

export const WOTW_TIME_ZONE = "America/New_York";

export const getWorkoutOfTheWeekWindow = (startDate) => {
  const weekStart = DateTime.fromISO(startDate, {
    zone: WOTW_TIME_ZONE,
  }).startOf("day");

  if (!weekStart.isValid) {
    throw new BadRequestError("Invalid Workout of the Week start date");
  }

  const isMonday = weekStart.weekday === 1;

  if (!isMonday) {
    throw new BadRequestError("Workout of the Week must start on a Monday");
  }

  const weekEnd = weekStart.plus({ weeks: 1 });

  return {
    weekStart: weekStart.toUTC().toJSDate(),
    weekEnd: weekEnd.toUTC().toJSDate(),
  };
};

export const getCurrentWorkoutOfTheWeekWindow = () => {
  const now = DateTime.now().setZone(WOTW_TIME_ZONE);

  const weekStart = now.startOf("day").minus({ days: now.weekday - 1 });

  const weekEnd = weekStart.plus({ weeks: 1 });

  return {
    weekStart: weekStart.toUTC().toJSDate(),
    weekEnd: weekEnd.toUTC().toJSDate(),
  };
};
