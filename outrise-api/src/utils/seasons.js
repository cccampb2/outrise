import { DateTime } from "luxon";

const SEASON_TIME_ZONE = "America/New_York";

export const getQuarterFromDate = (date) => {
  const dateTime = DateTime.fromJSDate(date, {
    zone: SEASON_TIME_ZONE,
  });

  return Math.floor((dateTime.month - 1) / 3) + 1;
};

export const getYearFromDate = (date) => {
  const dateTime = DateTime.fromJSDate(date, {
    zone: SEASON_TIME_ZONE,
  });

  return dateTime.year;
};

export const getQuarterStartDate = (year, quarter) => {
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new Error("Quarter must be between 1 and 4");
  }

  const startMonth = (quarter - 1) * 3 + 1;

  return DateTime.fromObject(
    {
      year,
      month: startMonth,
      day: 1,
    },
    {
      zone: SEASON_TIME_ZONE,
    },
  )
    .startOf("day")
    .toUTC()
    .toJSDate();
};

export const getQuarterEndDate = (year, quarter) => {
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new Error("Quarter must be between 1 and 4");
  }

  if (quarter === 4) {
    return getQuarterStartDate(year + 1, 1);
  }

  return getQuarterStartDate(year, quarter + 1);
};

export const getNextQuarter = ({ year, quarter }) => {
  if (quarter === 4) {
    return {
      year: year + 1,
      quarter: 1,
    };
  }

  return {
    year,
    quarter: quarter + 1,
  };
};
