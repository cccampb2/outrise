export const getQuarterFromDate = (date) => {
  const month = date.getUTCMonth();

  return Math.floor(month / 3) + 1;
};

export const getQuarterStartDate = (year, quarter) => {
  if (!Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
    throw new Error("Quarter must be between 1 and 4");
  }

  const startMonth = (quarter - 1) * 3;
  return new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
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
